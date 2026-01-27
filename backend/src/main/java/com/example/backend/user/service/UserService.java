package com.example.backend.user.service;

import com.example.backend.global.exception.BadRequestException;
import com.example.backend.global.exception.ConflictException;
import com.example.backend.user.dto.LoginReq;
import com.example.backend.user.dto.SignupReq;
import com.example.backend.user.dto.UserRes;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserRes signup(SignupReq request) {
        if (userRepository.existsByEmployeeNum(request.getEmployeeNum())) {
            throw new ConflictException("이미 사용 중인 아이디입니다. 사원 번호를 다시 확인해주세요");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        User user = request.toEntity(encodedPassword);
        User savedUser = userRepository.save(user);

        return UserRes.from(savedUser);
    }

    public UserRes login(LoginReq request) {
        User user = userRepository.findByEmployeeNum(request.getEmployeeNum())
                .orElseThrow(() -> new BadRequestException("아이디 또는 비밀번호가 잘못되었습니다."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("아이디 또는 비밀번호가 잘못되었습니다.");
        }

        return UserRes.from(user);
    }
}
