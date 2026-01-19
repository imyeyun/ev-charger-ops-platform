export default function ChartChargerStatusSummary({ total = 152 }) {
    return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{total}</div>
                <div style={{ fontSize: 11, color: "#999" }}>전체</div>
            </div>
        </div>
    );
}