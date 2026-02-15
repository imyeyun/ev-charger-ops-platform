"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearMonitoringDashboard } from "@/app/lib/monitoringDashboardStorage";
import { useState, useEffect } from "react"; // ✅ 추가

const NAV = [
    { label: "모니터링", href: "/pages/monitoring" },
    { label: "보고서", href: "/pages/report" },
    { label: "민원처리", href: "/pages/ComplaintList" },
    { label: "Simulator", href: "/pages/simulator" },
];

// ✅ 새 탭으로 열 메뉴(원하면 모니터링도 추가 가능)
const NEW_TAB = new Set([
    "/pages/report",
    "/pages/ComplaintList",
    "/pages/simulator",

]);

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [role, setRole] = useState(""); 

    useEffect(() => {                
        setRole(localStorage.getItem("role") || "");
    }, []);

    const isActive = (href) => {
        if (!pathname) return false;

        // ✅ 민원처리: 목록/상세 모두 포함
        if (href === "/pages/ComplaintList") {
            return (
                pathname.startsWith("/pages/ComplaintList") ||
                pathname.startsWith("/pages/ComplaintDetail")
            );
        }

        // ✅ 나머지 메뉴: 기존처럼 시작 여부
        return pathname.startsWith(href);
    };

    const HEADER_H = 86;

    const baseTab = {
        height: HEADER_H,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 clamp(16px, 2.2vw, 56px)",
        fontWeight: 700,
        textDecoration: "none",
        userSelect: "none",
        transition: "background 0.15s ease",
        whiteSpace: "nowrap",
        wordBreak: "keep-all",
        flex: "0 0 auto",
        boxSizing: "border-box",
        textAlign: "center",
    };

    const handleLogout = async () => {
        try {
            // 1) (선택) 서버 세션/쿠키 기반이면 여기서 로그아웃 API 호출
            await fetch("/api/authApi/logout", {
                method: "POST",
                credentials: "include",
            });
            // 2) 로컬 토큰 기반이면 토큰 제거
            if (typeof window !== "undefined") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
            }
            sessionStorage.clear();
            sessionStorage.removeItem("chat_tid_next");
            localStorage.removeItem("role");

            // ✅ (선택) 모니터링 레이아웃도 로그아웃 시 초기화
            clearMonitoringDashboard();

            // 3) 로그인 페이지로 이동
            router.push("/pages/login");
            router.refresh();
        } catch (e) {
            sessionStorage.clear();
            localStorage.removeItem("role");
            router.push("/pages/login");
            router.refresh();
        }
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
                    width: "100%",
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
                        minWidth: 220,
                        flex: "0 0 auto",
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
                <nav
                    style={{
                        flex: 1,
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "stretch",
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "stretch",
                            height: "100%",
                            flexWrap: "nowrap",
                            overflowX: "auto",
                            overflowY: "hidden",
                            scrollbarWidth: "none",
                            paddingRight: 12,
                        }}
                    >
                        <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>

                        {NAV.map((item) => {
                            const active = isActive(item.href);

                            // ✅ "지금 내가 모니터링에 있을 때만" 다른 메뉴를 새 탭으로
                            const isOnMonitoring =
                                pathname === "/pages/monitoring" || pathname?.startsWith("/pages/monitoring");

                            const isMonitoringMenu = item.href === "/pages/monitoring";

                            const openNewTab = isOnMonitoring && !isMonitoringMenu; // 모니터링에서 다른 메뉴만 새탭

                            // ✅ active 클릭 막는 건 기존 유지 (원하면 아래처럼 예외도 가능)
                            const isReport = item.href === "/pages/report";
                            const denyReport = isReport && role !== "MANAGER";

                            const disableClick = active || denyReport;// 그대로

                            return (
                                <Link
                                    key={item.href}
                                    href={denyReport ? "#" : item.href}
                                    target={openNewTab ? "_blank" : undefined}
                                    rel={openNewTab ? "noopener noreferrer" : undefined}
                                    aria-current={active ? "page" : undefined}
                                    style={{
                                        ...baseTab,
                                        background: active ? "#1b6fff" : "transparent",
                                        color: active ? "#fff" : "#111",
                                        cursor: disableClick ? "default" : "pointer",
                                        pointerEvents: disableClick ? "none" : "auto",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!active) e.currentTarget.style.background = "#f0f0f0";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!active) e.currentTarget.style.background = "transparent";
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
                    onClick={handleLogout}
                    style={{
                        width: 92,
                        height: 34,
                        borderRadius: 4,
                        border: "1px solid #cfcfcf",
                        background: "#fff",
                        cursor: "pointer",
                        flex: "0 0 auto",
                    }}
                >
                    Logout
                </button>
            </div>
        </header>
    );
}