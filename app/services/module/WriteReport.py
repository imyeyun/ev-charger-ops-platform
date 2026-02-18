import os
import re
import json
import csv
import sqlite3
import hashlib
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from IPython.display import Image, display

# Use a non-GUI backend to avoid Tk thread errors during parallel chart rendering.
import matplotlib
matplotlib.use("Agg", force=True)
import matplotlib.pyplot as plt

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

DEFAULT_DB_PATH = "data/joined_logs.sqlite"
DEFAULT_MULTIMODAL_TSV_PATH = "data/multimodal_analysis.tsv"
DEFAULT_REQUEST_JOINED_TSV_PATH = "data/request_joined.tsv"
DEFAULT_PREPARED_DB_PATH = "artifacts/cache/prepared_logs.sqlite"
DEFAULT_CHART_DIR = "artifacts/charts"

class ReportState(TypedDict, total=False):
    input_prompt: str
    table_of_contents: Dict[str, Any]
    db_path: str
    multimodal_tsv_path: str
    request_joined_tsv_path: str
    prepared_db_path: str
    chart_dir: str
    analysis_start_time: Optional[str]
    analysis_end_time: Optional[str]
    report_llm: Any
    section_agent_llm: Any

    tools: List[Any]
    tool_registry: Dict[str, Any]

    leaf_sections: List[Dict[str, Any]]
    max_tool_steps: int
    max_tool_steps_explicit: bool
    max_concurrency: int
    force_rebuild_prepared: bool

    current_section: Dict[str, Any]
    section_messages: List[Any]
    section_tool_steps: int
    current_tool_logs: List[Dict[str, Any]]
    current_body: str

    section_outputs: List[Dict[str, Any]]
    report_markdown: str


STATUS_CODE_MAP = {
    "9": "알수없음",
    "1": "통신이상",
    "2": "사용가능",
    "3": "충전중",
    "4": "운영중지",
    "5": "점검중",
}

DOMAIN_FIELD_INFO = {
    "station_id": "충전소 ID (statId)",
    "charger_id": "충전기 ID (chgerId)",
    "log_time": "로그 시간(기준 시각)",
    "operator_org": "관리기관(busid_description)",
    "charger_type": "충전기 타입(chgerType_description)",
    "charging_method": "충전 방식(method)",
    "max_output_kw": "충전기 최대출력(output, kW)",
    "status_code": "충전기 상태코드(stat)",
    "status_label": "충전기 상태코드 한글 라벨",
    "last_charge_start_time": "마지막 충전시작 시각(lastTedt)",
    "last_charge_end_time": "마지막 충전종료 시각(lastTsdt)",
    "last_sync_time": "마지막 동기화 시간(statUpdDt)",
    "installed_year": "설치년도(year)",
    "region": "지역 설명(zcode_description)",
    "subregion": "지역 상세 설명(zscode_description)",
    "key_hint": "(station_id, charger_id, log_time)을 복합키처럼 사용해 중복 제거",
}

LOGS_SCHEMA_HINT = [
    "operator_org", "station_id", "charger_id", "charger_type", "charging_method",
    "max_output_kw", "status_code", "status_label", "region", "subregion",
    "installed_year", "log_time", "log_date", "log_month", "log_year",
    "last_charge_start_time", "last_charge_end_time", "last_charge_minutes", "last_sync_time",
]


def strip_numbering(title: str) -> str:
    return re.sub(r"^\d+(?:\.\d+)*\.?\s+", "", title or "").strip()


def markdown_heading_level(title: str, default_level: int) -> int:
    match = re.match(r"^(\d+(?:\.\d+)*)", title or "")
    if not match:
        return default_level
    depth = len(match.group(1).split(".")) + 1
    return max(2, min(6, depth))


def extract_leaf_sections(table_of_contents: Dict[str, Any]) -> List[Dict[str, Any]]:
    leaves: List[Dict[str, Any]] = []

    def walk(node: Dict[str, Any], parents: List[str]) -> None:
        title = str(node.get("title", "")).strip()
        subsections = node.get("subsections") or []
        content = node.get("content")

        if subsections:
            for sub in subsections:
                walk(sub, parents + [title])
            return

        leaves.append({
            "title": title,
            "parents": parents,
            "content": content if isinstance(content, dict) else {},
        })

    for section in table_of_contents.get("sections", []):
        walk(section, [])

    return leaves

def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except Exception:
        return None


def ensure_readonly_sql(sql: str) -> str:
    cleaned = (sql or "").strip().rstrip(";")
    if not cleaned:
        raise ValueError("sql is empty")

    lowered = cleaned.lower()
    if not (lowered.startswith("select") or lowered.startswith("with")):
        raise ValueError("Only SELECT/CTE queries are allowed")

    banned = [
        "insert", "update", "delete", "drop", "alter", "create", "attach", "detach",
        "pragma", "vacuum", "reindex", "replace", "truncate"
    ]
    if any(re.search(rf"\b{token}\b", lowered) for token in banned):
        raise ValueError("Only read-only SELECT queries are allowed")

    if ";" in cleaned:
        raise ValueError("Multiple statements are not allowed")

    return cleaned


def _rewrite_logs_table(sql: str, target_table: str = "logs_prepared") -> str:
    rewritten = sql
    rewritten = re.sub(r"(?i)\bfrom\s+logs_prepared\b", f"FROM {target_table}", rewritten)
    rewritten = re.sub(r"(?i)\bjoin\s+logs_prepared\b", f"JOIN {target_table}", rewritten)
    rewritten = re.sub(r"(?i)\bfrom\s+logs\b", f"FROM {target_table}", rewritten)
    rewritten = re.sub(r"(?i)\bjoin\s+logs\b", f"JOIN {target_table}", rewritten)
    return rewritten


def _normalize_analysis_time(value: Optional[str], is_end: bool) -> Optional[str]:
    if value is None:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    if re.fullmatch(r"\d{8}", raw):
        date_part = datetime.strptime(raw, "%Y%m%d").strftime("%Y-%m-%d")
        return f"{date_part} 23:59:59" if is_end else f"{date_part} 00:00:00"

    if re.fullmatch(r"\d{14}", raw):
        return datetime.strptime(raw, "%Y%m%d%H%M%S").strftime("%Y-%m-%d %H:%M:%S")

    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return f"{raw} 23:59:59" if is_end else f"{raw} 00:00:00"

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue

    raise ValueError(
        "analysis_start_time/analysis_end_time 형식 오류: "
        "YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, YYYYMMDD, YYYYMMDDHHMMSS 중 하나를 사용하세요."
    )


def _escape_sql_text(value: str) -> str:
    return value.replace("'", "''")


def _to_iso_sql(col: str) -> str:
    return (
        f"CASE "
        f"WHEN {col} IS NULL OR TRIM({col})='' THEN NULL "
        f"WHEN LENGTH({col})=19 AND SUBSTR({col},5,1)='-' THEN {col} "
        f"WHEN LENGTH({col})=14 THEN "
        f"SUBSTR({col},1,4)||'-'||SUBSTR({col},5,2)||'-'||SUBSTR({col},7,2)||' '||SUBSTR({col},9,2)||':'||SUBSTR({col},11,2)||':'||SUBSTR({col},13,2) "
        f"ELSE NULL END"
    )


def _source_db_signature(source_db_path: str) -> Dict[str, Any]:
    p = Path(source_db_path)
    if not p.exists():
        raise FileNotFoundError(f"source db not found: {source_db_path}")
    st = p.stat()
    return {
        "source_path": str(p.resolve()),
        "source_size": int(st.st_size),
        "source_mtime_ns": int(st.st_mtime_ns),
    }


def ensure_prepared_db(
    source_db_path: str,
    prepared_db_path: str = DEFAULT_PREPARED_DB_PATH,
    force_refresh: bool = False,
) -> str:
    sig = _source_db_signature(source_db_path)
    prepared = Path(prepared_db_path)
    prepared.parent.mkdir(parents=True, exist_ok=True)

    if prepared.exists() and (not force_refresh):
        try:
            with sqlite3.connect(prepared) as conn:
                table_ok = conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='logs_prepared'"
                ).fetchone()
                meta_ok = conn.execute(
                    "SELECT source_size, source_mtime_ns FROM cache_meta WHERE id=1"
                ).fetchone()
                if table_ok and meta_ok:
                    if int(meta_ok[0]) == sig["source_size"] and int(meta_ok[1]) == sig["source_mtime_ns"]:
                        return str(prepared)
        except Exception:
            pass

    log_time_iso = _to_iso_sql("log_time")
    last_tedt_iso = _to_iso_sql("lastTedt")
    last_tsdt_iso = _to_iso_sql("lastTsdt")
    stat_upd_iso = _to_iso_sql("statUpdDt")

    with sqlite3.connect(prepared) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("DROP TABLE IF EXISTS logs_prepared")
        conn.execute("DROP TABLE IF EXISTS cache_meta")

        conn.execute("ATTACH DATABASE ? AS src", (str(Path(source_db_path).resolve()),))

        conn.execute(
            f"""
            CREATE TABLE logs_prepared AS
            WITH normalized AS (
                SELECT
                    busid_description AS operator_org,
                    COALESCE(statId, '') AS station_id,
                    COALESCE(chgerId, '') AS charger_id,
                    chgerType_description AS charger_type,
                    method AS charging_method,
                    CAST(output AS REAL) AS max_output_kw,
                    COALESCE(stat, '9') AS status_code,
                    CASE COALESCE(stat, '9')
                        WHEN '1' THEN '통신이상'
                        WHEN '2' THEN '사용가능'
                        WHEN '3' THEN '충전중'
                        WHEN '4' THEN '운영중지'
                        WHEN '5' THEN '점검중'
                        ELSE '알수없음'
                    END AS status_label,
                    CAST(year AS INTEGER) AS installed_year,
                    zcode_description AS region,
                    zscode_description AS subregion,
                    {log_time_iso} AS log_time,
                    {last_tedt_iso} AS last_charge_start_time,
                    {last_tsdt_iso} AS last_charge_end_time,
                    {stat_upd_iso} AS last_sync_time,
                    statUpdDt AS last_sync_raw
                FROM src.logs
            ),
            dedup AS (
                SELECT *
                FROM (
                    SELECT
                        n.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY station_id, charger_id, log_time
                            ORDER BY COALESCE(last_sync_time, log_time) DESC, COALESCE(last_sync_raw, '') DESC
                        ) AS rn
                    FROM normalized n
                    WHERE log_time IS NOT NULL
                )
                WHERE rn = 1
            )
            SELECT
                operator_org,
                station_id,
                charger_id,
                charger_type,
                charging_method,
                max_output_kw,
                status_code,
                status_label,
                installed_year,
                region,
                subregion,
                log_time,
                SUBSTR(log_time, 1, 10) AS log_date,
                SUBSTR(log_time, 1, 7) AS log_month,
                CAST(STRFTIME('%Y', log_time) AS INTEGER) AS log_year,
                last_charge_start_time,
                last_charge_end_time,
                CASE
                    WHEN last_charge_start_time IS NOT NULL AND last_charge_end_time IS NOT NULL
                    THEN ROUND((JULIANDAY(last_charge_end_time) - JULIANDAY(last_charge_start_time)) * 24 * 60, 2)
                    ELSE NULL
                END AS last_charge_minutes,
                last_sync_time
            FROM dedup
            """
        )

        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_log_date ON logs_prepared(log_date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_log_month ON logs_prepared(log_month)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_log_year ON logs_prepared(log_year)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_region ON logs_prepared(region)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_subregion ON logs_prepared(subregion)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_status ON logs_prepared(status_label)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_station ON logs_prepared(station_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lp_station_charger ON logs_prepared(station_id, charger_id)")

        conn.execute("DETACH DATABASE src")

        conn.execute(
            """
            CREATE TABLE cache_meta (
                id INTEGER PRIMARY KEY,
                source_path TEXT,
                source_size INTEGER,
                source_mtime_ns INTEGER,
                prepared_at TEXT
            )
            """
        )
        conn.execute(
            "INSERT INTO cache_meta (id, source_path, source_size, source_mtime_ns, prepared_at) VALUES (1, ?, ?, ?, ?)",
            (
                sig["source_path"],
                sig["source_size"],
                sig["source_mtime_ns"],
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    return str(prepared)


def execute_sql_readonly(
    db_path: str,
    sql: str,
    limit: int = 200,
    analysis_start_time: Optional[str] = None,
    analysis_end_time: Optional[str] = None,
) -> List[Dict[str, Any]]:
    safe_sql = ensure_readonly_sql(sql)
    safe_limit = max(1, min(int(limit), 2000))

    start_iso = _normalize_analysis_time(analysis_start_time, is_end=False)
    end_iso = _normalize_analysis_time(analysis_end_time, is_end=True)
    if start_iso and end_iso and start_iso > end_iso:
        raise ValueError("analysis_start_time 이 analysis_end_time 보다 늦습니다.")

    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.row_factory = sqlite3.Row

        rewritten_sql = safe_sql
        if start_iso or end_iso:
            conds: List[str] = []
            if start_iso:
                conds.append(f"log_time >= '{_escape_sql_text(start_iso)}'")
            if end_iso:
                conds.append(f"log_time <= '{_escape_sql_text(end_iso)}'")
            where_clause = " AND ".join(conds)
            conn.execute("DROP VIEW IF EXISTS logs_scope")
            conn.execute(f"CREATE TEMP VIEW logs_scope AS SELECT * FROM logs_prepared WHERE {where_clause}")
            rewritten_sql = _rewrite_logs_table(safe_sql, target_table="logs_scope")
        else:
            rewritten_sql = _rewrite_logs_table(safe_sql, target_table="logs_prepared")

        wrapped_sql = f"SELECT * FROM ({rewritten_sql}) AS _sub LIMIT {safe_limit}"
        rows = conn.execute(wrapped_sql).fetchall()

    return [dict(row) for row in rows]


def _stable_chart_path(section_title: str, chart_title: str, chart_type: str, chart_dir: str) -> Path:
    normalized_chart_dir = str(chart_dir or DEFAULT_CHART_DIR).replace("\\", "/")
    Path(normalized_chart_dir).mkdir(parents=True, exist_ok=True)
    seed = f"{section_title}|{chart_title}|{chart_type}"
    digest = hashlib.md5(seed.encode("utf-8")).hexdigest()[:8]
    slug = re.sub(r"[^0-9A-Za-z_-]+", "_", section_title).strip("_") or "section"
    return Path(normalized_chart_dir) / f"{slug}_{digest}_{chart_type}.png"


_KOREAN_FONT_READY = False
_KOREAN_FONT_NAME: Optional[str] = None


def _configure_matplotlib_korean_font() -> Optional[str]:
    global _KOREAN_FONT_READY, _KOREAN_FONT_NAME
    if _KOREAN_FONT_READY:
        return _KOREAN_FONT_NAME

    if plt is None:
        _KOREAN_FONT_READY = True
        _KOREAN_FONT_NAME = None
        return None

    try:
        from matplotlib import font_manager
    except Exception:
        plt.rcParams["axes.unicode_minus"] = False
        _KOREAN_FONT_READY = True
        _KOREAN_FONT_NAME = None
        return None

    candidate_names = [
        "NanumGothic",
        "Noto Sans CJK KR",
        "Noto Sans KR",
        "Malgun Gothic",
        "AppleGothic",
        "Arial Unicode MS",
    ]
    available_names = {f.name for f in font_manager.fontManager.ttflist}
    selected_name: Optional[str] = None

    for name in candidate_names:
        if name in available_names:
            selected_name = name
            break

    if selected_name is None:
        candidate_paths = [
            "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.otf",
        ]
        for path in candidate_paths:
            p = Path(path)
            if not p.exists():
                continue
            try:
                font_manager.fontManager.addfont(str(p))
                prop = font_manager.FontProperties(fname=str(p))
                selected_name = prop.get_name()
                break
            except Exception:
                continue

    if selected_name:
        plt.rcParams["font.family"] = selected_name
    plt.rcParams["axes.unicode_minus"] = False
    _KOREAN_FONT_READY = True
    _KOREAN_FONT_NAME = selected_name
    return selected_name


def _pick_chart_spec(section_focus: str, section_title: str = "") -> Dict[str, Any]:
    text = f"{section_focus or ''} {section_title or ''}".strip()

    if any(word in text for word in ["우선 조치", "우선조치", "대상 지역", "대상 충전소"]):
        return {
            "sql": (
                "SELECT region || ' / ' || COALESCE(NULLIF(subregion, ''), '상세지역 미상') AS target, "
                "ROUND(100.0 * AVG(CASE WHEN status_code IN ('1','4','5','9') THEN 1.0 ELSE 0.0 END), 2) AS risk_score "
                "FROM logs_prepared "
                "GROUP BY region, subregion "
                "HAVING COUNT(*) >= 3 "
                "ORDER BY risk_score DESC, COUNT(*) DESC "
                "LIMIT 20"
            ),
            "x_key": "target",
            "y_key": "risk_score",
            "chart_type": "bar",
            "title": "우선 조치 대상 위험 점수",
        }

    if any(word in text for word in ["위험", "리스크", "고장", "안전"]):
        return {
            "sql": (
                "SELECT region, "
                "ROUND(100.0 * AVG(CASE WHEN status_code IN ('1','4','5','9') THEN 1.0 ELSE 0.0 END), 2) AS risk_score "
                "FROM logs_prepared "
                "GROUP BY region "
                "ORDER BY risk_score DESC"
            ),
            "x_key": "region",
            "y_key": "risk_score",
            "chart_type": "bar",
            "title": "지역별 위험 점수",
        }

    if any(word in text for word in ["가동률", "상태"]):
        return {
            "sql": (
                "SELECT log_date, "
                "ROUND(100.0 * AVG(CASE WHEN status_code IN ('2','3') THEN 1.0 ELSE 0.0 END), 2) AS utilization_rate_pct "
                "FROM logs_prepared "
                "GROUP BY log_date "
                "ORDER BY log_date"
            ),
            "x_key": "log_date",
            "y_key": "utilization_rate_pct",
            "chart_type": "line",
            "title": "일자별 가동률(%)",
        }

    if any(word in text for word in ["이용", "사용량", "충전 이용"]):
        return {
            "sql": (
                "SELECT log_date, "
                "SUM(CASE WHEN last_charge_start_time IS NOT NULL THEN 1 ELSE 0 END) AS charge_start_count "
                "FROM logs_prepared "
                "GROUP BY log_date "
                "ORDER BY log_date"
            ),
            "x_key": "log_date",
            "y_key": "charge_start_count",
            "chart_type": "line",
            "title": "일자별 충전 시작 기록 수",
        }

    if any(word in text for word in ["인프라", "충전소", "충전기", "변화 추이", "추세", "기간별 변화"]):
        return {
            "sql": (
                "SELECT log_date, "
                "COUNT(DISTINCT station_id) AS station_count, "
                "COUNT(DISTINCT station_id || '|' || charger_id) AS charger_count "
                "FROM logs_prepared "
                "GROUP BY log_date "
                "ORDER BY log_date"
            ),
            "x_key": "log_date",
            "y_key": "charger_count",
            "chart_type": "line",
            "title": "일자별 충전기 수 추이",
        }

    if any(word in text for word in ["분석 범위", "지역", "기간"]):
        return {
            "sql": (
                "SELECT region, COUNT(*) AS record_count "
                "FROM logs_prepared "
                "GROUP BY region "
                "ORDER BY record_count DESC"
            ),
            "x_key": "region",
            "y_key": "record_count",
            "chart_type": "bar",
            "title": "지역별 데이터 건수",
        }

    return {
        "sql": (
            "SELECT log_date, COUNT(*) AS record_count "
            "FROM logs_prepared "
            "GROUP BY log_date "
            "ORDER BY log_date"
        ),
        "x_key": "log_date",
        "y_key": "record_count",
        "chart_type": "line",
        "title": "일자별 로그 건수",
    }


def _infer_chart_axes(rows: List[Dict[str, Any]]) -> Optional[Dict[str, str]]:
    if not rows:
        return None
    cols = list(rows[0].keys())
    numeric_cols: List[str] = []
    for col in cols:
        numeric_count = 0
        for row in rows:
            if _to_float(row.get(col)) is not None:
                numeric_count += 1
        if numeric_count >= max(3, len(rows) // 2):
            numeric_cols.append(col)

    x_key = None
    for col in cols:
        if col not in numeric_cols:
            x_key = col
            break
    if x_key is None and cols:
        x_key = cols[0]

    y_key = numeric_cols[0] if numeric_cols else None
    if y_key is None or x_key is None:
        return None

    return {"x_key": x_key, "y_key": y_key}


def _contains_non_ascii(text: str) -> bool:
    return any(ord(ch) > 127 for ch in text)


def _alias_non_ascii_labels(values: List[str]) -> Dict[str, Any]:
    aliased: List[str] = []
    mapping: List[Dict[str, str]] = []
    for idx, value in enumerate(values, start=1):
        label = value or ""
        if _contains_non_ascii(label):
            alias = f"C{idx}"
            aliased.append(alias)
            mapping.append({"alias": alias, "original": label})
        else:
            aliased.append(label)
    return {"values": aliased, "mapping": mapping}


def _make_markdown_table(rows: List[Dict[str, Any]], max_rows: int = 20) -> str:
    if not rows:
        return "(empty result)"

    cols = list(rows[0].keys())
    sample = rows[:max_rows]

    header = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join(["---"] * len(cols)) + " |"
    body = []
    for row in sample:
        vals = [str(row.get(c, "")) for c in cols]
        body.append("| " + " | ".join(vals) + " |")

    return "\n".join([header, sep] + body)


def _top_counts(rows: List[Dict[str, Any]], column: str, top_k: int = 10) -> List[Dict[str, Any]]:
    from collections import Counter

    counter = Counter()
    for row in rows:
        val = row.get(column)
        if val is None or str(val).strip() == "":
            continue
        counter[str(val)] += 1

    return [{"value": key, "count": count} for key, count in counter.most_common(top_k)]


def _numeric_summary(rows: List[Dict[str, Any]], max_cols: int = 8) -> Dict[str, Dict[str, float]]:
    out: Dict[str, Dict[str, float]] = {}
    if not rows:
        return out

    cols = list(rows[0].keys())
    for col in cols:
        values = []
        for row in rows:
            val = _to_float(row.get(col))
            if val is not None:
                values.append(val)
        if len(values) < 3:
            continue

        out[col] = {
            "min": min(values),
            "max": max(values),
            "mean": round(sum(values) / len(values), 4),
        }
        if len(out) >= max_cols:
            break

    return out


def _time_window(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    for key in ["log_time", "log_date", "log_month"]:
        vals = [str(r.get(key)) for r in rows if r.get(key)]
        if vals:
            return {
                "time_key": key,
                "min": min(vals),
                "max": max(vals),
                "distinct_count": len(set(vals)),
            }
    return {}


def _build_processed_payload(rows: List[Dict[str, Any]], sql: str, used_auto_sql: bool) -> Dict[str, Any]:
    cols = list(rows[0].keys()) if rows else []

    payload: Dict[str, Any] = {
        "ok": True,
        "used_auto_sql": used_auto_sql,
        "sql": sql,
        "row_count": len(rows),
        "columns": cols,
        "domain_info": DOMAIN_FIELD_INFO,
        "time_window": _time_window(rows),
        "numeric_summary": _numeric_summary(rows),
    }

    if "status_label" in cols:
        payload["status_distribution_top"] = _top_counts(rows, "status_label", top_k=8)
    if "region" in cols:
        payload["region_distribution_top"] = _top_counts(rows, "region", top_k=10)
    if "subregion" in cols:
        payload["subregion_distribution_top"] = _top_counts(rows, "subregion", top_k=10)

    row_level_shape = {"station_id", "charger_id", "log_time"}.issubset(set(cols))
    if row_level_shape:
        keys = {f"{r.get('station_id')}|{r.get('charger_id')}|{r.get('log_time')}" for r in rows}
        payload["composite_key_uniqueness"] = {
            "composite_key": "station_id + charger_id + log_time",
            "unique_keys": len(keys),
            "duplicate_rows": max(0, len(rows) - len(keys)),
        }
        payload["rollup_by_log_date_top"] = _top_counts(rows, "log_date", top_k=10) if "log_date" in cols else []
        payload["rollup_by_status_top"] = _top_counts(rows, "status_label", top_k=10) if "status_label" in cols else []

    payload["preview"] = [] if row_level_shape else rows[:20]
    payload["row_level_data_exposed"] = not row_level_shape
    return payload


def _auto_focus_sql(section_focus: str) -> str:
    focus = (section_focus or "").strip()

    if ("지역" in focus) and any(w in focus for w in ["비교", "분포", "위험"]):
        return (
            "SELECT region, subregion, log_date, COUNT(*) AS record_count, "
            "COUNT(DISTINCT station_id || '|' || charger_id) AS charger_count "
            "FROM logs_prepared "
            "GROUP BY region, subregion, log_date "
            "ORDER BY log_date DESC, record_count DESC"
        )

    if any(w in focus for w in ["가동률", "상태"]):
        return (
            "SELECT log_date, status_label, COUNT(*) AS record_count "
            "FROM logs_prepared "
            "GROUP BY log_date, status_label "
            "ORDER BY log_date DESC, record_count DESC"
        )

    if any(w in focus for w in ["인프라", "충전소", "충전기", "이용", "추세", "기간"]):
        return (
            "SELECT log_date, "
            "COUNT(*) AS record_count, "
            "COUNT(DISTINCT station_id) AS station_count, "
            "COUNT(DISTINCT station_id || '|' || charger_id) AS charger_count "
            "FROM logs_prepared "
            "GROUP BY log_date "
            "ORDER BY log_date DESC"
        )

    return (
        "SELECT log_date, COUNT(*) AS record_count "
        "FROM logs_prepared "
        "GROUP BY log_date "
        "ORDER BY log_date DESC"
    )


@tool("query_logs_sql")
def query_logs_sql_tool(
    sql: str = "",
    section_focus: str = "",
    limit: int = 200,
    db_path: str = DEFAULT_PREPARED_DB_PATH,
    analysis_start_time: Optional[str] = None,
    analysis_end_time: Optional[str] = None,
) -> str:
    """
    Run read-only SQL on logs_prepared and return processed summary.
    sql이 비어 있으면 section_focus 기준 자동 집계를 수행한다.
    """
    used_auto_sql = False
    target_sql = (sql or "").strip()
    if not target_sql:
        target_sql = _auto_focus_sql(section_focus)
        used_auto_sql = True

    rows = execute_sql_readonly(
        db_path=db_path,
        sql=target_sql,
        limit=limit,
        analysis_start_time=analysis_start_time,
        analysis_end_time=analysis_end_time,
    )
    payload = _build_processed_payload(rows=rows, sql=target_sql, used_auto_sql=used_auto_sql)
    payload["analysis_window"] = {
        "start_time": _normalize_analysis_time(analysis_start_time, is_end=False),
        "end_time": _normalize_analysis_time(analysis_end_time, is_end=True),
    }
    return json.dumps(payload, ensure_ascii=False)


@tool("create_chart")
def create_chart_tool(
    sql: str = "",
    x_key: str = "",
    y_key: str = "",
    chart_type: str = "auto",
    title: str = "analysis",
    section_title: str = "section",
    section_focus: str = "",
    db_path: str = DEFAULT_PREPARED_DB_PATH,
    chart_dir: str = DEFAULT_CHART_DIR,
    limit: int = 500,
    analysis_start_time: Optional[str] = None,
    analysis_end_time: Optional[str] = None,
) -> str:
    """
    Create a chart image from SQL result.
    - sql/x_key/y_key가 비어 있으면 section_focus/section_title 기반 자동 사양을 사용한다.
    """
    auto_spec = _pick_chart_spec(section_focus=section_focus, section_title=section_title)

    target_sql = (sql or "").strip() or auto_spec["sql"]
    target_x_key = (x_key or "").strip() or auto_spec["x_key"]
    target_y_key = (y_key or "").strip() or auto_spec["y_key"]
    target_chart_type = (chart_type or "").strip().lower()
    if target_chart_type == "auto":
        target_chart_type = auto_spec["chart_type"]
    target_title = (title or "").strip()
    if not target_title or target_title == "analysis":
        target_title = auto_spec["title"]

    window_start = _normalize_analysis_time(analysis_start_time, is_end=False)
    window_end = _normalize_analysis_time(analysis_end_time, is_end=True)

    rows = execute_sql_readonly(
        db_path=db_path,
        sql=target_sql,
        limit=limit,
        analysis_start_time=window_start,
        analysis_end_time=window_end,
    )
    if not rows:
        return json.dumps({"ok": False, "error": "empty result", "chart_path": None}, ensure_ascii=False)

    if target_x_key not in rows[0] or target_y_key not in rows[0]:
        inferred = _infer_chart_axes(rows)
        if inferred is None:
            return json.dumps(
                {
                    "ok": False,
                    "error": f"x_key or y_key not found: {target_x_key}, {target_y_key}",
                    "columns": list(rows[0].keys()),
                    "chart_path": None,
                },
                ensure_ascii=False,
            )
        target_x_key = inferred["x_key"]
        target_y_key = inferred["y_key"]

    if target_chart_type not in {"bar", "line"}:
        target_chart_type = "line" if len(rows) > 25 else "bar"

    if target_chart_type == "bar" and len(rows) > 40:
        rows = rows[:40]

    x = [str(r.get(target_x_key, "")) for r in rows]
    y = [(_to_float(r.get(target_y_key)) or 0.0) for r in rows]

    chart_path = _stable_chart_path(
        section_title=section_title,
        chart_title=target_title,
        chart_type=target_chart_type,
        chart_dir=chart_dir,
    )

    if plt is None:
        return json.dumps({"ok": False, "error": "matplotlib is unavailable", "chart_path": None}, ensure_ascii=False)

    warnings: List[str] = []
    font_name = _configure_matplotlib_korean_font()
    category_alias_mapping: List[Dict[str, str]] = []
    if font_name is None:
        alias_result = _alias_non_ascii_labels(x)
        x = alias_result["values"]
        category_alias_mapping = alias_result["mapping"]
        if _contains_non_ascii(target_title):
            target_title = f"{target_y_key} by {target_x_key}"
        warnings.append("한글 폰트가 없어 축 라벨을 영문 코드(C1, C2...)로 대체했습니다.")

    fig, ax = plt.subplots(figsize=(10, 4))
    if target_chart_type == "line":
        ax.plot(x, y, marker="o", linewidth=1.8)
    else:
        ax.bar(x, y)

    ax.set_title(target_title)
    ax.set_ylabel(target_y_key)
    ax.tick_params(axis="x", rotation=35)
    fig.tight_layout()
    fig.savefig(chart_path, dpi=130, bbox_inches="tight")
    plt.close(fig)

    summary = {
        "total": sum(y),
        "max_value": max(y),
        "max_category": x[max(range(len(y)), key=lambda i: y[i])],
        "points": len(y),
    }

    lowered = target_sql.lower()
    if "installed_year" in lowered and any(k in (target_title + section_title) for k in ["추이", "기간", "trend"]):
        warnings.append("기간 추이는 installed_year 대신 log_date/log_month/log_year 사용을 권장합니다.")

    signature_seed = "|".join([
        target_sql.strip(),
        target_x_key,
        target_y_key,
        target_chart_type,
        window_start or "",
        window_end or "",
    ])
    chart_signature = hashlib.md5(signature_seed.encode("utf-8")).hexdigest()[:16]

    return json.dumps(
        {
            "ok": True,
            "chart_path": chart_path.as_posix(),
            "chart_signature": chart_signature,
            "chart_type": target_chart_type,
            "title": target_title,
            "x_key": target_x_key,
            "y_key": target_y_key,
            "sql": target_sql,
            "summary": summary,
            "warnings": warnings,
            "font_name": font_name,
            "category_alias_mapping": category_alias_mapping[:80],
            "analysis_window": {
                "start_time": window_start,
                "end_time": window_end,
            },
        },
        ensure_ascii=False,
    )


@tool("create_table")
def create_table_tool(
    sql: str,
    limit: int = 20,
    db_path: str = DEFAULT_PREPARED_DB_PATH,
    analysis_start_time: Optional[str] = None,
    analysis_end_time: Optional[str] = None,
) -> str:
    """Run SQL and render a markdown table for quick reporting."""
    rows = execute_sql_readonly(
        db_path=db_path,
        sql=sql,
        limit=limit,
        analysis_start_time=analysis_start_time,
        analysis_end_time=analysis_end_time,
    )
    table_md = _make_markdown_table(rows, max_rows=limit)

    return json.dumps(
        {
            "ok": True,
            "row_count": len(rows),
            "columns": list(rows[0].keys()) if rows else [],
            "table_markdown": table_md,
            "analysis_window": {
                "start_time": _normalize_analysis_time(analysis_start_time, is_end=False),
                "end_time": _normalize_analysis_time(analysis_end_time, is_end=True),
            },
        },
        ensure_ascii=False,
    )


def _read_tsv_rows(tsv_path: str) -> Dict[str, Any]:
    p = Path(tsv_path)
    if not p.exists():
        raise FileNotFoundError(f"TSV file not found: {tsv_path}")

    with p.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh, delimiter="\t")
        cols = list(reader.fieldnames or [])
        rows: List[Dict[str, str]] = []
        for row in reader:
            rows.append({col: str((row.get(col) or "")).strip() for col in cols})

    return {"columns": cols, "rows": rows}


def _normalize_binary_flag(value: str) -> Optional[int]:
    s = str(value or "").strip()
    if s in {"\x00", "0", "false", "False", "FALSE", "N", "n"}:
        return 0
    if s in {"\x01", "1", "true", "True", "TRUE", "Y", "y"}:
        return 1
    if s.upper() in {"NULL", "NONE", ""}:
        return None
    return None


def _parse_datetime_loose(value: str) -> Optional[datetime]:
    s = str(value or "").strip()
    if not s:
        return None

    candidates = [
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ]
    for fmt in candidates:
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass

    m = re.match(r"^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})$", s)
    if m:
        hh = m.group(2).zfill(2)
        normalized = f"{m.group(1)} {hh}:{m.group(3)}"
        try:
            return datetime.strptime(normalized, "%Y-%m-%d %H:%M")
        except Exception:
            return None
    return None


def _datetime_span(rows: List[Dict[str, str]], col: str) -> Dict[str, Any]:
    parsed = [_parse_datetime_loose(row.get(col, "")) for row in rows]
    values = [v for v in parsed if v is not None]
    if not values:
        return {}
    return {
        "column": col,
        "min": min(values).strftime("%Y-%m-%d %H:%M:%S"),
        "max": max(values).strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(values),
    }


@tool("query_multimodal_tsv")
def query_multimodal_tsv_tool(
    section_focus: str = "",
    stat_id: str = "",
    chger_id: str = "",
    limit: int = 200,
    tsv_path: str = DEFAULT_MULTIMODAL_TSV_PATH,
) -> str:
    """
    multimodal_analysis.tsv를 읽어 오염/화재/고장 관련 요약 통계를 제공한다.
    """
    data = _read_tsv_rows(tsv_path)
    rows: List[Dict[str, str]] = data["rows"]
    cols: List[str] = data["columns"]

    target_rows = rows
    if stat_id:
        target_rows = [r for r in target_rows if r.get("stat_id", "") == stat_id]
    if chger_id:
        target_rows = [r for r in target_rows if r.get("chger_id", "") == chger_id]

    fire_yes = 0
    dirty_yes = 0
    broke_yes = 0
    fire_null = 0
    dirty_null = 0
    broke_null = 0

    station_counter: Dict[str, int] = {}
    for row in target_rows:
        s = row.get("stat_id", "")
        if s:
            station_counter[s] = station_counter.get(s, 0) + 1

        fire = _normalize_binary_flag(row.get("fire_yn", ""))
        dirty = _normalize_binary_flag(row.get("dirty_yn", ""))
        broke = _normalize_binary_flag(row.get("broke_yn", ""))

        if fire is None:
            fire_null += 1
        elif fire == 1:
            fire_yes += 1
        if dirty is None:
            dirty_null += 1
        elif dirty == 1:
            dirty_yes += 1
        if broke is None:
            broke_null += 1
        elif broke == 1:
            broke_yes += 1

    top_station = sorted(station_counter.items(), key=lambda x: x[1], reverse=True)[:10]
    notes_samples = []
    seen_notes = set()
    for row in target_rows:
        note = row.get("notes", "")
        if not note or note in seen_notes:
            continue
        seen_notes.add(note)
        notes_samples.append(note)
        if len(notes_samples) >= 5:
            break

    safe_limit = max(1, min(int(limit), 200))
    preview = target_rows[:safe_limit]

    payload = {
        "ok": True,
        "dataset": "multimodal_analysis",
        "tsv_path": tsv_path,
        "section_focus": section_focus,
        "row_count": len(target_rows),
        "columns": cols,
        "filters": {
            "stat_id": stat_id or None,
            "chger_id": chger_id or None,
        },
        "flag_summary": {
            "fire_yes_count": fire_yes,
            "fire_null_count": fire_null,
            "dirty_yes_count": dirty_yes,
            "dirty_null_count": dirty_null,
            "broke_yes_count": broke_yes,
            "broke_null_count": broke_null,
        },
        "time_span_img_time": _datetime_span(target_rows, "img_time"),
        "time_span_imgsensoranal_time": _datetime_span(target_rows, "imgsensoranal_time"),
        "top_station_ids": [{"stat_id": k, "count": v} for k, v in top_station],
        "notes_samples": notes_samples,
        "preview": preview,
    }
    return json.dumps(payload, ensure_ascii=False)


@tool("query_request_joined_tsv")
def query_request_joined_tsv_tool(
    section_focus: str = "",
    req_type: str = "",
    status: str = "",
    stat_id: str = "",
    chger_id: str = "",
    answered: str = "all",
    limit: int = 200,
    tsv_path: str = DEFAULT_REQUEST_JOINED_TSV_PATH,
) -> str:
    """
    request_joined.tsv를 읽어 민원/답변 상태를 요약한다.
    answered: all|answered|unanswered
    """
    data = _read_tsv_rows(tsv_path)
    rows: List[Dict[str, str]] = data["rows"]
    cols: List[str] = data["columns"]

    target_rows = rows
    if req_type:
        target_rows = [r for r in target_rows if r.get("req_type", "") == req_type]
    if status:
        target_rows = [r for r in target_rows if r.get("status", "") == status]
    if stat_id:
        target_rows = [r for r in target_rows if r.get("stat_id", "") == stat_id]
    if chger_id:
        target_rows = [r for r in target_rows if r.get("chger_id", "") == chger_id]

    answered_mode = str(answered or "all").strip().lower()
    if answered_mode in {"answered", "yes", "true"}:
        target_rows = [r for r in target_rows if r.get("answer", "").strip() != ""]
    elif answered_mode in {"unanswered", "no", "false"}:
        target_rows = [r for r in target_rows if r.get("answer", "").strip() == ""]

    req_type_counter: Dict[str, int] = {}
    status_counter: Dict[str, int] = {}
    for row in target_rows:
        t = row.get("req_type", "")
        s = row.get("status", "")
        req_type_counter[t] = req_type_counter.get(t, 0) + 1
        status_counter[s] = status_counter.get(s, 0) + 1

    answered_count = sum(1 for r in target_rows if r.get("answer", "").strip() != "")
    unanswered_count = len(target_rows) - answered_count

    response_minutes: List[float] = []
    for row in target_rows:
        req_t = _parse_datetime_loose(row.get("req_dt", ""))
        ans_t = _parse_datetime_loose(row.get("answer_dt", ""))
        if req_t is None or ans_t is None:
            continue
        delta = (ans_t - req_t).total_seconds() / 60.0
        if delta >= 0:
            response_minutes.append(delta)

    response_summary: Dict[str, Any] = {}
    if response_minutes:
        response_summary = {
            "count": len(response_minutes),
            "min_minutes": round(min(response_minutes), 2),
            "max_minutes": round(max(response_minutes), 2),
            "avg_minutes": round(sum(response_minutes) / len(response_minutes), 2),
        }

    safe_limit = max(1, min(int(limit), 200))
    preview = target_rows[:safe_limit]

    payload = {
        "ok": True,
        "dataset": "request_joined",
        "tsv_path": tsv_path,
        "section_focus": section_focus,
        "row_count": len(target_rows),
        "columns": cols,
        "filters": {
            "req_type": req_type or None,
            "status": status or None,
            "stat_id": stat_id or None,
            "chger_id": chger_id or None,
            "answered": answered_mode,
        },
        "answered_count": answered_count,
        "unanswered_count": unanswered_count,
        "req_type_distribution": [{"req_type": k, "count": v} for k, v in sorted(req_type_counter.items(), key=lambda x: x[1], reverse=True)],
        "status_distribution": [{"status": k, "count": v} for k, v in sorted(status_counter.items(), key=lambda x: x[1], reverse=True)],
        "time_span_req_dt": _datetime_span(target_rows, "req_dt"),
        "time_span_answer_dt": _datetime_span(target_rows, "answer_dt"),
        "response_time_minutes": response_summary,
        "preview": preview,
    }
    return json.dumps(payload, ensure_ascii=False)


def build_tools() -> List[Any]:
    return [
        query_logs_sql_tool,
        create_chart_tool,
        create_table_tool,
        query_multimodal_tsv_tool,
        query_request_joined_tsv_tool,
    ]


def build_tool_registry(tools: List[Any]) -> Dict[str, Any]:
    return {tool_obj.name: tool_obj for tool_obj in tools}

SECTION_AGENT_SYSTEM_PROMPT = """
너는 전기차 충전소 운영 보고서의 섹션 작성 에이전트다.
가능하면 근거 기반으로 작성하고, 필요 시 도구를 여러 번 호출해도 된다.

[도구 사용 원칙]
- 통계/비교/추이/분포가 필요하면 query_logs_sql을 호출한다.
- query_logs_sql/create_chart/create_table은 logs_prepared 기준으로 동작한다.
- 멀티모달(화재/오염/고장) 참고가 필요하면 query_multimodal_tsv를 호출한다.
- 민원/답변 현황 참고가 필요하면 query_request_joined_tsv를 호출한다.
- state에 analysis_start_time/analysis_end_time 이 있으면 해당 구간으로 자동 필터링된다.
- 섹션 정보에서 그래프 필요(`needs_graph=True`)면 create_chart를 최소 1회 호출한다.
- create_chart는 sql/x_key/y_key를 생략하고 section_focus/section_title만으로도 호출 가능하다.
- 같은 섹션에서 create_chart를 여러 번 호출할 때는 동일 SQL/축 조합을 반복하지 않는다.
- 기간 추이는 반드시 log_time/log_date/log_month/log_year를 우선 사용한다.
- installed_year는 설치연도이므로 운영 시계열 추이의 기준으로 쓰지 않는다.
- 충분한 근거가 모이면 도구 호출을 멈추고 본문 Markdown을 작성한다.

[제약]
- SQL은 SELECT 또는 CTE(읽기전용)만 사용한다.
- 최종 답변은 제목 없이 본문만 작성한다.
"""

SECTION_SYNTH_PROMPT = ChatPromptTemplate.from_template(
    """
너는 전기차 충전소 운영 보고서 작성자다.
아래 섹션 정보와 도구 결과를 바탕으로, 해당 섹션 본문만 Markdown으로 작성하라.

[규칙]
- 제목은 작성하지 말고 본문만 작성
- 2~4개 단락 또는 짧은 bullet로 구성
- 과장 없이 실무 보고서 문체 유지
- 도구 결과에서 유효한 수치/비교를 반영

[섹션 제목]
{section_title}

[요약]
{summary}

[key_points]
{key_points}

[도구 실행 로그]
{tool_logs}
"""
)


def create_report_llm(model_name: str = "gpt-4.1-mini") -> Optional[Any]:
    if not os.environ.get("OPENAI_API_KEY"):
        return None
    try:
        return ChatOpenAI(model_name=model_name, temperature=0.2)
    except Exception:
        return None


def create_agent_llm_with_tools(tools: List[Any], model_name: str = "gpt-4.1-mini") -> Optional[Any]:
    if not os.environ.get("OPENAI_API_KEY"):
        return None
    try:
        return ChatOpenAI(model_name=model_name, temperature=0).bind_tools(tools)
    except Exception:
        return None


def render_tool_logs(tool_logs: List[Dict[str, Any]]) -> str:
    if not tool_logs:
        return "(도구 호출 없음)"

    chunks: List[str] = []
    for idx, item in enumerate(tool_logs, start=1):
        tool_name = item.get("tool", "unknown")
        args = json.dumps(item.get("args", {}), ensure_ascii=False)
        result = item.get("result", {})
        result_text = json.dumps(result, ensure_ascii=False)
        chunks.append(f"{idx}. tool={tool_name}\\nargs={args}\\nresult={result_text}")
    return "\\n\\n".join(chunks)


def synthesize_section_text(section: Dict[str, Any], tool_logs: List[Dict[str, Any]], llm: Optional[Any]) -> str:
    content = section.get("content") if isinstance(section.get("content"), dict) else {}
    summary = content.get("summary") or "요약 정보 없음"
    key_points = content.get("key_points") if isinstance(content.get("key_points"), list) else []

    if llm is None:
        lines = [summary]
        if key_points:
            lines.append("핵심 포인트:")
            lines.extend([f"- {p}" for p in key_points])
        chart_paths = []
        for item in tool_logs:
            result = item.get("result") or {}
            if isinstance(result, dict) and result.get("chart_path"):
                chart_paths.append(result["chart_path"])
        if chart_paths:
            lines.append("생성된 차트:")
            lines.extend([f"- {p}" for p in chart_paths])
        return "\\n".join(lines)

    messages = SECTION_SYNTH_PROMPT.format_messages(
        section_title=section.get("title", ""),
        summary=summary,
        key_points="\\n".join([f"- {p}" for p in key_points]) if key_points else "- 없음",
        tool_logs=render_tool_logs(tool_logs),
    )
    try:
        resp = llm.invoke(messages)
        text = (resp.content or "").strip()
        return text or summary
    except Exception:
        lines = [summary]
        if key_points:
            lines.append("핵심 포인트:")
            lines.extend([f"- {p}" for p in key_points])
        return "\\n".join(lines)

def _estimate_section_max_tool_steps(section: Dict[str, Any]) -> int:
    content = section.get("content") if isinstance(section.get("content"), dict) else {}

    needs_graph = content.get("needs_graph") is True
    required_data = content.get("required_data") if isinstance(content.get("required_data"), list) else []
    key_points = content.get("key_points") if isinstance(content.get("key_points"), list) else []

    # 기본 2스텝: (1) 데이터 조회 (2) 최종 본문 생성
    steps = 2

    if needs_graph:
        # 그래프가 필요하면 조회 + 그래프 생성이 추가로 필요할 가능성이 높다.
        steps += 2

    if len(required_data) >= 5:
        steps += 1
    if len(key_points) >= 5:
        steps += 1

    title = str(section.get("title", ""))
    if any(word in title for word in ["종합", "요약", "판단", "의사결정"]):
        steps += 1

    return max(2, min(10, steps))


def _derive_outline_max_tool_steps(leaf_sections: List[Dict[str, Any]]) -> int:
    if not leaf_sections:
        return 4
    return max(_estimate_section_max_tool_steps(section) for section in leaf_sections)


def prepare_runtime(state: ReportState) -> ReportState:
    toc = state.get("table_of_contents") or {}
    if not toc.get("sections"):
        raise ValueError("table_of_contents.sections 가 비어 있습니다.")

    leaf_sections = extract_leaf_sections(toc)
    if not leaf_sections:
        raise ValueError("목차에서 리프 섹션을 찾지 못했습니다.")

    raw_db_path = state.get("db_path", DEFAULT_DB_PATH)
    multimodal_tsv_path = state.get("multimodal_tsv_path", DEFAULT_MULTIMODAL_TSV_PATH)
    request_joined_tsv_path = state.get("request_joined_tsv_path", DEFAULT_REQUEST_JOINED_TSV_PATH)
    prepared_db_path = state.get("prepared_db_path", DEFAULT_PREPARED_DB_PATH)
    prepared_db_path = ensure_prepared_db(
        source_db_path=raw_db_path,
        prepared_db_path=prepared_db_path,
        force_refresh=bool(state.get("force_rebuild_prepared", False)),
    )

    tools = build_tools()
    registry = build_tool_registry(tools)

    writer_llm = state.get("report_llm") or create_report_llm()
    section_agent_llm = state.get("section_agent_llm") or create_agent_llm_with_tools(tools)

    analysis_start_time = _normalize_analysis_time(state.get("analysis_start_time"), is_end=False)
    analysis_end_time = _normalize_analysis_time(state.get("analysis_end_time"), is_end=True)
    if analysis_start_time and analysis_end_time and analysis_start_time > analysis_end_time:
        raise ValueError("analysis_start_time 이 analysis_end_time 보다 늦습니다.")

    explicit_max_tool_steps = state.get("max_tool_steps")
    max_tool_steps_explicit = explicit_max_tool_steps is not None
    resolved_max_tool_steps = int(explicit_max_tool_steps) if max_tool_steps_explicit else _derive_outline_max_tool_steps(leaf_sections)

    return {
        **state,
        "db_path": raw_db_path,
        "multimodal_tsv_path": multimodal_tsv_path,
        "request_joined_tsv_path": request_joined_tsv_path,
        "prepared_db_path": prepared_db_path,
        "report_llm": writer_llm,
        "section_agent_llm": section_agent_llm,
        "tools": tools,
        "tool_registry": registry,
        "leaf_sections": leaf_sections,
        "max_tool_steps": resolved_max_tool_steps,
        "max_tool_steps_explicit": max_tool_steps_explicit,
        "max_concurrency": int(state.get("max_concurrency", 3)),
        "analysis_start_time": analysis_start_time,
        "analysis_end_time": analysis_end_time,
    }


def init_section_agent(state: ReportState) -> ReportState:
    section = state["current_section"]
    content = section.get("content") if isinstance(section.get("content"), dict) else {}

    summary = content.get("summary") or "요약 없음"
    needs_graph = content.get("needs_graph") is True
    key_points = content.get("key_points") if isinstance(content.get("key_points"), list) else []
    required_data = content.get("required_data") if isinstance(content.get("required_data"), list) else []
    graph_description = content.get("graph_description") or ""
    analysis_start_time = state.get("analysis_start_time")
    analysis_end_time = state.get("analysis_end_time")
    analysis_window_text = f"{analysis_start_time or '최소'} ~ {analysis_end_time or '최대'}"
    multimodal_tsv_path = state.get("multimodal_tsv_path", DEFAULT_MULTIMODAL_TSV_PATH)
    request_joined_tsv_path = state.get("request_joined_tsv_path", DEFAULT_REQUEST_JOINED_TSV_PATH)

    prompt = (
        f"[섹션 제목] {section.get('title', '')}\\n"
        f"[요약] {summary}\\n"
        f"[그래프 필요 여부] {'예' if needs_graph else '아니오'}\\n"
        f"[분석 시간 범위(log_time)] {analysis_window_text}\\n"
        f"[핵심 포인트] {'; '.join(key_points) if key_points else '없음'}\\n"
        f"[필요 데이터] {'; '.join(required_data) if required_data else '없음'}\\n"
        f"[그래프 설명] {graph_description if graph_description else '없음'}\\n"
        f"[logs_prepared 스키마] {', '.join(LOGS_SCHEMA_HINT)}\\n\\n"
        f"[참고 TSV] multimodal={multimodal_tsv_path}, request={request_joined_tsv_path}\\n"
        "필요하면 query_logs_sql을 먼저 호출해 근거를 만들고, 이어서 create_chart/create_table을 사용하라. "
        "민원/답변 내용이 중요하면 query_request_joined_tsv를 호출하고, 화재/오염/고장 징후가 중요하면 query_multimodal_tsv를 호출하라. "
        "그래프 필요 여부가 예라면 create_chart를 최소 1회 호출하라. "
        "create_chart는 section_focus와 section_title만 넣어도 자동으로 SQL/축을 고를 수 있다. "
        "충분한 근거가 모이면 본문 Markdown을 최종 답변으로 출력하라."
    )

    llm = state.get("section_agent_llm")
    if llm is None:
        return {
            **state,
            "section_messages": [],
            "section_tool_steps": 0,
            "current_tool_logs": [],
        }

    return {
        **state,
        "section_messages": [SystemMessage(content=SECTION_AGENT_SYSTEM_PROMPT), HumanMessage(content=prompt)],
        "section_tool_steps": 0,
        "current_tool_logs": [],
    }


def agent_step_node(state: ReportState) -> ReportState:
    llm = state.get("section_agent_llm")
    messages = list(state.get("section_messages", []))
    if llm is None or not messages:
        return state

    try:
        ai = llm.invoke(messages)
    except Exception as exc:
        return {
            **state,
            "section_agent_llm": None,
            "section_messages": messages + [AIMessage(content=f"tool-agent failed: {exc}")],
        }

    messages.append(ai)

    steps = state.get("section_tool_steps", 0)
    if getattr(ai, "tool_calls", None):
        steps += 1

    return {
        **state,
        "section_messages": messages,
        "section_tool_steps": steps,
    }


def route_after_agent(state: ReportState) -> str:
    llm = state.get("section_agent_llm")
    if llm is None:
        return "finalize"

    messages = state.get("section_messages", [])
    if not messages:
        return "finalize"

    last = messages[-1]
    tool_calls = getattr(last, "tool_calls", None) if isinstance(last, AIMessage) else None

    max_steps_raw = state.get("max_tool_steps")
    if max_steps_raw is None:
        max_steps = _estimate_section_max_tool_steps(state.get("current_section", {}))
    else:
        max_steps = max(1, int(max_steps_raw))

    if tool_calls and state.get("section_tool_steps", 0) < max_steps:
        return "run_tools"
    return "finalize"


def run_tools_node(state: ReportState) -> ReportState:
    messages = list(state.get("section_messages", []))
    if not messages:
        return state

    last = messages[-1]
    if not isinstance(last, AIMessage):
        return state

    tool_registry = state.get("tool_registry", {})
    tool_logs = list(state.get("current_tool_logs", []))

    prepared_db_path = state.get("prepared_db_path", DEFAULT_PREPARED_DB_PATH)
    chart_dir = state.get("chart_dir", DEFAULT_CHART_DIR)
    multimodal_tsv_path = state.get("multimodal_tsv_path", DEFAULT_MULTIMODAL_TSV_PATH)
    request_joined_tsv_path = state.get("request_joined_tsv_path", DEFAULT_REQUEST_JOINED_TSV_PATH)
    section_title = state.get("current_section", {}).get("title", "section")
    analysis_start_time = state.get("analysis_start_time")
    analysis_end_time = state.get("analysis_end_time")

    for call in getattr(last, "tool_calls", []) or []:
        name = call.get("name")
        args = call.get("args") or {}

        if name in {"query_logs_sql", "create_chart", "create_table"}:
            args.setdefault("db_path", prepared_db_path)
            args.setdefault("analysis_start_time", analysis_start_time)
            args.setdefault("analysis_end_time", analysis_end_time)
        if name == "query_multimodal_tsv":
            args.setdefault("tsv_path", multimodal_tsv_path)
        if name == "query_request_joined_tsv":
            args.setdefault("tsv_path", request_joined_tsv_path)
        if name == "create_chart":
            args.setdefault("chart_dir", chart_dir)
            args.setdefault("section_title", section_title)

        tool_obj = tool_registry.get(name)

        if tool_obj is None:
            result_text = json.dumps({"ok": False, "error": f"Unknown tool: {name}"}, ensure_ascii=False)
        else:
            try:
                result = tool_obj.invoke(args)
                result_text = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)
            except Exception as exc:
                result_text = json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False)

        messages.append(ToolMessage(content=result_text, tool_call_id=call.get("id", ""), name=name))

        try:
            parsed = json.loads(result_text)
        except Exception:
            parsed = {"raw": result_text}

        tool_logs.append({
            "tool": name,
            "args": args,
            "result": parsed,
        })

    return {
        **state,
        "section_messages": messages,
        "current_tool_logs": tool_logs,
    }


def finalize_section_node(state: ReportState) -> ReportState:
    section = state["current_section"]
    tool_logs = state.get("current_tool_logs", [])
    messages = state.get("section_messages", [])

    body = ""
    if messages:
        last = messages[-1]
        if isinstance(last, AIMessage) and not getattr(last, "tool_calls", None):
            text = (last.content or "").strip()
            if text:
                body = text

    if not body:
        body = synthesize_section_text(
            section=section,
            tool_logs=tool_logs,
            llm=state.get("report_llm"),
        )

    return {
        **state,
        "current_body": body,
    }


def build_section_graph() -> StateGraph:
    graph = StateGraph(ReportState)
    graph.add_node("init_section_agent", init_section_agent)
    graph.add_node("agent_step", agent_step_node)
    graph.add_node("run_tools", run_tools_node)
    graph.add_node("finalize_section", finalize_section_node)

    graph.add_edge(START, "init_section_agent")
    graph.add_edge("init_section_agent", "agent_step")

    graph.add_conditional_edges(
        "agent_step",
        route_after_agent,
        {
            "run_tools": "run_tools",
            "finalize": "finalize_section",
        },
    )
    graph.add_edge("run_tools", "agent_step")
    graph.add_edge("finalize_section", END)
    return graph


def build_report_graph() -> StateGraph:
    # backward compatibility for graph visualization cell
    return build_section_graph()


def _build_heading_lines(parents: List[str], last_parents: List[str]) -> List[str]:
    heading_lines: List[str] = []
    for depth, parent_title in enumerate(parents):
        if depth >= len(last_parents) or last_parents[depth] != parent_title:
            level = markdown_heading_level(parent_title, default_level=2 + depth)
            heading_lines.append(f"{'#' * level} {parent_title}")
            heading_lines.append("")
    return heading_lines


def _extract_chart_paths(tool_logs: List[Dict[str, Any]]) -> List[str]:
    paths: List[str] = []
    for item in tool_logs:
        result = item.get("result", {})
        if isinstance(result, dict) and result.get("chart_path"):
            paths.append(str(result["chart_path"]))
    return paths


def _normalize_chart_path(path: str) -> str:
    return str(path or "").strip().replace("\\", "/")


_MD_IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")


def _normalize_markdown_image_paths(text: str) -> str:
    if not text:
        return ""

    def _replace(match: re.Match) -> str:
        raw = match.group(0)
        path = match.group(1)
        norm = _normalize_chart_path(path)
        return raw.replace(path, norm, 1)

    return _MD_IMAGE_PATTERN.sub(_replace, text)


def _extract_markdown_image_paths(text: str) -> set:
    return {_normalize_chart_path(m.group(1)) for m in _MD_IMAGE_PATTERN.finditer(text or "")}


def _extract_unique_chart_paths(tool_logs: List[Dict[str, Any]]) -> List[str]:
    unique_paths: List[str] = []
    seen_signatures: set = set()
    seen_paths: set = set()

    for item in tool_logs:
        result = item.get("result", {})
        if not isinstance(result, dict):
            continue
        chart_path = result.get("chart_path")
        if not chart_path:
            continue
        chart_path_str = _normalize_chart_path(str(chart_path))
        if not chart_path_str:
            continue
        chart_signature = str(result.get("chart_signature") or chart_path_str)
        if chart_signature in seen_signatures or chart_path_str in seen_paths:
            continue
        seen_signatures.add(chart_signature)
        seen_paths.add(chart_path_str)
        unique_paths.append(chart_path_str)

    return unique_paths


def _extract_chart_alias_mappings(tool_logs: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    mappings: List[Dict[str, str]] = []
    seen: set = set()
    for item in tool_logs:
        result = item.get("result", {})
        if not isinstance(result, dict):
            continue
        rows = result.get("category_alias_mapping")
        if not isinstance(rows, list):
            continue
        for row in rows:
            if isinstance(row, dict) and row.get("alias") and row.get("original"):
                key = (str(row["alias"]), str(row["original"]))
                if key in seen:
                    continue
                seen.add(key)
                mappings.append({"alias": key[0], "original": key[1]})
    return mappings


def _section_needs_graph(section: Dict[str, Any]) -> bool:
    content = section.get("content") if isinstance(section.get("content"), dict) else {}
    return content.get("needs_graph") is True


def _build_section_focus_text(section: Dict[str, Any]) -> str:
    content = section.get("content") if isinstance(section.get("content"), dict) else {}
    chunks: List[str] = [str(section.get("title", ""))]
    for key in ["summary", "graph_description"]:
        val = content.get(key)
        if val:
            chunks.append(str(val))
    key_points = content.get("key_points") if isinstance(content.get("key_points"), list) else []
    if key_points:
        chunks.extend([str(p) for p in key_points])
    return " ".join(chunks)


def _ensure_required_chart(
    section: Dict[str, Any],
    tool_logs: List[Dict[str, Any]],
    runtime_state: ReportState,
) -> List[Dict[str, Any]]:
    if not _section_needs_graph(section):
        return tool_logs
    if _extract_chart_paths(tool_logs):
        return tool_logs

    tool_registry = runtime_state.get("tool_registry", {})
    chart_tool = tool_registry.get("create_chart")
    if chart_tool is None:
        return tool_logs

    args = {
        "section_title": section.get("title", "section"),
        "section_focus": _build_section_focus_text(section),
        "title": strip_numbering(section.get("title", "analysis")),
        "db_path": runtime_state.get("prepared_db_path", DEFAULT_PREPARED_DB_PATH),
        "chart_dir": runtime_state.get("chart_dir", DEFAULT_CHART_DIR),
        "analysis_start_time": runtime_state.get("analysis_start_time"),
        "analysis_end_time": runtime_state.get("analysis_end_time"),
        "limit": 800,
    }

    result_text = ""
    try:
        result = chart_tool.invoke(args)
        result_text = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)
    except Exception as exc:
        result_text = json.dumps({"ok": False, "error": str(exc), "chart_path": None}, ensure_ascii=False)

    try:
        parsed = json.loads(result_text)
    except Exception:
        parsed = {"raw": result_text}

    return tool_logs + [{
        "tool": "create_chart(auto_fallback)",
        "args": args,
        "result": parsed,
    }]


def run_single_section(
    idx: int,
    section: Dict[str, Any],
    runtime_state: ReportState,
) -> Dict[str, Any]:
    section_graph = build_section_graph().compile()

    # 병렬 실행 시 모델 객체 공유 이슈를 피하기 위해 섹션마다 새 인스턴스를 만든다.
    tools = runtime_state.get("tools", [])
    local_agent_llm = create_agent_llm_with_tools(tools) if runtime_state.get("section_agent_llm") is not None else None
    local_writer_llm = create_report_llm() if runtime_state.get("report_llm") is not None else None

    if runtime_state.get("max_tool_steps_explicit", False):
        section_max_tool_steps = max(1, int(runtime_state.get("max_tool_steps", 4)))
    else:
        section_max_tool_steps = _estimate_section_max_tool_steps(section)

    section_state: ReportState = {
        "current_section": section,
        "section_messages": [],
        "section_tool_steps": 0,
        "current_tool_logs": [],
        "tool_registry": runtime_state.get("tool_registry", {}),
        "prepared_db_path": runtime_state.get("prepared_db_path", DEFAULT_PREPARED_DB_PATH),
        "multimodal_tsv_path": runtime_state.get("multimodal_tsv_path", DEFAULT_MULTIMODAL_TSV_PATH),
        "request_joined_tsv_path": runtime_state.get("request_joined_tsv_path", DEFAULT_REQUEST_JOINED_TSV_PATH),
        "chart_dir": runtime_state.get("chart_dir", DEFAULT_CHART_DIR),
        "max_tool_steps": section_max_tool_steps,
        "section_agent_llm": local_agent_llm,
        "report_llm": local_writer_llm,
        "analysis_start_time": runtime_state.get("analysis_start_time"),
        "analysis_end_time": runtime_state.get("analysis_end_time"),
    }

    try:
        out = section_graph.invoke(section_state)
        body = out.get("current_body", "")
        tool_logs = out.get("current_tool_logs", [])
    except Exception as exc:
        content = section.get("content", {}) if isinstance(section.get("content"), dict) else {}
        body = content.get("summary", "") or f"섹션 생성 실패: {exc}"
        tool_logs = []

    tool_logs = _ensure_required_chart(section=section, tool_logs=tool_logs, runtime_state=runtime_state)

    return {
        "index": idx,
        "section": section,
        "body": body,
        "tool_logs": tool_logs,
    }


def assemble_report(runtime_state: ReportState, section_results: List[Dict[str, Any]]) -> ReportState:
    lines: List[str] = [f"# 전기차 충전소 보고서", ""]
    section_outputs: List[Dict[str, Any]] = []
    last_parents: List[str] = []

    for item in sorted(section_results, key=lambda x: x["index"]):
        section = item["section"]
        body = item.get("body", "")
        tool_logs = item.get("tool_logs", [])

        parents = section.get("parents", [])
        heading_lines = _build_heading_lines(parents, last_parents)
        lines.extend(heading_lines)
        last_parents = parents

        title = section.get("title", "")
        level = markdown_heading_level(title, default_level=min(6, len(parents) + 3))

        body = _normalize_markdown_image_paths(body)
        body_image_paths = _extract_markdown_image_paths(body)

        lines.append(f"{'#' * level} {title}")
        lines.append("")
        lines.append(body)
        lines.append("")

        chart_paths = _extract_unique_chart_paths(tool_logs)
        for chart_path in chart_paths:
            if _normalize_chart_path(chart_path) in body_image_paths:
                continue
            lines.append(f"![{strip_numbering(title)} 그래프]({chart_path})")
            lines.append("")

        alias_mappings = _extract_chart_alias_mappings(tool_logs)
        if alias_mappings:
            lines.append("라벨 매핑(한글 폰트 미탑재 환경):")
            for row in alias_mappings[:30]:
                lines.append(f"- {row['alias']}: {row['original']}")
            lines.append("")

        tools_used = [log.get("tool") for log in tool_logs if log.get("tool")]
        section_outputs.append(
            {
                "section_title": title,
                "tool_invoked": len(tools_used) > 0,
                "tool_calls": len(tools_used),
                "tools_used": tools_used,
                "chart_paths": chart_paths,
                "chart_path": chart_paths[0] if chart_paths else None,
            }
        )

    report_markdown = "\n".join(lines).strip() + "\n"

    return {
        **runtime_state,
        "section_outputs": section_outputs,
        "report_markdown": report_markdown,
    }


def run_report_with_graph(initial_state: ReportState) -> ReportState:
    runtime_state = prepare_runtime(initial_state)
    sections = runtime_state.get("leaf_sections", [])
    if not sections:
        raise ValueError("leaf_sections is empty")

    max_workers = max(1, min(int(runtime_state.get("max_concurrency", 3)), len(sections)))

    section_results: List[Dict[str, Any]] = [None] * len(sections)  # type: ignore

    if max_workers == 1:
        for idx, section in enumerate(sections):
            section_results[idx] = run_single_section(idx, section, runtime_state)
    else:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(run_single_section, idx, section, runtime_state): idx
                for idx, section in enumerate(sections)
            }
            for future in as_completed(futures):
                idx = futures[future]
                section_results[idx] = future.result()

    return assemble_report(runtime_state, section_results)


if __name__ == "__main__":
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is not set. Agentic tool-calling will run in fallback mode.")

    temp_table_of_contents = {'sections': [{'title': '1. 서론', 'content': None, 'subsections': [{'title': '1.1 보고서 목적 및 활용 시나리오', 'content': {'summary': '이 목차에서는 보고서의 목적을 명확히 하고, 보고서를 활용할 수 있는 구체적인 시나리오를 제시합니다. 또한, 해당 보고서가 어떤 문제 해결에 도움을 줄 수 있는지 소개합니다.', 'needs_graph': False, 'graph_description': None, 'required_data': [], 'key_points': ['보고서 작성의 배경과 목적 설명', '사용 가능한 데이터의 소개 및 분석 범위 명시', '보고서를 통해 얻을 수 있는 인사이트와 기대효과 서술', '현장 운영, 정책 수립, 고객 서비스 개선 등 활용 가능한 시나리오 제시']}, 'subsections': None}, {'title': '1.2 분석 범위 및 기준(지역·기간)', 'content': {'summary': '이 목차에서는 보고서 분석의 대상 범위와 기준, 즉 지역과 기간에 대해 구체적으로 정의합니다. 어떤 지역 데이터를 포함했으며, 분석 기간은 언제부터 언제까지인지를 명확히 하여 분석의 신뢰성과 한계를 제시합니다.', 'needs_graph': True, 'graph_description': '막대그래프 형태로 각 지역별 포함된 데이터 건수 및 분석 기간 동안의 데이터 분포를 시각화하여 분석 범위와 데이터 집중도를 설명', 'required_data': ['지역구분코드설명', '지역구분상세코드설명', '충전기 타임스탬프'], 'key_points': ['분석에 포함된 지역 구분 및 상세 구분 설명', '분석 기간 설정 근거 및 기간 명시', '각 지역별 데이터 수집 현황 및 데이터의 시간적 분포', '분석 범위에 따른 결론의 적용 가능성과 한계']}, 'subsections': None}]}, {'title': '2. 충전 인프라 구성 및 변화 추이', 'content': None, 'subsections': [{'title': '2.1 충전소·충전기 수의 기간별 변화', 'content': {'summary': '이 목차에서는 기간별 충전소와 충전기 수의 변화를 분석하여 충전 인프라가 어떻게 성장했는지를 보여줍니다. 이를 통해 인프라 확장 추세와 집중 지역 등을 파악할 수 있습니다.', 'needs_graph': True, 'graph_description': '선그래프를 활용하여 일정 기간 동안 충전소 수와 충전기 수의 증감 추이를 시각화함으로써 인프라 성장 속도 및 패턴을 설명', 'required_data': ['충전소 ID', '충전기 ID', '충전기 타임스탬프'], 'key_points': ['기간별 충전소 수 및 충전기 수 집계 및 비교', '인프라 확장 시기와 성장률 파악', '특정 기간 내 인프라 집중 또는 분산 현상 분석', '성장 추세에 따른 향후 인프라 확장 방향 예측 가능성']}, 'subsections': None}]}, {'title': '3. 충전소 이용 현황', 'content': None, 'subsections': [{'title': '3.1 전체 충전 이용 추세(기간별)', 'content': {'summary': '이 목차에서는 전체 충전소의 이용 현황을 기간별로 분석하여 충전 이용 추세를 파악합니다. 이를 통해 시간에 따른 이용량 변화와 충전 수요 패턴을 이해할 수 있습니다.', 'needs_graph': True, 'graph_description': '선그래프 또는 영역그래프를 사용하여 기간별 충전 시작 및 종료 건수 또는 이용 횟수를 시각화하고, 전체 충전 이용 추세 변화를 설명', 'required_data': ['충전기 타임스탬프', '마지막 충전시작일시', '마지막충전종료 일시', '충전기 ID'], 'key_points': ['기간별 충전 이용 건수 집계 및 추세 분석', '충전 이용량의 시간적 변화 및 계절성 여부 확인', '충전 수요 증가 또는 감소 원인 분석', '추세에 따른 충전 인프라 운영 및 관리 전략 제언']}, 'subsections': None}]}, {'title': '4. 충전기 상태 및 가동률', 'content': None, 'subsections': [{'title': '4.1 가동률의 기간별 변화', 'content': {'summary': '이 목차에서는 충전기의 가동률이 기간별로 어떻게 변화했는지 분석합니다. 가동률 변화를 파악하여 충전기의 효율성 및 운영 상태를 평가하고 개선점을 도출합니다.', 'needs_graph': True, 'graph_description': '선그래프를 통해 기간별 충전기 가동률 변화를 시각화하여 시간에 따른 가동률 추세와 변동성을 설명', 'required_data': ['충전기 타임스탬프', '충전기 상태', '충전기 ID', '마지막 충전시작일시', '마지막충전종료 일시', '상태갱신일시'], 'key_points': ['기간별 충전기 가동률 산출 및 변화 추이 분석', '가동률 상승 또는 하락의 원인 탐색', '운영 관점에서 가동률 개선 방안 모색', '가동률 변동과 충전기 상태 간 상관관계 고려']}, 'subsections': None}]}, {'title': '5. 안전 및 고장 리스크', 'content': None, 'subsections': [{'title': '5.1 지역별 위험 수준 비교', 'content': {'summary': '이 목차에서는 지역별로 충전소의 화재 위험, 고장 위험 등 안전 및 고장 리스크 수준을 비교 분석합니다. 이를 통해 상대적으로 위험이 높은 지역을 파악하고 예방 및 관리 방안을 모색할 수 있습니다.', 'needs_graph': True, 'graph_description': '막대그래프 또는 히트맵을 사용하여 각 지역별 화재 위험과 고장 위험 점수를 비교 시각화하여 지역별 위험 수준 차이를 한눈에 파악할 수 있도록 설명', 'required_data': ['지역구분코드설명', '지역구분상세코드설명', '화재위험 분석결과', '고장 분석결과'], 'key_points': ['지역별 화재 위험 수준 지표 비교', '지역별 충전소 고장 위험 수준 평가', '위험 수준 차이에 따른 지역별 관리 우선순위 설정', '안전 관리 강화가 필요한 지역 도출 및 대응 방안 제시']}, 'subsections': None}]}, {'title': '6. 종합 판단 및 의사결정 포인트', 'content': None, 'subsections': [{'title': '6.1 핵심 이슈 요약(지역·기간 관점)', 'content': {'summary': '이 목차에서는 보고서 전반에 걸쳐 분석된 내용을 바탕으로 지역과 기간별로 나타난 핵심 이슈를 요약합니다. 주요 발견사항을 집약하여 의사결정에 필요한 주요 포인트를 강조합니다.', 'needs_graph': False, 'graph_description': None, 'required_data': ['지역구분코드설명', '지역구분상세코드설명', '충전기 타임스탬프', '충전소 ID', '충전기 ID', '화재위험 분석결과', '고장 분석결과', '충전기 상태', '민원 유형', '민원 처리상태'], 'key_points': ['지역별 충전 인프라 구성 및 변화 추이의 주요 특징', '기간별 충전 이용 현황과 가동률의 주요 변화 패턴', '지역별 안전 및 고장 리스크의 차이와 주요 위험 요인', '민원 발생 현황과 처리 상태에 따른 지역별 개선 필요 사항', '종합적으로 고려한 정책 및 운영 개선 방향 제시']}, 'subsections': None}, {'title': '6.2 우선 조치 대상 지역 및 충전소', 'content': {'summary': '이 목차에서는 분석 결과를 바탕으로 우선적으로 조치가 필요한 지역과 충전소를 선정합니다. 위험 수준, 고장 빈도, 민원 발생 등을 종합적으로 고려하여 효율적인 자원 배분 및 대응 전략을 제안합니다.', 'needs_graph': True, 'graph_description': '지도 시각화(히트맵)와 막대그래프를 활용하여 지역별 및 충전소별 위험 및 민원 지표를 나타내어 우선 조치 대상의 위치와 중요도를 설명', 'required_data': ['지역구분코드설명', '충전소 ID', '화재위험 분석결과', '고장 분석결과', '민원 유형', '민원 처리 상태', '충전기 상태'], 'key_points': ['위험 수준과 민원 발생 빈도를 기반으로 우선 조치 대상 지역 및 충전소 도출', '지역별 안전 리스크 및 고장 빈도 고려', '민원 처리 현황과 연계한 긴급 대응 필요성 파악', '효과적인 관리와 개선을 위한 자원 우선 배분 방안 제시']}, 'subsections': None}, {'title': '6.3 단기·중기 운영 개선 방향', 'content': {'summary': '이 목차에서는 분석 결과를 토대로 단기 및 중기 관점에서 충전 인프라 운영의 개선 방향을 제시합니다. 현장의 문제점 해결과 효율적 자원 운영을 위한 구체적인 전략을 수립합니다.', 'needs_graph': False, 'graph_description': None, 'required_data': ['충전기 상태', '충전기 타임스탬프', '민원 유형', '민원 처리 상태', '화재위험 분석결과', '고장 분석결과', '지역구분코드설명'], 'key_points': ['단기적으로 조치가 필요한 문제점 및 대응 방안 정리', '중기적 관점에서 인프라 확장 및 운영 효율화 전략 수립', '민원 및 고장 예방을 위한 체계적 관리 방안 제안', '지역별 특성을 반영한 맞춤형 운영 정책 개발', '지속적인 모니터링과 데이터 기반 의사결정 강화']}, 'subsections': None}]}]}

    initial_state: ReportState = {
        "input_prompt": "기본적인 전기차 충전소 충전기 보고서 만들어줘",
        "table_of_contents": temp_table_of_contents,
        "db_path": DEFAULT_DB_PATH,
        "multimodal_tsv_path": DEFAULT_MULTIMODAL_TSV_PATH,
        "request_joined_tsv_path": DEFAULT_REQUEST_JOINED_TSV_PATH,
        "prepared_db_path": "artifacts/cache/prepared_logs.sqlite",
        "chart_dir": "artifacts/charts",
        # log_time 기준 분석 구간. None이면 전체 기간 사용.
        # 예: "2026-01-01 00:00:00", "2026-01-31 23:59:59"
        "analysis_start_time": "2026-01-15 00:00:00",
        "analysis_end_time": "2026-01-17 23:59:59",
        "report_llm": None,
        "max_concurrency": 3,
    }

    result_state = run_report_with_graph(initial_state)
    print(result_state["report_markdown"])
    
