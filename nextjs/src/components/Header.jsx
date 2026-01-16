"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
    { label: "모니터링", href: "/pages/monitoring" },
    { label: "보고서", href: "/pages/report" },
    { label: "민원처리", href: "/pages/complaints" },
    { label: "Simulator", href: "/pages/simulator" },
];

export default function Header() {
    const pathname = usePathname();
    const isActive = (href) => pathname === href || pathname?.startsWith(href + "/");

    const HEADER_H = 86;

    const baseTab = {
        height: HEADER_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 90px",
        fontWeight: 700,
        textDecoration: "none",
        userSelect: "none",
        transition: "background 0.15s ease",
    };

    return (
        <header
            style={{
                height: HEADER_H,
                borderBottom: "1px solid #eee",
                background: "#fff",
            }}
        >
            <div
                style={{
                    maxWidth: 1400,
                    margin: "0 auto",
                    padding: "0 24px",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 24,
                }}
            >
                {/* 로고 */}
                <Link
                    href="/pages/monitoring"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        minWidth: 260,
                    }}
                >
                    <Image
                        src="/logo.png"
                        alt="한국환경공단 로고"
                        width={210}
                        height={44}
                        priority
                    />
                </Link>

                {/* 네비 */}
                <nav style={{ flex: 1, display: "flex", justifyContent: "center", height: "100%" }}>
                    <div style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
                        {NAV.map((item) => {
                            const active = isActive(item.href);

                            // ✅ 현재 페이지: 파란색 + 클릭/호버 불가
                            if (active) {
                                return (
                                    <div
                                        key={item.href}
                                        aria-current="page"
                                        style={{
                                            ...baseTab,
                                            background: "#1b6fff",
                                            color: "#fff",
                                            cursor: "default",
                                            pointerEvents: "none",
                                        }}
                                    >
                                        {item.label}
                                    </div>
                                );
                            }

                            // ✅ 나머지: hover 시 회색
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    style={{
                                        ...baseTab,
                                        background: "transparent",
                                        color: "#111",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#f0f0f0";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <button
                    type="button"
                    style={{
                        width: 92,
                        height: 34,
                        borderRadius: 4,
                        border: "1px solid #cfcfcf",
                        background: "#fff",
                        cursor: "pointer",
                    }}
                >
                    Logout
                </button>
            </div>
        </header>
    );
}
