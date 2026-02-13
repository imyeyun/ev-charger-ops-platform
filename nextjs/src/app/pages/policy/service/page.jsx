import { SERVICE_TEXT } from "@/app/legal/service";

export default function ServiceTermsPage() {
    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
            <h1>서비스 이용약관</h1>

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
        {SERVICE_TEXT}
      </pre>
        </div>
    );
}
