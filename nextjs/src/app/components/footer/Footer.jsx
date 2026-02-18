// app/components/Footer.jsx
"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <nav className={styles.links}>
                    <Link href="/pages/policy/privacy" className={styles.link}>
                        개인정보처리방침
                    </Link>
                    <span className={styles.sep}>|</span>
                    <Link href="/pages/policy/service" className={styles.link}>
                        이용약관
                    </Link>
                </nav>

                <div className={styles.meta}>
                    <p>© {new Date().getFullYear()} EV Charger Ops Platform</p>
                    <p className={styles.small}>
                        문의: support@example.com · 운영: EV 충전 통합관제 누리집
                    </p>
                </div>
            </div>
        </footer>
    );
}
