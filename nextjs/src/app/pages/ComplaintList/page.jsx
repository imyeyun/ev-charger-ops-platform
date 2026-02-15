'use client';

import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header'; // 1. Header 컴포넌트 임포트
import styles from './page.module.css';

const INITIAL_FILTERS = {
    searchKeyword: '',
    startDate: '',
    endDate: '',
    complaintType: '',
    showUnprocessed: true, // ✅ 전체 보이려면 둘 다 true
    showProcessed: true,   // ✅
};

const COMPLAINT_TYPE_LABEL = {
    CHARGER_BREAKDOWN: "충전기 고장",
    PAYMENT: "결제 오류",
    SUBSIDY: "보조금",
    OTHER: "기타",
};

function formatUtcYmdHm(isoLike) {
    if (!isoLike) return "-";

    // Z 또는 ±HH:MM 이 있으면 그 타임존 그대로 파싱
    // 없으면 UTC로 간주해서 Z를 붙임
    const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(isoLike);
    const safe = hasTz ? isoLike : `${isoLike}Z`; // ✅ UTC로 강제

    const d = new Date(safe);
    if (Number.isNaN(d.getTime())) return isoLike;

    const pad = (n) => String(n).padStart(2, "0");

    // ✅ UTC 기준으로 출력
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default function ComplaintList() {
    const router = useRouter();
    /// ✅ 입력 중인 값(화면의 폼)
    const [filters, setFilters] = useState(INITIAL_FILTERS);

    // ✅ 실제 목록에 적용된 값(검색 버튼 눌렀을 때만 바뀜)
    const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

    const [currentPage, setCurrentPage] = useState(1); // 현재 보여주고 있는 페이 번호(페이지네이션)
    const [itemsPerPage] = useState(10); // 한 페이지에 보여줄 행 개수(현재 10개로 고정)
    const [selectedItems, setSelectedItems] = useState([]); //체크박스로 선택된 민원들의 id 목록

    const [modalMessage, setModalMessage] = useState(''); //중앙 모달(알림창)에 표시할 메시지 문자열
    const openModal = (msg) => setModalMessage(msg); // 모달 열기(메시지를 세팅해서 모달 표시)
    const closeModal = () => setModalMessage(''); // 모달 닫기(메시지를 비워서 모달을 숨김)

    const [allComplaints, setAllComplaints] = useState([]); // 서버에서 받아온 원본 민원 리스트를 저장하는 상태
    const [loading, setLoading] = useState(true); // 서버 통신 중인지 여부

    const [isProcessing, setIsProcessing] = useState(false); // 민원 답변 생성 시 스피너 설정 위함
    const [processingMsg, setProcessingMsg] = useState("");

    const [role, setRole] = useState(""); // ✅ 추가

    useEffect(() => {                     // ✅ 추가
        setRole(localStorage.getItem("role") || "");
    }, []);

    // 기존에 존재하던 중복 mapped를 제거하기 위해 매핑 함수와 로딩 함수 추가
    // 1) 백 list item -> 화면용 item으로 매핑
    const mapComplaint = (item) => ({
        id: item.reqId,
        title: item.title,
        category: item.reqType,
        date: item.reqDt,
        field: item.field
    });

    // 2) 목록 다시 불러오기(초기 로딩/처리 후 리프레시 공용)
    const fetchComplaints = async () => {
        const res = await axios.get('/api/complaintsApi');
        const list = res.data; // res.data -> HTTP 응답 바디 전체이므로 실제 데이터 필드를 꺼내기 위함
        return list.map(mapComplaint); // 원본 배열의 각 item을 화면용 객체로 바궈서 반환
    };

    // 최초 진입 시 리스트 API 호출해서 setAllComplaints
    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                // 사용자가 페이지에 처음 접속했을 때 서버로부터 전체 민원 리스트를 가져옴
                setAllComplaints(await fetchComplaints());
            } catch (e) {
                openModal(e.message || '민원 리스트를 불러오지 못했습니다.');
                setAllComplaints([]);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    // ✅ “적용된 필터(appliedFilters)” 기준으로만 목록 필터링
    const filteredComplaints = useMemo(() => {
        const {
            searchKeyword,
            startDate,
            endDate,
            complaintType,
            showUnprocessed,
            showProcessed,
        } = appliedFilters;

        // ✅ 1) 최신순 정렬(먼저 정렬하고 그 다음 필터)
        let list = [...allComplaints].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // ✅ 2) 상태 필터 : 백 답장이 field이므로 status 제거 후 field로 미처리/처리완료 분류하도록 변경
        if (showUnprocessed && showProcessed) {
            // 전체
        } else if (showUnprocessed) {
            list = list.filter(c => c.field === 'PENDING');
        } else if (showProcessed) {
            list = list.filter(c => c.field === 'COMPLETED');
        } else {
            list = [];
        }

        // ✅ 3) 검색어 (제목만) : api 응답에 title만 있고 content는 없기 때문
        if (searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase();
            list = list.filter(c => c.title.toLowerCase().includes(kw));
        }

        // ✅ 4) 기간
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            list = list.filter(c => new Date(c.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            list = list.filter(c => new Date(c.date) <= end);
        }

        // ✅ 5) 민원 유형
        if (complaintType) {
            list = list.filter(c => c.category === complaintType);
        }

        // ✅ 번호는 “필터+정렬 이후” 1부터
        return list.map((complaint, index) => ({
            ...complaint,
            number: index + 1,
        }));
    }, [appliedFilters, allComplaints]);

    // 페이지네이션
    const paginatedComplaints = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredComplaints.slice(start, end);
    }, [filteredComplaints, currentPage, itemsPerPage]);

    const totalCount = filteredComplaints.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleSearch = () => { // 현재 입력 적용해서 검색 실행 등
        setAppliedFilters(filters); // ✅ 이때만 목록 변경
        setCurrentPage(1);
        setSelectedItems([]);
    };

    const handleReset = () => { // 필터 입력/적용값 초기화 등
        setFilters(INITIAL_FILTERS);        // ✅ 폼 초기화
        setAppliedFilters(INITIAL_FILTERS); // ✅ 목록도 전체로
        setCurrentPage(1);
        setSelectedItems([]);
    };

    const handleStartDateChange = (e) => {
        const date = e.target.value;
        if (date && filters.endDate && new Date(date) > new Date(filters.endDate)) {
            openModal('시작일은 종료일보다 늦을 수 없습니다.');
            return;
        }
        setFilters(prev => ({ ...prev, startDate: date }));
    };

    const handleEndDateChange = (e) => {
        const date = e.target.value;
        if (date && filters.startDate && new Date(date) < new Date(filters.startDate)) {
            openModal('종료일은 시작일보다 이전일 수 없습니다.');
            return;
        }
        setFilters(prev => ({ ...prev, endDate: date }));
    };

    const handlePageChange = (page) => { // 페이지 이동(현재 페이지 변경)
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleSelectItem = (id) => { // 민원 체크박스 개별 선택/해제 토글
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked) => { // 현재 페이지 목록을 전체 선택/해제
        if (checked) {
            setSelectedItems(paginatedComplaints.map(item => item.id)); // 현재 페이지 항목만 전체 선택
        } else {
            setSelectedItems([]);
        }
    };

    const handleAgentProcess = async () => { // reqIds를 일괄 처리 POST로 보내고 결과 안내, 목록 리프레시

        const fieldById = new Map(allComplaints.map(c => [c.id, c.field]));

// ✅ 선택된 것 중 미처리만 추림
        const pendingIds = selectedItems.filter(id => fieldById.get(id) === "PENDING");

        if (pendingIds.length === 0) {
            openModal('처리할 민원을 선택해주세요.');
            return;
        }

        // 선택된 민원 일괄 처리(Agent 처리)
        // action으로 분기하던 코드 삭제(complaintsApi 코드도 함께 수정)
        try {
            setIsProcessing(true); // 답변 생성 중일 때 true
            setProcessingMsg("선택한 민원 답변을 생성 중입니다..."); // 민원 답변 생성중일 때 사용자에게 표시 위함

            const result = await axios.post('/api/complaintsApi', { reqIds: pendingIds });

            const data = result.data; // res.data -> HTTP 응답 바디 전체이므로 실제 데이터 필드를 꺼내기 위함
            openModal(`요청 ${data.requestedCount}건 중 ${data.successCount}건 처리되었습니다.`);

            // 처리 후 목록 최신화
            // 민원 Agent 처리가 완료된 후, 변경된 상태를 화면에 반영하기 위해 전체 민원 리스트를 다시 불러옴
            setAllComplaints(await fetchComplaints());

            setSelectedItems([]); // 선택 해제
        } catch (e) {
            const msg =
                e?.response?.data?.error ||          // ✅ Next route가 내려준 사용자 메시지(이미 등록된 답변입니다 등)
                e?.message ||                        // axios 기본 메시지
                "민원 처리 중 오류가 발생했습니다.";

            openModal(msg);
        } finally {
            setIsProcessing(false); // 답변 생성 끝나면 다시 false
            setProcessingMsg("");
        }
    };

    const handleRowClick = (id) => { // 테이블 행 클릭 시 해당 민원 상세 페이지로 라우팅
        router.push(`/pages/ComplaintDetail/${id}`);
    };

    const renderPagination = () => { // 페이지 버튼 계산
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return (
            <div className={styles.pagination}>
                <button
                    className={styles.paginationButton}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    &lt;
                </button>
                {pages.map((page, index) => (
                    <button
                        key={index}
                        className={`${styles.paginationButton} ${page === currentPage ? styles.paginationActive : ''}`}
                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                        disabled={page === '...'}
                    >
                        {page}
                    </button>
                ))}
                <button
                    className={styles.paginationButton}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    &gt;
                </button>
            </div>
        );
    };

    return (
        <>
            <Header />

            {isProcessing && (
                <div className={styles.processingOverlay} role="status" aria-live="polite">
                    <div className={styles.processingBox}>
                        <div className={styles.spinner} />
                        <div className={styles.processingText}>{processingMsg}</div>
                        <div className={styles.processingSubText}>
                            잠시만 기다려주세요.
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ 중앙 모달 (확인 버튼만) */}
            {modalMessage && (
                <div className={styles.modalOverlay} role="dialog" aria-modal="true">
                    <div className={styles.modalBox}>
                        <div className={styles.modalMessage}>{modalMessage}</div>
                        <div className={styles.modalActions}>
                            <button className={styles.modalConfirmButton} onClick={closeModal}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.container}>
                <div className={styles.wrapper}>
                    <div className={styles.mainFrame}>
                        <h1 className={styles.title}>민원 조회</h1>

                        {/* 검색 필터 섹션 */}
                        <div className={styles.searchSection}>
                            {/* 검색어 입력 (라디오 삭제, 입력란만) */}
                            <div className={styles.searchRow}>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="검색어를 입력하세요"
                                    value={filters.searchKeyword}
                                    onChange={(e) => setFilters(prev => ({ ...prev, searchKeyword: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>

                            {/* 기간 선택 */}
                            <div className={styles.dateRow}>
                                <label className={styles.dateLabel}>기간:</label>
                                <div className={styles.dateInputGroup}>
                                    <input
                                        type="date"
                                        className={styles.dateInput}
                                        value={filters.startDate}
                                        onChange={handleStartDateChange}
                                    />
                                    <span className={styles.dateSeparator}>~</span>
                                    <input
                                        type="date"
                                        className={styles.dateInput}
                                        value={filters.endDate}
                                        onChange={handleEndDateChange}
                                    />
                                </div>
                            </div>

                            {/* 민원 유형 분류 */}
                            <div className={styles.categoryRow}>
                                <label className={styles.categoryLabel}>민원 유형:</label>
                                <select
                                    className={styles.categorySelect}
                                    value={filters.complaintType}
                                    onChange={(e) => setFilters(prev => ({ ...prev, complaintType: e.target.value }))}
                                >
                                    <option value="">전체</option>
                                    <option value="CHARGER_BREAKDOWN">충전기 고장</option>
                                    <option value="PAYMENT">결제 오류</option>
                                    <option value="SUBSIDY">보조금</option>
                                    <option value="OTHER">기타</option>
                                </select>
                            </div>

                            {/* 상태 필터 (체크박스) */}
                            <div className={styles.statusRow}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={filters.showUnprocessed}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFilters(prev => {
                                                const next = { ...prev, showUnprocessed: checked };
                                                if (!next.showUnprocessed && !next.showProcessed) next.showProcessed = true; // 최소 1개 유지
                                                return next;
                                            });
                                        }}
                                    />
                                    <span>미처리된 민원</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={filters.showProcessed}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFilters(prev => {
                                                const next = { ...prev, showProcessed: checked };
                                                if (!next.showProcessed && !next.showUnprocessed) next.showUnprocessed = true;
                                                return next;
                                            });
                                        }}
                                    />
                                    <span>처리된 민원</span>
                                </label>
                            </div>

                            {/* 검색/초기화 버튼: 탭 박스(필터 박스) 안으로 이동 */}
                            <div className={styles.filterButtons}>
                                <button className={styles.searchButton} onClick={handleSearch}>
                                    🔍 검색
                                </button>
                                <button className={styles.resetButton} onClick={handleReset}>
                                    ↻ 초기화
                                </button>
                            </div>
                        </div>

                        {/* 테이블 컨트롤 */}
                        <div className={styles.tableControls}>
                            <span className={styles.totalCount}>총 {totalCount}건 등록({currentPage}/{totalPages || 1})</span>

                            {/* 항상 표시되도록 변경 */}
                            {/*선택된 민원이 0건 또는 답변 처리 진행 중일 때 버튼 비활성화*/}
                            {role === "MANAGER" && (
                                <button
                                    className={styles.agentProcessButton}
                                    onClick={handleAgentProcess}
                                    disabled={selectedItems.length === 0 || isProcessing}
                                >
                                    {isProcessing ? "처리 중..." : "선택 민원 Agent 처리"}
                                </button>
                            )}

                            <span className={styles.itemsPerPage}>{itemsPerPage}개씩</span>
                        </div>

                        {/* 테이블 */}
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                <tr>
                                    <th className={styles.checkboxColumn}>
                                        <input
                                            type="checkbox"
                                            checked={
                                                paginatedComplaints.length > 0 &&
                                                paginatedComplaints.every(item => selectedItems.includes(item.id))
                                            }
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th className={styles.numberColumn}>번호</th>
                                    <th className={styles.statusColumn}>상태</th>
                                    <th className={styles.titleColumn}>제목</th>
                                    <th className={styles.categoryColumn}>분류</th>
                                    <th className={styles.dateColumn}>등록일시</th>
                                </tr>
                                </thead>
                                <tbody>
                                {paginatedComplaints.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className={styles.emptyMessage}>
                                            검색 결과가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedComplaints.map((complaint) => (
                                        <tr key={complaint.id} onClick={() => handleRowClick(complaint.id)}>
                                            <td className={styles.checkboxColumn}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(complaint.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => handleSelectItem(complaint.id)}
                                                />
                                            </td>
                                            <td className={styles.numberColumn}>{complaint.number}</td>
                                            <td className={styles.statusColumn}>
                        <span className={complaint.field === 'PENDING' ? styles.statusUnprocessed : styles.statusProcessed}>
                          {complaint.field === 'PENDING' ? '미처리' : '처리완료'}
                        </span>
                                            </td>
                                            <td className={styles.titleColumn}>{complaint.title}</td>
                                            <td className={styles.categoryColumn}>{COMPLAINT_TYPE_LABEL[complaint.category]}</td>
                                            <td className={styles.dateColumn}>{formatUtcYmdHm(complaint.date)}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* 페이지네이션 */}
                        {renderPagination()}
                    </div>
                </div>
            </div>
        </>

    );
}