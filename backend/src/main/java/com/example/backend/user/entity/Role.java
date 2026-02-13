package com.example.backend.user.entity;

import java.util.Map;

public enum Role {
    MANAGER,
    USER;

    private static final Map<String, Role> RANK_MAP = Map.of(
            "주임", MANAGER,
            "대리", MANAGER,
            "과장", MANAGER,
            "차장", MANAGER,
            "부장", MANAGER
    );

    public static Role fromRank(String rank) {
        return RANK_MAP.getOrDefault(rank, USER);
    }
}
