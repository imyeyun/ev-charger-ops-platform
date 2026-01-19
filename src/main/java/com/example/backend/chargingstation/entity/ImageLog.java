package com.example.backend.chargingstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
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

    @Id
    @Column(name = "img_time")
    private LocalDateTime imgTime;

    @Column(name = "img_path", nullable = false, length = 255)
    private String imgPath;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)
    })

}
