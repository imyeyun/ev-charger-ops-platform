package com.example.backend.chargingstation.service;

import com.example.backend.chargingstation.dto.StationDetailReq;
import com.example.backend.chargingstation.dto.StationDetailRes;
import com.example.backend.chargingstation.entity.Charger;
import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.chargingstation.entity.ImageLog;
import com.example.backend.chargingstation.repository.ChargerLogRepository;
import com.example.backend.chargingstation.repository.ChargerRepository;
import com.example.backend.chargingstation.repository.ChargingStationRepository;
import com.example.backend.chargingstation.repository.ImageLogRepository;
import com.example.backend.global.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChargingStationService {

    private final ChargingStationRepository chargingStationRepository;
    private final ChargerRepository chargerRepository;
    private final ChargerLogRepository chargerLogRepository;
    private final ImageLogRepository imageLogRepository;

    public StationDetailRes getStationDetail(StationDetailReq request) {
        String statId = request.getStatId();

        ChargingStation station = chargingStationRepository.findByStatIdWithCodes(statId)
                .orElseThrow(() -> new NotFoundException("충전소를 찾을 수 없습니다."));

        List<Charger> chargers = chargerRepository.findByStatId(statId);

        // N+1 문제 해결: 한 번의 쿼리로 모든 최신 로그 조회
        List<ChargerLog> latestLogs = chargerLogRepository.findLatestLogsByStatId(statId);
        Map<String, ChargerLog> logMap = latestLogs.stream()
                .collect(Collectors.toMap(ChargerLog::getChgerId, log -> log));

        List<StationDetailRes.ChargerDetail> chargerDetails = new ArrayList<>();
        for (Charger charger : chargers) {
            ChargerLog latestLog = logMap.get(charger.getChgerId());

            StationDetailRes.ChargerDetail detail = StationDetailRes.ChargerDetail.builder()
                    .chgerId(charger.getChgerId())
                    .chgerType(charger.getChgerType())
                    .output(charger.getOutput())
                    .method(charger.getMethod())
                    .chgerTime(latestLog != null ? latestLog.getChgerTime() : null)
                    .lastTsdt(latestLog != null ? latestLog.getLastTsdt() : null)
                    .lastTedt(latestLog != null ? latestLog.getLastTedt() : null)
                    .statUpdDt(latestLog != null ? latestLog.getStatUpdDt() : null)
                    .stat(latestLog != null ? latestLog.getStat() : null)
                    .build();

            chargerDetails.add(detail);
        }

        ImageLog latestImage = imageLogRepository.findLatestByStatId(statId).orElse(null);

        StationDetailRes.ChargingStationDetail stationDetail = StationDetailRes.ChargingStationDetail.builder()
                .zcodeDescription(station.getRegionCode() != null ?
                        station.getRegionCode().getZcodeDescription() : null)
                .zscodeDescription(station.getRegionDetailCode() != null ?
                        station.getRegionDetailCode().getZscodeDescription() : null)
                .busidDescription(station.getAgency() != null ?
                        station.getAgency().getBusidDescription() : null)
                .statNm(station.getStatNm())
                .addr(station.getAddr())
                .lat(station.getLat())
                .lng(station.getLng())
                .busiCall(station.getBusiCall())
                .note(station.getNote())
                .year(station.getYear())
                .build();

        StationDetailRes.ImageDetail imageDetail = StationDetailRes.ImageDetail.builder()
                .imgPath(latestImage != null ? latestImage.getImgPath() : "")
                .build();

        return StationDetailRes.builder()
                .chargingStation(stationDetail)
                .chargers(chargerDetails)
                .image(imageDetail)
                .build();
    }
}
