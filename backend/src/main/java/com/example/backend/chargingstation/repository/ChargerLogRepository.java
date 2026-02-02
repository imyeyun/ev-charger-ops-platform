package com.example.backend.chargingstation.repository;

import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargerLogId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChargerLogRepository extends JpaRepository<ChargerLog, ChargerLogId> {

    @Query("SELECT cl FROM ChargerLog cl WHERE cl.statId = :statId AND cl.chgerId = :chgerId " +
           "AND cl.chgerTime = (SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
           "WHERE cl2.statId = :statId AND cl2.chgerId = :chgerId)")
    Optional<ChargerLog> findLatestByStatIdAndChgerId(@Param("statId") String statId,
                                                       @Param("chgerId") String chgerId);

    Optional<ChargerLog> findTopByStatIdAndChgerIdOrderByChgerTimeDesc(String statId, String chgerId);

    @Query("SELECT cl FROM ChargerLog cl WHERE cl.chgerTime = " +
           "(SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
           "WHERE cl2.chgerId = cl.chgerId AND cl2.statId = cl.statId)")
    List<ChargerLog> findLatestLogs();

    @Query("SELECT cl.stat, COUNT(cl) FROM ChargerLog cl WHERE cl.chgerTime = " +
           "(SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
           "WHERE cl2.chgerId = cl.chgerId AND cl2.statId = cl.statId) " +
           "GROUP BY cl.stat")
    List<Object[]> countByStatGrouped();

    @Query("SELECT cl FROM ChargerLog cl WHERE cl.statId = :statId " +
           "AND cl.chgerTime = (SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
           "WHERE cl2.statId = cl.statId AND cl2.chgerId = cl.chgerId)")
    List<ChargerLog> findLatestLogsByStatId(@Param("statId") String statId);

    // 일별 비정상 상태 충전기 개수 조회 (상태 0, 1, 4, 5)
    @Query("SELECT CAST(cl.chgerTime AS LocalDate) as date, COUNT(cl) as cnt " +
           "FROM ChargerLog cl " +
           "WHERE cl.stat IN (0, 1, 4, 5) " +
           "GROUP BY CAST(cl.chgerTime AS LocalDate) " +
           "ORDER BY CAST(cl.chgerTime AS LocalDate) DESC")
    List<Object[]> countBadCaseByDate();

    // 지역(zscode)별 비정상 상태 충전기 개수 조회
    @Query("SELECT cs.zscode, COUNT(DISTINCT cl.statId) " +
           "FROM ChargerLog cl " +
           "JOIN ChargingStation cs ON cl.statId = cs.statId " +
           "WHERE cl.stat IN (0, 1, 4, 5) " +
           "AND cl.chgerTime = (SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
           "WHERE cl2.chgerId = cl.chgerId AND cl2.statId = cl.statId) " +
           "GROUP BY cs.zscode")
    List<Object[]> countBadCaseByRegion();

}