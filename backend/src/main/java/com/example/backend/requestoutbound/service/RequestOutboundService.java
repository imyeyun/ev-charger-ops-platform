package com.example.backend.requestoutbound.service;

import com.example.backend.ai.client.AiComplaintClient;
import com.example.backend.ai.dto.complaint.AiComplaintReq;
import com.example.backend.ai.dto.complaint.AiComplaintRes;
import com.example.backend.analysis.entity.MultimodalAnalysis;
import com.example.backend.analysis.repository.MultimodalAnalysisRepository;
import com.example.backend.chargingstation.entity.Charger;
import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.chargingstation.entity.RegionCode;
import com.example.backend.chargingstation.entity.RegionDetailCode;
import com.example.backend.chargingstation.entity.Agency;
import com.example.backend.chargingstation.repository.ChargerLogRepository;
import com.example.backend.chargingstation.repository.ChargerRepository;
import com.example.backend.chargingstation.repository.ChargingStationRepository;
import com.example.backend.global.exception.ConflictException;
import com.example.backend.global.exception.NotFoundException;
import com.example.backend.request.entity.Request;
import com.example.backend.request.entity.RequestStatus;
import com.example.backend.request.repository.RequestRepository;
import com.example.backend.requestoutbound.dto.OutboundBatchReq;
import com.example.backend.requestoutbound.dto.OutboundBatchRes;
import com.example.backend.requestoutbound.entity.RequestOutbound;
import com.example.backend.requestoutbound.repository.RequestOutboundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RequestOutboundService {

    private final RequestOutboundRepository requestOutboundRepository;
    private final RequestRepository requestRepository;
    private final ChargingStationRepository chargingStationRepository;
    private final ChargerRepository chargerRepository;
    private final ChargerLogRepository chargerLogRepository;
    private final MultimodalAnalysisRepository multimodalAnalysisRepository;
    private final AiComplaintClient aiComplaintClient;

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public OutboundBatchRes processRequests(OutboundBatchReq req) {
        List<Long> reqIds = req.getReqIds();
        List<Request> requests = requestRepository.findAllById(reqIds);
        if (requests.size() != reqIds.size()) {
            throw new NotFoundException("해당 민원을 찾을 수 없습니다.");
        }
        if (requestOutboundRepository.existsByReqIdIn(reqIds)) {
            throw new ConflictException("이미 답변이 등록된 민원입니다.");
        }

        java.util.Map<Long, Request> requestMap = requests.stream()
                .collect(java.util.stream.Collectors.toMap(Request::getReqId, request -> request));
        List<Request> orderedRequests = reqIds.stream()
                .map(reqId -> {
                    Request request = requestMap.get(reqId);
                    if (request == null) {
                        throw new NotFoundException("해당 민원을 찾을 수 없습니다.");
                    }
                    return request;
                })
                .toList();

        List<OutboundBatchRes.OutboundResult> results = new ArrayList<>();
        int successCount = 0;

        for (Request request : orderedRequests) {
            OutboundBatchRes.OutboundResult result = processSingleRequest(request);
            results.add(result);
            if ("PROCESSED".equals(result.getStatus())) {
                successCount++;

            }
        }

        return OutboundBatchRes.builder()
                .requestedCount(reqIds.size())
                .successCount(successCount)
                .results(results)
                .build();
    }

    private OutboundBatchRes.OutboundResult processSingleRequest(Request request) {
        request.updateStatus(RequestStatus.IN_PROGRESS);
        requestRepository.save(request);

        AiComplaintReq aiRequest = buildAiRequest(request);
        AiComplaintRes aiResponse = aiComplaintClient.generateAnswer(aiRequest);

        RequestOutbound outbound = RequestOutbound.builder()
                .reqId(request.getReqId())
                .answer(aiResponse.getAnswer())
                .answerDt(aiResponse.getAnswerDt() != null ? aiResponse.getAnswerDt() : LocalDateTime.now())
                .build();

        RequestOutbound saved = requestOutboundRepository.save(outbound);

        request.updateStatus(RequestStatus.COMPLETED);
        requestRepository.save(request);

        return OutboundBatchRes.OutboundResult.builder()
                .reqId(request.getReqId())
                .status("PROCESSED")
                .procId(saved.getProcId())
                .build();
    }

    private AiComplaintReq buildAiRequest(Request request) {
        //Optional<ChargingStation> stationOpt = chargingStationRepository.findByStatId(request.getStatId());

        Optional<ChargingStation> stationOpt = chargingStationRepository.findByStatId(request.getStatId())
                .stream().findFirst();

        AiComplaintReq.ChargerStatusInfo chargerStatusInfo = null;
        AiComplaintReq.MultimodalAnalysisInfo multimodalInfo = null;

        if (stationOpt.isPresent()) {
            ChargingStation station = stationOpt.get();

            Optional<Charger> chargerOpt = chargerRepository.findByStatIdAndChgerId(
                    request.getStatId(), request.getChgerId());

            if (chargerOpt.isPresent()) {
                Charger charger = chargerOpt.get();

                Optional<ChargerLog> logOpt = chargerLogRepository
                        .findTopByStatIdAndChgerIdOrderByChgerTimeDesc(
                                request.getStatId(), request.getChgerId());

                ChargerLog log = logOpt.orElse(null);

                chargerStatusInfo = AiComplaintReq.ChargerStatusInfo.builder()
                        .statId(station.getStatId())
                        .zcodeDescription(getZcodeDescription(station))
                        .zscodeDescription(getZscodeDescription(station))
                        .busidDescription(getBusidDescription(station))
                        .statNm(station.getStatNm())
                        .addr(station.getAddr())
                        .busiCall(station.getBusiCall())
                        .year(station.getYear())
                        .chgerId(charger.getChgerId())
                        .chgerType(charger.getChgerType())
                        .output(charger.getOutput())
                        .method(charger.getMethod())
                        .chgerTime(log != null ? log.getChgerTime() : null)
                        .lastTsdt(log != null ? log.getLastTsdt() : null)
                        .lastTedt(log != null ? log.getLastTedt() : null)
                        .statUpdDt(log != null ? log.getStatUpdDt() : null)
                        .stat(log != null ? log.getStat() : null)
                        .build();
            }

            Optional<MultimodalAnalysis> analysisOpt = multimodalAnalysisRepository
                    .findTopByOrderByImgsensoranalTimeDesc();

            if (analysisOpt.isPresent()) {
                MultimodalAnalysis analysis = analysisOpt.get();

                multimodalInfo = AiComplaintReq.MultimodalAnalysisInfo.builder()
                        .statId(station.getStatId())
                        .zcodeDescription(getZcodeDescription(station))
                        .zscodeDescription(getZscodeDescription(station))
                        .busidDescription(getBusidDescription(station))
                        .statNm(station.getStatNm())
                        .addr(station.getAddr())
                        .busiCall(station.getBusiCall())
                        .year(station.getYear())
                        .multimodalId(analysis.getMultimodalId())
                        .fireYn(analysis.getFireYn())
                        .fireDetails(analysis.getFireDetails())
                        .brokeYn(analysis.getBrokeYn())
                        .brokeDetails(analysis.getBrokeDetails())
                        .cleanYn(analysis.getCleanYn())
                        .cleanDetails(analysis.getCleanDetails())
                        .imgsensoranalTime(analysis.getImgsensoranalTime())
                        .build();
            }
        }

        AiComplaintReq.RequestInfo requestInfo = AiComplaintReq.RequestInfo.builder()
                .reqId(request.getReqId())
                .title(request.getTitle())
                .content(request.getContent())
                .reqType(request.getReqType().name())
                .build();

        return AiComplaintReq.builder()
                .chargerStatus(chargerStatusInfo)
                .multimodalAnalysis(multimodalInfo)
                .request(requestInfo)
                .build();
    }

    private String getZcodeDescription(ChargingStation station) {
        return station.getRegionCode() != null ? station.getRegionCode().getZcodeDescription() : station.getZcode();
    }

    private String getZscodeDescription(ChargingStation station) {
        return station.getRegionDetailCode() != null ? station.getRegionDetailCode().getZscodeDescription() : station.getZscode();
    }

    private String getBusidDescription(ChargingStation station) {
        return station.getAgency() != null ? station.getAgency().getBusidDescription() : station.getBusiId();
    }
}