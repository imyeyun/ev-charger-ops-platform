package com.example.backend.request.service;

import com.example.backend.global.exception.NotFoundException;
import com.example.backend.request.dto.RequestDetailReq;
import com.example.backend.request.dto.RequestDetailRes;
import com.example.backend.request.dto.RequestListItemRes;
import com.example.backend.request.entity.Request;
import com.example.backend.request.repository.RequestRepository;
import com.example.backend.requestoutbound.entity.RequestOutbound;
import com.example.backend.requestoutbound.repository.RequestOutboundRepository;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.chargingstation.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RequestService {

    private final RequestRepository requestRepository;
    private final RequestOutboundRepository requestOutboundRepository;
    private final ChargingStationRepository chargingStationRepository;

    public List<RequestListItemRes> getRequestList() {
        List<Request> requests = requestRepository.findAllByOrderByReqDtDesc();
        return requests.stream()
                .map(RequestListItemRes::from)
                .collect(Collectors.toList());
    }

    public RequestDetailRes getRequestDetail(RequestDetailReq req) {
        Request request = requestRepository.findById(req.getReqId())
                .orElseThrow(() -> new NotFoundException("해당 민원을 찾을 수 없습니다."));

        List<RequestOutbound> outbounds = requestOutboundRepository.findByReqId(req.getReqId());

        //Optional<ChargingStation> stationOpt = chargingStationRepository.findByStatId(request.getStatId());
        //ChargingStation station = stationOpt.orElse(null);

        RequestDetailRes.RequestInfo requestInfo = RequestDetailRes.RequestInfo.builder()
                .reqId(request.getReqId())
                .chgerId(request.getChgerId())
                .statId(request.getStatId())
                //.zcode(station != null ? station.getZcode() : null)
                //.zscode(station != null ? station.getZscode() : null)
                //.busId(station != null ? station.getBusiId() : null)
                .title(request.getTitle())
                .content(request.getContent())
                .reqType(request.getReqType() != null ? request.getReqType().name() : null)
                .reqDt(request.getReqDt())
                .status(request.getStatus() != null ? request.getStatus().name() : null)
                .build();

        List<RequestDetailRes.OutboundInfo> outboundInfos = outbounds.stream()
                .map(o -> RequestDetailRes.OutboundInfo.builder()
                        .procId(o.getProcId())
                        .answer(o.getAnswer())
                        .answerDt(o.getAnswerDt())
                        .build())
                .collect(Collectors.toList());

        return RequestDetailRes.builder()
                .request(requestInfo)
                .outbounds(outboundInfos)
                .build();
    }
}
