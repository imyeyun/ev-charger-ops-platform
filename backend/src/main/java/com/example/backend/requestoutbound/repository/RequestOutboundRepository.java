package com.example.backend.requestoutbound.repository;

import com.example.backend.requestoutbound.entity.RequestOutbound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestOutboundRepository extends JpaRepository<RequestOutbound, Long> {

    List<RequestOutbound> findByReqId(Long reqId);

    boolean existsByReqId(Long reqId);
    boolean existsByReqIdIn(List<Long> reqIds);
}
