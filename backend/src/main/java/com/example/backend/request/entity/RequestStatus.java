package com.example.backend.request.entity;

public enum RequestStatus {

    PENDING("대기중"),
    IN_PROGRESS("처리중"),
    COMPLETED("완료"),
    REJECTED("반려");

    private final String description;

    RequestStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
