package com.example.backend.ai.dto.multimodal;

// import 추가
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true) // 추가
public class AiMultimodalRes {

    private Boolean fireYN;
    private Boolean brokenYN;
    private Boolean dirtyYN;
    private Verdict verdict; //추가

// 밑에 어노테이션부터 추가
   @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Verdict {
        private String notes;
    }
}


