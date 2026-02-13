package com.example.backend.user.dto;

import com.example.backend.user.entity.Role;
import com.example.backend.user.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserRes {

    private Long userId;
    private String employeeNum;
    private String username;
    private String department;
    private Role role;

    public static UserRes from(User user) {
        return UserRes.builder()
                .userId(user.getUserId())
                .employeeNum(user.getEmployeeNum())
                .username(user.getUsername())
                .department(user.getDepartment())
                .role(user.getRole())
                .build();
    }
}
