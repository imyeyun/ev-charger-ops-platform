package com.example.backend.analysis.entity;

import com.example.backend.chargingstation.entity.Charger;
import com.example.backend.chargingstation.entity.ImageLog;
import com.example.backend.chargingstation.entity.SensorLog;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "multimodal_analysis")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MultimodalAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "multimodal_id")
    private Long multimodalId;

    @Column(name = "fire_yn", nullable = false)
    private Boolean fireYn;

    @Column(name = "broke_yn", nullable = false)
    private Boolean brokeYn;

    @Column(name = "dirty_yn", nullable = true)  //변수명 수정, rule-based로 fire로 판정되면” dirty가 null로 처리하기로 해서 nullable = true
    private Boolean dirtyYn;

    @Column(name = "notes", length = 300) // llm 응답 부분 추가
    private String notes;

    @Column(name = "imgsensoranal_time", nullable = false)
    private LocalDateTime imgsensoranalTime;

    @Column(name = "img_id", nullable = false)
    private Long imgId;

    @Column(name = "img_time", nullable = false)
    private LocalDateTime imgTime;

    @Column(name = "transaction_id", nullable = false, length = 10)
    private String transactionId;

    @Column(name = "chger_id", nullable = false, length = 2)
    private String chgerId;

    @Column(name = "stat_id", nullable = false, length = 8)
    private String statId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "chger_id", referencedColumnName = "chger_id", insertable = false, updatable = false),
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false),

    })
    private Charger charger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "img_id", referencedColumnName = "img_id", insertable = false, updatable = false),
            @JoinColumn(name = "img_time", referencedColumnName = "img_time", insertable = false, updatable = false),

    })
    private ImageLog imageLog;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "transaction_id", referencedColumnName = "transaction_id", insertable = false, updatable = false),
            @JoinColumn(name = "chger_id", referencedColumnName = "chger_id", insertable = false, updatable = false),
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)

    })
    private SensorLog sensorlog;

    @Builder
    public MultimodalAnalysis(Boolean fireYn, Boolean brokeYn, String notes, // detail 지우고 notes 추가␊
                              Boolean dirtyYn, LocalDateTime imgsensoranalTime,
                              Long imgId, LocalDateTime imgTime, String transactionId,
                              String chgerId, String statId) {
        this.fireYn = fireYn;
        this.brokeYn = brokeYn;
        this.dirtyYn = dirtyYn;
        this.notes = notes;
        this.imgsensoranalTime = imgsensoranalTime;
        this.imgId = imgId;
        this.imgTime = imgTime;
        this.transactionId = transactionId;
        this.chgerId = chgerId;
        this.statId = statId;
    }

    // 멀티 모달 API 수정
    public void updateResult(
            Boolean fireYn,
            Boolean brokeYn,
            Boolean dirtyYn,
            String notes,
            LocalDateTime imgsensoranalTime,
            Long imgId,
            LocalDateTime imgTime,
            String transactionId
    ) {
        this.fireYn = fireYn;
        this.brokeYn = brokeYn;
        this.dirtyYn = dirtyYn;
        this.notes = notes;
        this.imgsensoranalTime = imgsensoranalTime;
        this.imgId = imgId;
        this.imgTime = imgTime;
        this.transactionId = transactionId;
    }
}
