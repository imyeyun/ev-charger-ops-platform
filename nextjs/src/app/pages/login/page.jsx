"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Link as MuiLink,
} from "@mui/material";

import { login } from "@/app/api/authApi"; // ✅ 추가

export default function Page() {
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // ✅ userId -> employeeNum 매핑
            await login({ employeeNum: userId, password });

            router.push("/pages/monitoring");
            router.refresh();
        } catch (err) {
            alert(err?.message ?? "로그인에 실패했습니다.");
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                backgroundColor: "#fff",
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "min(560px, 94vw)",
                    border: "1px solid #e6e6e6",
                    borderRadius: 1,
                    p: 5,
                }}
            >
                <Box sx={{ textAlign: "center", mb: 3.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                        <Image
                            src="/logo.png"
                            alt="한국환경공단 로고"
                            priority
                            width={210}
                            height={48}
                            className="darkreader-ignore"
                            data-darkreader-ignore
                            suppressHydrationWarning
                        />
                    </Box>

                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: "#111" }}>
                        한국환경공단
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: "#666", mt: 0.8 }}>
                        Korea Environment Corporation
                    </Typography>
                </Box>

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        placeholder="사용자ID"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        sx={{
                            mb: 2,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 0.7,
                                height: 56,
                                fontSize: 16,
                            },
                        }}
                        inputProps={{ "aria-label": "사용자ID" }}
                    />

                    <TextField
                        fullWidth
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{
                            mb: 2.5,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 0.7,
                                height: 56,
                                fontSize: 16,
                            },
                        }}
                        inputProps={{ "aria-label": "비밀번호" }}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{
                            height: 56,
                            borderRadius: 0.7,
                            fontWeight: 800,
                            fontSize: 16,
                            backgroundColor: "#1b6fff",
                            "&:hover": { backgroundColor: "#135fe0" },
                        }}
                    >
                        로그인
                    </Button>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
                        <MuiLink
                            component="button"
                            type="button"
                            underline="none"
                            sx={{ fontSize: 13, color: "#1b6fff", fontWeight: 600 }}
                            onClick={() => router.push("/pages/signup")}
                        >
                            회원가입
                        </MuiLink>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
