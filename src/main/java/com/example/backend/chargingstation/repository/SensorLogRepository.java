package com.example.backend.chargingstation.repository;

import com.example.backend.chargingstation.entity.SensorLog;
import com.example.backend.chargingstation.entity.SensorLogId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface SensorLogRepository extends JpaRepository<SensorLog, SensorLogId> {

    @Query("SELECT sl FROM SensorLog sl WHERE sl.statId = :statId AND sl.chgerId = :chgerId " +
           "AND sl.sensorTime = (SELECT MAX(sl2.sensorTime) FROM SensorLog sl2 " +
           "WHERE sl2.statId = :statId AND sl2.chgerId = :chgerId)")
    Optional<SensorLog> findLatestByStatIdAndChgerId(@Param("statId") String statId,
                                                      @Param("chgerId") String chgerId);
}
