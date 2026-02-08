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

       @Query(value =
              "SELECT " +
              "  cl.chger_time, " +
              "  cl.chger_id, " +
              "  cl.stat_id, " +
              "  COALESCE(NULLIF(cl.last_tsdt,   0), '1970-01-01 00:00:00') AS last_tsdt, " +
              "  COALESCE(NULLIF(cl.last_tedt,   0), '1970-01-01 00:00:00') AS last_tedt, " +
              "  COALESCE(NULLIF(cl.stat_upd_dt, 0), '1970-01-01 00:00:00') AS stat_upd_dt, " +
              "  cl.stat " +
              "FROM backend.charger_log cl " +
              "JOIN ( " +
              "    SELECT chger_id, stat_id, MAX(chger_time) AS max_time " +
              "    FROM backend.charger_log " +
              "    GROUP BY chger_id, stat_id " +
              ") t " +
              "  ON t.chger_id = cl.chger_id " +
              " AND t.stat_id  = cl.stat_id " +
              " AND t.max_time = cl.chger_time",
              nativeQuery = true)
       List<ChargerLog> findLatestLogs();


       @Query(value =
              "SELECT cl.stat AS stat, COUNT(*) AS cnt " +
              "FROM charger_log cl " +
              "JOIN ( " +
              "    SELECT chger_id, stat_id, MAX(chger_time) AS max_time " +
              "    FROM charger_log " +
              "    GROUP BY chger_id, stat_id " +
              ") t " +
              "  ON t.chger_id = cl.chger_id " +
              " AND t.stat_id = cl.stat_id " +
              " AND t.max_time = cl.chger_time " +
              "GROUP BY cl.stat",
              nativeQuery = true)
       List<Object[]> countByStatGrouped();

       @Query(value =
               "SELECT " +
                       "  cl.chger_time, " +
                       "  cl.chger_id, " +
                       "  cl.stat_id, " +
                       "  COALESCE(NULLIF(cl.last_tsdt,   0), '1970-01-01 00:00:00') AS last_tsdt, " +
                       "  COALESCE(NULLIF(cl.last_tedt,   0), '1970-01-01 00:00:00') AS last_tedt, " +
                       "  COALESCE(NULLIF(cl.stat_upd_dt, 0), '1970-01-01 00:00:00') AS stat_upd_dt, " +
                       "  cl.stat " +
                       "FROM backend.charger_log cl " +
                       "JOIN ( " +
                       "    SELECT chger_id, stat_id, MAX(chger_time) AS max_time " +
                       "    FROM backend.charger_log " +
                       "    WHERE stat_id = :statId " +
                       "    GROUP BY chger_id, stat_id " +
                       ") t " +
                       "  ON t.chger_id = cl.chger_id " +
                       " AND t.stat_id  = cl.stat_id " +
                       " AND t.max_time = cl.chger_time",
               nativeQuery = true)
       List<ChargerLog> findLatestLogsByStatId(@Param("statId") String statId);

       // 일별 비정상 상태 충전기 개수 조회 (상태 0, 1, 4, 5)
       @Query("SELECT CAST(cl.chgerTime AS LocalDate) as date, COUNT(cl) as cnt " +
              "FROM ChargerLog cl " +
              "WHERE cl.stat IN (0, 1, 4, 5) " +
              "GROUP BY CAST(cl.chgerTime AS LocalDate) " +
              "ORDER BY CAST(cl.chgerTime AS LocalDate) DESC")
       List<Object[]> countBadCaseByDate();

       // 지역(zscode)별 비정상 상태 충전기 개수 조회 (상태 0, 1, 4, 5)
       @Query("SELECT cs.zscode, COUNT(DISTINCT cl.statId) " +
              "FROM ChargerLog cl " +
              "JOIN ChargingStation cs ON cl.statId = cs.statId " +
              "WHERE cl.stat IN (0, 1, 4, 5) " +
              "AND cl.chgerTime = (SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
              "WHERE cl2.chgerId = cl.chgerId AND cl2.statId = cl.statId) " +
              "GROUP BY cs.zscode")
       List<Object[]> countBadCaseByRegion();

       // 비정상 상태(0, 1, 4, 5)인 충전소 ID 목록만 조회 (최신 로그 기준)
       @Query(value =
              "SELECT DISTINCT cl.stat_id " +
              "FROM charger_log cl " +
              "JOIN ( " +
              "    SELECT chger_id, stat_id, MAX(chger_time) AS max_time " +
              "    FROM charger_log " +
              "    GROUP BY chger_id, stat_id " +
              ") t ON t.chger_id = cl.chger_id " +
              "   AND t.stat_id = cl.stat_id " +
              "   AND t.max_time = cl.chger_time " +
              "WHERE cl.stat IN (0, 1, 4, 5)",
              nativeQuery = true)
       List<String> findBadCaseStatIds();

}