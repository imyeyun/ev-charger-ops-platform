// "use client";
//
// import { usePathname } from "next/navigation";
//
// const NO_APPROOT_PREFIXES = ["/pages/login", "/pages/signup"];
//
// export default function LayoutShell({ children }) {
//     const pathname = usePathname() || "";
//     const isNoAppRoot = NO_APPROOT_PREFIXES.some((p) => pathname.startsWith(p));
//
//     if (isNoAppRoot) return <>{children}</>;
//
//     return <div className="appRoot">{children}</div>;
// }

"use client";

import { usePathname } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/footer/Footer"; // ✅ Footer import

const NO_APPROOT_PREFIXES = ["/pages/login", "/pages/signup"];

// ✅ 여기엔 "페이지가 Header를 이미 직접 렌더링하는 애들만" 넣기
const PAGE_OWNS_HEADER_PREFIXES = [
    "/pages/monitoring",
    "/pages/monitoringDetail",
    "/pages/report",
    "/pages/ComplaintList",
    "/pages/ComplaintDetail",
];

export default function LayoutShell({ children }) {
    const pathname = usePathname() || "";
    const isNoAppRoot = NO_APPROOT_PREFIXES.some((p) => pathname.startsWith(p));

    const pageOwnsHeader = PAGE_OWNS_HEADER_PREFIXES.some((p) =>
        pathname.startsWith(p)
    );

    // ✅ 로그인/회원가입: Header는 없고 Footer는 붙인다
    if (isNoAppRoot) {
        return (
            <>
                {children}
                <Footer />
            </>
        );
    }

    return (
        <div className="appRoot">
            {!pageOwnsHeader && <Header />}
            {children}
            <Footer />
        </div>
    );
}

