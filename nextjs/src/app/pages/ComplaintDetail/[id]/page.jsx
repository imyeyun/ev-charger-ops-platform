'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './page.module.css';
import Header from '@/app/components/Header'; // 1. Header 컴포넌트 임포트
import { fetchComplaintDetail } from '@/app/api/complaintsApi';

export default function ComplaintDetail() {
    const router = useRouter();
    const params = useParams();
    const complaintId = params?.id;

    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const idStr = complaintId ? String(complaintId) : null;

        const sampleComplaints = {
            '1': {
                id: 1,
                title: '충전기 고장 민원',
                category: '충전기 고장',
                receivedDate: '2024-01-15 10:00',
                content:
                    '충전소에 설치된 충전기가 작동하지 않습니다. 충전을 시도했지만 전원이 들어오지 않고, 화면도 켜지지 않습니다.\n다른 충전기도 모두 사용 중이어서 급하게 충전이 필요한 상황입니다. 빠른 조치 부탁드립니다.',
                hasReply: false,
                replyDate: null,
                reply: null,
            },
            '2': {
                id: 2,
                title: '결제 오류 민원',
                category: '결제 오류',
                receivedDate: '2024-01-14 11:00',
                content:
                    '충전 완료 후 결제가 중복으로 처리되었습니다.\n한 번의 충전에 대해 두 번의 결제가 발생했고, 카드사에 문의한 결과 실제로 두 번의 승인이 들어간 것을 확인했습니다. 환불 처리 부탁드립니다.',
                hasReply: true,
                replyDate: '2024-01-14 15:20',
                reply:
                    '안녕하세요. 결제 중복 처리 문제로 불편을 드려 죄송합니다.\n확인 결과 중복 결제가 확인되어 즉시 환불 처리하겠습니다.\n환불은 영업일 기준 3-5일 내에 완료됩니다.',
            },
            '3': {
                id: 3,
                title: 'AS 연결 지연 민원',
                category: 'AS 콜센터 연결 지연',
                receivedDate: '2024-01-13 14:00',
                content:
                    '충전기 고장으로 AS 콜센터에 전화를 걸었는데 연결이 너무 오래 걸립니다.\n10분 이상 대기했지만 연결되지 않아서 민원을 접수합니다. 빠른 응대 부탁드립니다.',
                hasReply: false,
                replyDate: null,
                reply: null,
            },
        };

        if (idStr && sampleComplaints[idStr]) {
            setComplaint(sampleComplaints[idStr]);
        } else {
            setComplaint({
                id: idStr || '?',
                title: '민원 제목',
                category: '기타',
                receivedDate: '2024-01-15 10:00',
                content: '민원 내용이 여기에 표시됩니다.',
                hasReply: false,
                replyDate: null,
                reply: null,
            });
        }
        setLoading(false);
    }, [complaintId]);

    // 백 연결 시 위의 useEffect 삭제 후 아래 주석 해제
    // useEffect(() => {
    //     if (!complaintId) return;

    //     const run = async () => {
    //         try {
    //         setLoading(true);

    //         const { request, outbounds } = await fetchComplaintDetail(complaintId);

    //         // ✅ 백 응답 → 화면용 state로 매핑
    //         // (필드명은 백이 확정되면 여기만 조정하면 됨)
    //         setComplaint({
    //             id: request.reqId ?? request.id ?? complaintId,
    //             title: request.title ?? '민원 제목',
    //             category: request.reqType ?? request.category ?? '기타',
    //             receivedDate: request.reqDt ?? request.receivedDate ?? '-',
    //             content: request.content ?? '민원 내용이 여기에 표시됩니다.',

    //             // outbounds(답변 이력) 중 "최신" 1개를 보여주는 형태로 가정
    //             hasReply: Array.isArray(outbounds) && outbounds.length > 0,
    //             replyDate:
    //             Array.isArray(outbounds) && outbounds.length > 0
    //                 ? (outbounds[outbounds.length - 1].answerDt ?? outbounds[outbounds.length - 1].procDt ?? null)
    //                 : null,
    //             reply:
    //             Array.isArray(outbounds) && outbounds.length > 0
    //                 ? (outbounds[outbounds.length - 1].answer ?? outbounds[outbounds.length - 1].reply ?? null)
    //                 : null,

    //             // 필요하면 전체 답변 목록도 넣어둘 수 있음
    //             outbounds: Array.isArray(outbounds) ? outbounds : [],
    //         });
    //         } catch (e) {
    //         // ✅ 실패 시 처리
    //         setComplaint(null);
    //         // 여기서 중앙 모달/에러 UI를 쓰고 싶으면 상태 추가해서 처리
    //         console.error(e);
    //         } finally {
    //         setLoading(false);
    //         }
    //     };

    //     run();
    // }, [complaintId]);

    const handleBack = () => {
        router.push('/pages/ComplaintList');
    };

    if (loading) {
        return (
            <>
                <Header />
                <div className={styles.container}>
                    <div className={styles.wrapper}>
                        <div className={styles.loading}>로딩 중...</div>
                    </div>
                </div>
            </>
        );
    }

    if (!complaint) {
        return (
            <>
                <Header />
                <div className={styles.container}>
                    <div className={styles.wrapper}>
                        <div className={styles.error}>민원을 찾을 수 없습니다.</div>
                    </div>
                </div>
            </>
        );
    }

    const replyBadgeText = complaint.hasReply ? '답변완료' : '미처리';
    const replyDateText = complaint.replyDate || '-';

    return (
        <>
            <Header />
            <div className={styles.container}>
                <div className={styles.wrapper}>
                    {/* 페이지 타이틀 */}
                    <h1 className={styles.pageTitle}>민원 상세 조회</h1>

                    {/* 큰 카드(이미지처럼 내부에 민원/답변 박스) */}
                    <div className={styles.card}>
                        {/* 민원 박스 */}
                        <div className={styles.sectionBox}>
                            <div className={styles.sectionInner}>
                                <div className={styles.fieldTitleRow}>
                                    {/*<div className={styles.fieldTitleLabel}>민원 제목</div>*/}
                                    <div className={styles.fieldTitleValue}>{complaint.title}</div>
                                </div>

                                <div className={styles.metaGrid}>
                                    <div className={styles.metaCell}>
                                        <div className={styles.metaLabel}>민원 유형</div>
                                        <div className={styles.metaValue}>{complaint.category}</div>
                                    </div>
                                    <div className={styles.metaCell}>
                                        <div className={styles.metaLabel}>접수 일시</div>
                                        <div className={styles.metaValue}>{complaint.receivedDate}</div>
                                    </div>
                                </div>


                                <div className={styles.textAreaBox}>
                                    {complaint.content}
                                </div>
                            </div>
                        </div>

                        {/* 답변 박스 */}
                        <div className={styles.sectionBox}>
                            <div className={styles.sectionInner}>
                                <div className={styles.replyHeader}>
                <span
                    className={`${styles.replyBadge} ${
                        complaint.hasReply ? styles.replyBadgeDone : styles.replyBadgePending
                    }`}
                >
                  {replyBadgeText}
                </span>

                                    <div className={styles.replyMeta}>
                                        <span className={styles.replyMetaLabel}>답변 일시</span>
                                        <span className={styles.replyMetaValue}>{replyDateText}</span>
                                    </div>
                                </div>

                                <div className={styles.textAreaBoxReply}>
                                    {complaint.hasReply && complaint.reply
                                        ? complaint.reply
                                        : '답변 내용'}
                                </div>
                            </div>
                        </div>

                        {/* 하단 목록 버튼 */}
                        <div className={styles.bottomActions}>
                            <button className={styles.listButton} onClick={handleBack}>
                                목록
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
}
