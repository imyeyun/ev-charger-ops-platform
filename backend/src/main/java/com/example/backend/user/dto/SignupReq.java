package com.example.backend.user.dto;

import com.example.backend.user.entity.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SignupReq {

    @NotBlank(message = "사원번호를 입력하지 않았습니다")
    @Size(max = 20, message = "사원번호는 20자 이내여야 합니다")
    private String employeeNum;

    @NotBlank(message = "비밀번호를 입력하지 않았습니다")
    private String password;

    @NotBlank(message = "이름을 입력하지 않았습니다")
    @Size(max = 10, message = "이름은 10자 이내여야 합니다")
    private String username;

    @NotBlank(message = "부서를 입력하지 않았습니다")
    @Size(max = 20, message = "부서명은 20자 이내여야 합니다")
    private String department;

    public User toEntity(String encodedPassword) {
        return User.builder()
                .employeeNum(this.employeeNum)
                .password(encodedPassword)
                .username(this.username)
                .department(this.department)
                .build();
    }
}
