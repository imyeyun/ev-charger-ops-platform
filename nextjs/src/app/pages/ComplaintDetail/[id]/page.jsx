'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import styles from './page.module.css';
import Header from '@/app/components/Header'; // 1. Header 컴포넌트 임포트

export default function ComplaintDetail() {
    const router = useRouter();
    const params = useParams();
    const complaintId = params?.id;

    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!complaintId) return;

        const run = async () => {
            try {
                setLoading(true);

                const response = await axios.post('/api/complaintsApi', {
                    action: 'detail',
                    reqId: Number(complaintId),
                });

                const { request, outbounds } = response.data;

                // ✅ 백 응답 → 화면용 state로 매핑
                // (필드명은 백이 확정되면 여기만 조정하면 됨)
                setComplaint({
                    id: request.reqId ?? request.id ?? complaintId,
                    title: request.title ?? '민원 제목',
                    category: request.reqType ?? request.category ?? '기타',
                    receivedDate: request.reqDt ?? request.receivedDate ?? '-',
                    content: request.content ?? '민원 내용이 여기에 표시됩니다.',

                    // outbounds(답변 이력) 중 "최신" 1개를 보여주는 형태로 가정
                    hasReply: Array.isArray(outbounds) && outbounds.length > 0,
                    replyDate:
                        Array.isArray(outbounds) && outbounds.length > 0
                            ? (outbounds[outbounds.length - 1].answerDt ?? outbounds[outbounds.length - 1].procDt ?? null)
                            : null,
                    reply:
                        Array.isArray(outbounds) && outbounds.length > 0
                            ? (outbounds[outbounds.length - 1].answer ?? outbounds[outbounds.length - 1].reply ?? null)
                            : null,

                    // 필요하면 전체 답변 목록도 넣어둘 수 있음
                    outbounds: Array.isArray(outbounds) ? outbounds : [],
                });
            } catch (e) {
                // ✅ 실패 시 처리
                console.error(e);
                setComplaint(null);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [complaintId]);


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
