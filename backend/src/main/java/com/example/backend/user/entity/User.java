package com.example.backend.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "employee_num", nullable = false, length = 20, unique = true)
    private String employeeNum;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "username", nullable = false, length = 10)
    private String username;

    @Column(name = "department", nullable = false, length = 20)
    private String department;

    @Builder
    public User(String employeeNum, String password, String username, String department) {
        this.employeeNum = employeeNum;
        this.password = password;
        this.username = username;
        this.department = department;
    }
}
