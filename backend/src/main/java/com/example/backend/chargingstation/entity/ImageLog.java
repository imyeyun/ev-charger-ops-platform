package com.example.backend.chargingstation.entity;

import jakarta.persistence.*;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.OneToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "image_log")
@IdClass(ImageLogId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImageLog {

    @Id
    @Column(name = "img_id")
    private Long imgId;

    @Column(name = "img_time")
    private LocalDateTime imgTime;

    @Column(name = "img_path", nullable = false, length = 255)
    private String imgPath;

    @Column(name = "stat_id", length = 8)
    private String statId;

    //@OneToOne(fetch = FetchType.LAZY)
    //@JoinColumns({
    //       @JoinColumns(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)
    //})
    //private Charger charger;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)
    })
    private ChargingStation chargingStation;
}
