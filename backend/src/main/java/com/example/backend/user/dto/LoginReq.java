package com.example.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LoginReq {

    @NotBlank(message = "사원번호를 입력하지 않았습니다")
    private String employeeNum;

    @NotBlank(message = "비밀번호를 입력하지 않았습니다")
    private String password;
}
