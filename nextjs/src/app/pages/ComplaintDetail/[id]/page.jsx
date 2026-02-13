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

function formatUtcYmdHm(isoLike) {
    if (!isoLike) return "-";

    const normalized = isoLike.replace(/\.(\d{3})\d+/, ".$1"); // ✅ 마이크로초 → ms

    const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized);
    const safe = hasTz ? normalized : `${normalized}Z`; // ✅ 타임존 없으면 UTC로 간주

    const d = new Date(safe);
    if (Number.isNaN(d.getTime())) return isoLike;

    // ✅ KST로 출력
    const parts = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(d).replace(" ", " ");

    // sv-SE는 "YYYY-MM-DD HH:mm" 형태로 잘 나옴
    return parts;
}

export default function ComplaintDetail() {
    const router = useRouter();
    const params = useParams();
    const complaintId = params?.id;

    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);

    const [deleting, setDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [role, setRole] = useState("");

    const handleDeleteReply = async () => {

        try {
            setDeleting(true);

            await axios.delete("/api/complaintsApi", {
                data: {reqId: Number(complaint.id)},
            });

            setComplaint((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    hasReply: false,
                    replyDate: null,
                    reply: null,
                    outbounds: [], // 필요 시 유지하고 싶으면 [] 대신 prev.outbounds 그대로 두면 됨
                };
            });
            setIsDeleteModalOpen(false);
            router.push("/pages/ComplaintList");
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        if (!complaintId) return;

        const run = async () => {
            try {
                setLoading(true);

                const response = await axios.post('/api/complaintsApi', {reqId: Number(complaintId)});

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
                <Header/>
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
                <Header/>
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
            <Header/>
            <div className={styles.container}>
                <div className={styles.wrapper}>
                    <h1 className={styles.pageTitle}>민원 상세 조회</h1>

                    <div className={styles.card}>
                        {/* 민원 박스 */}
                        <div className={styles.sectionBox}>
                            <div className={styles.sectionInner}>
                                <div className={styles.fieldTitleRow}>
                                    <div className={styles.fieldTitleValue}>{complaint.title}</div>
                                </div>

                                <div className={styles.metaGrid}>
                                    <div className={styles.metaCell}>
                                        <div className={styles.metaLabel}>민원 유형</div>
                                        <div className={styles.metaValue}>
                                            {COMPLAINT_TYPE_LABEL[complaint.category] || '-'}
                                        </div>
                                    </div>
                                    <div className={styles.metaCell}>
                                        <div className={styles.metaLabel}>접수 일시</div>
                                        <div className={styles.metaValue}>
                                            {formatUtcYmdHm(complaint.receivedDate)}
                                        </div>
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
                                    <div className={styles.replyHeaderLeft}>
                                    <span
                                        className={`${styles.replyBadge} ${
                                            complaint.hasReply ? styles.replyBadgeDone : styles.replyBadgePending
                                        }`}
                                    >
                                        {replyBadgeText}
                                    </span>

                                        <div className={styles.replyMeta}>
                                            <span className={styles.replyMetaLabel}>답변 일시</span>
                                            <span
                                                className={styles.replyMetaValue}>{formatUtcYmdHm(replyDateText)}</span>
                                        </div>
                                    </div>

                                    {/* ✅ 우측 상단: 모달 열기 */}
                                    {complaint.hasReply && role === "manager" && (
                                        <button
                                            className={styles.deleteButton}
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            disabled={deleting}
                                        >
                                            답변 삭제
                                        </button>
                                    )}
                                </div>

                                <div className={styles.textAreaBoxReply}>
                                    {complaint.hasReply && complaint.reply ? complaint.reply : '답변 내용'}
                                </div>

                                {/* ❌ 삭제 에러 표시 제거 */}
                            </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div className={styles.bottomActions}>
                            <button className={styles.listButton} onClick={handleBack}>
                                목록
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ 여기: return의 “맨 아래(</> 직전)”에 모달 */}
            {isDeleteModalOpen && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => !deleting && setIsDeleteModalOpen(false)}
                >
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalTitle}>답변 삭제</div>
                        <div className={styles.modalDesc}>이 민원의 답변을 삭제할까요?</div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.modalCancel}
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={deleting}
                            >
                                취소
                            </button>
                            <button
                                className={styles.modalOk}
                                onClick={handleDeleteReply}
                                disabled={deleting}
                            >
                                {deleting ? '삭제 중...' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}