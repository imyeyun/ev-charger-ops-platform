"use client";

import { useState } from "react";
import Header from "@/app/components/Header";
import styles from "./page.module.css";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import reportApi from "@/app/api/reportApi";

export default function Report() {
    const [selectedReportType, setSelectedReportType] = useState("");
    const [prompt, setPrompt] = useState("");

    // 서버가 준 PDF 경로(프론트 도메인 기준 /files/... 형태)
    const [filePath, setFilePath] = useState("");

    // UI 상태
    const [isGenerating, setIsGenerating] = useState(false);
    const [openDownload, setOpenDownload] = useState(false);

    // 파일 없을때 오류
    const [openError, setOpenError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleReportTypeSelect = (type) => {
        setSelectedReportType(type);

        if (type === "audit") setPrompt("감사용 보고서 예시 프롬포트...");
        else if (type === "monthly") setPrompt("월별 보고서 예시 프롬포트...");
        else if (type === "custom") setPrompt("맞춤 보고서 기본 프롬포트 형식...");
    };

    // 파일 존재 체크
    const existsFile = async (url) => {
        try {
            const res = await fetch(url, { method: "HEAD" });
            return res.ok;
        } catch {
            return false;
        }
    };

    /**
     * ✅ 보고서 생성(서버 호출)
     * - 서버가 filePath를 내려주면 미리보기/다운로드에 사용
     */
    // const handleGenerateReport = async () => {
    //     // ✅ 1. 생성 중이면 아예 무시 (완전 차단)
    //     if (isGenerating) return;
    //
    //     // ✅ 2. 입력 검증
    //     if (!selectedReportType) {
    //         alert("보고서 유형을 선택해주세요.");
    //         return;
    //     }
    //     if (!prompt.trim()) {
    //         alert("프롬포트를 입력해주세요.");
    //         return;
    //     }
    //
    //     try {
    //         setIsGenerating(true);
    //         setFilePath(""); // ✅ 이전 미리보기 제거
    //
    //         const payload = {
    //             reportType: selectedReportType,
    //             prompt,
    //             dataStartTime: null,
    //             dataEndTime: null,
    //         };
    //
    //         const data = await reportApi.createReport(payload);
    //
    //         // ✅ 3. filePath 존재 여부
    //         const fp = data?.filePath;
    //         if (!fp) {
    //             setErrorMsg("보고서 생성에 실패했습니다. (파일 경로 없음)");
    //             setOpenError(true);
    //             return;
    //         }
    //
    //         // ✅ 4. 절대경로로 정규화
    //         const normalized =
    //             fp.startsWith("http://") || fp.startsWith("https://")
    //                 ? fp
    //                 : `${window.location.origin}${fp.startsWith("/") ? "" : "/"}${fp}`;
    //
    //         // ✅ 5. 실제 파일 존재 체크 (404 방지)
    //         const ok = await existsFile(normalized);
    //         if (!ok) {
    //             setErrorMsg("보고서 파일을 찾을 수 없습니다. 다시 생성해주세요.");
    //             setOpenError(true);
    //             return;
    //         }
    //
    //         // ✅ 6. 여기까지 왔으면 안전
    //         setFilePath(normalized);
    //
    //     } catch (e) {
    //         setErrorMsg(e.message || "보고서 생성 중 오류가 발생했습니다.");
    //         setOpenError(true);
    //     } finally {
    //         // ✅ 7. 무조건 상태 복구
    //         setIsGenerating(false);
    //     }
    // };


    /* 미리보기 테스트 */
    const handleGenerateReport = async () => {
        if (isGenerating) return; // ✅ 이미 생성 중이면 무시

        if (!selectedReportType) {
            alert("보고서 유형을 선택해주세요.");
            return;
        }
        if (!prompt.trim()) {
            alert("프롬포트를 입력해주세요.");
            return;
        }

        setIsGenerating(true);

        // 🔹 테스트용: 1초 뒤 가짜 filePath 세팅
        setTimeout(async () => {
            // const testPath = "/files/not-exist.pdf";
            const testPath = "/pdf/test-report.pdf";
            const ok = await existsFile(testPath);
            if (!ok) {
                setFilePath(""); // ✅ 미리보기 자체를 안 띄움
                setErrorMsg("보고서 파일을 찾을 수 없습니다. 다시 생성해주세요.");
                setOpenError(true);
                setIsGenerating(false);
                return;
            }

            setFilePath(testPath); // ✅ 존재할 때만 미리보기 띄움
            setIsGenerating(false);
        }, 1000);
    };

    /**
     * ✅ 다운로드 확인 누르면:
     * - filePath를 새 탭으로 열거나,
     * - a 태그 download로 저장 트리거
     *
     * (프록시가 Content-Disposition을 attachment로 주면 자동 다운로드 됨)
     */
    const confirmDownload = async () => {
        if (!filePath) return;

        const ok = await existsFile(filePath);
        if (!ok) {
            setErrorMsg("다운로드할 파일이 존재하지 않습니다. 다시 생성해주세요.");
            setOpenError(true);
            setOpenDownload(false);
            return;
        }

        // 존재하면 진행
        // window.open(...) 또는 a download 방식 등
        window.open(filePath, "_blank", "noopener,noreferrer");
        setOpenDownload(false);
    };

    return (
        <>
            <Header />

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
                                    // ✅ 서버가 준 PDF URL로 미리보기
                                    // (CSP/헤더에 따라 iframe이 막힐 수 있음. 그땐 링크로 대체하면 됨)
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
                <Dialog open={openDownload} onClose={() => setOpenDownload(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>PDF 다운로드</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2">생성된 보고서를 PDF 파일로 다운로드하시겠습니까?</Typography>
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
                <Dialog open={openError} onClose={() => setOpenError(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>파일을 불러올 수 없음</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2">{errorMsg}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenError(false)} variant="contained">확인</Button>
                    </DialogActions>
                </Dialog>
            </div>
        </>
    );
}
