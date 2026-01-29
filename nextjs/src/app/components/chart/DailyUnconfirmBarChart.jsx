"use client";

import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

export default function DailyUnconfirmBarChart({ data }) {
    return (
        <div style={{ width: "100%", height: 260 }}>
            <h4 style={{ marginBottom: 12 }}>일별 상태 미확인 충전기 개수</h4>
            <ResponsiveContainer>
                <BarChart data={data}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2F80ED" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}