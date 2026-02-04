package com.example.backend.chargingstation.repository;

import com.example.backend.chargingstation.entity.SensorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SensorLogRepository extends JpaRepository<SensorLog, String> {

    Optional<SensorLog> findTopByStatIdAndChgerIdOrderByTransactionIdDesc(String statId, String chgerId);
}
