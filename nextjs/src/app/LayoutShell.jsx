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

const NO_APPROOT_PREFIXES = ["/pages/login", "/pages/signup"];

// ✅ 여기엔 "페이지가 Header를 이미 직접 렌더링하는 애들만" 넣기
const PAGE_OWNS_HEADER_PREFIXES = [
    "/pages/monitoring",
    "/pages/monitoringDetail",
    "/pages/report",
    "/pages/ComplaintList",
    "/pages/ComplaintDetail",
    // ❗️시뮬레이터는 Header가 없으니 여기 넣지 마
];

export default function LayoutShell({ children }) {
    const pathname = usePathname() || "";
    const isNoAppRoot = NO_APPROOT_PREFIXES.some((p) => pathname.startsWith(p));
    if (isNoAppRoot) return <>{children}</>;

    const pageOwnsHeader = PAGE_OWNS_HEADER_PREFIXES.some((p) => pathname.startsWith(p));

    return (
        <div className="appRoot">
            {!pageOwnsHeader && <Header />}
            {children}
        </div>
    );
}


