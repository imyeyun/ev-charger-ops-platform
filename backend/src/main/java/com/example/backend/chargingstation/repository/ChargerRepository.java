package com.example.backend.chargingstation.repository;

import com.example.backend.chargingstation.entity.Charger;
import com.example.backend.chargingstation.entity.ChargerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChargerRepository extends JpaRepository<Charger, ChargerId> {

    List<Charger> findByStatId(String statId);

    Optional<Charger> findByStatIdAndChgerId(String statId, String chgerId);
}
