import { axiosClient } from "./axiosClient";


export async function askQnA({ question, statId, chargerId, context }) {
    const res = await axiosClient.post("/api/qna", {
        question,
        statId,
        chargerId,
        context,
    });
    return res.data;
}
