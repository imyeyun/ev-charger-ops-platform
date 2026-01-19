"use client";

import { useState } from "react";
import Header from "@/components/Header";
import styles from "./page.module.css";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function Report() {
    const [selectedReportType, setSelectedReportType] = useState("");
    const [prompt, setPrompt] = useState("");
    const [reportPreview, setReportPreview] = useState("");

    // ✅ 저장 팝업 -> 다운로드 팝업
    const [openDownload, setOpenDownload] = useState(false);

    const handleReportTypeSelect = (type) => {
        setSelectedReportType(type);

        if (type === "audit") setPrompt("감사용 보고서 예시 프롬포트...");
        else if (type === "monthly") setPrompt("월별 보고서 예시 프롬포트...");
        else if (type === "custom") setPrompt("맞춤 보고서 기본 프롬포트 형식...");
    };

    const handleGenerateReport = () => {
        if (!prompt.trim()) {
            alert("프롬포트를 입력해주세요.");
            return;
        }
        setReportPreview(
            `생성된 보고서 미리보기:\n\n${prompt}\n\n[보고서 내용이 여기에 표시됩니다]`
        );
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
                                className={`${styles.reportTypeButton} ${
                                    selectedReportType === "audit" ? styles.active : ""
                                }`}
                                onClick={() => handleReportTypeSelect("audit")}
                            >
                                감사용 보고서
                            </button>

                            <button
                                className={`${styles.reportTypeButton} ${
                                    selectedReportType === "monthly" ? styles.active : ""
                                }`}
                                onClick={() => handleReportTypeSelect("monthly")}
                            >
                                월별 보고서
                            </button>

                            <button
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
                            />
                            <button className={styles.generateButton} onClick={handleGenerateReport}>
                                보고서 생성
                            </button>
                        </div>

                        <div className={styles.previewSection}>
                            <h2 className={styles.sectionTitle}>보고서 미리보기</h2>
                            <div className={styles.previewContent}>
                                {reportPreview ? (
                                    <pre className={styles.previewText}>{reportPreview}</pre>
                                ) : (
                                    <p className={styles.emptyPreview}>생성된 보고서가 없습니다.</p>
                                )}
                            </div>
                        </div>

                        {/* ✅ 하단 액션: PDF 다운로드만 */}
                        <div className={styles.actionButtons}>
                            <button
                                className={styles.actionButton}
                                onClick={() => setOpenDownload(true)}
                                disabled={!reportPreview}
                            >
                                PDF 다운로드
                            </button>
                        </div>
                    </div>
                </div>

                {/* ✅ MUI 팝업: PDF 다운로드 */}
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
                        <Button  variant="contained">
                            확인
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </>
    );
}
