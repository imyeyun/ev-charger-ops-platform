# D:\ev\collector.py
# 목적:
# - getChargerStatus(period=10) 호출
# - 충전기별 prev_stat -> new_stat "전이"만 state_change에 저장
# - 단, 정상끼리(2<->3) 전이만 제외 (노이즈 감소)
#   -> 비정상<->정상(복구/악화) 전이는 반드시 저장

import os
import time
import sqlite3
import datetime as dt
import logging
from pathlib import Path
import requests
import xml.etree.ElementTree as ET

BASE_URL = "http://apis.data.go.kr/B552584/EvCharger/getChargerStatus"

PERIOD_MIN = int(os.getenv("EV_PERIOD_MIN", "10"))
NUM_ROWS = int(os.getenv("EV_NUM_ROWS", "9999"))
MAX_PAGES = int(os.getenv("EV_MAX_PAGES", "50"))
TIMEOUT_SEC = int(os.getenv("EV_TIMEOUT_SEC", "30"))

SCRIPT_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("EV_DB_PATH", str(SCRIPT_DIR / "evcharger.sqlite")))
LOG_PATH = Path(os.getenv("EV_LOG_PATH", str(SCRIPT_DIR / "collector.log")))
LOCK_PATH = Path(os.getenv("EV_LOCK_PATH", str(SCRIPT_DIR / "collector.lock")))

SERVICE_KEY = os.getenv("EV_API_KEY", "").strip()

NORMAL_STATS = {2, 3}  # 정상(사용가능/충전중)


def kst_iso_now() -> str:
    return (dt.datetime.utcnow() + dt.timedelta(hours=9)).replace(microsecond=0).isoformat()


def setup_logger():
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("ev_collector")
    logger.setLevel(logging.INFO)

    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    fh = logging.FileHandler(LOG_PATH, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    return logger


logger = setup_logger()


def acquire_lock():
    if LOCK_PATH.exists():
        mtime = dt.datetime.fromtimestamp(LOCK_PATH.stat().st_mtime)
        # 2시간 넘게 묵은 lock이면 깨진 걸로 보고 제거
        if (dt.datetime.now() - mtime).total_seconds() > 7200:
            LOCK_PATH.unlink(missing_ok=True)
        else:
            raise RuntimeError(f"Lock exists: {LOCK_PATH}")
    LOCK_PATH.write_text(kst_iso_now(), encoding="utf-8")


def release_lock():
    try:
        LOCK_PATH.unlink(missing_ok=True)
    except Exception:
        pass


def parse_items(xml_text: str):
    root = ET.fromstring(xml_text)
    body = root.find("body")
    if body is None:
        return []
    items = body.find("items")
    if items is None:
        return []
    out = []
    for item in items.findall("item"):
        out.append({c.tag: (c.text or "").strip() for c in list(item)})
    return out


def fetch_status_changes(period_min: int):
    if not (1 <= period_min <= 10):
        raise ValueError("EV_PERIOD_MIN must be in [1,10]")
    if not SERVICE_KEY:
        raise RuntimeError("EV_API_KEY 환경변수가 비어있음. 서비스키를 설정해줘.")

    session = requests.Session()
    all_rows = []

    for page_no in range(1, MAX_PAGES + 1):
        params = {
            "serviceKey": SERVICE_KEY,
            "dataType": "XML",
            "numOfRows": str(NUM_ROWS),
            "pageNo": str(page_no),
            "period": str(period_min),
        }

        last_err = None
        for attempt in range(3):
            try:
                r = session.get(BASE_URL, params=params, timeout=TIMEOUT_SEC)
                r.raise_for_status()
                rows = parse_items(r.text)
                break
            except Exception as e:
                last_err = e
                time.sleep(1.5 * (attempt + 1))
        else:
            raise RuntimeError(f"API fetch failed on page {page_no}: {last_err}")

        if not rows:
            break

        all_rows.extend(rows)

        if len(rows) < NUM_ROWS:
            break

        time.sleep(0.2)

    return all_rows


def ensure_db(conn: sqlite3.Connection):
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS last_state (
        statId TEXT NOT NULL,
        chgerId TEXT NOT NULL,
        last_stat INTEGER,
        last_statUpdDt TEXT,
        last_seen_at TEXT,
        PRIMARY KEY (statId, chgerId)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS state_change (
        event_at TEXT NOT NULL,           -- ingested_at (KST ISO)
        statId TEXT NOT NULL,
        chgerId TEXT NOT NULL,
        busiId TEXT,
        prev_stat INTEGER,
        new_stat INTEGER,
        prev_statUpdDt TEXT,
        new_statUpdDt TEXT,
        lastTsdt TEXT,
        lastTedt TEXT,
        nowTsdt TEXT,
        PRIMARY KEY (statId, chgerId, new_statUpdDt)   -- 동일 갱신시각 중복 방지
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_state_change_time ON state_change(event_at);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_state_change_key_time ON state_change(statId, chgerId, event_at);")
    conn.commit()


def insert_state_changes(conn: sqlite3.Connection, ingested_at: str, rows):
    cur = conn.cursor()
    fetched = len(rows)
    changes = 0
    updated_cache = 0

    for r in rows:
        statId = r.get("statId", "")
        chgerId = r.get("chgerId", "")
        statUpdDt = r.get("statUpdDt", "")
        if not statId or not chgerId or not statUpdDt:
            continue

        s = r.get("stat", "")
        stat = int(s) if s.isdigit() else None
        if stat is None:
            continue

        # 이전 상태
        cur.execute("SELECT last_stat, last_statUpdDt FROM last_state WHERE statId=? AND chgerId=?", (statId, chgerId))
        prev = cur.fetchone()
        prev_stat = prev[0] if prev else None
        prev_statUpdDt = prev[1] if prev else None

        # last_state는 항상 갱신(관측 캐시)
        cur.execute("""
        INSERT INTO last_state(statId, chgerId, last_stat, last_statUpdDt, last_seen_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(statId, chgerId) DO UPDATE SET
            last_stat=excluded.last_stat,
            last_statUpdDt=excluded.last_statUpdDt,
            last_seen_at=excluded.last_seen_at
        """, (statId, chgerId, stat, statUpdDt, ingested_at))
        updated_cache += 1

        # 전이 기록 조건:
        # 1) prev_stat이 있어야 하고
        # 2) stat이 변해야 하며
        # 3) (prev,new) 둘 다 정상(2/3)인 "정상끼리 전이(2<->3)"만 제외
        if prev_stat is not None and stat != prev_stat:
            is_normal_to_normal = (prev_stat in NORMAL_STATS) and (stat in NORMAL_STATS)
            if not is_normal_to_normal:
                cur.execute("""
                INSERT OR IGNORE INTO state_change
                (event_at, statId, chgerId, busiId, prev_stat, new_stat, prev_statUpdDt, new_statUpdDt,
                 lastTsdt, lastTedt, nowTsdt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ingested_at,
                    statId,
                    chgerId,
                    r.get("busiId") or None,
                    prev_stat,
                    stat,
                    prev_statUpdDt,
                    statUpdDt,
                    r.get("lastTsdt") or None,
                    r.get("lastTedt") or None,
                    r.get("nowTsdt") or None,
                ))
                if cur.rowcount > 0:
                    changes += 1

    conn.commit()
    return fetched, changes, updated_cache


def main():
    acquire_lock()
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        ingested_at = kst_iso_now()
        rows = fetch_status_changes(PERIOD_MIN)

        conn = sqlite3.connect(DB_PATH)
        ensure_db(conn)
        fetched, changes, updated_cache = insert_state_changes(conn, ingested_at, rows)
        conn.close()

        logger.info(f"[{ingested_at}] fetched={fetched} state_change+={changes} last_state_upd={updated_cache} db={DB_PATH}")
    finally:
        release_lock()


if __name__ == "__main__":
    main()
