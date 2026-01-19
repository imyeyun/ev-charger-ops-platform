package com.example.backend.request.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "request")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "req_id")
    private Long reqId;

    @Column(name = "chger_id", nullable = false, length = 2)
    private String chgerId;

    @Column(name = "stat_id", nullable = false, length = 8)
    private String statId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "req_type", nullable = false, length = 20)
    private RequestType reqType;

    @Column(name = "req_dt", nullable = false)
    private LocalDateTime reqDt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RequestStatus status;

    @ManyToOne(fetch = FetchType.LAZY)                                                                                                                                
      @JoinColumns({                                                                                                                                                    
          @JoinColumn(name = "chger_id", referencedColumnName = "chger_id", insertable = false, updatable = false),                                                     
          @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)                                                        
      })                                                                                                                                                                
      private Charger charger;

    @Builder
    public Request(String chgerId, String statId, String title, String content, RequestType reqType, LocalDateTime reqDt, RequestStatus status) {
        this.chgerId = chgerId;
        this.statId = statId;
        this.title = title;
        this.content = content;
        this.reqType = reqType;
        this.reqDt = reqDt;
        this.status = status;
    }

    public void updateStatus(RequestStatus status) {
        this.status = status;
    }
}
