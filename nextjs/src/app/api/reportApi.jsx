// src/app/api/reportApi.jsx (경로는 너 프로젝트 기준에 맞춰)
import axios from "axios";

/**
 * 저장소/백엔드에서 받은 경로를
 * "프론트에서 바로 열 수 있는 절대 URL"로 통일
 */
function normalizeToFrontUrl(rawPath) {
    if (!rawPath) return null;

    // 이미 절대 URL이면 그대로 사용
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
        return rawPath;
    }

    // 예: reports/abc.pdf → /pdf/abc.pdf
    const fileName = rawPath.split("/").pop();
    const frontPath = `/pdf/${fileName}`;

    // 절대경로로 변환 (client에서만 동작)
    return `${window.location.origin}${frontPath}`;
}

/**
 * 실제 파일 존재 여부 체크 (404 방지)
 * - fetch 대신 axios HEAD 사용
 */
async function existsFile(url) {
    try {
        const res = await axios.head(url, {
            validateStatus: () => true, // 404여도 throw 안 함
        });
        return res.status >= 200 && res.status < 300;
    } catch {
        return false;
    }
}

/**
 * 보고서 생성 + 링크 정리까지 한 번에 처리
 * - 백엔드를 직접 치지 않고, Next route(/api/report)를 호출
 */
async function generateAndResolve(payload) {
    try {
        const res = await axios.post("/api/reportApi", payload, {
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
        });

        // 백엔드/route가 에러를 메시지로 내려주는 경우 처리
        if (res.status < 200 || res.status >= 300) {
            const msg =
                res.data?.message || res.data?.msg || res.data?.error || "보고서 생성에 실패했습니다.";
            throw new Error(msg);
        }

        const rawPath = res.data?.filePath;
        if (!rawPath) {
            throw new Error("보고서 파일 경로를 받지 못했습니다.");
        }

        // 1) 프론트 기준 절대 URL로 정규화
        const fileUrl = normalizeToFrontUrl(rawPath);

        // 2) 실제 파일 존재 체크
        const ok = await existsFile(fileUrl);
        if (!ok) {
            throw new Error("보고서 파일이 존재하지 않습니다.");
        }

        return {
            fileUrl,
            reportId: res.data?.reportId,
        };
    } catch (e) {
        throw new Error(e?.message || "보고서 생성 중 오류가 발생했습니다.");
    }
}

/**
 * pdf 다운로드 파일 체크
 */
async function validateDownload(fileUrl) {
    const ok = await existsFile(fileUrl);
    if (!ok) {
        throw new Error("다운로드할 파일이 존재하지 않습니다.");
    }
    return fileUrl;
}

export default {
    generateAndResolve,
    validateDownload,
};
