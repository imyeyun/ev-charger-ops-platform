import os
import re
import json
import requests
import feedparser
import pandas as pd
import sqlite3

from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from PIL import Image
import pytesseract

from langchain_openai import OpenAIEmbeddings
from pathlib import Path

import datetime

load_dotenv()
llm_key = os.environ.get("OPENAI_API_KEY")

llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0)

DEFAULT_PERIOD_START = "2026-01-14 00:00:00"
DEFAULT_PERIOD_END   = "2026-01-14 23:59:59"
DEFAULT_DB_PATH = (
    Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "joined_logs.sqlite"
).as_posix()
DEFAULT_MULTIMODAL_TSV_PATH = (
    Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "multimodal_analysis.tsv"
).as_posix()
DEFAULT_REQUEST_JOINED_TSV_PATH = (
    Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "request_joined.tsv"
).as_posix()
DEFAULT_PDF_PATHS = [
    (Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "2023년 종합감사결과(231129).pdf").as_posix(),
    (Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "2025년 제3차 공공기관(경기주택도시공사) 종합감사 결과보고서(공개용).pdf").as_posix(),
    (Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "[별지 14] 전기자동차 충전시설 점검기록표(전기안전관리자의 직무에 관한 고시).pdf").as_posix(),
    (Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "전기차 충전시설 자체점검 체크리스트.pdf").as_posix(),
]
DEFAULT_IMAGE_PATHS = [
    (Path(__file__).resolve().parent.parent
    / "data" / "report_data" / "화재 점검 항목.png").as_posix(),
]
OUTPUT_PDF_DIR = (
    Path(__file__).resolve().parent.parent
    / "artifacts" / "audit_report.pdf"
).as_posix()


_LOCAL_RAG = {"retriever": None, "built": False}

def audit_report_main(input_prompt: str, period_start, period_end):
    app = build_graph().compile()
    out = app.invoke({
        "input_prompt": input_prompt,
        "extra_prompt": "최근 3개월 대한민국 주요 사회 이슈를 먼저 수집하고, 전기차 충전소와 연결 가능할 때만 추가 점검으로 포함. 공문/법령 취지 기반으로 부족한 점을 최대한 상세히 지적. 마크다운/링크/목록/텍스트표 금지.",
        "reflect_count": 0,
        "max_reflect": 2,
        "period_start": period_start,
        "period_end": period_end,
        "pdf_path": OUTPUT_PDF_DIR,
    })




def build_local_rag_retriever(pdf_paths: List[str], image_paths: List[str], k: int = 4):
    # 이미 만들어져 있으면 재사용
    if _LOCAL_RAG.get("built") and _LOCAL_RAG.get("retriever") is not None:
        return _LOCAL_RAG["retriever"]

    docs: List[Document] = []

    # 1) PDF 로딩
    for p in (pdf_paths or []):
        if not p or (not os.path.exists(p)):
            continue
        loader = PyPDFLoader(p)
        pages = loader.load()  # page 단위 Document 리스트
        # source 메타데이터 보강
        for d in pages:
            d.metadata = dict(d.metadata or {})
            d.metadata["source_file"] = os.path.basename(p)
        docs.extend(pages)

    # 2) 이미지(표/체크리스트 등) OCR
    for ip in (image_paths or []):
        if not ip or (not os.path.exists(ip)):
            continue
        try:
            img = Image.open(ip)
            text = (pytesseract.image_to_string(img) or "").strip()
            if text:
                docs.append(
                    Document(
                        page_content=text,
                        metadata={"source_file": os.path.basename(ip), "page": 1, "source_type": "image_ocr"},
                    )
                )
        except Exception:
            pass

    # 문서가 없으면 None
    if not docs:
        _LOCAL_RAG["built"] = True
        _LOCAL_RAG["retriever"] = None
        return None

    splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
    chunks = splitter.split_documents(docs)

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vs = FAISS.from_documents(chunks, embeddings)

    retriever = vs.as_retriever(search_kwargs={"k": int(k)})

    _LOCAL_RAG["built"] = True
    _LOCAL_RAG["retriever"] = retriever
    return retriever

class ReportState(TypedDict, total=False):
    input_prompt: str
    extra_prompt: str
    outline: str
    draft: str
    review: str

    period_start: str
    period_end: str  

    anomalies: list
    data_snapshot: dict

    ops_snapshot: dict
    requests_snapshot: dict
    request_samples: list  # 보고서에 사례로 넣을 상위 n건

    social_issues: list
    official_docs: list

    reflect_count: int
    max_reflect: int
    next_step: str

    pdf_path: str

    # PDF 표 렌더링용
    summary_rows: list
    top_rows: list

UA = {"User-Agent": "Mozilla/5.0"}

# (로컬 테스트용) 멀티모달 TSV에서 이상 징후(anomalies) 생성
def _flag_is_true(v) -> bool:
    if v is None:
        return False
    try:
        if pd.isna(v):
            return False
    except Exception:
        pass
    s = str(v)
    return (s == "\x01") or ("\x01" in s) or (s.strip() in ["1", "True", "true"])


# notes 문구 기반 위험도(임시 규칙) 매핑
def _infer_level_from_notes(issue_text: str, category: str) -> str:
    if not issue_text:
        return ""  # 근거 없으면 비워둠

    s = str(issue_text).strip()

    # 1) "낮음" 신호가 있으면 우선 low로(예: "가능성은 낮", "위험은 낮")
    low_signals = ["낮은", "낮은 편", "낮은 상태", "낮습니다", "낮음", "가능성은 낮", "위험은 낮", "징후는 보이지 않습니다", "보이지 않습니다"]
    for k in low_signals:
        if k in s:
            return "low"

    # 2) "즉시/매우/긴급/경보" 같은 강한 신호면 high
    high_signals = ["즉시", "긴급", "매우", "심각", "위험", "경보", "알람", "연기", "불꽃", "화재"]
    for k in high_signals:
        if k in s:
            # 화재 카테고리는 화재/연기/불꽃/경보가 들어가면 high로 강하게 둠
            if category == "fire":
                return "high"
            # 청결/고장은 "매우/즉시/심각/경보"면 high
            if k in ["즉시", "긴급", "매우", "심각", "경보", "알람"]:
                return "high"
            # 그 외(단순 "위험" 등)는 medium로 둠
            return "medium"

    # 3) "높음" 신호면 medium (필요하면 high로 올릴 수도 있음)
    mid_signals = ["높아", "높은", "증가", "필요", "관리"]
    for k in mid_signals:
        if k in s:
            return "medium"

    # 4) 아무 키워드도 못 잡으면 비워둠
    return ""

def fetch_anomalies_from_multimodal_tsv(tsv_path: str, period_start: str = "", period_end: str = "") -> list:
    df = pd.read_csv(tsv_path, sep="\t")

    # 기간 필터 (입력은 log_time과 동일한 형태로 받는 것을 전제로)
    if "img_time" in df.columns and (period_start or period_end):
        t = pd.to_datetime(df["img_time"], errors="coerce")
        start = pd.to_datetime(period_start, errors="coerce") if period_start else None
        end = pd.to_datetime(period_end, errors="coerce") if period_end else None

        if start is not None and not pd.isna(start):
            df = df[t >= start]
            t = t[t >= start]
        if end is not None and not pd.isna(end):
            df = df[t <= end]

    anomalies = []
    for _, r in df.iterrows():
        stat_id = str(r.get("stat_id") or "").strip()
        chger_id = str(r.get("chger_id") or "").strip()

        dirty = _flag_is_true(r.get("dirty_yn"))
        fire = _flag_is_true(r.get("fire_yn"))
        broke = _flag_is_true(r.get("broke_yn"))

        # anomalies는 멀티모달에서 검출된 충전소만 포함
        if not (dirty or fire or broke):
            continue

        # issue는 강제 작성 금지: TSV의 notes가 있으면 그걸 사용, 없으면 빈칸
        notes = r.get("notes")
        issue_text = "" if notes is None else str(notes).strip()

        if dirty:
            anomalies.append({
                "station_id": stat_id,
                "charger_id": chger_id,
                "type": "현장(청결)",
                "level": _infer_level_from_notes(issue_text, "dirty"),
                "issue": issue_text,
                "cause_candidates": [],
            })
        if fire:
            anomalies.append({
                "station_id": stat_id,
                "charger_id": chger_id,
                "type": "안전(화재)",
                "level": _infer_level_from_notes(issue_text, "fire"),
                "issue": issue_text,
                "cause_candidates": [],
            })
        if broke:
            anomalies.append({
                "station_id": stat_id,
                "charger_id": chger_id,
                "type": "장비(고장)",
                "level": _infer_level_from_notes(issue_text, "broke"),
                "issue": issue_text,
                "cause_candidates": [],
            })

    return anomalies

def fetch_ops_snapshot_from_sqlite(
    db_path: str,
    table: str = "logs",
    period_start: str = "",
    period_end: str = "",
    top_n: int = 10,
) -> dict:
    # joined_logs.sqlite는 TEXT 컬럼이므로 문자열 비교 가능한 형태(YYYY-MM-DD HH:MM:SS)로 필터
    where = []
    params = []
    if period_start:
        where.append("log_time >= ?")
        params.append(period_start)
    if period_end:
        where.append("log_time <= ?")
        params.append(period_end)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    out = {
        "ok": True,
        "db_path": db_path,
        "table": table,
        "period_start": period_start,
        "period_end": period_end,
        "row_count": 0,
        "time_min": None,
        "time_max": None,
        "unique_stations": 0,
        "stat_dist": [],
        "output_dist": [],
        "method_dist": [],
        "region_dist": [],
        "chger_type_dist": [],
    }

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute(f"SELECT COUNT(*) FROM {table} {where_sql}", params)
    out["row_count"] = int(cur.fetchone()[0] or 0)

    cur.execute(f"SELECT MIN(log_time), MAX(log_time) FROM {table} {where_sql}", params)
    mn, mx = cur.fetchone()
    out["time_min"] = mn
    out["time_max"] = mx

    cur.execute(f"SELECT COUNT(DISTINCT statId) FROM {table} {where_sql}", params)
    out["unique_stations"] = int(cur.fetchone()[0] or 0)

    cur.execute(
        f"SELECT stat, COUNT(*) c FROM {table} {where_sql} GROUP BY stat ORDER BY c DESC LIMIT {int(top_n)}",
        params,
    )
    out["stat_dist"] = [{"stat": r[0], "count": int(r[1])} for r in cur.fetchall()]

    cur.execute(
        f"SELECT output, COUNT(*) c FROM {table} {where_sql} GROUP BY output ORDER BY c DESC LIMIT {int(top_n)}",
        params,
    )
    out["output_dist"] = [{"output": r[0], "count": int(r[1])} for r in cur.fetchall()]

    cur.execute(
        f"SELECT method, COUNT(*) c FROM {table} {where_sql} GROUP BY method ORDER BY c DESC LIMIT {int(top_n)}",
        params,
    )
    out["method_dist"] = [{"method": r[0], "count": int(r[1])} for r in cur.fetchall()]

    cur.execute(
        f"""
        SELECT zcode_description, zscode_description, COUNT(*) c
        FROM {table} {where_sql}
        GROUP BY zcode_description, zscode_description
        ORDER BY c DESC
        LIMIT {int(top_n)}
        """,
        params,
    )
    out["region_dist"] = [{"zcode": r[0], "zscode": r[1], "count": int(r[2])} for r in cur.fetchall()]

    cur.execute(
        f"""
        SELECT chgerType_description, COUNT(*) c
        FROM {table} {where_sql}
        GROUP BY chgerType_description
        ORDER BY c DESC
        LIMIT {int(top_n)}
        """,
        params,
    )
    out["chger_type_dist"] = [{"type": r[0], "count": int(r[1])} for r in cur.fetchall()]

    conn.close()
    return out


def fetch_requests_snapshot_from_tsv(
    tsv_path: str,
    period_start: str = "",
    period_end: str = "",
    top_n: int = 8,
) -> dict:
    df = pd.read_csv(tsv_path, sep="\t")

    if "req_dt" in df.columns:
        df["req_dt_parsed"] = pd.to_datetime(df["req_dt"], errors="coerce")
    else:
        df["req_dt_parsed"] = pd.NaT

    if period_start:
        ps = pd.to_datetime(period_start, errors="coerce")
        if pd.notna(ps):
            df = df[df["req_dt_parsed"] >= ps]
    if period_end:
        pe = pd.to_datetime(period_end, errors="coerce")
        if pd.notna(pe):
            df = df[df["req_dt_parsed"] <= pe]

    has_answer = 0
    if "answer" in df.columns:
        has_answer = int(df["answer"].notna().sum())

    type_dist = {}
    if "req_type" in df.columns:
        for v in df["req_type"].fillna("UNKNOWN").astype(str).tolist():
            type_dist[v] = type_dist.get(v, 0) + 1

    samples = []
    if len(df) > 0:
        df2 = df.sort_values("req_dt_parsed", ascending=False).head(int(top_n))
        for _, r in df2.iterrows():
            samples.append({
                "req_id": r.get("req_id"),
                "stat_id": r.get("stat_id"),
                "chger_id": r.get("chger_id"),
                "req_type": r.get("req_type"),
                "req_dt": r.get("req_dt"),
                "title": r.get("title"),
                "content": r.get("content"),
                "has_answer": False if pd.isna(r.get("answer")) else True,
                "answer_dt": r.get("answer_dt"),
            })

    out = {
        "ok": True,
        "tsv_path": tsv_path,
        "period_start": period_start,
        "period_end": period_end,
        "row_count": int(len(df)),
        "has_answer_count": has_answer,
        "type_dist": [{"req_type": k, "count": int(v)} for k, v in sorted(type_dist.items(), key=lambda x: -x[1])],
        "samples": samples,
    }
    return out


# 3개월 간 한국의 주요 이슈 수집

def fetch_social_issues_korea_3m(extra_prompt: str, max_keep: int = 12) -> List[Dict[str, str]]:
    p = (extra_prompt or "").strip()
    if not p:
        return []

    # “수집하지 마/제외/불필요” 같은 부정어가 있으면 수집 안함
    deny = ["수집하지", "수집 금지", "제외", "빼", "하지마", "하지 마", "불필요", "필요없"]
    if any(d in p for d in deny):
        return []

    # extra_prompt에 사회/이슈/뉴스/최근 등 단서가 없으면 이슈 수집 안함
    keywords = ["사회", "이슈", "최근", "뉴스", "기사", "트렌드", "핫이슈", "주요 이슈", "이슈 반영", "이슈 포함"]
    if not any(k in p for k in keywords):
        return []

    queries = [
        "대한민국 주요 이슈 when:3m",
        "대형 사고 when:3m",
        "재난 안전 when:3m",
        "공공기관 감사 결과 when:3m",
        "정부 발표 점검 when:3m",
        "사회적 논란 when:3m",
        "공공시설 안전 점검 when:3m",
        "대형 화재 사고 when:3m",
    ]

    items: List[Dict[str, str]] = []
    for q in queries:
        url = "https://news.google.com/rss/search?q=" + requests.utils.quote(q) + "&hl=ko&gl=KR&ceid=KR:ko"
        try:
            r = requests.get(url, headers=UA, timeout=10)
            feed = feedparser.parse(r.text)
        except Exception:
            continue

        for e in getattr(feed, "entries", []) or []:
            title_raw = (getattr(e, "title", "") or "").strip()
            link = (getattr(e, "link", "") or "").strip()
            pub = (getattr(e, "published", "") or "").strip()

            if not title_raw:
                continue

            title = title_raw
            publisher = ""
            if " - " in title_raw:
                a, b = title_raw.rsplit(" - ", 1)
                title = a.strip()
                publisher = b.strip()

            items.append(
                {"title": title, "publisher": publisher, "published": pub, "link": link, "source_type": "google_news_rss"}
            )

    # 제목 기준 중복 제거
    seen = set()
    uniq = []
    for it in items:
        t = (it.get("title") or "").strip()
        key = re.sub(r"\s+", " ", t).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        uniq.append(it)

    return uniq[:max_keep]

# 관련 공문서 수집

def fetch_official_docs_ev(max_keep: int = 10) -> List[Dict[str, str]]:
    base = "https://www.law.go.kr"
    queries = [
        "전기자동차 충전",
        "환경친화적 자동차",
        "전기설비 안전",
        "전기안전관리",
        "소방 안전 점검",
        "재난 안전관리",
        "시설물 유지관리",
        "공공시설 안전점검",
    ]

    def extract_from_html(html: str) -> List[Dict[str, str]]:
        hrefs = re.findall(r'href="(/(?:lsInfoP|admRulInfoP)\.do\?[^"]+)"', html)

        seen_href = set()
        cleaned = []
        for h in hrefs:
            if h in seen_href:
                continue
            seen_href.add(h)
            cleaned.append(h)

        out = []
        for h in cleaned:
            # title 속성 우선
            m = re.search(r'href="' + re.escape(h) + r'"[^>]*title="([^"]{2,200})"', html)
            if m:
                title = re.sub(r"\s+", " ", m.group(1)).strip()
            else:
                # 없으면 anchor 텍스트 추정
                m2 = re.search(r'href="' + re.escape(h) + r'"[^>]*>(.*?)</a>', html, re.DOTALL)
                raw = (m2.group(1) if m2 else "")
                raw = re.sub(r"<[^>]+>", " ", raw)
                title = re.sub(r"\s+", " ", raw).strip()

            if not title:
                continue

            out.append(
                {
                    "title": title,
                    "link": base + h,
                    "source_type": "law.go.kr" if "lsInfoP.do" in h else "law.go.kr_admin_rule",
                }
            )
        return out

    items: List[Dict[str, str]] = []
    for q in queries:
        # 법령
        try:
            r = requests.get(base + "/lsSc.do", params={"query": q}, headers=UA, timeout=10)
            r.raise_for_status()
            items.extend(extract_from_html(r.text))
        except Exception:
            pass

        # 행정규칙
        try:
            r = requests.get(base + "/admRulSc.do", params={"query": q}, headers=UA, timeout=10)
            r.raise_for_status()
            items.extend(extract_from_html(r.text))
        except Exception:
            pass

    # 제목 기준 중복 제거
    seen = set()
    uniq = []
    for it in items:
        t = (it.get("title") or "").strip()
        if not t or t in seen:
            continue
        seen.add(t)
        uniq.append(it)

    return uniq[:max_keep]

def load_data(state: ReportState) -> ReportState:
    state.setdefault("source_status", {})
    state.setdefault("source_errors", [])

    # 1) 이상 징후 데이터(로컬 TSV)
    period_start = (state.get("period_start") or "").strip()
    period_end = (state.get("period_end") or "").strip()
    if not period_start:
        period_start = DEFAULT_PERIOD_START
        state["period_start"] = period_start
    if not period_end:
        period_end = DEFAULT_PERIOD_END
        state["period_end"] = period_end

    # 1) 이상 징후 데이터(로컬 TSV)
    raw_anomalies = fetch_anomalies_from_multimodal_tsv(DEFAULT_MULTIMODAL_TSV_PATH, period_start, period_end)


    # 2) ✅ type 분리 확장
    # - "안전(화재)+현장(청결)" 같은 케이스는
    #   동일 station/charger/level/issue를 유지한 채
    #   type만 나눠서 2개의 레코드로 만든다.
    anomalies = []
    for a in raw_anomalies:
        t = (a.get("type") or "").strip()
        if "+" in t:
            parts = [x.strip() for x in t.split("+") if x.strip()]
            if parts:
                for part in parts:
                    a2 = dict(a)
                    a2["type"] = part
                    anomalies.append(a2)
            else:
                anomalies.append(a)
        else:
            anomalies.append(a)

    state["anomalies"] = anomalies

    # 3) 집계 스냅샷 (분리된 anomalies 기준으로 집계)
    level_dist = {"high": 0, "medium": 0, "low": 0}
    type_dist = {}

    for a in anomalies:
        lv = (a.get("level") or "").strip().lower()
        if lv in level_dist:
            level_dist[lv] += 1

        t = (a.get("type") or "").strip()
        if t:
            type_dist[t] = type_dist.get(t, 0) + 1

    state["data_snapshot"] = {
        "record_count": len(anomalies),
        "flag_counts": level_dist,
        "type_distribution": type_dist,
    }

    state["ops_snapshot"] = fetch_ops_snapshot_from_sqlite(
        db_path=DEFAULT_DB_PATH,
        table="logs",
        period_start=period_start,
        period_end=period_end,
        top_n=10,
    )

    req = fetch_requests_snapshot_from_tsv(
        tsv_path=DEFAULT_REQUEST_JOINED_TSV_PATH,
        period_start=period_start,
        period_end=period_end,
        top_n=8,
    )

    state["requests_snapshot"] = {k: v for k, v in req.items() if k != "samples"}
    state["request_samples"] = req.get("samples") or []

    # 4) 사회 이슈(조건부) - 기존 try/except 유지(추가 기록은 제거)
    try:
        extra_prompt = (state.get("extra_prompt") or "").strip()
        social = fetch_social_issues_korea_3m(extra_prompt, max_keep=12)
        state["social_issues"] = social
        state["source_status"]["social_issues_count"] = len(social)
    except Exception as e:
        state["social_issues"] = []
        state["source_errors"].append(f"social_issues_fetch_failed: {str(e)}")
        state["source_status"]["social_issues_count"] = 0

    # 5) 공식 문서 후보(공문/법령 제목 리스트) - 기존 유지
    try:
        official = fetch_official_docs_ev(max_keep=10)
        state["official_docs"] = official
        state["source_status"]["official_docs_count"] = len(official)
    except Exception as e:
        state["official_docs"] = []
        state["source_errors"].append(f"official_docs_fetch_failed: {str(e)}")
        state["source_status"]["official_docs_count"] = 0

    try:
        pdf_paths = DEFAULT_PDF_PATHS
        image_paths = DEFAULT_IMAGE_PATHS
        retriever = build_local_rag_retriever(pdf_paths=pdf_paths, image_paths=image_paths, k=4)
        state["rag_retriever"] = retriever
        state["source_status"]["local_rag_ready"] = bool(retriever)
    except Exception as e:
        state["rag_retriever"] = None
        state["source_errors"].append(f"local_rag_build_failed: {str(e)}")
        state["source_status"]["local_rag_ready"] = False

    return state

def build_outline(state: ReportState) -> ReportState:
    outline = {
        "sections": [
            "0. 감사실시 개요",
            "1. 종합 요약",
            "2. 공문/법령 취지 기반 예상 지적사항 및 미비점",
            "3. 우선순위 실행항목",
            "4. 최근 3개월 대한민국 주요 사회 이슈 요약 및 감사 연계",
            "부록. 이상 징후 표(PDF에만 포함)"
        ]
    }
    state["outline"] = json.dumps(outline, ensure_ascii=False)
    return state

def write_report(state: ReportState) -> ReportState:
    input_prompt = (state.get("input_prompt") or "").strip()
    extra_prompt = (state.get("extra_prompt") or "").strip()

    anomalies = state.get("anomalies") or []
    snapshot = state.get("data_snapshot") or {}
    social = state.get("social_issues") or []
    official = state.get("official_docs") or []

    ops_snapshot = state.get("ops_snapshot") or {}
    requests_snapshot = state.get("requests_snapshot") or {}
    request_samples = state.get("request_samples") or []

    retriever = state.get("rag_retriever")

    def rag_search(query: str, max_chars: int = 1600):
        if not retriever:
            return "", []
        try:
            docs = retriever.get_relevant_documents(query)
        except Exception:
            return "", []

        sources = []
        blocks = []
        for d in docs:
            meta = d.metadata or {}
            src = meta.get("source_file") or meta.get("source") or "local_doc"
            page = meta.get("page")
            if page is None:
                page = meta.get("page_number")
            if page is None:
                tag = f"{src}"
            else:
                tag = f"{src} p{page}"
            if tag not in sources:
                sources.append(tag)

            txt = (d.page_content or "").strip()
            if not txt:
                continue
            # 너무 길면 잘라서 넣기
            if len(txt) > 700:
                txt = txt[:700].rstrip()
            blocks.append(f"[{tag}] {txt}")

        ctx = "\n\n".join(blocks).strip()
        if len(ctx) > max_chars:
            ctx = ctx[:max_chars].rstrip()
        return ctx, sources

    # PDF 요약표
    type_dist = {} 
    for a in anomalies:
        t = (a.get("type") or "").strip()
        if t:
            type_dist[t] = type_dist.get(t, 0) + 1

    summary_rows = []
    for k, v in type_dist.items():
        summary_rows.append([str(k), str(v), ""])

    if not summary_rows:
        summary_rows = [["해당 없음", "0", ""]]

    state["summary_rows"] = summary_rows

    # PDF 상세표
    official_titles = []
    for x in official:
        official_titles.append(
            {
                "title": x.get("title", ""),
                "source_type": x.get("source_type", ""),
            }
        )

    # -------------------------
    # (C) PDF 표용 상세 테이블 데이터
    # - 근거 후보 문서: 제목 매칭(간단)
    # - 증빙 항목: LLM(에이전트)이 anomaly를 보고 생성
    # -------------------------
    top_rows = []

    # 증빙 생성용 시스템 프롬프트(짧고 엄격하게)
    evidence_system_prompt = """
너는 ‘종합감사 대비 사전점검’에서 각 문제항목에 대해 "감사 대응 시 확보해야 할 증빙(자료/기록)"을 도출하는 담당자다.

출력 규칙:
- 반드시 한국어
- 4~8개 항목만
- 목록 기호(-, *, •) 금지
- 마크다운(#, **, ``` , |) 금지
- URL/링크 금지
- 한 줄에 "항목1; 항목2; 항목3 ..." 형태로 세미콜론(;)으로만 구분
- 과도한 단정/원인 확정 금지(증빙은 일반적으로 요구되는 기록/문서 중심)
""".strip()

    for i, a in enumerate(anomalies, start=1):
        a_type = (a.get("type") or "")
        a_level = (a.get("level") or "")
        a_issue = (a.get("issue") or "")
        causes = a.get("cause_candidates") or []
        causes_text = ", ".join(causes) if causes else "-"

        text = f"{a_type} {a_issue}"

        # 1) 근거 후보 문서(제목) 간단 매칭
        rag_query = f"전기차 충전시설 {a_type} {a_issue} 점검 항목 원인 점검기록표 체크리스트"
        if causes:
            rag_query += " " + " ".join([str(x) for x in causes[:3]])

        rag_ctx, rag_sources = rag_search(rag_query, max_chars=1400)
        sources_text = ", ".join(rag_sources[:3]) if rag_sources else "-"

        # 2) ✅ 증빙 항목: 에이전트(LLM)로 생성
        #    - official_titles(제목만) + anomaly 정보를 함께 주고
        #      “감사 대응 시 확보할 증빙”을 뽑게 함
        evidence_human_prompt = f"""
[문제 항목]
구분: {a_type}
위험도: {a_level}
관측된 현상: {a_issue}
원인 후보(단정 금지): {causes_text}

[근거 후보 문서(제목만)]
{json.dumps(official_titles, ensure_ascii=False)}

[로컬 PDF/이미지 발췌]
{rag_ctx if rag_ctx else '-'}

[요청]
위 문제 항목을 감사 관점에서 확인하기 위해 일반적으로 요구될 수 있는 증빙(기록/문서/로그/사진/점검표/계약/SLA/조치이력 등)을 4~8개 도출하라.
출력은 반드시 한 줄, 세미콜론으로만 구분하라.
""".strip()

        try:
            ev_msg = llm.invoke(
                [
                    SystemMessage(content=evidence_system_prompt),
                    HumanMessage(content=evidence_human_prompt),
                ]
            )
            evidence_text = (ev_msg.content or "").strip()
        except Exception:
            evidence_text = "점검기록; 유지보수 이력; 장애/통신 로그; 사진 증빙; 조치 결과보고"

        # 후처리: 금지 문자/형식 정리(혹시라도 튀는 경우 방어)
        evidence_text = re.sub(r"https?://\S+", "", evidence_text)
        evidence_text = evidence_text.replace("```", "").replace("|", "").replace("**", "")
        evidence_text = evidence_text.replace("\n", " ").strip()

        # 너무 길면 줄이기(표 가독성)
        if len(evidence_text) > 240:
            evidence_text = evidence_text[:240].rstrip()

        top_rows.append(
            [
                str(i),
                a.get("station_id", ""),
                a.get("charger_id", ""),
                a_type,
                a_level,
                a_issue,
                causes_text,
                sources_text,    # 근거 후보 문서
                evidence_text,   # ✅ 에이전트가 생성한 증빙 항목
            ]
        )

    state["top_rows"] = top_rows

    # -------------------------
    # (D) 보고서 본문 생성(기존 로직 유지)
    # -------------------------
    social_titles = []
    for x in social:
        social_titles.append({"title": x.get("title", ""), "published": x.get("published", "")})

    system_prompt = """
너는 ‘전기차 충전소 관리자 종합감사 대비 사전점검 보고서’ 작성자다.

최우선 규칙
1) 사용자의 추가 프롬프트가 항상 최우선이다. 충돌 시 추가 프롬프트를 따른다.
2) 이상 데이터는 징후/단서이며, 지적사항은 공문/법령/행정규칙의 취지 관점에서 구체적으로 확장한다.
3) 원인 후보는 단정하지 말고 가능성으로만 표현한다.

출력 금지
1) 마크다운 문법(#, **, |, ```), 하이픈/별표 목록, 본문 URL/링크/출처 나열
2) 텍스트 표(문자 기반 표) 및 표를 본문에 재현하는 행위

출력 형식
1. 종합 요약:
3~6문장.

2. 공문/법령 취지 기반 예상 지적사항 및 미비점:
(1)~(8) 번호를 붙여 작성. 각 항목 3~6문장.
‘현상 → 왜 지적되는지(취지) → 확인해야 할 증빙(개념적으로) → 즉시조치 → 재발방지’ 순서 유지.

3. 우선순위 실행항목:
(1)~(5), 각 1~2문장.

4. 최근 3개월 대한민국 주요 사회 이슈 요약 및 감사 연계:
사회 이슈가 없으면 생략. (5~8줄)

주의: 본문에는 표를 넣지 마라. 표는 PDF 부록으로만 제공된다.
""".strip()

    human_prompt = f"""
[사용자 요청]
{input_prompt}

[추가 프롬프트]
{extra_prompt}

[운영 로그 요약(joined_logs.sqlite)]
{json.dumps(ops_snapshot, ensure_ascii=False)}

[민원 요약(request_joined.tsv)]
{json.dumps(requests_snapshot, ensure_ascii=False)}

[민원 사례 상위]
{json.dumps(request_samples[:5], ensure_ascii=False)}

[이상 데이터]
{json.dumps(anomalies, ensure_ascii=False)}

[집계 스냅샷]
{json.dumps(snapshot, ensure_ascii=False)}

[공식문서 후보(제목만)]
{json.dumps(official_titles, ensure_ascii=False)}

[사회이슈 후보(제목/시점만)]
{json.dumps(social_titles, ensure_ascii=False)}

[감사보고서 틀 참고(로컬 PDF 발췌)]
{rag_search("감사실시 개요 감사대상 및 중점사항 감사결과 총괄 종합 의견 주요 지적사항 목차", max_chars=1800)[0]}
""".strip()

    msg = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)])
    draft = (msg.content or "").strip()

    draft = re.sub(r"https?://\S+", "", draft)
    
    # ✅ 화살표/유사 기호 제거(강제)
    draft = draft.replace("→", " ")
    draft = draft.replace("⇒", " ")
    draft = draft.replace("→", " ")
    draft = draft.replace("->", " ")
    draft = draft.replace("=>", " ")

    # (혹시 유니코드 화살표류가 더 섞이면 같이 제거)
    for sym in ["➜", "➔", "➡", "⟶", "⟹", "⟶", "⟵", "⟶"]:
        draft = draft.replace(sym, " ")

    # 기존 방어
    draft = draft.replace("```", "").replace("|", "").replace("**", "")

    # 공백 정리
    draft = re.sub(r"[ \t]{2,}", " ", draft)
    draft = re.sub(r"\n{3,}", "\n\n", draft)

    state["draft"] = draft.strip()

    return state

from langchain_core.messages import SystemMessage, HumanMessage

def review_report(state: ReportState) -> ReportState:
    draft = (state.get("draft") or "").strip()
    anomalies = state.get("anomalies") or []
    official_docs = state.get("official_docs") or []
    social_issues = state.get("social_issues") or []

    reflect_count = int(state.get("reflect_count") or 0)
    max_reflect = int(state.get("max_reflect") or 0)
    score = int(state.get("review_score") or 80)

    problems = []

    if len(draft) > 2200:
        problems.append("length_over")
    if re.search(r"https?://", draft):
        problems.append("contains_url")
    if any(x in draft for x in ["```", "|", "**"]):
        problems.append("markdown_fragments")
    if re.search(r"(?m)^\s*[-*]\s+", draft):
        problems.append("bullet_list")
    if re.search(r"(?m)^\s*[A-Z]\.\s*", draft):
        problems.append("alpha_heading")

    for a in anomalies:
        iss = (a.get("issue") or "").strip()
        if iss and (iss not in draft):
            problems.append("missing_anomaly_issue")
            break

    official_titles = []
    for d in official_docs:
        title = (d.get("title") or "").strip()
        if title:
            official_titles.append(title)
    official_titles = official_titles[:12]

    if official_titles:
        hit = 0
        used = set()
        for t in official_titles:
            if t in draft and t not in used:
                used.add(t)
                hit += 1
        if hit < min(3, len(official_titles)):
            problems.append("official_docs_not_reflected")

    social_titles = []
    for s in social_issues:
        tt = (s.get("title") or "").strip()
        if tt:
            social_titles.append(tt)
    social_titles = social_titles[:12]

    if social_titles:
        need = min(6, len(social_titles))
        hit = 0
        used = set()
        for t in social_titles:
            if t in draft and t not in used:
                used.add(t)
                hit += 1
        if hit < need:
            problems.append("social_issues_not_reflected")

    is_fail = False
    hard_fail = {"contains_url", "markdown_fragments", "bullet_list", "alpha_heading"}
    for p in problems:
        if p in hard_fail:
            is_fail=True
            break

    judge_score = 0
    judge_pass = False
    judge_note = []
    judge_rewrite = ""

    try:
        judge_system = """
너는 '보고서 품질 심사관(LLM Judge)'이다.
입력된 보고서 본문(draft)이 아래 요구를 얼마나 만족하는지 0~100점으로 채점하고,
부족하면 재작성 지시를 내린다.

반드시 아래 JSON만 출력하라(추가 텍스트 금지).
스키마:
{
  "total_score": 0-100,
  "pass": true/false,
  "subscores": {
    "structure": 0-100,
    "coverage": 0-100,
    "grounding": 0-100,
    "actionability": 0-100,
    "clarity": 0-100
  },
  "fail_reasons": ["..."],
  "rewrite_instructions": "..."
}

평가 기준(요약):
- structure: 1~4 섹션 구조, 2번은 (1)~(8) 형태 유지 여부
- coverage: anomalies(충전소/충전기/이슈) 누락 없이 반영 여부
- grounding: 공식 문서 제목/사회이슈 제목을 '본문에' 규칙대로 반영했는지
- actionability: 감사 관점에서 점검/조치가 구체적인지
- clarity: 장황하지 않고 읽기 쉬운지, 금지요소(링크/마크다운/목록/텍스트표/영문머릿말) 회피 여부

pass 판정은 임계값(score) 이상이면 true로 하라.
""".strip()

        judge_human = f"""
score={score}

[anomalies]
{json.dumps(anomalies, ensure_ascii=False)}

[official_titles]
{json.dumps(official_titles, ensure_ascii=False)}

[social_titles]
{json.dumps(social_titles, ensure_ascii=False)}

[draft]
{draft}
""".strip()

        jmsg = llm.invoke([SystemMessage(content=judge_system), HumanMessage(content=judge_human)])
        raw = (jmsg.content or "").strip()

        m = re.search(r"\{.*\}", raw, flags=re.S)
        payload = json.loads(m.group(0) if m else raw)

        judge_score = int(payload.get("total_score") or 0)
        judge_pass = bool(payload.get("pass"))
        judge_notes = payload.get("fail_reasons") or []
        judge_rewrite = (payload.get("rewrite_instructions") or "").strip()

    except Exception as e:
        # judge 실패 시: 기존 rule 기반으로만 판단
        state["judge_error"] = str(e)

    # 기록(디버깅용)
    state["review_score"] = score
    state["review_score"] = judge_score
    state["review_judge_pass"] = judge_pass
    state["review_judge_notes"] = judge_notes


    # 통과 조건:
    # - 하드 위반 없음
    passed = (not is_fail) and (judge_pass or judge_score >= score)

    if not passed and reflect_count < max_reflect:
        state["reflect_count"] = reflect_count + 1
        state["next_step"] = "write_report"

        # 재작성 지시는 input_prompt에 “한 번만” 덧붙이기 (무한 누적 방지)
        if not state.get("rewrite_hint_added"):
            ip = (state.get("input_prompt") or "").strip()

            # judge가 준 지시가 있으면 그걸 우선 사용
            hint = judge_rewrite if judge_rewrite else (
                "재작성 지시: 형식(1~4, 2번은 (1)~(8))을 유지하고, 제공된 사례(충전소/충전기/이슈)를 빠짐없이 반영하며, "
                "공식 문서 제목과 사회 이슈 제목을 규칙대로 본문에 포함하라. 마크다운/링크/목록/영문머릿말 금지."
            )
            ip += "\n\n" + hint
            state["input_prompt"] = ip
            state["rewrite_hint_added"] = True

        state["review"] = "REWRITE"
        state["review_problems"] = problems
        return state

    # 반복횟수 소진이면 경고로 PDF 진행
    state["next_step"] = "generate_pdf"
    state["review"] = "OK" if passed else "OK_WITH_WARN"
    state["review_problems"] = problems
    return state

    # if problems and reflect_count < max_reflect:
    #     state["reflect_count"] = reflect_count + 1
    #     state["next_step"] = "write_report"

    #     ip = (state.get("input_prompt") or "").strip()
    #     ip += "\n\n재작성 지시: 형식(1~4, 2번은 (1)~(8))을 유지하고, 제공된 사례(충전소/충전기/이슈)를 빠짐없이 반영하며, 공식 문서 제목과 사회 이슈 제목을 규칙대로 본문에 포함하라. 마크다운/링크/목록/영문머릿말 금지."
    #     state["input_prompt"] = ip

    #     state["review"] = "REWRITE"
    #     state["review_problems"] = problems
    #     return state

    # state["next_step"] = "generate_pdf"
    # state["review"] = "OK" if not problems else "OK_WITH_WARN"
    # state["review_problems"] = problems
    # return state


def should_reflect(state: ReportState) -> str:
    return state.get("next_step", "generate_pdf")

def generate_pdf(state: ReportState) -> ReportState:
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfbase import pdfmetrics

    pdf_path = (state.get("pdf_path") or "audit_report.pdf").strip()

    folder = os.path.dirname(pdf_path)
    if folder:
        os.makedirs(folder, exist_ok=True)

    font_name = "Helvetica"
    try:
        malgun = r"C:\Windows\Fonts\malgun.ttf"
        if os.path.exists(malgun):
            pdfmetrics.registerFont(TTFont("Malgun", malgun))
            font_name = "Malgun"
    except Exception:
        font_name = "Helvetica"

    styles = getSampleStyleSheet()

    base = ParagraphStyle(
        "base",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=10,
        leading=14,
        spaceAfter=6,
    )
    title_style = ParagraphStyle(
        "title",
        parent=styles["Title"],
        fontName=font_name,
        fontSize=14,
        leading=18,
        spaceAfter=10,
    )

    # ✅ 표 셀용(작게 + 줄바꿈 안정화)
    cell = ParagraphStyle(
        "cell",
        parent=base,
        fontName=font_name,
        fontSize=8.5,
        leading=10.5,
        spaceAfter=0,
    )

    doc = SimpleDocTemplate(pdf_path, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    story = []

    story.append(Paragraph("전기차 충전소 관리자 종합감사 대비 사전점검 보고서", title_style))
    story.append(Spacer(1, 6))

    draft = (state.get("draft") or "").strip()
    for line in draft.split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 6))
            continue
        story.append(Paragraph(line, base))

    story.append(Spacer(1, 10))
    story.append(Paragraph("이상 징후 요약", ParagraphStyle("h", parent=base, fontSize=11, leading=15, spaceAfter=6)))

    summary_rows = state.get("summary_rows") or []
    summary_table = Table([["구분", "건수", "비고"]] + summary_rows, colWidths=[90, 60, 330])
    summary_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONT", (0, 0), (-1, -1), font_name),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(summary_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("주요 이상 징후 상세", ParagraphStyle("h2", parent=base, fontSize=11, leading=15, spaceAfter=6)))

    # ✅ Paragraph로 감싸서 자동 줄바꿈
    top_rows = state.get("top_rows") or []
    header = ["충전소", "충전기", "등급", "구분", "이슈", "원인 후보", "필요 증빙"]

    wrapped = []
    for r in top_rows:
        wrapped.append(
            [
                Paragraph(str(r[0]), cell),
                Paragraph(str(r[1]), cell),
                Paragraph(str(r[2]), cell),
                Paragraph(str(r[3]), cell),
                Paragraph(str(r[4]), cell),
                Paragraph(str(r[5]), cell),
                Paragraph(str(r[6]), cell),
            ]
        )

    # ✅ 폭 조정(겹침 방지): 이슈/증빙을 넓히고 나머지 축소
    top_table = Table(
        [[Paragraph(h, cell) for h in header]] + wrapped,
        colWidths=[45, 40, 32, 38, 135, 110, 140],
        repeatRows=1,
    )

    top_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(top_table)

    doc.build(story)
    state["pdf_path"] = pdf_path
    return state

def build_graph() -> StateGraph:
    graph = StateGraph(ReportState)

    graph.add_node("load_data", load_data)
    graph.add_node("build_outline", build_outline)
    graph.add_node("write_report", write_report)
    graph.add_node("review_report", review_report)
    graph.add_node("generate_pdf", generate_pdf)

    graph.set_entry_point("load_data")
    graph.add_edge("load_data", "build_outline")
    graph.add_edge("build_outline", "write_report")
    graph.add_edge("write_report", "review_report")

    graph.add_conditional_edges(
        "review_report",
        should_reflect,
        {"write_report": "write_report", "generate_pdf": "generate_pdf"},
    )

    graph.add_edge("generate_pdf", END)
    return graph

