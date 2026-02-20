# D:\ev\eda_thresholds_windowed_fixed.py
# 목적:
# - make_train_down6h.py 라벨 정의에 "직접" 연결되는 EDA
#   (prev 정상비중, next 다운(4/5) 점유분, next 다운 시작 여부, grid로 예상 알람량/양성량)
#
# 포인트:
# - DOWN={4,5}
# - started_down = next window 내에서 (not DOWN -> DOWN) 진입 여부
# - down_minutes_next = next window에서 DOWN 점유시간(분)
# - (옵션) ONLY_NORMAL_SAMPLES: 현재 new_stat이 정상(2/3)인 시점만 샘플
# - (권장) time_col은 new_statUpdDt 사용 (event_at은 수집시각이라 약간 흔들릴 수 있음)
#
# 입력: D:\ev\evcharger.sqlite (state_change)
# 출력: D:\ev\eda_thresholds_windowed\grid_prev{prev}_next{next}.csv

import os
import sqlite3
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
import pandas as pd
import argparse

DB_PATH = r"D:\ev\evcharger.sqlite"
OUT_DIR = r"D:\ev\eda_thresholds_windowed"
os.makedirs(OUT_DIR, exist_ok=True)

NORMAL = {2, 3}
DOWN = {4, 5}

def dt_parse(s: str) -> datetime:
    s = (s or "").strip()
    if not s:
        raise ValueError("empty datetime string")

    # 1) 14자리: YYYYMMDDHHMMSS  (ex: 20260118114525)
    if s.isdigit() and len(s) == 14:
        return datetime.strptime(s, "%Y%m%d%H%M%S")

    # 2) 12자리: YYYYMMDDHHMM (혹시 있을 경우)
    if s.isdigit() and len(s) == 12:
        return datetime.strptime(s, "%Y%m%d%H%M")

    # 3) 8자리: YYYYMMDD
    if s.isdigit() and len(s) == 8:
        return datetime.strptime(s, "%Y%m%d")

    # 4) 'YYYY-MM-DD HH:MM:SS' -> ISO로 보정
    if " " in s and "T" not in s:
        s = s.replace(" ", "T")

    # 5) ISO (YYYY-MM-DDTHH:MM:SS[.ffffff])
    return datetime.fromisoformat(s)


def overlap_seconds(a_start, a_end, b_start, b_end) -> float:
    s = max(a_start, b_start)
    e = min(a_end, b_end)
    if e <= s:
        return 0.0
    return (e - s).total_seconds()

def percentiles(arr, ps=(5,10,20,50,80,90,95,99)):
    if len(arr) == 0:
        return {}
    a = np.asarray(arr, dtype=float)
    out = {f"p{p}": float(np.percentile(a, p)) for p in ps}
    out["mean"] = float(np.mean(a))
    out["count"] = int(len(a))
    return out

def main(
    prev_h: int,
    next_h: int,
    norm_grid,
    down_grid_minutes,
    time_col: str,
    only_normal_samples: bool,
):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # time_col은 event_at(수집시각) 또는 new_statUpdDt(실제 갱신시각) 권장
    # state_change에 컬럼이 없을 수도 있으니 사전에 에러 메시지 출력
    cols = [r[1] for r in cur.execute("PRAGMA table_info(state_change)").fetchall()]
    if time_col not in cols:
        raise ValueError(
            f"time_col '{time_col}' not found in state_change columns.\n"
            f"available cols: {cols}"
        )

    rows = cur.execute(f"""
        SELECT {time_col}, statId, chgerId, prev_stat, new_stat
        FROM state_change
        WHERE {time_col} IS NOT NULL
        ORDER BY statId, chgerId, {time_col}
    """).fetchall()

    global_max = cur.execute(f"SELECT MAX({time_col}) FROM state_change WHERE {time_col} IS NOT NULL").fetchone()[0]
    con.close()
    global_max_t = dt_parse(global_max)

    print("==== META ====")
    print("db:", DB_PATH)
    print("time_col:", time_col)
    print("global_max_t:", global_max_t)
    print("total rows:", len(rows))
    print("prev_h:", prev_h, "next_h:", next_h)
    print("only_normal_samples:", only_normal_samples)
    print()

    # charger별 시계열
    seq = defaultdict(list)
    for t_str, statId, chgerId, prev_s, new_s in rows:
        if t_str is None:
            continue
        try:
            t = dt_parse(t_str)
        except Exception:
            continue
        try:
            prev_i = int(prev_s) if prev_s is not None else None
            new_i  = int(new_s) if new_s is not None else None
        except Exception:
            continue
        if new_i is None:
            continue
        seq[(statId, chgerId)].append((t, prev_i, new_i))

    # 샘플 저장용
    normal_ratio_prev = []
    down_minutes_next = []
    started_down_next = []

    used = 0
    used_started = 0

    for (statId, chgerId), events in seq.items():
        events.sort(key=lambda x: x[0])
        n = len(events)
        if n == 0:
            continue

        times  = [e[0] for e in events]
        prevs  = [e[1] for e in events]
        states = [e[2] for e in events]  # new_stat이 다음 이벤트까지 유지된다고 가정

        # 세그먼트 (start, end, state)
        segs = []
        for i in range(n):
            s = times[i]
            e = times[i+1] if i < n-1 else global_max_t
            segs.append((s, e, states[i]))

        first_time = segs[0][0]

        for i in range(n):
            t = times[i]
            cur_state = states[i]

            # make_train처럼 "정상 시점만" 샘플로 제한 가능
            if only_normal_samples and (cur_state not in NORMAL):
                continue

            win_prev_start = t - timedelta(hours=prev_h)
            win_prev_end   = t
            win_next_start = t
            win_next_end   = t + timedelta(hours=next_h)

            # 관측 가능 조건(윈도우가 데이터 범위 안에 있어야)
            if win_prev_start < first_time:
                continue
            if win_next_end > global_max_t:
                continue

            # (1) prev 정상비중
            normal_sec = 0.0
            for (s, e, st) in segs:
                if e <= win_prev_start:
                    continue
                if s >= win_prev_end:
                    break
                if st in NORMAL:
                    normal_sec += overlap_seconds(s, e, win_prev_start, win_prev_end)
            normal_ratio = normal_sec / (prev_h * 3600.0)

            # (2) next window DOWN(4/5) 점유시간 (분)
            down_sec = 0.0
            for (s, e, st) in segs:
                if e <= win_next_start:
                    continue
                if s >= win_next_end:
                    break
                if st in DOWN:  # ✅ 핵심 수정(기존 st == TARGET 버그 제거)
                    down_sec += overlap_seconds(s, e, win_next_start, win_next_end)
            down_min = down_sec / 60.0

            # (3) next window 안에 DOWN "시작" 여부 (not DOWN -> DOWN)
            started = 0
            for k in range(i+1, n):
                if times[k] > win_next_end:
                    break
                if (states[k] in DOWN) and (states[k-1] not in DOWN):
                    started = 1
                    break

            normal_ratio_prev.append(normal_ratio)
            down_minutes_next.append(down_min)
            started_down_next.append(started)

            used += 1
            if started:
                used_started += 1

    print("==== SAMPLE COUNTS (observed windows only) ====")
    print("used samples:", used)
    print("started_down in next window:", used_started, f"({(used_started/max(used,1))*100:.2f}%)")
    print()

    print("==== DISTRIBUTIONS ====")
    print("[Prev normal_ratio] (0~1):", percentiles(normal_ratio_prev))
    print(f"[Next down_minutes] (0~{next_h*60}):", percentiles(down_minutes_next))
    down_started = [m for m, s in zip(down_minutes_next, started_down_next) if s == 1]
    print("[Next down_minutes | started_down=1]:", percentiles(down_started))
    print()

    # grid: (Prev 정상비중 >= thr) AND (started_down==1) AND (down_minutes >= thr_min)
    nr = np.asarray(normal_ratio_prev, dtype=float)
    dm = np.asarray(down_minutes_next, dtype=float)
    st = np.asarray(started_down_next, dtype=int)

    results = []
    for thr_n in norm_grid:
        for thr_min in down_grid_minutes:
            flag = (nr >= thr_n) & (st == 1) & (dm >= thr_min)
            cnt = int(flag.sum())
            rate = cnt / max(len(flag), 1)
            results.append({
                "prev_h": prev_h,
                "next_h": next_h,
                "time_col": time_col,
                "only_normal_samples": int(only_normal_samples),
                "thr_prev_normal_ratio": float(thr_n),
                "thr_next_down_minutes": float(thr_min),
                "flag_count": cnt,
                "flag_rate": rate,
            })

    out_df = pd.DataFrame(results).sort_values(["thr_prev_normal_ratio", "thr_next_down_minutes"])
    out_path = os.path.join(OUT_DIR, f"grid_prev{prev_h}_next{next_h}_{time_col}_onnormal{int(only_normal_samples)}.csv")
    out_df.to_csv(out_path, index=False, encoding="utf-8-sig")

    print("Saved grid:", out_path)
    print(out_df.head(30))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--prev_h", type=int, default=6)
    ap.add_argument("--next_h", type=int, default=6)

    # ✅ 핵심: event_at(수집시각) vs new_statUpdDt(실제 갱신시각)
    # collector 기준으로 학습/라벨은 new_statUpdDt 권장
    ap.add_argument("--time_col", type=str, default="new_statUpdDt",
                    help="time column to use: new_statUpdDt (recommended) or event_at")

    # ✅ make_train과 맞추고 싶으면 켜기
    ap.add_argument("--only_normal_samples", action="store_true",
                    help="If set, keep samples only when current new_stat is NORMAL(2/3)")

    args = ap.parse_args()

    # make_train의 NORMAL_RATIO_THR 후보 그리드
    norm_grid = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

    # make_train의 DOWN_MIN_THR 후보(분 단위)
    # next_h=6이면 보통 10~120분이 실무적으로 의미 있음
    down_grid_minutes = [5, 10, 20, 30, 60, 120]

    main(
        prev_h=args.prev_h,
        next_h=args.next_h,
        norm_grid=norm_grid,
        down_grid_minutes=down_grid_minutes,
        time_col=args.time_col,
        only_normal_samples=args.only_normal_samples,
    )
