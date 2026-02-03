"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import UncheckList from "@/app/components/list/UncheckList";

function toNumberIfPossible(v) {
    const s = String(v ?? "").trim();
    if (!s) return s;
    const n = Number(s);
    return Number.isFinite(n) && String(n) === s ? n : s;
}

export default function Notification({
                                         open,
                                         onClose,
                                         styles,
                                         title = "알람 전송",
                                         pageSize = 9,
                                         onView,
                                     }) {
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");

    // ✅ 현재 페이지 id들 (UncheckList에서 콜백으로 받음)
    const [pageIds, setPageIds] = useState([]);

    // ✅ open 시 초기화
    useEffect(() => {
        if (!open) return;
        setSelectedIds(new Set());
        setSendError("");
        setPageIds([]);
    }, [open]);

    // ESC 닫기
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const toggleOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allChecked = useMemo(() => {
        if (pageIds.length === 0) return false;
        for (const id of pageIds) {
            if (!selectedIds.has(id)) return false;
        }
        return true;
    }, [pageIds, selectedIds]);

    const toggleAllOnPage = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const shouldCheck = !allChecked;
            for (const id of pageIds) {
                if (shouldCheck) next.add(id);
                else next.delete(id);
            }
            return next;
        });
    };

    const postJson = async (url, payload) => {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            if (data && data.error) throw new Error(String(data.error));
            if (data && data.message) throw new Error(String(data.message));
            throw new Error("Internal Server Error");
        }
        if (data && data.error) throw new Error(String(data.error));
        return data;
    };

    const handleSend = async () => {
        setSendError("");

        const ids = [...selectedIds].filter(Boolean);
        if (ids.length === 0) {
            setSendError("선택된 충전소가 없습니다.");
            return;
        }

        try {
            setSending(true);

            // ✅ 요청하신 엔드포인트로 전송
            // payload 형태는 기존과 동일하게 유지
            const payload = { statId: ids.map(toNumberIfPossible) };

            await postJson("/api/external_notification", payload);

            onClose?.();
        } catch (e) {
            setSendError(String(e?.message || "알림 전송에 실패했습니다."));
        } finally {
            setSending(false);
        }
    };

    // ✅ UncheckList가 현재 페이지 id를 알려줌
    const handlePageIdsChange = useCallback((ids) => {
        setPageIds(Array.isArray(ids) ? ids : []);
    }, []);

    if (!open) return null;

    return (
        <div
            className={styles.modalOverlay}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className={styles.modalCard} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>{title}</div>
                    <button className={styles.modalCloseBtn} onClick={onClose} aria-label="닫기">
                        ×
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <label className={styles.modalAllRow}>
                        <input type="checkbox" checked={allChecked} onChange={toggleAllOnPage} />
                        <span className={styles.modalAllText}>전체 선택(현재 페이지)</span>
                    </label>

                    <UncheckList
                        styles={styles}
                        title={null}
                        pageSize={pageSize}
                        onView={onView}
                        onPageIdsChange={handlePageIdsChange}
                        renderRow={(s) => {
                            return (
                                <div key={s.id} className={styles.modalListItemRow}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(s.id)}
                                        onChange={() => toggleOne(s.id)}
                                    />
                                    <div className={styles.modalItemBox}>
                                        <span className={styles.listItemText}>{s.name}</span>
                                        <button className={styles.viewBtn} onClick={() => onView?.(s.id)}>
                                            보기
                                        </button>
                                    </div>
                                </div>
                            );
                        }}
                    />

                    {sendError && (
                        <div className={styles.modalSendError} style={{ color: "crimson" }}>
                            {sendError}
                        </div>
                    )}

                    <div className={styles.modalFooter}>
                        <button
                            className={styles.modalSendBtn}
                            onClick={handleSend}
                            disabled={sending}
                        >
                            {sending ? "전송 중..." : "알림 전송"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
