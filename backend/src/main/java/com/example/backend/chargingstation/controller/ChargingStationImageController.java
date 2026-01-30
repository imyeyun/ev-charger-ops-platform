package com.example.backend.chargingstation.controller;

import com.example.backend.chargingstation.entity.ImageLog;
import com.example.backend.chargingstation.repository.ImageLogRepository;
import com.example.backend.global.exception.NotFoundException;
import com.example.backend.global.storage.S3PresignedUrlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/charging-stations")
@RequiredArgsConstructor
public class ChargingStationImageController {

    private final ImageLogRepository imageLogRepository;
    private final S3PresignedUrlService presignedUrlService;

    @GetMapping("/{statId}/image")
    public ResponseEntity<?> getLatestImage(@PathVariable String statId) {

        ImageLog imageLog = imageLogRepository.findLatestByStatId(statId)
                .orElseThrow(() -> new NotFoundException("이미지를 찾을 수 없습니다."));

        String url = presignedUrlService.generateGetUrl(imageLog.getImgPath());

        return ResponseEntity.ok(Map.of("url", url));
    }
}
