package com.example.backend.qna.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "official_document")
public class OfficialDocument {
    @Id
    @Column(name = "doc_id", nullable = false)
    private Integer docId;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "issuer_name", length = 255, nullable = false)
    private String issuerName;

    @Column(name = "published_date", nullable = false)
    private LocalDateTime publishedDate;

    @Column(name = "file_path", length = 255, nullable = false)
    private String filePath;
}