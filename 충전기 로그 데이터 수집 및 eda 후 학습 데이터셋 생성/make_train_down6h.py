# D:\ev\make_train_down6h.py
import csv
import sqlite3
from datetime import datetime, timedelta
from collections import defaultdict, deque

DB_PATH = r"D:\ev\evcharger_7days.sqlite"
OUT_CSV = r"D:\ev\train_csv\train_down6h_7days.csv"

# ===== Set A (6h/6h) =====
PREV_H = 6
NEXT_H = 6
NORMAL_RATIO_THR = 0.5     # prev 6h 정상(2/3) 점유 비중
DOWN_MIN_THR = 10          # next 6h에서 (4/5) 점유시간 합이 이 분 이상이면 다운 사건으로 라벨링
DOWN_STATES = {4, 5}
NORMAL = {2, 3}

# 피처 윈도우(과거 패턴)
WINDOWS_HOURS = [6, 24]
FEATURE_EXCLUDE_CURRENT = True
ONLY_NORMAL_SAMPLES = True

BAD_FOR_FEATURE = {1, 4, 5, 9}

def dt_parse(s: str) -> datetime:
    return datetime.fromisoformat(s)

def overlap_seconds(a_start, a_end, b_start, b_end) -> float:
    s = max(a_start, b_start)
    e = min(a_end, b_end)
    if e <= s:
        return 0.0
    return (e - s).total_seconds()

def main():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    rows = cur.execute("""
        SELECT event_at, statId, chgerId, busiId, prev_stat, new_stat
        FROM state_change
        WHERE event_at IS NOT NULL
        ORDER BY statId, chgerId, event_at
    """).fetchall()

    global_max = cur.execute("SELECT MAX(event_at) FROM state_change WHERE event_at IS NOT NULL").fetchone()[0]
    con.close()

    global_max_t = dt_parse(global_max)
    print("global_max_t:", global_max_t, "rows:", len(rows))

    # charger별 시계열
    seq = defaultdict(list)
    for event_at, statId, chgerId, busiId, prev_s, new_s in rows:
        t = dt_parse(event_at)
        seq[(statId, chgerId)].append((t, busiId, int(prev_s), int(new_s)))

    fieldnames = [
        "event_at", "statId", "chgerId", "busiId",
        "prev_stat", "new_stat",
        "gap_minutes",
        "normal_ratio_prev6h",
        "started_down_next6h",
        "down_minutes_next6h",
        "y_down_6h",
        # 6h features
        "n_events_6h", "to_9_6h", "to_1_6h", "to_4_6h", "to_5_6h", "to_bad_6h",
        "from9_to_normal_6h", "from1_to_normal_6h", "bad_to_normal_6h",
        # 24h features
        "n_events_24h", "to_9_24h", "to_1_24h", "to_4_24h", "to_5_24h", "to_bad_24h",
        "from9_to_normal_24h", "from1_to_normal_24h", "bad_to_normal_24h",
    ]

    total_events = 0
    kept = 0
    pos = 0

    with open(OUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()

        for (statId, chgerId), events in seq.items():
            events.sort(key=lambda x: x[0])
            n = len(events)
            if n == 0:
                continue

            times = [e[0] for e in events]
            busis = [e[1] for e in events]
            prevs = [e[2] for e in events]
            news  = [e[3] for e in events]

            # 세그먼트 (start,end,state) state=new_stat이 다음 이벤트까지 유지된다고 가정
            segs = []
            for i in range(n):
                s = times[i]
                e = times[i+1] if i < n-1 else global_max_t
                segs.append((s, e, news[i]))
            first_time = segs[0][0]

            # 피처 카운터
            deques = {h: deque() for h in WINDOWS_HOURS}
            counters = {h: defaultdict(int) for h in WINDOWS_HOURS}

            def add_event(h, t, prev, new):
                dq = deques[h]; cnt = counters[h]
                dq.append((t, prev, new))
                cnt["n_events"] += 1
                if new == 9: cnt["to_9"] += 1
                if new == 1: cnt["to_1"] += 1
                if new == 4: cnt["to_4"] += 1
                if new == 5: cnt["to_5"] += 1
                if new in BAD_FOR_FEATURE: cnt["to_bad"] += 1
                if prev == 9 and new in NORMAL: cnt["from9_to_normal"] += 1
                if prev == 1 and new in NORMAL: cnt["from1_to_normal"] += 1
                if prev in BAD_FOR_FEATURE and new in NORMAL: cnt["bad_to_normal"] += 1

            def expire_old(h, now_t):
                dq = deques[h]; cnt = counters[h]
                cutoff = now_t - timedelta(hours=h)
                while dq and dq[0][0] < cutoff:
                    t0, prev0, new0 = dq.popleft()
                    cnt["n_events"] -= 1
                    if new0 == 9: cnt["to_9"] -= 1
                    if new0 == 1: cnt["to_1"] -= 1
                    if new0 == 4: cnt["to_4"] -= 1
                    if new0 == 5: cnt["to_5"] -= 1
                    if new0 in BAD_FOR_FEATURE: cnt["to_bad"] -= 1
                    if prev0 == 9 and new0 in NORMAL: cnt["from9_to_normal"] -= 1
                    if prev0 == 1 and new0 in NORMAL: cnt["from1_to_normal"] -= 1
                    if prev0 in BAD_FOR_FEATURE and new0 in NORMAL: cnt["bad_to_normal"] -= 1

            prev_time = None

            for i in range(n):
                t = times[i]
                prev = prevs[i]
                new  = news[i]
                busiId = busis[i]
                total_events += 1

                for h in WINDOWS_HOURS:
                    expire_old(h, t)

                # 정상 시점만 샘플
                if ONLY_NORMAL_SAMPLES and (new not in NORMAL):
                    for h in WINDOWS_HOURS:
                        add_event(h, t, prev, new)
                    prev_time = t
                    continue

                # prev/next 윈도우 관측 가능해야 함
                win_prev_start = t - timedelta(hours=PREV_H)
                win_next_end   = t + timedelta(hours=NEXT_H)
                if win_prev_start < first_time or win_next_end > global_max_t:
                    for h in WINDOWS_HOURS:
                        add_event(h, t, prev, new)
                    prev_time = t
                    continue

                gap_minutes = ""
                if prev_time is not None:
                    gap_minutes = int((t - prev_time).total_seconds() / 60)
                prev_time = t

                # prev 6h 정상비중
                normal_sec = 0.0
                for (s, e, st) in segs:
                    if e <= win_prev_start:
                        continue
                    if s >= t:
                        break
                    if st in NORMAL:
                        normal_sec += overlap_seconds(s, e, win_prev_start, t)
                normal_ratio_prev6h = normal_sec / (PREV_H * 3600.0)

                if normal_ratio_prev6h < NORMAL_RATIO_THR:
                    for h in WINDOWS_HOURS:
                        add_event(h, t, prev, new)
                    continue

                # next 6h 다운(4/5) 점유시간 + 다운 시작 여부
                win_next_start = t
                win_next_end   = t + timedelta(hours=NEXT_H)

                down_sec = 0.0
                for (s, e, st) in segs:
                    if e <= win_next_start:
                        continue
                    if s >= win_next_end:
                        break
                    if st in DOWN_STATES:
                        down_sec += overlap_seconds(s, e, win_next_start, win_next_end)
                down_minutes_next6h = int(round(down_sec / 60.0))

                started_down_next6h = 0
                for k in range(i+1, n):
                    if times[k] > win_next_end:
                        break
                    if news[k] in DOWN_STATES and news[k-1] not in DOWN_STATES:
                        started_down_next6h = 1
                        break

                y = 1 if (started_down_next6h == 1 and down_minutes_next6h >= DOWN_MIN_THR) else 0

                # 현재 이벤트 포함 여부
                if not FEATURE_EXCLUDE_CURRENT:
                    for h in WINDOWS_HOURS:
                        add_event(h, t, prev, new)

                row = {
                    "event_at": t.isoformat(),
                    "statId": statId,
                    "chgerId": chgerId,
                    "busiId": busiId,
                    "prev_stat": prev,
                    "new_stat": new,
                    "gap_minutes": gap_minutes,
                    "normal_ratio_prev6h": normal_ratio_prev6h,
                    "started_down_next6h": started_down_next6h,
                    "down_minutes_next6h": down_minutes_next6h,
                    "y_down_6h": y,
                }

                for h in WINDOWS_HOURS:
                    cnt = counters[h]
                    suffix = f"{h}h"
                    row[f"n_events_{suffix}"] = cnt["n_events"]
                    row[f"to_9_{suffix}"] = cnt["to_9"]
                    row[f"to_1_{suffix}"] = cnt["to_1"]
                    row[f"to_4_{suffix}"] = cnt["to_4"]
                    row[f"to_5_{suffix}"] = cnt["to_5"]
                    row[f"to_bad_{suffix}"] = cnt["to_bad"]
                    row[f"from9_to_normal_{suffix}"] = cnt["from9_to_normal"]
                    row[f"from1_to_normal_{suffix}"] = cnt["from1_to_normal"]
                    row[f"bad_to_normal_{suffix}"] = cnt["bad_to_normal"]

                w.writerow(row)
                kept += 1
                pos += y

                if FEATURE_EXCLUDE_CURRENT:
                    for h in WINDOWS_HOURS:
                        add_event(h, t, prev, new)

    print(f"Saved: {OUT_CSV}")
    print("kept_samples:", kept)
    if kept:
        print(f"pos_rate y_down_6h: {pos/kept:.4f} ({pos}/{kept})")
        print("DOWN_MIN_THR:", DOWN_MIN_THR, "NORMAL_RATIO_THR:", NORMAL_RATIO_THR)

if __name__ == "__main__":
    main()
