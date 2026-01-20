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

export default function ComplaintList() {
    const router = useRouter();
    /// ✅ 입력 중인 값(화면의 폼)
    const [filters, setFilters] = useState(INITIAL_FILTERS);

    // ✅ 실제 목록에 적용된 값(검색 버튼 눌렀을 때만 바뀜)
    const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedItems, setSelectedItems] = useState([]);

    const [modalMessage, setModalMessage] = useState(''); //중앙 메세지 모달 상태
    const openModal = (msg) => setModalMessage(msg);
    const closeModal = () => setModalMessage('');

    const [allComplaints, setAllComplaints] = useState([]);   // ✅ 서버 데이터 저장
    const [loading, setLoading] = useState(true);
    
    // ✅ 최초 진입 시 리스트 API 호출해서 setAllComplaints
    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                // 사용자가 페이지에 처음 접속했을 때 서버로부터 전체 민원 리스트를 가져옴
                const result = await axios.get('/api/complaintsApi');
                const list = Array.isArray(result.data) ? result.data : [];

                // ✅ 백 응답 필드명(reqId, reqDt, reqType...)을 화면용 필드로 매핑
                const mapped = (Array.isArray(list) ? list : []).map((item) => ({
                    id: item.reqId,                 // ✅ row click / 선택에 쓰는 id
                    title: item.title ?? '',
                    content: item.content ?? '',    // 리스트에 content 없으면 '' 유지
                    category: item.reqType ?? item.reqTypeNm ?? '', // 백 스펙에 맞게
                    status: item.status === 'PROCESSED' ? '처리완료' : '미처리', // 백에 status가 없다면 기본
                    date: item.reqDt ?? item.reqDtStr ?? '',        // datetime 문자열(ISO면 더 좋음)
                    field: item.field ?? item.Field ?? '',
                }));

                setAllComplaints(mapped);
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

        // ✅ 2) 상태 필터
        if (showUnprocessed && showProcessed) {
            // 전체
        } else if (showUnprocessed) {
            list = list.filter(c => c.status === '미처리');
        } else if (showProcessed) {
            list = list.filter(c => c.status === '처리완료');
        } else {
            list = [];
        }

        // ✅ 3) 검색어(제목+내용)
        if (searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase();
            list = list.filter(c =>
                c.title.toLowerCase().includes(kw) || c.content.toLowerCase().includes(kw)
            );
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

    const handleSearch = () => {
        setAppliedFilters(filters); // ✅ 이때만 목록 변경
        setCurrentPage(1);
        setSelectedItems([]);
    };

    const handleReset = () => {
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

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleSelectItem = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedItems(paginatedComplaints.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    const handleAgentProcess = async () => {
        if (selectedItems.length === 0) {
            openModal('처리할 민원을 선택해주세요.');
            return;
        }

        // 선택된 민원 일괄 처리(Agent 처리)
        try {
            const result = await axios.post('/api/complaintsApi', {
                action: 'process',
                reqIds: selectedItems,
            });

            const data = result.data;
            openModal(`요청 ${data.requestedCount}건 중 ${data.successCount}건 처리되었습니다.`);

            // ✅ 처리 후 목록 최신화
            // 민원 Agent 처리가 완료된 후, 변경된 상태를 화면에 반영하기 위해 전체 민원 리스트를 다시 불러옴
            const listResult = await axios.get('/api/complaintsApi');
            const list = Array.isArray(listResult.data) ? listResult.data : [];

            const mapped = (Array.isArray(list) ? list : []).map((item) => ({
                id: item.reqId,
                title: item.title ?? '',
                content: item.content ?? '',
                category: item.reqType ?? item.reqTypeNm ?? '',
                status: item.status === 'PROCESSED' ? '처리완료' : '미처리',
                date: item.reqDt ?? item.reqDtStr ?? '',
                field: item.field ?? item.Field ?? '',
            }));
            setAllComplaints(mapped);

            setSelectedItems([]); // 선택 해제
        } catch (e) {
            openModal(e.message || '민원 처리 중 오류가 발생했습니다.');
        }
    };

    const handleRowClick = (id) => {
        router.push(`/pages/ComplaintDetail/${id}`);
    };

    const renderPagination = () => {
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
                                    <option value="충전기 고장">충전기 고장</option>
                                    <option value="결제 오류">결제 오류</option>
                                    <option value="AS 콜센터 연결 지연">AS 콜센터 연결 지연</option>
                                    <option value="기타">기타</option>
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
                            <button
                                className={styles.agentProcessButton}
                                onClick={handleAgentProcess}
                                disabled={selectedItems.length === 0}
                                title={selectedItems.length === 0 ? '민원을 선택하면 처리할 수 있습니다.' : ''}
                            >
                                선택 민원 Agent 처리
                            </button>

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
                        <span className={complaint.status === '미처리' ? styles.statusUnprocessed : styles.statusProcessed}>
                          {complaint.status}
                        </span>
                                            </td>
                                            <td className={styles.titleColumn}>{complaint.title}</td>
                                            <td className={styles.categoryColumn}>{complaint.category}</td>
                                            <td className={styles.dateColumn}>{complaint.date}</td>
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