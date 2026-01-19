"use client";

import { usePathname } from "next/navigation";

const NO_APPROOT_PREFIXES = ["/pages/login", "/pages/signup"];

export default function LayoutShell({ children }) {
    const pathname = usePathname() || "";
    const isNoAppRoot = NO_APPROOT_PREFIXES.some((p) => pathname.startsWith(p));

    if (isNoAppRoot) return <>{children}</>;

    return <div className="appRoot">{children}</div>;
}
