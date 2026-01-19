"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatWidget({ open, onClose }) {
    const [messages, setMessages] = useState([
        { id: 1, role: "bot", text: "안녕하세요! 무엇을 도와드릴까요?" },
    ]);
    const [input, setInput] = useState("");
    const listRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [open, messages]);

    const send = () => {
        const text = input.trim();
        if (!text) return;

        const userMsg = { id: Date.now(), role: "user", text };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        // ✅ 임시 응답(추후 API 연결 시 이 부분 교체)
        setTimeout(() => {
            const botMsg = {
                id: Date.now() + 1,
                role: "bot",
                text: `확인했어요: "${text}"`,
            };
            setMessages((prev) => [...prev, botMsg]);
        }, 400);
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                left: 20,
                bottom: 96, // 하단 고정 버튼과 겹치지 않게
                width: 340,
                height: 440,
                background: "#ffffff",
                border: "1px solid #e6e6e6",
                borderRadius: 12,
                boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                zIndex: 9999,
                display: open ? "flex" : "none",
                flexDirection: "column",
                overflow: "hidden",
                pointerEvents: "auto",
                fontFamily: "Arial, sans-serif",
            }}
        >
            {/* 상단 바 */}
            <div
                style={{
                    height: 44,
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #eeeeee",
                    background: "#ffffff",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>챗봇</div>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "1px solid #e6e6e6",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: "28px",
                        color: "#333",
                    }}
                    aria-label="close"
                >
                    ✕
                </button>
            </div>

            {/* 메시지 영역 */}
            <div
                ref={listRef}
                style={{
                    flex: 1,
                    padding: 12,
                    overflowY: "auto",
                    background: "#fafafa",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                }}
            >
                {messages.map((m) => {
                    const isUser = m.role === "user";
                    return (
                        <div key={m.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                            <div
                                style={{
                                    maxWidth: "78%",
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    fontSize: 12,
                                    lineHeight: 1.4,
                                    background: isUser ? "#1b6fff" : "#ffffff",
                                    color: isUser ? "#ffffff" : "#111111",
                                    border: isUser ? "none" : "1px solid #e6e6e6",
                                    boxShadow: isUser ? "none" : "0 2px 8px rgba(0,0,0,0.04)",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}
                            >
                                {m.text}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 입력 영역 */}
            <div
                style={{
                    padding: 10,
                    borderTop: "1px solid #eeeeee",
                    background: "#ffffff",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                }}
            >
        <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="메시지를 입력하세요"
            rows={1}
            style={{
                flex: 1,
                resize: "none",
                height: 34,
                padding: "8px 10px",
                border: "1px solid #d6d6d6",
                borderRadius: 8,
                fontSize: 12,
                outline: "none",
                fontFamily: "Arial, sans-serif",
            }}
        />
                <button
                    type="button"
                    onClick={send}
                    style={{
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "#1b6fff",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                    }}
                >
                    전송
                </button>
            </div>
        </div>
    );
}
