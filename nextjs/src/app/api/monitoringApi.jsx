import axios from "axios";


const baseURL = "http://localhost:8080";
const MOCK = true; // 지금처럼 백 없을 때 true, 백 붙으면 false


const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});


export function getAxiosErrorMessage(err, fallback = "요청에 실패했습니다.") {
    return (
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        fallback
    );
}

// -------------------------
// MOCK 응답 (백 없을 때도 화면 동작 확인 가능)
// -------------------------
client.interceptors.request.use(async (config) => {
    if (!MOCK) return config;


    if (config.url === "/api/charging_station/detail") {
        config.adapter = async () => ({
            data: {
                chargingStation: {
                    statNm: "테스트 충전소",
                    addr: "서울 어딘가",
                    busiNm: "운영사",
                    stat: "사용가능",
                },
                charger: [
                    { chgerId: 1, chgerNm: "1번 충전기" },
                    { chgerId: 2, chgerNm: "2번 충전기" },
                ],
                // 여기 값은 "S3 key"라고 가정
                imgPath: ["sample/key/1.jpg", "sample/key/2.jpg"],
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config,
        });
    }


    if (config.url === "/api/multimodal_analysis") {
        config.adapter = async () => ({
            data: {
                fireYN: "N",
                fireDetails: "특이사항 없음",
                brokeYN: "N",
                brokeDetails: "정상",
                cleanYN: "Y",
                cleanDetails: "오염 감지",
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config,
        });
    }


    if (config.url === "/api/storage/presign") {
        const body = config.data ? JSON.parse(config.data) : {};
        const keys = Array.isArray(body?.keys) ? body.keys : [];

        config.adapter = async () => ({
            data: {
                urls: keys.map((k) => `https://example.com/presigned/${encodeURIComponent(k)}`),
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config,
        });
    }

    return config;
});



export async function getChargingStationDetail(statId) {
    const res = await client.post("/api/charging_station/detail", { statId });
    return res.data;
}


export async function analyzeMultimodal(statId, chargerId) {
    const res = await client.post("/api/multimodal_analysis", { statId, chargerId });
    return res.data;
}


export async function presignUrls(keys = []) {
    const res = await client.post("/api/storage/presign", { keys });
    const data = res.data;

    if (Array.isArray(data?.urls)) return data.urls;
    if (Array.isArray(data?.data?.urls)) return data.data.urls;

    if (data && typeof data === "object" && !Array.isArray(data)) {
        return keys.map((k) => data[k]).filter(Boolean);
    }

    return [];
}
