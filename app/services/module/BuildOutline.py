import pandas as pd
import numpy as np
import os
import re
import openai
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from langchain_core.runnables import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory

import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from typing import Any, Dict, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END
from IPython.display import Image, display

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from langchain_core.runnables.history import RunnableWithMessageHistory

class ReportState(TypedDict):
    input_prompt: str
    table_of_contents: dict
    outline_mode: bool
    outline_llm: Any
    temp_session: str


class TocSection(BaseModel):
    title: str = Field(..., description="목차 제목")
    content: Optional[Any] = Field(
        None,
        description="목차 내용(세부 목차가 있으면 None)",
    )
    subsections: Optional[List["TocSection"]] = Field(
        None,
        description="같은 구조의 세부 목차 목록",
    )

    @classmethod
    def _validate_structure(cls, values):
        subsections = values.get("subsections")
        content = values.get("content")
        if subsections and content is not None:
            raise ValueError("content must be None when subsections are present")
        return values


def cond_outline_mode(state: ReportState) -> str:
    return "true" if state.get("outline_mode", False) else "false"


def check_outline_related(state: ReportState) -> ReportState:
    text = state.get("input_prompt", "")

    chain = state["outline_llm"]

    class OutlineRelatedResult(BaseModel): outline_related: bool = Field(..., description="사용자가 이미 목차를 제공했는지 여부")
    
    outline_related_parser = PydanticOutputParser(pydantic_object=OutlineRelatedResult)
    prompt_text = (
        """
        너는 사용자 요청을 분석하는 분류기다.
        다음 기준에 따라 true 또는 false만 출력하라.

        의미 정의:
        - true → 사용자가 이미 목차를 제공했으므로 생성하지 않음
        - false  → LLM이 보고서의 목차를 새로 생성해야 함

        판단 기준:
        - 사용자가 보고서의 목차(항목 목록, 번호가 매겨진 구조, 섹션 리스트 등)를 명시적으로 제공했으면 true
        - "목차를 만들어", "구성해", "알아서 구조를 잡아" 등의 표현이 있으면 false
        - 보고서 작성 요청이지만 목차가 전혀 주어지지 않았으면 false
        - 목차만 요청해도 false
        """
        f"{outline_related_parser.get_format_instructions()}\n"
        f"사용자 프롬프트: {text}"
    )
    session_id = state.get("temp_session")
    raw = chain.invoke(
        {"input": prompt_text},
        config={"configurable": {"session_id": session_id}},
    )
    result = outline_related_parser.parse(raw.content)
    updated = dict(state)
    updated["outline_mode"] = result.outline_related
    # print(result.outline_related)
    return updated


def personal_outline(state: ReportState) -> ReportState:
    text = state.get("input_prompt", "")
    chain = state.get("outline_llm")
    
    class TableOfContents(BaseModel): sections: List[TocSection] = Field(..., description="최상위 목차 목록")

    parser = PydanticOutputParser(pydantic_object=TableOfContents)
    prompt = (
        "전기차 충전소 충전기 보고서의 개인 목차를 작성하세요. "
        "세부 목차가 있으면 상위 목차의 content는 None으로 두세요. "
        "지정된 출력 형식만 반환하세요.\n"
        f"{parser.get_format_instructions()}\n"
        f"사용자 프롬프트: {text}"
    )
    session_id = state.get("temp_session")
    raw = chain.invoke(
        {"input": prompt},
        config={"configurable": {"session_id": session_id}},
    )
    toc = parser.parse(raw.content)
    updated = dict(state)
    updated["table_of_contents"] = toc.dict()
    return updated


def check_all_request(state: ReportState) -> ReportState:
    text = state.get("input_prompt", "")
    chain = state.get("outline_llm")

    class AllRequestResult(BaseModel): all_request: bool = Field(..., description="사용자가 모든/전부/전체 범위를 요청하는지 여부")
    
    all_request_parser = PydanticOutputParser(pydantic_object=AllRequestResult)
    prompt_text = (
        """
        너는 사용자 요청을 분석해 보고서의 "완결 수준"을 판단하는 분류기다.

        다음 기준에 따라 true 또는 false만 출력하라.

        의미 정의:
        - true  : 모든 주요 분석 영역을 포함한 완결된 보고서를 요구함
        - false : 핵심 요약 중심의 기본 보고서를 요구함

        true 로 판단하는 경우:
        - "전체 보고서", "전체 분석", "종합 분석", "전반적인 분석"
        - "상세 보고서", "심층 분석", "모든 항목을 포함"
        - "빠짐없이", "전부 다", "완전한 형태로"
        - "최종 보고서", "풀 버전", "full report"의 의미가 포함됨

        false 로 판단하는 경우:
        - "보고서 작성해줘" 처럼 일반적인 요청
        - "요약", "개요", "간단히", "핵심만"
        - 특정 영역만 언급됨 (예: 안전만, 민원만)
        - 범위나 깊이에 대한 명시가 없음
        """
        "지정된 출력 형식만 반환하세요.\n"
        f"{all_request_parser.get_format_instructions()}\n"
        f"사용자 프롬프트: {text}"
    )
    session_id = state.get("temp_session")
    raw = chain.invoke(
        {"input": prompt_text},
        config={"configurable": {"session_id": session_id}},
    )
    result = all_request_parser.parse(raw.content)
    updated = dict(state)
    updated["outline_mode"] = result.all_request
    # print(result.all_request)
    return updated


def all_outline(state: ReportState) -> ReportState:
    updated = dict(state)
    updated["table_of_contents"] = {'sections': [{'title': '1. 서론', 'content': None, 'subsections': [{'title': '1.1 보고서 목적 및 활용 시나리오', 'content': None, 'subsections': None}, {'title': '1.2 분석 범위 및 기준(지역·기간)', 'content': None, 'subsections': None}]}, {'title': '2. 충전 인프라 구성 및 변화 추이', 'content': None, 'subsections': [{'title': '2.1 충전소·충전기 수의 기간별 변화', 'content': None, 'subsections': None}, {'title': '2.2 지역별 충전 인프라 분포 비교', 'content': None, 'subsections': None}, {'title': '2.3 인프라 변화가 두드러진 지역 사례', 'content': None, 'subsections': None}]}, {'title': '3. 충전소 이용 현황 분석', 'content': None, 'subsections': [{'title': '3.1 전체 충전 이용 추세(기간별)', 'content': None, 'subsections': None}, {'title': '3.2 지역별 이용 수준 비교', 'content': None, 'subsections': None}, {'title': '3.3 장기 미사용 충전소 집중 지역', 'content': None, 'subsections': None}]}, {'title': '4. 충전기 상태 및 가동률 분석', 'content': None, 'subsections': [{'title': '4.1 가동률의 기간별 변화', 'content': None, 'subsections': None}, {'title': '4.2 지역별 가동률 수준 비교', 'content': None, 'subsections': None}, {'title': '4.3 가동률 급변 지역의 기간별 패턴', 'content': None, 'subsections': None}]}, {'title': '5. 안전 및 고장 리스크 분석', 'content': None, 'subsections': [{'title': '5.1 지역별 위험 수준 비교', 'content': None, 'subsections': None}, {'title': '5.2 주요 고위험 지역의 기간별 변화', 'content': None, 'subsections': None}, {'title': '5.3 반복 위험 발생 지역 사례', 'content': None, 'subsections': None}]}, {'title': '6. 품질 및 운영 환경 분석', 'content': None, 'subsections': [{'title': '6.1 청결 및 품질 지표의 기간별 변화', 'content': None, 'subsections': None}, {'title': '6.2 품질 저하 지역 분포', 'content': None, 'subsections': None}, {'title': '6.3 품질 급변 사례 분석(지역·기간 교차)', 'content': None, 'subsections': None}]}, {'title': '7. 민원 시계열 분석', 'content': None, 'subsections': [{'title': '7.1 민원 발생 추이 및 주요 유형', 'content': None, 'subsections': None}, {'title': '7.2 민원 처리 상태 및 처리 리드타임', 'content': None, 'subsections': None}, {'title': '7.3 민원과 안전·고장 리스크의 연관성', 'content': None, 'subsections': None}]}, {'title': '8. 종합 판단 및 의사결정 포인트', 'content': None, 'subsections': [{'title': '8.1 핵심 이슈 요약(지역·기간 관점)', 'content': None, 'subsections': None}, {'title': '8.2 우선 조치 대상 지역 및 충전소', 'content': None, 'subsections': None}, {'title': '8.3 단기·중기 운영 개선 방향', 'content': None, 'subsections': None}]}]}
    return updated


def check_basic_request(state: ReportState) -> ReportState:
    text = state.get("input_prompt", "")
    chain = state.get("outline_llm")

    class BasicRequestResult(BaseModel): basic_request: bool = Field(..., description="기본/디폴트 수준의 보고서만 요청했는지 여부")

    basic_request_parser = PydanticOutputParser(pydantic_object=BasicRequestResult)
    prompt_text = (
        """
        너는 사용자 요청을 분석해 보고서의 요청 수준이 기본/디폴트인지 판단하는 분류기다.

        다음 기준에 따라 true 또는 false만 출력하라.

        의미 정의:
        - true  : 기본/디폴트 수준의 보고서 요청(추가 요구 없음)
        - false : 특정 목차만 요구하거나 기본 목차에 추가 요구가 있음

        true 로 판단하는 경우:
        - "보고서 작성해줘", "보고서 만들어줘" 처럼 일반적 요청
        - "기본", "디폴트", "표준" 수준을 명시
        - 범위나 깊이에 대한 추가 요구가 없음

        false 로 판단하는 경우:
        - 특정 영역만 언급됨 (예: 안전만, 민원만)
        - "여기에 추가로", "이것도 포함" 등 추가 요구
        - 기본 목차 외 추가 세부 목차 요청
        """
        "지정된 출력 형식만 반환하세요.\n"
        f"{basic_request_parser.get_format_instructions()}\n"
        f"사용자 프롬프트: {text}"
    )
    session_id = state.get("temp_session")
    raw = chain.invoke(
        {"input": prompt_text},
        config={"configurable": {"session_id": session_id}},
    )
    result = basic_request_parser.parse(raw.content)
    updated = dict(state)
    updated["outline_mode"] = result.basic_request
    # print(result.basic_request)
    return updated


def basic_outline(state: ReportState) -> ReportState:
    updated = dict(state)
    updated["table_of_contents"] = {'sections': [{'title': '1. 서론', 'content': None, 'subsections': [{'title': '1.1 보고서 목적 및 활용 시나리오', 'content': None, 'subsections': None}, {'title': '1.2 분석 범위 및 기준(지역·기간)', 'content': None, 'subsections': None}]}, {'title': '2. 충전 인프라 구성 및 변화 추이', 'content': None, 'subsections': [{'title': '2.1 충전소·충전기 수의 기간별 변화', 'content': None, 'subsections': None}]}, {'title': '3. 충전소 이용 현황', 'content': None, 'subsections': [{'title': '3.1 전체 충전 이용 추세(기간별)', 'content': None, 'subsections': None}]}, {'title': '4. 충전기 상태 및 가동률', 'content': None, 'subsections': [{'title': '4.1 가동률의 기간별 변화', 'content': None, 'subsections': None}]}, {'title': '5. 안전 및 고장 리스크', 'content': None, 'subsections': [{'title': '5.1 지역별 위험 수준 비교', 'content': None, 'subsections': None}]}, {'title': '6. 종합 판단 및 의사결정 포인트', 'content': None, 'subsections': [{'title': '6.1 핵심 이슈 요약(지역·기간 관점)', 'content': None, 'subsections': None}, {'title': '6.2 우선 조치 대상 지역 및 충전소', 'content': None, 'subsections': None}, {'title': '6.3 단기·중기 운영 개선 방향', 'content': None, 'subsections': None}]}]}
    return updated

def iterate_and_decide(state: ReportState) -> ReportState:
    text = state.get("input_prompt", "")

    class SectionSelectResult(BaseModel): include: bool = Field(..., description="해당 목차를 포함해야 하는지 여부")

    selector = PydanticOutputParser(pydantic_object=SectionSelectResult)

    full_toc = {'sections': [{'title': '1. 서론', 'content': None, 'subsections': [{'title': '1.1 보고서 목적 및 활용 시나리오', 'content': None, 'subsections': None}, {'title': '1.2 분석 범위 및 기준(지역·기간)', 'content': None, 'subsections': None}]}, {'title': '2. 충전 인프라 구성 및 변화 추이', 'content': None, 'subsections': [{'title': '2.1 충전소·충전기 수의 기간별 변화', 'content': None, 'subsections': None}, {'title': '2.2 지역별 충전 인프라 분포 비교', 'content': None, 'subsections': None}, {'title': '2.3 인프라 변화가 두드러진 지역 사례', 'content': None, 'subsections': None}]}, {'title': '3. 충전소 이용 현황 분석', 'content': None, 'subsections': [{'title': '3.1 전체 충전 이용 추세(기간별)', 'content': None, 'subsections': None}, {'title': '3.2 지역별 이용 수준 비교', 'content': None, 'subsections': None}, {'title': '3.3 장기 미사용 충전소 집중 지역', 'content': None, 'subsections': None}]}, {'title': '4. 충전기 상태 및 가동률 분석', 'content': None, 'subsections': [{'title': '4.1 가동률의 기간별 변화', 'content': None, 'subsections': None}, {'title': '4.2 지역별 가동률 수준 비교', 'content': None, 'subsections': None}, {'title': '4.3 가동률 급변 지역의 기간별 패턴', 'content': None, 'subsections': None}]}, {'title': '5. 안전 및 고장 리스크 분석', 'content': None, 'subsections': [{'title': '5.1 지역별 위험 수준 비교', 'content': None, 'subsections': None}, {'title': '5.2 주요 고위험 지역의 기간별 변화', 'content': None, 'subsections': None}, {'title': '5.3 반복 위험 발생 지역 사례', 'content': None, 'subsections': None}]}, {'title': '6. 품질 및 운영 환경 분석', 'content': None, 'subsections': [{'title': '6.1 청결 및 품질 지표의 기간별 변화', 'content': None, 'subsections': None}, {'title': '6.2 품질 저하 지역 분포', 'content': None, 'subsections': None}, {'title': '6.3 품질 급변 사례 분석(지역·기간 교차)', 'content': None, 'subsections': None}]}, {'title': '7. 민원 시계열 분석', 'content': None, 'subsections': [{'title': '7.1 민원 발생 추이 및 주요 유형', 'content': None, 'subsections': None}, {'title': '7.2 민원 처리 상태 및 처리 리드타임', 'content': None, 'subsections': None}, {'title': '7.3 민원과 안전·고장 리스크의 연관성', 'content': None, 'subsections': None}]}, {'title': '8. 종합 판단 및 의사결정 포인트', 'content': None, 'subsections': [{'title': '8.1 핵심 이슈 요약(지역·기간 관점)', 'content': None, 'subsections': None}, {'title': '8.2 우선 조치 대상 지역 및 충전소', 'content': None, 'subsections': None}, {'title': '8.3 단기·중기 운영 개선 방향', 'content': None, 'subsections': None}]}]}
    basic_toc = {'sections': [{'title': '1. 서론', 'content': None, 'subsections': [{'title': '1.1 보고서 목적 및 활용 시나리오', 'content': None, 'subsections': None}, {'title': '1.2 분석 범위 및 기준(지역·기간)', 'content': None, 'subsections': None}]}, {'title': '2. 충전 인프라 구성 및 변화 추이', 'content': None, 'subsections': [{'title': '2.1 충전소·충전기 수의 기간별 변화', 'content': None, 'subsections': None}]}, {'title': '3. 충전소 이용 현황', 'content': None, 'subsections': [{'title': '3.1 전체 충전 이용 추세(기간별)', 'content': None, 'subsections': None}]}, {'title': '4. 충전기 상태 및 가동률', 'content': None, 'subsections': [{'title': '4.1 가동률의 기간별 변화', 'content': None, 'subsections': None}]}, {'title': '5. 안전 및 고장 리스크', 'content': None, 'subsections': [{'title': '5.1 지역별 위험 수준 비교', 'content': None, 'subsections': None}]}, {'title': '6. 종합 판단 및 의사결정 포인트', 'content': None, 'subsections': [{'title': '6.1 핵심 이슈 요약(지역·기간 관점)', 'content': None, 'subsections': None}, {'title': '6.2 우선 조치 대상 지역 및 충전소', 'content': None, 'subsections': None}, {'title': '6.3 단기·중기 운영 개선 방향', 'content': None, 'subsections': None}]}]}

    system_prompt = (
        "너는 사용자 프롬프트에 따라 목차 포함 여부를 판단하는 분류기다. "
        "기본 목차와 전체 목차를 참고해 판단하라.\n"
        f"기본 목차: {basic_toc}\n"
        f"전체 목차: {full_toc}"
    )
    system_prompt = system_prompt.replace("{", "{{").replace("}", "}}")
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder("history"),
        ("human", "{input}"),
    ])
    base_chain = prompt | ChatOpenAI(model_name="gpt-4.1-mini")
    store: Dict[str, InMemoryChatMessageHistory] = {}

    def get_history(session_id: str) -> InMemoryChatMessageHistory:
        if session_id not in store:
            store[session_id] = InMemoryChatMessageHistory()
        return store[session_id]

    chain = RunnableWithMessageHistory(
        base_chain,
        get_history,
        input_messages_key="input",
        history_messages_key="history",
    )

    def decide_include(title: str) -> bool:
        prompt_text = (
            "사용자 프롬프트가 다음 목차를 포함해야 하는지 판단하세요. "
            "지정된 출력 형식만 반환하세요.\n"
            f"{selector.get_format_instructions()}\n"
            f"사용자 프롬프트: {text}\n"
            f"목차 제목: {title}"
        )
        session_id = state.get("temp_session")
        raw = chain.invoke(
            {"input": prompt_text},
            config={"configurable": {"session_id": session_id}},
        )
        result = selector.parse(raw.content)
        return result.include

    selected = {"sections": []}
    for sec in full_toc["sections"]:
        if not decide_include(sec["title"]):
            continue
        new_sec = {"title": sec["title"], "content": None, "subsections": []}
        for sub in sec.get("subsections", []):
            if decide_include(sub["title"]):
                new_sec["subsections"].append({
                    "title": sub["title"],
                    "content": None,
                    "subsections": None,
                })
        if not new_sec["subsections"]:
            new_sec["subsections"] = None
        selected["sections"].append(new_sec)

    updated = dict(state)
    updated["table_of_contents"] = selected
    return updated


def renumber_sections(state: ReportState) -> ReportState:
    toc = state.get("table_of_contents") or {}
    sections = toc.get("sections", [])

    def strip_numbering(title: str) -> str:
        return re.sub(r"^\d+(?:\.\d+)*\.?\s+", "", title).strip()

    def renumber_section(section, index_prefix):
        title = section.get("title", "")
        section["title"] = f"{index_prefix}. {strip_numbering(title)}"

        subsections = section.get("subsections")
        if subsections:
            for i, sub in enumerate(subsections, start=1):
                sub_title = sub.get("title", "")
                sub["title"] = f"{index_prefix}.{i} {strip_numbering(sub_title)}"
        return section

    for i, sec in enumerate(sections, start=1):
        renumber_section(sec, i)

    updated = dict(state)
    updated["table_of_contents"] = toc
    return updated


def fill_leaf_contents(state: ReportState) -> ReportState:
    toc = state.get("table_of_contents") or {}
    sections = toc.get("sections", [])

    class LeafContentResult(BaseModel):
        summary: str = Field(..., description="해당 목차에 대한 간단한 요약")
        needs_graph: bool = Field(..., description="그래프나 차트가 필요한지 여부")
        graph_description: Optional[str] = Field(
            None, description="그래프를 넣을 경우 그래프 종류(막대그래프, 선그래프 등)와 설명"
        )
        required_data: List[str] = Field(
            default_factory=list,
            description="분석에 필요한 데이터나 지표 목록(예: 가동률, 장애율, 일정별 집계 등)"
        )
        key_points: List[str] = Field(
            default_factory=list,
            description="해당 목차에서 서술해야 할 핵심 포인트나 분석 관점"
        )

    parser = PydanticOutputParser(pydantic_object=LeafContentResult)

    system_prompt = (
        "너는 보고서 목차별 작성 지시문을 만드는 전문가다. "
        "아래 데이터 정의를 기준으로 필요한 데이터와 지표를 구체적으로 제시하라.\n"
        "[사용 가능 데이터]\n"
        "1) 충전기 상태 로그 테이블: 충전소 ID, 충전소명, 도로명 주소, 위도, 경도, 관리업체 전화번호, "
        "충전소 안내, 설치년도, 지역구분코드설명, 지역구분상세코드설명, 기관, 충전기 ID, 충전기 타입, "
        "충전기 출력, 충전방식, 충전기 타임스탬프, 마지막 충전시작일시, 마지막충전종료 일시, "
        "상태갱신일시, 충전기 상태.\n"
        "2) 민원 테이블: 민원 ID, 충전기 ID, 충전소 ID, 민원제목, 민원 내용, 민원 유형, "
        "접수 일시, 처리상태, 민원 처리 ID, 민원 답변, 답변일시.\n"
        "3) 멀티모달 분석 테이블: 화재위험 분석결과, 화재 위험 세부결과, 충전소 고장 분석결과, "
        "충전소 고장 세부결과, 청결상태결과, 청결세부결과.\n"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder("history"),
        ("human", "{input}"),
    ])
    base_chain = prompt | ChatOpenAI(model_name="gpt-4.1-mini")
    store: Dict[str, InMemoryChatMessageHistory] = {}

    def get_history(session_id: str) -> InMemoryChatMessageHistory:
        if session_id not in store:
            store[session_id] = InMemoryChatMessageHistory()
        return store[session_id]

    chain = RunnableWithMessageHistory(
        base_chain,
        get_history,
        input_messages_key="input",
        history_messages_key="history",
    )

    def fill_section(section, parent_titles):
        subsections = section.get("subsections")
        title = section.get("title", "")
        path = " > ".join(parent_titles + [title])
        if subsections:
            for sub in subsections:
                fill_section(sub, parent_titles + [title])
            section["content"] = None
        else:
            prompt_text = (
                "다음 목차에 들어갈 내용을 보고서 작성용 지시문으로 작성하세요. "
                "요약, 그래프 필요 여부, 그래프 설명, 필요한 데이터, 핵심 포인트를 포함하세요. "
                "지정된 출력 형식만 반환하세요.\n"
                f"{parser.get_format_instructions()}\n"
                f"목차 경로: {path}"
            )
            session_id = state.get("temp_session")
            raw = chain.invoke(
                {"input": prompt_text},
                config={"configurable": {"session_id": session_id}},
            )
            result = parser.parse(raw.content)
            section["content"] = result.model_dump()
        return section

    for sec in sections:
        fill_section(sec, [])

    updated = dict(state)
    updated["table_of_contents"] = toc
    return updated


def build_outline_graph() -> StateGraph:
    graph = StateGraph(ReportState)

    graph.add_node("check_outline_related", check_outline_related)
    graph.add_node("personal_outline", personal_outline)
    graph.add_node("check_all_request", check_all_request)
    graph.add_node("all_outline", all_outline)
    graph.add_node("check_basic_request", check_basic_request)
    graph.add_node("basic_outline", basic_outline)
    graph.add_node("iterate_and_decide", iterate_and_decide)
    graph.add_node("renumber_sections", renumber_sections)
    graph.add_node("fill_leaf_contents", fill_leaf_contents)

    graph.add_edge(START, "check_outline_related")
    graph.add_conditional_edges(
        "check_outline_related",
        cond_outline_mode,
        {"true": "personal_outline", "false": "check_all_request"},
    )
    graph.add_conditional_edges(
        "check_all_request",
        cond_outline_mode,
        {"true": "all_outline", "false": "check_basic_request"},
    )
    graph.add_conditional_edges(
        "check_basic_request",
        cond_outline_mode,
        {"true": "basic_outline", "false": "iterate_and_decide"},
    )

    graph.add_edge("personal_outline", "fill_leaf_contents")
    graph.add_edge("all_outline", "fill_leaf_contents")
    graph.add_edge("basic_outline", "fill_leaf_contents")
    graph.add_edge("iterate_and_decide", "renumber_sections")
    graph.add_edge("renumber_sections", "fill_leaf_contents")
    graph.add_edge("fill_leaf_contents", END)

    return graph

def build_outline(state: ReportState):

    llm = ChatOpenAI(model_name="gpt-4.1-mini")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "너는 대화 히스토리(history)를 볼 수 있다."),
        MessagesPlaceholder("history"),
        ("human", "{input}"),
    ])
    base_chain = prompt | llm
    store: Dict[str, InMemoryChatMessageHistory] = {}

    def get_history(session_id: str) -> InMemoryChatMessageHistory:
        if session_id not in store:
            store[session_id] = InMemoryChatMessageHistory()
        return store[session_id]

    chain = RunnableWithMessageHistory(
        base_chain,
        get_history,
        input_messages_key="input",
        history_messages_key="history",
    )

    state["outline_llm"] = chain
    state["temp_session"] = "a083011-default"

    graph = build_outline_graph()
    compiled = graph.compile()
    output_state = compiled.invoke(state)

    # print(get_history("a083011-default"))
    return output_state


if __name__ == "__main__":

    # 1. 그래프 구조 출력
    compiled = build_outline_graph().compile()
    try:
        display(Image(compiled.get_graph().draw_mermaid_png()))
    except Exception:
        pass

    # 2. 응답 테스트 
    initial_state: ReportState = {
        # "input_prompt": test_prompt,
        # "input_prompt": "전기차 충전소 충전기 보고서를 기본 목차에 각 월별과 지역별 세부목차를 적용해서 만들어줘",
        # "input_prompt": "전기차 충전소 충전기 보고서 만들어줘",
        "input_prompt": "기본적인 전기차 충전소 충전기 보고서 만들어줘",
        # "input_prompt": "민원 관련 내용들로만 보고서를 작성해줘",
        # "input_prompt": "기본목차에 지역별 분석을 추가해서 보고서를 작성해줘. 민원이랑 품질 관련 목차는 포함시키지 말아줘",
        # "input_prompt": "전기차 충전소 충전기 보고서 만들어줘. 네가 만들 수 있는 모든 항목을 작성해줘",
        # "input_prompt": "전기차 충전소 충전기 악성 민원 사례 보고서를 만들어줘. 목차는 1. 악성 민원 사례 5가지 이거 하나로만 구성해줘.",

        "table_of_contents": {},
        "outline_mode": True,
        "outline_llm": None,
    }
    result = build_outline(initial_state)
    # print(result)