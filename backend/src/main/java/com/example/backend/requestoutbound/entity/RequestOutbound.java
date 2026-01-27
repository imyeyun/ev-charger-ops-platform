package com.example.backend.requestoutbound.entity;

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

import java.time.LocalDateTime;

@Entity
@Table(name = "request_outbound")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RequestOutbound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proc_id")
    private Long procId;

    @Column(name = "answer", nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(name = "answer_dt", nullable = false)
    private LocalDateTime answerDt;

    @Column(name = "req_id", nullable = false)
    private Long reqId;

    @Builder
    public RequestOutbound(String answer, LocalDateTime answerDt, Long reqId) {
        this.answer = answer;
        this.answerDt = answerDt;
        this.reqId = reqId;
    }
}
