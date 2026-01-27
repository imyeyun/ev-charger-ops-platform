package com.example.backend.chargingstation.repository;

import com.example.backend.chargingstation.entity.ImageLog;
import com.example.backend.chargingstation.entity.ImageLogId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ImageLogRepository extends JpaRepository<ImageLog, ImageLogId> {

    @Query("SELECT il FROM ImageLog il WHERE il.statId = :statId " +
           "AND il.imgTime = (SELECT MAX(il2.imgTime) FROM ImageLog il2 WHERE il2.statId = :statId)")
    Optional<ImageLog> findLatestByStatId(@Param("statId") String statId);
}
