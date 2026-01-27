package com.example.backend.notification.repository;

import com.example.backend.notification.entity.ExternalNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExternalNotificationRepository extends JpaRepository<ExternalNotification, Long> {

    List<ExternalNotification> findByStatIdIn(List<String> statIds);
}
