package com.example.backend.chargingstation.repository;

import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.chargingstation.entity.ChargingStationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChargingStationRepository extends JpaRepository<ChargingStation, ChargingStationId> {

    @Query("SELECT cs FROM ChargingStation cs " +
           "JOIN FETCH cs.regionCode " +
           "JOIN FETCH cs.regionDetailCode " +
           "JOIN FETCH cs.agency " +
           "WHERE cs.statId = :statId")
    Optional<ChargingStation> findByStatIdWithCodes(@Param("statId") String statId);

    List<ChargingStation> findByStatId(String statId);

    //@Query
    //List<ChargingStation> findAllWithCodes();

    @Query("SELECT cs FROM ChargingStation cs " +
           "JOIN FETCH cs.regionCode " +
           "JOIN FETCH cs.regionDetailCode " +
           "JOIN FETCH cs.agency")
    List<ChargingStation> findAllWithCodes();
}
