package com.example.backend.ai.dto.multimodal;

// import 추가
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiMultimodalRes {
    private Boolean fireYN;
    private Boolean brokenYN;  // 또는 faultYN 쓰는 경우도 있음
    private Boolean dirtyYN;
    private Verdict verdict;

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Verdict {
        private Boolean fireYN;
        private Boolean faultYN;   // ✅ FastAPI verdict에는 보통 faultYN
        private Boolean dirtyYN;
        private String notes;
    }
}



