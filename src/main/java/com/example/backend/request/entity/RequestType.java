package com.example.backend.request.entity;

public enum RequestType {

    CHARGER_BREAKDOWN("충전기 고장"),
    PAYMENT("결제"),
    SUBSIDY("보조금"),
    OTHER("기타");

    private final String description;

    RequestType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}