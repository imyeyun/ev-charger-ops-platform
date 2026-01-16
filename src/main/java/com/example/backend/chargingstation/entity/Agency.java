package com.example.backend.chargingstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "agency")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Agency {

    @Id
    @Column(name = "busi_id", length = 2)
    private String busiId;

    @Column(name = "busid_description", length = 20)
    private String busidDescription;
}
