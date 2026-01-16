'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header'; // 1. Header 컴포넌트 임포트
import styles from './page.module.css';

export default function ComplaintList() {
  // 검색 필터 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [complaintType, setComplaintType] = useState(''); // '충전기 고장' | '결제 오류' | 'AS 콜센터 연결 지연' | '기타' | ''
  const [showUnprocessed, setShowUnprocessed] = useState(true); // 미처리 민원
  const [showProcessed, setShowProcessed] = useState(false); // 처리된 민원

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);

  // 샘플 데이터 - 실제 데이터로 교체 필요
  const allComplaints = [
    { id: 1, title: '충전기 고장 민원', content: '충전기가 작동하지 않습니다', status: '미처리', category: '충전기 고장', date: '2024-01-15 10:00' },
    { id: 2, title: '결제 오류 민원', content: '결제가 중복으로 되었습니다', status: '처리완료', category: '결제 오류', date: '2024-01-14 11:00' },
    { id: 3, title: 'AS 연결 지연 민원', content: 'AS 콜센터 연결이 너무 오래 걸립니다', status: '미처리', category: 'AS 콜센터 연결 지연', date: '2024-01-13 14:00' },
    { id: 4, title: '기타 민원', content: '기타 문의사항입니다', status: '처리완료', category: '기타', date: '2024-01-12 09:00' },
    { id: 5, title: '충전기 고장 민원 2', content: '또 다른 충전기 고장', status: '미처리', category: '충전기 고장', date: '2024-01-11 16:00' },
    { id: 6, title: '결제 문제', content: '결제 관련 문제가 있습니다', status: '처리완료', category: '결제 오류', date: '2024-01-10 10:30' },
  ];

  // 필터링된 민원 목록
  const filteredComplaints = useMemo(() => {
    let filtered = [...allComplaints];

    // 상태 필터 (미처리/처리)
    if (showUnprocessed && showProcessed) {
      // 둘 다 선택 시 전체 표시
    } else if (showUnprocessed) {
      filtered = filtered.filter(c => c.status === '미처리');
    } else if (showProcessed) {
      filtered = filtered.filter(c => c.status === '처리완료');
    } else {
      filtered = [];
    }

    // 검색어 필터 (제목+내용만 사용)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(kw) || c.content.toLowerCase().includes(kw)
      );
    }

    // 기간 필터
    if (startDate) {
      filtered = filtered.filter(c => {
        const complaintDate = new Date(c.date);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        return complaintDate >= start;
      });
    }

    if (endDate) {
      filtered = filtered.filter(c => {
        const complaintDate = new Date(c.date);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return complaintDate <= end;
      });
    }

    // 민원 유형 필터
    if (complaintType) {
      filtered = filtered.filter(c => c.category === complaintType);
    }

    // 번호 재정렬 (1번부터)
    return filtered.map((complaint, index) => ({
      ...complaint,
      number: index + 1
    }));
  }, [searchKeyword, startDate, endDate, complaintType, showUnprocessed, showProcessed, allComplaints]);

  // 페이지네이션
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredComplaints.slice(start, end);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  const totalCount = filteredComplaints.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = () => {
    setCurrentPage(1);
    setSelectedItems([]);
  };

  const handleReset = () => {
    setSearchKeyword('');
    setStartDate('');
    setEndDate('');
    setComplaintType('');
    setShowUnprocessed(true);
    setShowProcessed(false);
    setCurrentPage(1);
    setSelectedItems([]);
  };

  const handleStartDateChange = (e) => {
    const date = e.target.value;
    if (date && endDate && new Date(date) > new Date(endDate)) {
      alert('시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    setStartDate(date);
  };

  const handleEndDateChange = (e) => {
    const date = e.target.value;
    if (date && startDate && new Date(date) < new Date(startDate)) {
      alert('종료일은 시작일보다 이전일 수 없습니다.');
      return;
    }
    setEndDate(date);
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

  const handleAgentProcess = () => {
    if (selectedItems.length === 0) {
      alert('처리할 민원을 선택해주세요.');
      return;
    }
    // Agent 처리 로직 구현
    console.log('선택된 민원 Agent 처리:', selectedItems);
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
                                  value={searchKeyword}
                                  onChange={(e) => setSearchKeyword(e.target.value)}
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
                                      value={startDate}
                                      onChange={handleStartDateChange}
                                  />
                                  <span className={styles.dateSeparator}>~</span>
                                  <input
                                      type="date"
                                      className={styles.dateInput}
                                      value={endDate}
                                      onChange={handleEndDateChange}
                                  />
                              </div>
                          </div>

                          {/* 민원 유형 분류 */}
                          <div className={styles.categoryRow}>
                              <label className={styles.categoryLabel}>민원 유형:</label>
                              <select
                                  className={styles.categorySelect}
                                  value={complaintType}
                                  onChange={(e) => setComplaintType(e.target.value)}
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
                                      checked={showUnprocessed}
                                      onChange={(e) => {
                                          setShowUnprocessed(e.target.checked);
                                          if (!e.target.checked && !showProcessed) {
                                              setShowProcessed(true);
                                          }
                                          setCurrentPage(1);
                                      }}
                                  />
                                  <span>미처리된 민원</span>
                              </label>
                              <label className={styles.checkboxLabel}>
                                  <input
                                      type="checkbox"
                                      checked={showProcessed}
                                      onChange={(e) => {
                                          setShowProcessed(e.target.checked);
                                          if (!e.target.checked && !showUnprocessed) {
                                              setShowUnprocessed(true);
                                          }
                                          setCurrentPage(1);
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
                                      <tr key={complaint.id}>
                                          <td className={styles.checkboxColumn}>
                                              <input
                                                  type="checkbox"
                                                  checked={selectedItems.includes(complaint.id)}
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