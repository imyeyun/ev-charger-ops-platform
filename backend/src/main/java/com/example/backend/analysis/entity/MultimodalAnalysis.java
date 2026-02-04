/*package com.example.backend.analysis.entity;

import com.example.backend.chargingstation.entity.Charger;
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

    @Column(name = "fire_details", nullable = false, length = 200)
    private String fireDetails;

    @Column(name = "broke_yn", nullable = false)
    private Boolean brokeYn;

    @Column(name = "broke_details", nullable = false, length = 200)
    private String brokeDetails;

    @Column(name = "clean_yn", nullable = false)
    private Boolean cleanYn;

    @Column(name = "clean_details", nullable = false, length = 200)
    private String cleanDetails;

    @Column(name = "imgsensoranal_time", nullable = false)
    private LocalDateTime imgsensoranalTime;

    @Column(name = "img_id", nullable = false)
    private Long imgId;

    @Column(name = "img_time", nullable = false)
    private LocalDateTime imgTime;

    @Column(name = "sensor_time", nullable = false)
    private LocalDateTime sensorTime;

    @Column(name = "chger_id", nullable = false, length = 2)
    private String chgerId;

    @Column(name = "stat_id", nullable = false, length = 8)
    private String statId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            //@JoinColumn(name = "img_id", referencedColumnName = "img_id", insertable = false, updatable = false),
            //@JoinColumn(name = "img_time", referencedColumnName = "img_time", insertable = false, updatable = false),
            @JoinColumn(name = "sensor_time", referencedColumnName = "sensor_time", insertable = false, updatable = false),
            @JoinColumn(name = "chger_id", referencedColumnName = "chger_id", insertable = false, updatable = false),
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false),

    })
    private Charger charger;



    @Builder
    public MultimodalAnalysis(Boolean fireYn, String fireDetails, Boolean brokeYn, String brokeDetails,
                               Boolean cleanYn, String cleanDetails, LocalDateTime imgsensoranalTime,
                               Long imgId, LocalDateTime imgTime, LocalDateTime sensorTime,
                               String chgerId2, String statId2) {
        this.fireYn = fireYn;
        this.fireDetails = fireDetails;
        this.brokeYn = brokeYn;
        this.brokeDetails = brokeDetails;
        this.cleanYn = cleanYn;
        this.cleanDetails = cleanDetails;
        this.imgsensoranalTime = imgsensoranalTime;
        this.imgId = imgId;
        this.imgTime = imgTime;
        this.sensorTime = sensorTime;
        this.chgerId = chgerId2;
        this.statId = statId2;
    }
}
 */

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

    @Column(name = "sensor_time", nullable = false)
    private LocalDateTime sensorTime;

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

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "img_id", referencedColumnName = "img_id", insertable = false, updatable = false),
            @JoinColumn(name = "img_time", referencedColumnName = "img_time", insertable = false, updatable = false),

    })
    private ImageLog imageLog;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "sensor_time", referencedColumnName = "sensor_time", insertable = false, updatable = false),
            @JoinColumn(name = "chger_id", referencedColumnName = "chger_id", insertable = false, updatable = false),
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)

    })
    private SensorLog sensorlog;

    @Builder
    public MultimodalAnalysis(Boolean fireYn, Boolean brokeYn, String notes, // detail 지우고 notes 추가
                              Boolean dirtyYn, LocalDateTime imgsensoranalTime,
                              Long imgId, LocalDateTime imgTime, LocalDateTime sensorTime,
                              String chgerId2, String statId2) {
        this.fireYn = fireYn;
        this.brokeYn = brokeYn;
        this.dirtyYn = dirtyYn;
        this.notes = notes;
        this.imgsensoranalTime = imgsensoranalTime;
        this.imgId = imgId;
        this.imgTime = imgTime;
        this.sensorTime = sensorTime;
        this.chgerId = chgerId2;
        this.statId = statId2;
    }
}