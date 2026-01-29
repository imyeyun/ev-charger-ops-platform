"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

export default function ChatWidget({ open, onClose }) {
    const [messages, setMessages] = useState([
        { id: 1, role: "bot", text: "안녕하세요! 무엇을 도와드릴까요?" },
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [threadId, setThreadId] = useState(null);
    const [employeeNum, setEmployeeNum] = useState("");
    const listRef = useRef(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = sessionStorage.getItem("login_employeeNum");
        setEmployeeNum(stored || "");
    }, []);

    // ✅ 챗봇 열 때마다 threadId 발급: 0,1,2...
    useEffect(() => {
        if (!open) return;

        if (typeof window === "undefined") return;
        const saved = sessionStorage.getItem("chat_tid_next");
        if (saved === null || saved === "") {
            sessionStorage.setItem("chat_tid_next", "1");
            setThreadId(String(employeeNum) + "0");
            return;
        }

        // 저장된 값이 있으면, 그 값을 이번 threadId로 사용
        setThreadId(Number(saved));
        sessionStorage.setItem("chat_tid_next", String(Number(saved) + 1));
        setThreadId(String(employeeNum) + Number(saved));
    }, [open]);


    useEffect(() => {
        if (!open) return;
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [open, messages]);


    async function callQnaApi(prompt) {
        const res = await axios.post("/api/qnaApi", {
            prompt: String(prompt),
            threadId: threadId,
        });

        const data = res.data;
        if (data && data.answer !== undefined && data.answer !== null) {
            return String(data.answer);
        }
        return "";
    }

    async function send() {
        const text = input.trim();
        if (text.length === 0) return;
        if (sending) return;

        setInput("");
        setSending(true);

        const userId = Date.now();
        const loadingId = userId + 1;

        setMessages(function (prev) {
            return prev.concat(
                { id: userId, role: "user", text: text },
                { id: loadingId, role: "bot", text: "답변 생성 중..." }
            );
        });

        try {
            const answer = await callQnaApi(text);

            // 답이 비어있으면 기본 문구
            let botText = "응답이 비어있습니다. (백 응답 형식 확인 필요)";
            if (String(answer).trim().length > 0) {
                botText = String(answer);
            }

            setMessages(function (prev) {
                return prev.map(function (m) {
                    if (m.id === loadingId) {
                        return { id: m.id, role: m.role, text: botText };
                    }
                    return m;
                });
            });
        } catch (err) {
            let msg = "요청 실패";

            if (err && err.response && err.response.data) {
                if (err.response.data.message) msg = String(err.response.data.message);
                else if (err.response.data.error) msg = String(err.response.data.error);
            } else if (err && err.message) {
                msg = String(err.message);
            }

            setMessages(function (prev) {
                return prev.map(function (m) {
                    if (m.id === loadingId) {
                        return { id: m.id, role: m.role, text: "요청 실패: " + msg };
                    }
                    return m;
                });
            });
        } finally {
            setSending(false);
        }
    }

    function handleClose() {
        setThreadId(null);
        onClose();
    }

    function onKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                left: 20,
                bottom: 96,
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
                    onClick={handleClose}
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
                        <div
                            key={m.id}
                            style={{
                                display: "flex",
                                justifyContent: isUser ? "flex-end" : "flex-start",
                            }}
                        >
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
                                    boxShadow: isUser
                                        ? "none"
                                        : "0 2px 8px rgba(0,0,0,0.04)",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    opacity: m.text === "답변 생성 중..." ? 0.75 : 1,
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
            disabled={sending}
        />
                <button
                    type="button"
                    onClick={send}
                    disabled={sending}
                    style={{
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        border: "none",
                        background: sending ? "#9bbcff" : "#1b6fff",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: sending ? "not-allowed" : "pointer",
                    }}
                >
                    {sending ? "전송중" : "전송"}
                </button>
            </div>
        </div>
    );
}
