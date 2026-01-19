import "./globals.css";
import LayoutShell from "./LayoutShell";

export default function RootLayout({ children }) {
    return (
        <html lang="ko">
        <body>
        <LayoutShell>{children}</LayoutShell>
        </body>
        </html>
    );
}
