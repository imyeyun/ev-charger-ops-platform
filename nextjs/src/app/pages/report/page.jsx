"use client";

import { useState } from "react";
import Header from "@/app/components/Header";
import styles from "./page.module.css";

import axios from "axios";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
// 스피너
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";

export default function Report() {
    const [selectedReportType, setSelectedReportType] = useState("");
    const [prompt, setPrompt] = useState("");

    // 서버가 준 PDF URL(프론트에서 열 수 있는 형태)
    const [filePath, setFilePath] = useState("");

    // UI 상태
    const [isGenerating, setIsGenerating] = useState(false);
    const [openDownload, setOpenDownload] = useState(false);

    // 에러 팝업
    const [openError, setOpenError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleReportTypeSelect = (type) => {
        setSelectedReportType(type);

        if (type === "audit") setPrompt("감사용 보고서 예시 프롬포트...");
        else if (type === "monthly") setPrompt("월별 보고서 예시 프롬포트...");
        else if (type === "custom") setPrompt("맞춤 보고서 기본 프롬포트 형식...");
    };

    /**
     * ✅ 백엔드 연동 버전
     * - reportApi.generateAndResolve()만 호출
     * - 결과로 받은 fileUrl을 미리보기/다운로드에 사용
     */

    const handleGenerateReport = async () => {
        if (isGenerating) return;

        if (!selectedReportType) {
            setErrorMsg("보고서 유형을 선택해주세요.");
            setOpenError(true);
            return;
        }
        if (!prompt.trim()) {
            setErrorMsg("프롬포트를 입력해주세요.");
            setOpenError(true);
            return;
        }

        setIsGenerating(true);
        setFilePath("");

        try {
            const payload = {
                reportType: selectedReportType,
                prompt,
                dataStartTime: null,
                dataEndTime: null,
            };

            // ✅ route 호출 (여기서 백엔드 호출/정규화/존재체크까지 완료됨)
            const res = await axios.post("/api/reportApi", payload, {
                headers: { "Content-Type": "application/json" },
                validateStatus: () => true,
            });

            if (res.status < 200 || res.status >= 300) {
                const msg =
                    res.data?.message ||
                    res.data?.msg ||
                    res.data?.error ||
                    "보고서 생성 중 오류가 발생했습니다.";
                throw new Error(msg);
            }

            const fileUrl = res.data?.fileUrl;
            if (!fileUrl) {
                throw new Error("fileUrl을 받지 못했습니다. 응답을 확인해주세요.");
            }

            setFilePath(fileUrl);
        } catch (e) {
            setErrorMsg(e?.message || "보고서 생성 중 오류가 발생했습니다.");
            setOpenError(true);
        } finally {
            setIsGenerating(false);
        }
    };



    /**
     * ✅ 다운로드 확인
     */
    const confirmDownload = async () => {
        try {
            const fileUrl = await reportApi.validateDownload(filePath);
            window.open(fileUrl, "_blank", "noopener,noreferrer");
            setOpenDownload(false);
        } catch (e) {
            setErrorMsg(e?.message || "다운로드할 파일을 확인할 수 없습니다.");
            setOpenError(true);
            setOpenDownload(false);
        }
    };

    return (
        <>
            <Header />

            {/*스피너 기능*/}
            <Backdrop
                open={isGenerating}
                sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}
            >
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress color="inherit" />
                    <Typography variant="body2">보고서 생성 중...</Typography>
                </Stack>
            </Backdrop>
            <div className={styles.container}>
                <div className={styles.reportWrapper}>
                    {/* 사이드바 */}
                    <div className={styles.sidebar}>
                        <h2 className={styles.sidebarTitle}>보고서 유형</h2>
                        <div className={styles.reportTypeList}>
                            <button
                                disabled={isGenerating}
                                className={`${styles.reportTypeButton} ${
                                    selectedReportType === "audit" ? styles.active : ""
                                }`}
                                onClick={() => handleReportTypeSelect("audit")}
                            >
                                감사용 보고서
                            </button>

                            <button
                                disabled={isGenerating}
                                className={`${styles.reportTypeButton} ${
                                    selectedReportType === "monthly" ? styles.active : ""
                                }`}
                                onClick={() => handleReportTypeSelect("monthly")}
                            >
                                월별 보고서
                            </button>

                            <button
                                disabled={isGenerating}
                                className={`${styles.reportTypeButton} ${
                                    selectedReportType === "custom" ? styles.active : ""
                                }`}
                                onClick={() => handleReportTypeSelect("custom")}
                            >
                                맞춤 보고서
                            </button>
                        </div>
                    </div>

                    {/* 메인 */}
                    <div className={styles.mainContent}>
                        <div className={styles.promptSection}>
                            <h2 className={styles.sectionTitle}>프롬포트 입력</h2>
                            <textarea
                                className={styles.promptInput}
                                placeholder="프롬포트를 입력하세요..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={10}
                                disabled={isGenerating}
                            />

                            <button
                                className={styles.generateButton}
                                onClick={handleGenerateReport}
                                disabled={isGenerating}
                            >
                                {isGenerating ? "생성 중..." : "보고서 생성"}
                            </button>
                        </div>

                        <div className={styles.previewSection}>
                            <h2 className={styles.sectionTitle}>보고서 미리보기</h2>

                            <div className={styles.previewContent}>
                                {filePath ? (
                                    <iframe
                                        title="report-preview"
                                        src={filePath}
                                        style={{
                                            width: "100%",
                                            height: "420px",
                                            border: "1px solid #ddd",
                                            borderRadius: "8px",
                                        }}
                                    />
                                ) : (
                                    <p className={styles.emptyPreview}>생성된 보고서가 없습니다.</p>
                                )}
                            </div>

                            {filePath && (
                                <div style={{ marginTop: 10 }}>
                                    <a href={filePath} target="_blank" rel="noreferrer">
                                        새 탭에서 PDF 열기
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* 하단 액션 */}
                        <div className={styles.actionButtons}>
                            <button
                                className={styles.actionButton}
                                onClick={() => setOpenDownload(true)}
                                disabled={!filePath}
                            >
                                PDF 다운로드
                            </button>
                        </div>
                    </div>
                </div>

                {/* MUI 팝업: PDF 다운로드 */}
                <Dialog
                    open={openDownload}
                    onClose={() => setOpenDownload(false)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>PDF 다운로드</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2">
                            생성된 보고서를 PDF 파일로 다운로드하시겠습니까?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDownload(false)} variant="outlined">
                            취소
                        </Button>
                        <Button
                            onClick={confirmDownload}
                            variant="contained"
                            disabled={!filePath}
                        >
                            확인
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* 에러 팝업 */}
                <Dialog
                    open={openError}
                    onClose={() => setOpenError(false)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>오류</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2">{errorMsg}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenError(false)} variant="contained">
                            확인
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </>
    );
}
