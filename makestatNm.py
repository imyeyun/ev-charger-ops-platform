import sqlite3
import pandas as pd
from pathlib import Path

# =====================
# 경로
# =====================
BASE = Path(r"C:\Users\User\Desktop\fastapi\app\data\chargerLogSQLite")

SRC_DB = BASE / "evcharger(0202).sqlite"          # 기존 DB
DST_DB = BASE / "evcharger.sqlite"    # 새로 만들 DB
STATION_TSV = BASE / "station.tsv"

# =====================
# 1) station.tsv → 서울 필터
# =====================
df_station = pd.read_csv(STATION_TSV, sep="\t", dtype=str)

df_seoul = df_station[df_station["zcode"] == "11"].copy()

# stat_id → stat_nm 매핑
stat_map = dict(zip(df_seoul["stat_id"], df_seoul["stat_nm"]))

print("서울 충전소 수:", len(stat_map))

# =====================
# 2) 기존 sqlite에서 서울 로그만 읽기
# =====================
conn_src = sqlite3.connect(SRC_DB)

placeholders = ",".join(["?"] * len(stat_map))

query = f"""
SELECT *
FROM state_change
WHERE statId IN ({placeholders})
"""

df_log = pd.read_sql_query(query, conn_src, params=list(stat_map.keys()))
conn_src.close()

print("서울 로그 수:", len(df_log))

# =====================
# 3) stat_nm 컬럼 추가
# =====================
df_log["stat_nm"] = df_log["statId"].map(stat_map)

# =====================
# 4) 새 sqlite로 저장
# =====================
if DST_DB.exists():
    DST_DB.unlink()  # 기존 파일 삭제

conn_dst = sqlite3.connect(DST_DB)

df_log.to_sql("state_change", conn_dst, index=False)

conn_dst.close()

print("서울 전용 SQLite 생성 완료:", DST_DB)
