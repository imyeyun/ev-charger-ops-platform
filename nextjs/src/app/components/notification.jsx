"use client";

import { useEffect, useMemo, useState } from "react";

export default function Notification({
                                         open,
                                         onClose,
                                         styles,
                                         title = "알람 전송",
                                         pageSize = 9,
                                         onView,
                                     }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [page, setPage] = useState(1);

    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");

    // ✅ open일 때만 리스트 로드 (UncheckList 기반)

    useEffect(() => {
        if (!open) return;

        let alive = true;

        async function run() {
            setLoading(true);
            setError("");
            setSendError("");
            setItems([]);
            setPage(1);
            setSelectedIds(new Set());

            // uncheckList API 호출하기 위한 코드
            // 알림 띄우기 위한 리스트 보기 위해선 필요함
            try {
                const res = await fetch("/api/componentApi/UncheckList", {
                    method: "GET",
                    cache: "no-store",
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    let msg = "리스트를 불러오지 못했습니다.";
                    if (data && data.error) msg = String(data.error);
                    else if (data && data.message) msg = String(data.message);
                    throw new Error(msg);
                }

                let list = [];
                if (data && Array.isArray(data.chargerBadCaseList)) {
                    list = data.chargerBadCaseList;
                }

                const mapped = list.map((x) => {
                    let id = "";
                    let name = "";
                    if (x && x.statId !== undefined && x.statId !== null) id = String(x.statId);
                    if (x && x.statNm !== undefined && x.statNm !== null) name = String(x.statNm);
                    return { id, name };
                });

                if (alive) setItems(mapped);
            } catch (e) {
                if (alive) setError(String((e && e.message) || "리스트를 불러오지 못했습니다."));
            } finally {
                if (alive) setLoading(false);
            }
        }

        run();
        return () => {
            alive = false;
        };
    }, [open]);

    // ESC로 닫기
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                if (onClose) onClose();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    useEffect(() => {
        if (!open) return;
        if (page > totalPages) setPage(totalPages);
    }, [open, page, totalPages]);

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

    // 페이지로 만드는 코드
    const getPagination = (current, total) => {
        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

        const pages = new Set([1, total, current, current - 1, current + 1]);
        const nums = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

        const result = [];
        for (let i = 0; i < nums.length; i++) {
            if (i > 0 && nums[i] - nums[i - 1] > 1) result.push("...");
            result.push(nums[i]);
        }
        return result;
    };

    const pagerItems = useMemo(() => getPagination(page, totalPages), [page, totalPages]);

    const allChecked = useMemo(() => {
        if (items.length === 0) return false;
        return selectedIds.size === items.length;
    }, [items.length, selectedIds]);

    const toggleOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds((prev) => {
            if (items.length === 0) return new Set();
            if (prev.size === items.length) return new Set(); // 전체 해제
            return new Set(items.map((x) => x.id)); // 전체 선택
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

        const ids = [...selectedIds]
            .map((v) => String(v).trim())
            .filter((v) => v !== "");
        if (ids.length === 0) {
            setSendError("선택된 충전소가 없습니다.");
            return;
        }

        try {
            setSending(true);

            // 스펙: { statId:  }
            const payload = { statId: ids };

            // ✅ route 프록시 사용
            await postJson("/api/external_notification", payload);

            if (onClose) onClose();
        } catch (e) {
            setSendError(String(e?.message || "알림 전송에 실패했습니다."));
        } finally {
            setSending(false);
        }
    };

    if (!open) return null;

    return (
        <div
            className={styles.modalOverlay}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    if (onClose) onClose();
                }
            }}
        >
            <div className={styles.modalCard} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>{title}</div>
                    <button className={styles.modalCloseBtn} onClick={onClose} aria-label="닫기">
                        ×
                    </button>
                </div>

                {/* ✅ 핵심: body를 “스크롤 영역(list)” + “고정 영역(페이지네이션/버튼)”으로 분리 */}
                <div className={styles.modalBody}>
                    <label className={styles.modalAllRow}>
                        <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={toggleAll}
                            disabled={loading || !!error || items.length === 0}
                        />
                        <span className={styles.modalAllText}>전체 선택</span>
                    </label>

                    {/* ✅ 리스트 영역(여기만 스크롤) */}
                    <div className={styles.modalListScroll}>
                        {loading && <div className={styles.listBody}>불러오는 중...</div>}
                        {error && (
                            <div className={styles.listBody} style={{ color: "crimson" }}>
                                {error}
                            </div>
                        )}

                        {!loading && !error && (
                            <div className={styles.modalListBody}>
                                {pageItems.map((s) => (
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
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ✅ 고정 하단 영역: 페이지네이션 + 전송버튼 */}
                    <div className={styles.modalBottom}>
                        {totalPages > 1 && (
                            <div className={styles.pagination} style={{ marginTop: 0 }}>
                                <button
                                    className={styles.pageArrow}
                                    onClick={() => page > 1 && setPage(page - 1)}
                                    disabled={page <= 1}
                                >
                                    &lt;
                                </button>

                                {pagerItems.map((p, idx) => {
                                    if (p === "...") {
                                        return (
                                            <span key={`dots-${idx}`} className={styles.pageDots}>
                        ...
                      </span>
                                        );
                                    }

                                    const active = p === page;
                                    return (
                                        <button
                                            key={p}
                                            className={`${styles.pageBtn} ${active ? styles.pageBtnActive : ""}`}
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}

                                <button
                                    className={styles.pageArrow}
                                    onClick={() => page < totalPages && setPage(page + 1)}
                                    disabled={page >= totalPages}
                                >
                                    &gt;
                                </button>
                            </div>
                        )}

                        {sendError && (
                            <div className={styles.modalSendError} style={{ color: "crimson" }}>
                                {sendError}
                            </div>
                        )}

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.modalSendBtn}
                                onClick={handleSend}
                                disabled={sending || loading || !!error}
                            >
                                {sending ? "전송 중..." : "알림 전송"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
