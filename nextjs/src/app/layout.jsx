import "./globals.css";
import LayoutShell from "./LayoutShell";
import CssBaseline from "@mui/material/CssBaseline";
import ThemeRegistry from "./ThemeRegistry";

export default function RootLayout({ children }) {
    return (
        <html lang="ko" suppressHydrationWarning>
        <body>
        <ThemeRegistry>
            <CssBaseline />
            <LayoutShell>{children}</LayoutShell>
        </ThemeRegistry>
        </body>
        </html>
    );
}
