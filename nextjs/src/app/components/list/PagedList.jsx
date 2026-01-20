"use client";

import { useMemo, useState, useEffect } from "react";

export default function PagedList({
                                      styles,
                                      title,
                                      items = [],
                                      pageSize = 5,       // ✅ 기본 5개
                                      onView,
                                  }) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const [page, setPage] = useState(1);

    // ✅ items 길이가 바뀌어서 totalPages가 줄면 page 보정
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

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

    return (
        <section className={styles.card}>
            <h3 className={styles.listTitle}>{title}</h3>

            <div className={styles.listBody}>
                {pageItems.map((s) => (
                    <div key={s.id} className={styles.listItemRow}>
                        <span className={styles.listItemText}>{s.name}</span>
                        <button className={styles.viewBtn} onClick={() => onView?.(s.id)}>
                            보기
                        </button>
                    </div>
                ))}
            </div>

            {/* ✅ 별도 Pagination 컴포넌트 없이, 여기서 직접 UI 렌더 */}
            {totalPages > 1 && (
                <div className={styles.pagination}>
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
        </section>
    );
}
