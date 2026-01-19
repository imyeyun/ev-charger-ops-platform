package com.example.backend.request.controller;

import com.example.backend.request.dto.RequestDetailReq;
import com.example.backend.request.dto.RequestDetailRes;
import com.example.backend.request.dto.RequestListItemRes;
import com.example.backend.request.service.RequestService;
import com.example.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Request", description = "민원 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    @Operation(summary = "민원 리스트 조회", description = "전체 민원 목록 조회")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공",
            content = @Content(examples = @ExampleObject(value = """
                    {
                      "code": 200,
                      "message": "success",
                      "data": [
                        {
                          "reqId": 2,
                          "title": "string",
                          "reqType": "COMPLAINT",
                          "reqDt": "2024-01-10T10:00:00",
                          "field": "PENDING"
                        },
                        {
                          "reqId": 1,
                          "title": "string",
                          "reqType": "INQUIRY",
                          "reqDt": "2024-01-09T09:00:00",
                          "field": "COMPLETED"
                        }
                      ]
                    }
                    """)))
    @GetMapping("/request")
    public ResponseEntity<ApiResponse<List<RequestListItemRes>>> getRequestList() {
        List<RequestListItemRes> response = requestService.getRequestList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "민원 상세 조회", description = "민원 ID로 상세 정보 및 답변 조회")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
            examples = @ExampleObject(value = """
                    {
                      "reqId": 1
                    }
                    """)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공",
            content = @Content(examples = @ExampleObject(value = """
                    {
                      "code": 200,
                      "message": "success",
                      "data": {
                        "request": {
                          "reqId": 1,
                          "chargerId": "01",
                          "statId": "STAT0001",
                          "zcode": "11",
                          "zscode": "11000",
                          "busId": "01",
                          "title": "string",
                          "content": "string",
                          "reqType": "COMPLAINT",
                          "reqDt": "2024-01-10T10:00:00",
                          "status": "PENDING"
                        },
                        "outbounds": [
                          {
                            "procId": 101,
                            "answer": "string",
                            "answerDt": "2024-01-10T11:00:00"
                          }
                        ]
                      }
                    }
                    """)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "잘못된 형식",
            content = @Content(examples = @ExampleObject(value = """
                    {
                      "code": 400,
                      "message": "잘못된 형식입니다."
                    }
                    """)))
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<RequestDetailRes>> getRequestDetail(@Valid @RequestBody RequestDetailReq request) {
        RequestDetailRes response = requestService.getRequestDetail(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}