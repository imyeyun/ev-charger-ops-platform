'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import styles from './page.module.css';
import Header from '@/app/components/Header'; // 1. Header 컴포넌트 임포트

const COMPLAINT_TYPE_LABEL = {
    CHARGER_BREAKDOWN: "충전기 고장",
    PAYMENT: "결제 오류",
    SUBSIDY: "보조금",
    OTHER: "기타",
};

function formatKstYmdHm(isoLike) {
    if (!isoLike) return "-";

    // 이미 Z 또는 +09:00 같은 타임존이 있으면 그대로 사용
    const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(isoLike);
    const safe = hasTz ? isoLike : `${isoLike}+09:00`; // ✅ KST로 강제

    const d = new Date(safe);
    if (Number.isNaN(d.getTime())) return isoLike;

    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

                const response = await axios.post('/api/complaintsApi', { reqId: Number(complaintId) });

                const { request, outbounds } = response.data;

                // 답변 이력(outbounds)이 여러 개 있을 수 있으므로 배열의 마지막 원소를 꺼내, 화면에서는 가장 최신 답변 1개만 보여주기 위함
                // (추가) outbounds 정렬 순서에 따라 마지막 원소 또는 첫번째 원소를 꺼낼 수 있음
                const last = outbounds.length ? outbounds[outbounds.length - 1] : null;

                // 백 응답 → 화면용 state로 매핑
                setComplaint({
                    id: request.reqId,
                    title: request.title,
                    category: request.reqType,
                    receivedDate: request.reqDt,
                    content: request.content,

                    hasReply: outbounds.length > 0, // 답변이 있으면 true
                    replyDate: last ? last.answerDt : null,
                    reply: last ? last.answer : null,
                    outbounds, // 그대로 저장
                });
            } catch (e) {
                // 실패 시 처리
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
                                        <div className={styles.metaValue}>{COMPLAINT_TYPE_LABEL[complaint.category]}</div>
                                    </div>
                                    <div className={styles.metaCell}>
                                        <div className={styles.metaLabel}>접수 일시</div>
                                        <div className={styles.metaValue}>{formatKstYmdHm(complaint.receivedDate)}</div>
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
                                        <span className={styles.replyMetaValue}>{formatKstYmdHm(replyDateText)}</span>
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
