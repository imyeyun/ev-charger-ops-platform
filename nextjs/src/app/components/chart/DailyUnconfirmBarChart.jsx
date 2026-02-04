"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

function toLabelMMDD(iso) {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}`;
}

export default function DailyUnconfirmBarChart() {
    const [daily, setDaily] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;

        const run = async () => {
            try {
                setLoading(true);
                setError("");

                const res = await fetch("/api/componentApi/DailyUnconfirmBarChart", { cache: "no-store" });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.error || data?.message || "Internal Server Error");
                }

                if (alive) setDaily(data.dailychargerStatBadCase || []);
            } catch (e) {
                if (alive) setError(e?.message || "Internal Server Error");
            } finally {
                if (alive) setLoading(false);
            }
        };

        run();
        return () => {
            alive = false;
        };
    }, []);

    const chartData = useMemo(() => {
        return daily.map((it) => ({
            label: toLabelMMDD(it.date),
            sum: Number(it.sum) || 0,
        }));
    }, [daily]);

    if (loading) return <div>불러오는 중...</div>;
    if (error) return <div style={{ color: "#b00020" }}>{error}</div>;
    if (!chartData.length) return <div>표시할 데이터가 없습니다.</div>;

    return (
        <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="sum" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
