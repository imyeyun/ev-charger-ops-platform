package com.example.backend.user.controller;

import com.example.backend.global.response.ApiResponse;
import com.example.backend.user.dto.LoginReq;
import com.example.backend.user.dto.SignupReq;
import com.example.backend.user.dto.UserRes;
import com.example.backend.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "User", description = "사용자 API")
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserRes>> signup(@Valid @RequestBody SignupReq request) {
        UserRes response = userService.signup(request);
        return ResponseEntity.ok(ApiResponse.success("회원가입이 완료되었습니다.", response));
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserRes>> login(
            @Valid @RequestBody LoginReq request,
            HttpServletRequest httpRequest) {
        UserRes response = userService.login(request);

        // 세션 고정 공격 방지: 기존 세션 무효화 후 새 세션 생성
        HttpSession oldSession = httpRequest.getSession(false);
        if (oldSession != null) {
            oldSession.invalidate();
        }

        HttpSession newSession = httpRequest.getSession(true);
        newSession.setAttribute("user", response);

        return ResponseEntity.ok(ApiResponse.success("로그인 성공", response));
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(ApiResponse.success("로그아웃 성공", null));
    }

    @Operation(summary = "현재 로그인 사용자 조회")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserRes>> getCurrentUser(HttpSession session) {
        UserRes user = (UserRes) session.getAttribute("user");

        if (user == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error(401, "로그인이 필요합니다."));
        }

        return ResponseEntity.ok(ApiResponse.success("조회 성공", user));
    }
}
