"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";

import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Link as MuiLink,
} from "@mui/material";

export default function Page() {
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const employeeNum = userId.trim();
        const pw = password;

        if (!employeeNum) {
            alert("사용자ID를 입력해주세요.");
            return;
        }
        if (!pw) {
            alert("비밀번호를 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(
                "/api/authApi/login",
                { employeeNum, password: pw },
                { headers: { "Content-Type": "application/json" } }
            );

            router.push("/pages/monitoring");
            router.refresh(); // 너 말대로 일단 유지
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                "로그인에 실패했습니다.";
            alert(msg);
            setIsLoading(false);
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
                            width={220}
                            height={50}
                        />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: "#666", mt: 0.8 }}>
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
                        disabled={isLoading}
                        sx={{
                            height: 56,
                            borderRadius: 0.7,
                            fontWeight: 800,
                            fontSize: 16,
                            backgroundColor: "#1b6fff",
                            "&:hover": { backgroundColor: "#135fe0" },
                            "&.Mui-disabled": {
                                backgroundColor: "#9bbcff",
                                color: "#fff",
                            },
                        }}
                    >
                        {isLoading ? "로그인 중..." : "로그인"}
                    </Button>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
                        <MuiLink
                            component="button"
                            type="button"
                            underline="none"
                            sx={{ fontSize: 13, color: "#1b6fff", fontWeight: 600 }}
                            onClick={() => router.push("/pages/signup")}
                            disabled={isLoading}
                        >
                            회원가입
                        </MuiLink>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
