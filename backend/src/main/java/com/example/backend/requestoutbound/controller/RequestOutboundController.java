package com.example.backend.requestoutbound.controller;

import com.example.backend.requestoutbound.dto.OutboundBatchReq;
import com.example.backend.requestoutbound.dto.OutboundBatchRes;
import com.example.backend.requestoutbound.service.RequestOutboundService;
import com.example.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "RequestOutbound", description = "민원 처리 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RequestOutboundController {

    private final RequestOutboundService requestOutboundService;

    @Operation(summary = "민원 일괄 처리", description = "선택된 민원들에 대해 AI 답변을 생성하여 처리")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
            examples = @ExampleObject(value = """
                    {
                      "reqIds": [12, 15]
                    }
                    """)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "처리 성공",
            content = @Content(examples = @ExampleObject(value = """
                    {
                      "code": 200,
                      "message": "success",
                      "data": {
                        "requestedCount": 2,
                        "successCount": 2,
                        "results": [
                          { "reqId": 12, "status": "PROCESSED", "procId": 101 },
                          { "reqId": 15, "status": "PROCESSED", "procId": 102 }
                        ]
                      }
                    }
                    """)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "민원 없음",
            content = @Content(examples = @ExampleObject(value = """
                    {
                      "code": 404,
                      "message": "해당 민원을 찾을 수 없습니다."
                    }
                    """)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "이미 답변 등록됨",
            content = @Content(examples = @ExampleObject(value = """
                    {
                      "code": 409,
                      "message": "이미 답변이 등록된 민원입니다."
                    }
                    """)))
    @PostMapping("/request_outbound")
    public ResponseEntity<ApiResponse<OutboundBatchRes>> processRequests(@Valid @RequestBody OutboundBatchReq request) {
        OutboundBatchRes response = requestOutboundService.processRequests(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}