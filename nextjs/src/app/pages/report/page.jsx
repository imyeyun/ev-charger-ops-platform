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

const CUSTOM_REPORT_PROMPT_GUIDE = [
    "원하는 보고서 범위를 자연어로 입력해 주세요. 기본/전체 작성, 특정 목차만 선택, 제외할 주제 지정, 목차 직접 입력까지 모두 가능합니다. 예: \"2.1만 작성\", \"민원/품질 제외\", \"목차 직접 지정: 1. 서론 2. 이용 현황 3. 결론\"처럼 입력하면 요청한 범위에 맞춰 보고서를 생성합니다.",
    "",
    "간단 예시(3개):",
    "",
    "1. 기본 보고서 만들어줘",
    "2. 전체 항목으로 상세 보고서 작성해줘",
    "3. 지역별 위험 수준 비교만 작성해줘",
].join("\n");

export default function Report() {
    const [selectedReportType, setSelectedReportType] = useState("");
    const [prompt, setPrompt] = useState("");

    // ✅ 날짜 추가
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const handleStartDateChange = (e) => {
        const next = e.target.value;

        // ✅ 날짜 선택 시점에서 검증
        if (endDate && next && next > endDate) {
            setErrorMsg("시작일은 종료일보다 늦을 수 없습니다.");
            setOpenError(true);
            return; // 값 반영 안 함(유지)
        }
        setStartDate(next);
    };

    const handleEndDateChange = (e) => {
        const next = e.target.value;

        // ✅ 날짜 선택 시점에서 검증
        if (startDate && next && startDate > next) {
            setErrorMsg("종료일은 시작일보다 빠를 수 없습니다.");
            setOpenError(true);
            return; // 값 반영 안 함(유지)
        }
        setEndDate(next);
    };

    const today = (() => {
        const now = new Date(); // 로컬(=한국 PC면 KST)
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    })();


    // 서버가 준 PDF URL(프론트에서 열 수 있는 형태)
    const [filePath, setFilePath] = useState("");
    const proxiedPreviewPath = filePath
        ? `/api/reportApi?src=${encodeURIComponent(filePath)}`
        : "";
    const proxiedDownloadPath = filePath
        ? `/api/reportApi?src=${encodeURIComponent(filePath)}&download=1`
        : "";

    // UI 상태
    const [isGenerating, setIsGenerating] = useState(false);
    const [openDownload, setOpenDownload] = useState(false);

    // 에러 팝업
    const [openError, setOpenError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleReportTypeSelect = (type) => {
        setSelectedReportType(type);
        setPrompt("");
    };

    const resetDates = () => {
        setStartDate("");
        setEndDate("");
    };

    /**
     * ✅ 백엔드 연동 버전
     */
    const handleGenerateReport = async () => {
        if (isGenerating) return;

        if (!startDate || !endDate) {
            setErrorMsg("기간(시작일/종료일)을 선택해주세요.");
            setOpenError(true);
            return;
        }

        if (!selectedReportType) {
            setErrorMsg("보고서 유형을 선택해주세요.");
            setOpenError(true);
            return;
        }
        if (!prompt.trim()) {
            setErrorMsg("내용을 입력해주세요...");
            setOpenError(true);
            return;
        }

        setIsGenerating(true);
        setFilePath("");

        try {
            const payload = {
                reportType: selectedReportType,
                prompt,
                dataStartTime: startDate,
                dataEndTime: endDate,
            };

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
     * - 원래 reportApi.validateDownload(filePath) 쓰려면 reportApi import가 필요함
     * - 지금은 최소 동작으로 filePath를 바로 오픈
     */
    const confirmDownload = async () => {
        try {
            window.open(proxiedDownloadPath, "_blank", "noopener,noreferrer");
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

            {/* 스피너 */}
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
                        {/* ✅ 기간 선택 박스 */}
                        <div className={styles.sidebarBox}>
                            <h2 className={styles.sidebarTitle}>기간 선택</h2>

                            <div className={styles.dateRow}>
                                <label className={styles.dateLabel}>시작일</label>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    disabled={isGenerating}
                                    max={today}
                                    onKeyDown={(e) => e.preventDefault()}
                                    onPaste={(e) => e.preventDefault()}
                                    onDrop={(e) => e.preventDefault()}
                                />
                            </div>

                            <div className={styles.dateRow}>
                                <label className={styles.dateLabel}>종료일</label>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                    disabled={isGenerating}
                                    max={today}
                                    onKeyDown={(e) => e.preventDefault()}
                                    onPaste={(e) => e.preventDefault()}
                                    onDrop={(e) => e.preventDefault()}
                                />
                            </div>

                            <button
                                type="button"
                                className={styles.dateResetButton}
                                onClick={resetDates}
                                disabled={isGenerating || (!startDate && !endDate)}
                            >
                                기간 초기화
                            </button>
                        </div>

                        {/* ✅ 보고서 유형 박스 */}
                        <div className={styles.sidebarBox}>
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
                    </div>


                    {/* 메인 */}
                    <div className={styles.mainContent}>
                        <div className={styles.promptSection}>
                            <h2 className={styles.sectionTitle}>프롬프트 입력</h2>
                            <textarea
                                className={styles.promptInput}
                                placeholder={
                                    selectedReportType === "custom"
                                        ? CUSTOM_REPORT_PROMPT_GUIDE
                                        : selectedReportType
                                            ? "내용을 입력해주세요..."
                                            : "보고서를 선택해주세요..."
                                }
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={10}
                                disabled={isGenerating}
                                style={{ color: "#111111" }}
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
                                        src={proxiedPreviewPath}
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
                                    <a href={proxiedPreviewPath} target="_blank" rel="noreferrer">
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

                {/* 다운로드 팝업 */}
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
                        <Button onClick={confirmDownload} variant="contained" disabled={!filePath}>
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
