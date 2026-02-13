import { PRIVACY_TEXT } from "@/app/legal/privacy";

export default function PrivacyPage() {
    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
            <h1>개인정보처리방침</h1>

            <pre
                style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 12,
                }}
            >
        {PRIVACY_TEXT}
      </pre>
        </div>
    );
}
