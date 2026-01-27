package com.example.backend.ai.dto.multimodal;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AiMultimodalRes {

    private Boolean fireYN;
    private String fireDetails;
    private Boolean brokenYN;
    private String brokeDetails;
    private Boolean cleanYN;
    private String cleanDetails;
}
