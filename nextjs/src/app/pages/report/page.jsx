"use client";

import { useState } from "react";
import Header from "../../components/Header";
import styles from "./page.module.css";

export default function Report() {
    const [selectedReportType, setSelectedReportType] = useState("");
    const [prompt, setPrompt] = useState("");
    const [reportPreview, setReportPreview] = useState("");
    const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    const handleReportTypeSelect = (type) => {
        setSelectedReportType(type);

        if (type === "audit") {
            setPrompt("감사용 보고서 예시 프롬포트...");
        } else if (type === "monthly") {
            setPrompt("월별 보고서 예시 프롬포트...");
        } else if (type === "custom") {
            setPrompt("맞춤 보고서 기본 프롬포트 형식...");
        }
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

    const confirmDownload = () => {
        console.log("PDF 다운로드");
        setShowDownloadConfirm(false);
    };

    const confirmReset = () => {
        setPrompt("");
        setReportPreview("");
        setSelectedReportType("");
        setShowResetConfirm(false);
    };

    const confirmSave = () => {
        console.log("보고서 저장");
        setShowSaveConfirm(false);
    };

    return (
        <>
            {/* ✅ Report 페이지에서만 Header 사용 */}
            <Header />

            <div className={styles.container}>
                <div className={styles.reportWrapper}>
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
                            <button
                                className={styles.generateButton}
                                onClick={handleGenerateReport}
                            >
                                보고서 생성
                            </button>
                        </div>

                        <div className={styles.previewSection}>
                            <h2 className={styles.sectionTitle}>보고서 미리보기</h2>
                            <div className={styles.previewContent}>
                                {reportPreview ? (
                                    <pre className={styles.previewText}>{reportPreview}</pre>
                                ) : (
                                    <p className={styles.emptyPreview}>
                                        생성된 보고서가 없습니다.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className={styles.actionButtons}>
                            <button
                                className={styles.actionButton}
                                onClick={() => setShowDownloadConfirm(true)}
                                disabled={!reportPreview}
                            >
                                PDF 다운로드
                            </button>
                            <button
                                className={styles.actionButton}
                                onClick={() => setShowResetConfirm(true)}
                            >
                                초기화
                            </button>
                            <button
                                className={styles.actionButton}
                                onClick={() => setShowSaveConfirm(true)}
                                disabled={!reportPreview}
                            >
                                보고서 저장
                            </button>
                        </div>
                    </div>
                </div>

                {/* 다운로드 확인 */}
                {showDownloadConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>PDF 다운로드</h3>
                            <p>생성된 보고서를 PDF로 다운로드하시겠습니까?</p>
                            <div className={styles.modalButtons}>
                                <button onClick={confirmDownload}>확인</button>
                                <button onClick={() => setShowDownloadConfirm(false)}>
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 초기화 확인 */}
                {showResetConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>초기화</h3>
                            <p>작성된 보고서를 초기화하시겠습니까?</p>
                            <div className={styles.modalButtons}>
                                <button onClick={confirmReset}>확인</button>
                                <button onClick={() => setShowResetConfirm(false)}>
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 저장 확인 */}
                {showSaveConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>보고서 저장</h3>
                            <p>생성된 보고서를 DB에 저장하시겠습니까?</p>
                            <div className={styles.modalButtons}>
                                <button onClick={confirmSave}>확인</button>
                                <button onClick={() => setShowSaveConfirm(false)}>
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
