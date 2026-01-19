package com.example.backend.chargingstation.util;

import com.example.backend.chargingstation.entity.ChargerLog;

import java.util.Set;

public class ChargerStatusUtil {

    // 충전기 상태 코드
    public static final int STATUS_UNKNOWN = 0;      // 알수없음
    public static final int STATUS_COMM_ERROR = 1;   // 통신이상
    public static final int STATUS_AVAILABLE = 2;    // 충전가능
    public static final int STATUS_CHARGING = 3;     // 충전중
    public static final int STATUS_STOPPED = 4;      // 운영중지
    public static final int STATUS_MAINTENANCE = 5;  // 점검중

    // 비정상 상태 코드 집합
    public static final Set<Integer> BAD_CASE_STATUSES = Set.of(
            STATUS_UNKNOWN,
            STATUS_COMM_ERROR,
            STATUS_STOPPED,
            STATUS_MAINTENANCE
    );

    private ChargerStatusUtil() {
        // 유틸리티 클래스이므로 인스턴스화 방지
    }

    public static boolean isBadCase(Integer stat) {
        return stat != null && BAD_CASE_STATUSES.contains(stat);
    }

    public static boolean isBadCase(ChargerLog log) {
        return log != null && isBadCase(log.getStat());
    }

    public static String getStatusText(Integer stat) {
        if (stat == null) return "상태확인필요";
        return switch (stat) {
            case STATUS_UNKNOWN -> "알수없음";
            case STATUS_COMM_ERROR -> "통신이상";
            case STATUS_AVAILABLE -> "충전가능";
            case STATUS_CHARGING -> "충전중";
            case STATUS_STOPPED -> "운영중지";
            case STATUS_MAINTENANCE -> "점검중";
            default -> "상태확인필요";
        };
    }
}
