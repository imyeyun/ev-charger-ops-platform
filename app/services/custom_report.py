import pandas as pd
import numpy as np
import os, re, json, csv, sqlite3, hashlib
from datetime import datetime
import openai
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage, ToolMessage
from langchain_core.runnables import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.tools import tool
from pathlib import Path

import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END
from IPython.display import Image, display
from pydantic import BaseModel, Field

from langchain_core.runnables.history import RunnableWithMessageHistory

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


import app.services.module.BuildOutline as BuildOutline
import app.services.module.WriteReport as WriteReport
import app.services.module.GeneratePDF as GeneratePDF

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
DEFAULT_PREPARED_DB_PATH = (
    Path(__file__).resolve().parent.parent
    / "artifacts" / "cache" / "prepared_logs.sqlite"
).as_posix()
DEFAULT_CHART_DIR = (
    Path(__file__).resolve().parent.parent
    / "artifacts" / "charts"
).as_posix()
OUTPUT_PDF_DIR = (
    Path(__file__).resolve().parent.parent
    / "artifacts" / "custom_report.pdf"
).as_posix()

class ReportState(TypedDict):
    input_prompt: str
    table_of_contents: dict
    outline_mode: bool
    outline_llm: Any
    temp_session: str
    review : str
    report_markdown : str
    start_time : str
    end_time : str

def custom_report_main(input_prompt: str, start_time: Optional[str] = None, end_time: Optional[str] = None) -> ReportState:
    initial_state: ReportState = {
            "input_prompt": input_prompt,
            "outline_mode": True,
            "outline_llm": None,
            "start_time": start_time,
            "end_time": end_time
        }

    graph = build_graph()
    compiled = graph.compile()
    compiled.invoke(initial_state)


def build_outline(state: ReportState) -> ReportState:
    return BuildOutline.build_outline(state)

def write_report(state: ReportState) -> ReportState:
    temp_state: WriteReport.ReportState = {
        "input_prompt": "기본적인 전기차 충전소 충전기 보고서 만들어줘",
        "table_of_contents": state["table_of_contents"],
        "db_path": DEFAULT_DB_PATH,
        "multimodal_tsv_path": DEFAULT_MULTIMODAL_TSV_PATH,
        "request_joined_tsv_path": DEFAULT_REQUEST_JOINED_TSV_PATH,
        "prepared_db_path": DEFAULT_PREPARED_DB_PATH,
        "chart_dir": DEFAULT_CHART_DIR,
        # log_time 기준 분석 구간. None이면 전체 기간 사용.
        # 예: "2026-01-01 00:00:00", "2026-01-31 23:59:59"
        "analysis_start_time": state.get("start_time", "2026-01-15 00:00:00"),
        "analysis_end_time": state.get("end_time", "2026-01-17 23:59:59"),
        "report_llm": None,
        "max_concurrency": 3,
    }
    # TODO: write the report using the outline and input prompt
    # TODO: 목차와 입력 프롬프트로 보고서를 작성

    t_out_state=WriteReport.run_report_with_graph(temp_state)
    state["report_markdown"] = t_out_state["report_markdown"]
    return state


def review_report(state: ReportState) -> ReportState:
    # TODO: check whether the report is appropriate and consistent
    # TODO: 보고서의 적절성과 일관성을 검사
    state["review"] = "final"
    return state


def should_reflect(state: ReportState) -> str:
    # TODO: decide whether to loop back based on review result and count
    # TODO: 리뷰 결과와 회수에 따라 루프 여부 결정
    # TODO: stop reflecting after 3 revisions
    # TODO: 3회 반영 후에는 종료
    # TODO: return "write_report" to reflect or "generate_pdf" to finalize
    # TODO: "write_report"로 반영하거나 "generate_pdf"로 종료하도록 반환
    needs_revision = state.get("review", "").strip().lower() == "revise"
    revision_count = state.get("revision_count", 0)
    if needs_revision and revision_count < 3:
        return "write_report"
    return "generate_pdf"


def generate_pdf(state: ReportState) -> ReportState:
    # TODO: render final report content and export to PDF
    # TODO: 최종 보고서 내용을 렌더링하고 PDF로 내보내기
    GeneratePDF.generate_pdf(state["report_markdown"], OUTPUT_PDF_DIR)
    return state


def build_graph() -> StateGraph:
    graph = StateGraph(ReportState)

    graph.add_node("build_outline", build_outline)
    graph.add_node("write_report", write_report)
    graph.add_node("review_report", review_report)
    graph.add_node("generate_pdf", generate_pdf)

    graph.set_entry_point("build_outline")
    graph.add_edge("build_outline", "write_report")
    graph.add_edge("write_report", "review_report")
    graph.add_conditional_edges(
        "review_report",
        should_reflect,
        {"write_report": "write_report", "generate_pdf": "generate_pdf"},
    )
    graph.add_edge("generate_pdf", END)

    return graph


if __name__ == "__main__":

    input_prompt = "기본적인 전기차 충전소 충전기 보고서 만들어줘"
    report_main(input_prompt, "2026-01-15 00:00:00", "2026-01-17 23:59:59")