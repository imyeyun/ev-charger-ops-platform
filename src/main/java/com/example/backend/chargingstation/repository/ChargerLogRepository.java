package com.example.backend.chargingstation.repository;

import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargerLogId;
import com.example.backend.chargingstation.entity.ChargingStation;
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
           "WHERE cl2.chgerId = cl.chgerId AND cl2.statId = cl.statId " +
           "AND cl2.zcode = cl.zcode AND cl2.zscode = cl.zscode AND cl2.busiId = cl.busiId)")
    List<ChargerLog> findLatestLogs();

    @Query("SELECT cl.stat, COUNT(cl) FROM ChargerLog cl WHERE cl.chgerTime = " +
           "(SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
           "WHERE cl2.chgerId = cl.chgerId AND cl2.statId = cl.statId " +
           "AND cl2.zcode = cl.zcode AND cl2.zscode = cl.zscode AND cl2.busiId = cl.busiId) " +
           "GROUP BY cl.stat")
    List<Object[]> countByStatGrouped();

    @Query("SELECT cl FROM ChargerLog cl WHERE cl.statId = :statId " +
           "AND cl.chgerTime = (SELECT MAX(cl2.chgerTime) FROM ChargerLog cl2 " +
           "WHERE cl2.statId = cl.statId AND cl2.chgerId = cl.chgerId)")
    List<ChargerLog> findLatestLogsByStatId(@Param("statId") String statId);

    //@Query("SELECT cs FROM ChargingStation cs " +
    //        "JOIN FETCH cs.regionCode " +
    //        "JOIN FETCH cs.regionDetailCode " +
    //        "JOIN FETCH cs.agency")
    //List<ChargingStation> findAllWithCodes();

}
