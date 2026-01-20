"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
    { label: "모니터링", href: "/pages/monitoring" },
    { label: "보고서", href: "/pages/report" },
    { label: "민원처리", href: "/pages/ComplaintList" },
    { label: "Simulator", href: "/pages/simulator" },
];



export default function Header() {
    const router = useRouter();
    const pathname = usePathname();

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

    // ✅ (수정) 탭 padding 최대값을 줄여서 마지막(Simulator)만 삐져나오는 현상 방지
    const baseTab = {
        height: HEADER_H,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 clamp(16px, 2.2vw, 56px)", // ✅ max 90px → 56px로 축소
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

    // ✅ 로그아웃 기능 구현
    const handleLogout = async () => {
        try {
            // 1) (선택) 서버 세션/쿠키 기반이면 여기서 로그아웃 API 호출
            // await fetch("/api/auth/logout", { method: "POST" });

            // 2) 로컬 토큰 기반이면 토큰 제거
            if (typeof window !== "undefined") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                // 필요하면 아래도 같이 정리
                // sessionStorage.clear();
            }

            // 3) 로그인 페이지로 이동
            router.push("/pages/login"); // ✅ 프로젝트 로그인 라우트에 맞게 경로만 바꿔줘
            router.refresh();
        } catch (e) {
            // 실패해도 일단 로그인 화면으로 보내는 게 UX가 좋음
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
                        minWidth: 220, // ✅ (선택) 폭 약간만 줄여서 네비 영역 확보
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
                            paddingRight: 12, // ✅ (추가) 마지막 탭이 끝에 딱 걸려 잘리는 경우 방지
                        }}
                    >
                        <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>

                        {NAV.map((item) => {
                            const active = isActive(item.href);

                            // ✅ (선택) active도 Link로 통일하면 미세한 레이아웃 차이 가능성 제거
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    style={{
                                        ...baseTab,
                                        background: active ? "#1b6fff" : "transparent",
                                        color: active ? "#fff" : "#111",
                                        cursor: active ? "default" : "pointer",
                                        pointerEvents: active ? "none" : "auto",
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
