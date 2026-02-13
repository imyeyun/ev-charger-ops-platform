package com.example.backend.user.dto;

import com.example.backend.user.entity.Role;
import com.example.backend.user.entity.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
    @Size(min = 8, max = 128, message = "비밀번호는 8자 이상 128자 이하여야 합니다")
    private String password;

    @NotBlank(message = "이름을 입력하지 않았습니다")
    @Size(max = 10, message = "이름은 10자 이내여야 합니다")
    private String username;

    @NotBlank(message = "부서-직급을 입력하지 않았습니다")
    @Size(max = 30, message = "부서-직급은 30자 이내여야 합니다")
    @Pattern(regexp = "^.+-.+$", message = "부서-직급 형식으로 입력해주세요 (예: 기술팀-과장)")
    private String department;

    public User toEntity(String encodedPassword, String departmentName, Role role) {
        return User.builder()
                .employeeNum(this.employeeNum)
                .password(encodedPassword)
                .username(this.username)
                .department(departmentName)
                .role(role)
                .build();
    }
}
