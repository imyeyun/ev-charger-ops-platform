package com.example.backend.notification.entity;

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

@Table(name = "external_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExternalNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ext_notif_id")
    private Long extNotifId;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "test_mail", columnDefinition = "TEXT")
    private String testMail;

    @Column(name = "chger_time", nullable = false)
    private LocalDateTime chgerTime;

    @Column(name = "chger_id", nullable = false, length = 2)
    private String chgerId;

    @Column(name = "stat_id", nullable = false, length = 8)
    private String statId;

    @Builder
    public ExternalNotification(String message, String testMail, LocalDateTime chgerTime,
                                 String chgerId, String statId) {
        this.message = message;
        this.testMail = testMail;
        this.chgerTime = chgerTime;
        this.chgerId = chgerId;
        this.statId = statId;
    }
}