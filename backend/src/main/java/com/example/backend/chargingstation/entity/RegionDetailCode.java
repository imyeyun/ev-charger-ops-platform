package com.example.backend.chargingstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "region_detail_code")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RegionDetailCode {

    @Id
    @Column(name = "zscode", length = 5)
    private String zscode;

    @Column(name = "zscode_description", length = 5)
    private String zscodeDescription;
}
