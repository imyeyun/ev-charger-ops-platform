from __future__ import annotations

import asyncio
import csv
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.procurement_agent import ProcurementAgentRequest, recommend_provider
from app.services.autopilot_agent import AutopilotRequest, run_autopilot
from app.services.autopilot_explain import AutopilotExplainRequest, explain_autopilot

router = APIRouter()

def now_iso():
    return datetime.now(timezone.utc).isoformat()

# ✅ 배포용 프로젝트의 app/data 사용
DATA_DIR = (Path(__file__).resolve().parents[1] / "data").resolve()

STATUS_PATH = DATA_DIR / "260114-1624.jsonl"
CHARGER_PATH = DATA_DIR / "charger.tsv"
STATION_PATH = DATA_DIR / "station.tsv"
LINK_MAP_PATH = DATA_DIR / "link_map.tsv"
LINK_TRAFFIC_PATH = DATA_DIR / "link_traffic.tsv"

BASELINE_SPEED = 30.0
ALLOWED_STATUS = {4, 5}

_CACHE = {"mtime": None, "twins": [], "station_map": None, "charger_map": None}

def _read_tsv(path: Path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))

def _load_station_map():
    rows = _read_tsv(STATION_PATH)
    m = {}
    for r in rows:
        stat_id = (r.get("stat_id") or "").strip()
        if not stat_id:
            continue
        try:
            lat = float(r.get("lat") or 0)
            lon = float(r.get("lng") or 0)
        except Exception:
            lat, lon = 0.0, 0.0
        m[stat_id] = {
            "statId": stat_id,
            "name": (r.get("stat_nm") or stat_id).strip(),
            "addr": (r.get("addr") or "").strip(),
            "lat": lat,
            "lon": lon,
            "zcode": (r.get("zcode") or "").strip(),
            "zscode": (r.get("zscode") or "").strip(),
            "busiId": (r.get("busi_id") or "").strip(),
        }
    return m

def _load_charger_map():
    rows = _read_tsv(CHARGER_PATH)
    m = {}
    for r in rows:
        stat_id = (r.get("stat_id") or "").strip()
        chger_id = (r.get("chger_id") or "").strip()
        if not stat_id or not chger_id:
            continue
        m[(stat_id, chger_id)] = {
            "chgerType": (r.get("chger_type") or "").strip(),
            "method": (r.get("method") or "").strip(),
            "output": (r.get("output") or "").strip(),
            "busiId": (r.get("busi_id") or "").strip() if "busi_id" in r else None,
        }
    return m

def _load_latest_status():
    latest = {}
    if not STATUS_PATH.exists():
        return latest

    with open(STATUS_PATH, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                j = json.loads(line)
            except Exception:
                continue

            stat_id = (j.get("statId") or "").strip()
            chger_id = (j.get("chgerId") or "").strip()
            if not stat_id or not chger_id:
                continue

            try:
                status_code = int(j.get("stat"))
            except Exception:
                continue

            if status_code not in ALLOWED_STATUS:
                continue

            upd = (j.get("statUpdDt") or "").strip()
            key = (stat_id, chger_id)

            prev = latest.get(key)
            if (prev is None) or (upd > (prev.get("statUpdDt") or "")):
                latest[key] = j

    return latest

def _load_link_map():
    m = {}
    if not LINK_MAP_PATH.exists():
        return m
    with open(LINK_MAP_PATH, "r", encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            stat_id = (r.get("stat_id") or "").strip()
            link_id = (r.get("link_id") or "").strip()
            if not stat_id or not link_id:
                continue
            try:
                dist_m = float(r.get("dist_m") or 0)
            except Exception:
                dist_m = 0.0
            if dist_m > 1500:
                continue
            m[stat_id] = {"link_id": link_id, "dist_m": dist_m}
    return m

def _load_link_traffic():
    m = {}
    if not LINK_TRAFFIC_PATH.exists():
        return m
    with open(LINK_TRAFFIC_PATH, "r", encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            link_id = (r.get("link_id") or "").strip()
            if not link_id:
                continue
            spd = r.get("speed")
            trv = r.get("travel_time")
            try:
                spd = float(spd) if spd not in (None, "", "null") else None
            except Exception:
                spd = None
            try:
                trv = float(trv) if trv not in (None, "", "null") else None
            except Exception:
                trv = None
            m[link_id] = {"speed": spd, "travel_time": trv}
    return m

def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))

def recalc_derived(twin: dict):
    s = twin["signals"]

    x = 0.0
    x += 1.2 if s["statusCode"] in [4, 5] else 0.0
    x += 0.9 * s["commLossRate24h"]
    x += 1.3 * s["sensorRisk"]
    x += 0.8 * s["visionSmoke"]
    downProb = sigmoid(1.2 * (x - 0.55))

    if s["statusCode"] in [4, 5]:
        health = "DOWN"
    elif s["commLossRate24h"] > 0.12 or downProb > 0.55:
        health = "DEGRADED"
    else:
        health = "OK"

    riskScore = max(s["visionFire"], s["visionSmoke"]) * 0.7 + s["sensorRisk"] * 0.8 + (0.2 if health == "DOWN" else 0.0)
    if riskScore > 0.55:
        risk = "CRITICAL"
    elif riskScore > 0.35:
        risk = "ALERT"
    elif riskScore > 0.18:
        risk = "SUSPECT"
    else:
        risk = "NONE"

    twin["derived"] = {
        "health": health,
        "risk": risk,
        "downProb6h": float(round(downProb, 3)),
        "updatedAt": now_iso(),
    }

def _build_twins():
    if _CACHE["station_map"] is None:
        _CACHE["station_map"] = _load_station_map()
    if _CACHE["charger_map"] is None:
        _CACHE["charger_map"] = _load_charger_map()

    station_map = _CACHE["station_map"]
    charger_map = _CACHE["charger_map"]

    latest_status = _load_latest_status()
    link_map = _load_link_map()
    link_tr = _load_link_traffic()

    twins = []
    for (stat_id, chger_id), s in latest_status.items():
        st = station_map.get(stat_id)
        if not st:
            continue

        meta = charger_map.get((stat_id, chger_id), {})

        try:
            status_code = int(s.get("stat"))
        except Exception:
            status_code = 9

        twin = {
            "stationId": stat_id,
            "chargerId": chger_id,
            "name": f'{st["name"]} / CH-{chger_id}',
            "lat": st["lat"],
            "lon": st["lon"],
            "signals": {
                "statusCode": status_code,
                "commLossRate24h": 0.0,
                "visionSmoke": 0.0,
                "visionFire": 0.0,
                "sensorRisk": 0.0,
                "lastTsdt": s.get("lastTsdt"),
                "lastTedt": s.get("lastTedt"),
                "statUpdDt": s.get("statUpdDt"),
                "busiId": s.get("busiId"),
                "zcode": s.get("zcode"),
                "zscode": s.get("zscode"),
            },
            "meta": meta,
            "station": {
                "addr": st.get("addr"),
                "zcode": st.get("zcode"),
                "zscode": st.get("zscode"),
                "busiId": st.get("busiId"),
            },
            "derived": {},
        }

        lm = link_map.get(stat_id)
        if lm:
            lid = lm["link_id"]
            tr = link_tr.get(lid, {})
            spd = tr.get("speed")
            ttime = tr.get("travel_time")

            congestion = None
            if isinstance(spd, (int, float)):
                congestion = max(0.0, min(1.0, 1.0 - (float(spd) / BASELINE_SPEED)))

            twin["signals"]["linkId"] = lid
            twin["signals"]["linkDistM"] = lm.get("dist_m")
            twin["signals"]["trafficSpeed"] = float(spd) if isinstance(spd, (int, float)) else 0.0
            twin["signals"]["trafficTravelTime"] = float(ttime) if isinstance(ttime, (int, float)) else 0.0
            twin["signals"]["trafficCongestion"] = float(round(congestion, 3)) if congestion is not None else 0.0
        else:
            twin["signals"]["trafficCongestion"] = 0.0

        recalc_derived(twin)
        twins.append(twin)

    return twins

def refresh_twins():
    if not STATUS_PATH.exists():
        _CACHE["twins"] = []
        return _CACHE["twins"]

    mtime = STATUS_PATH.stat().st_mtime
    if _CACHE["mtime"] != mtime:
        _CACHE["twins"] = _build_twins()
        _CACHE["mtime"] = mtime
    return _CACHE["twins"]

@router.get("/twins")
def get_twins():
    return {"items": refresh_twins()}

@router.get("/stream/twins")
async def stream_twins():
    async def event_gen():
        while True:
            payload = {"items": refresh_twins()}
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            await asyncio.sleep(1.0)

    return StreamingResponse(event_gen(), media_type="text/event-stream")

@router.post("/agent/procurement/recommend")
def agent_procurement_recommend(req: ProcurementAgentRequest):
    return recommend_provider(refresh_twins(), req)

@router.post("/agent/fleet/autopilot")
def agent_fleet_autopilot(req: AutopilotRequest):
    return run_autopilot(refresh_twins(), req)

@router.post("/agent/fleet/autopilot/explain")
def agent_fleet_autopilot_explain(req: AutopilotExplainRequest):
    return explain_autopilot(req)
