package com.example.backend.qna.repository;

import com.example.backend.qna.entity.OfficialDocument;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OfficialDocumentRepository extends JpaRepository<OfficialDocument, Integer> {

    List<OfficialDocument> findTop5ByOrderByPublishedDateDesc();
}