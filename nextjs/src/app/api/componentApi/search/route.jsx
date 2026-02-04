import { NextResponse } from "next/server";

/*
  캐시(Map) - 테스트용
*/
var CACHE = {
    ready: false,
    builtAtMs: 0,
    stationById: null,        // stat_id -> station row
    repChargerByStatId: null, // stat_id -> 대표 charger row (chger_id 최소)
    statByKey: null,          // (stat_id|chger_id) -> latest stat row
    stationCount: 0,
};

function toStringSafe(v) {
    if (v === null) return "";
    if (v === undefined) return "";
    return String(v);
}

function trimSafe(v) {
    return toStringSafe(v).trim();
}

function splitLines(text) {
    var t = trimSafe(text);
    if (t === "") return [];
    return t.split(/\r?\n/);
}

function parseHeaderIndex(headerLine) {
    var cols = headerLine.split("\t");
    var idx = {};
    var i = 0;
    while (i < cols.length) {
        idx[trimSafe(cols[i])] = i;
        i = i + 1;
    }
    return idx;
}

function getCol(cols, idx, key) {
    var p = idx[key];
    if (p === undefined) return "";
    return toStringSafe(cols[p]);
}

function getRequestOrigin(request) {
    var origin = request.headers.get("origin");
    if (origin) return origin;

    var proto = request.headers.get("x-forwarded-proto");
    if (!proto) proto = "http";

    var host = request.headers.get("x-forwarded-host");
    if (!host) host = request.headers.get("host");

    return proto + "://" + host;
}

async function fetchPublicText(request, path) {
    var origin = getRequestOrigin(request);
    var url = origin + path;

    var res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
            Accept: "text/plain, text/tab-separated-values, text/tsv, */*",
        },
    });

    var text = "";
    try {
        text = await res.text();
    } catch (e) {
        text = "";
    }

    if (res.ok === false) {
        var msg = trimSafe(text);
        if (msg === "") msg = "failed to fetch " + path + " (status " + String(res.status) + ")";
        throw new Error(msg);
    }

    return text;
}

function compareTimeString(a, b) {
    // "YYYY-MM-DD HH:mm:ss"면 문자열 비교로 최신 판별 가능
    var sa = trimSafe(a);
    var sb = trimSafe(b);

    if (sa === "" && sb === "") return 0;
    if (sa === "") return -1;
    if (sb === "") return 1;

    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
}

function pickLatestKeyFromStatObj(statObj) {
    if (!statObj) return "";
    var k = trimSafe(statObj.stat_upd_dt);
    if (k !== "") return k;
    return trimSafe(statObj.chger_time);
}

function buildCacheFrom3Tsv(stationText, chargerText, statText) {
    // -------------------------
    // station.tsv
    // -------------------------
    var stationLines = splitLines(stationText);
    var stationById = new Map();

    if (stationLines.length >= 2) {
        var sIdx = parseHeaderIndex(stationLines[0]);
        var i = 1;
        while (i < stationLines.length) {
            var line = stationLines[i];
            i = i + 1;
            if (!line) continue;

            var cols = line.split("\t");

            var statId = trimSafe(getCol(cols, sIdx, "stat_id"));
            if (statId === "") continue;

            stationById.set(statId, {
                stat_id: statId,
                stat_nm: getCol(cols, sIdx, "stat_nm"),
                addr: getCol(cols, sIdx, "addr"),
                busi_call: getCol(cols, sIdx, "busi_call"),
                busi_id: getCol(cols, sIdx, "busi_id"),
                lat: getCol(cols, sIdx, "lat"),
                lng: getCol(cols, sIdx, "lng"),
                note: getCol(cols, sIdx, "note"),
                year: getCol(cols, sIdx, "year"),
                zcode: getCol(cols, sIdx, "zcode"),
                zscode: getCol(cols, sIdx, "zscode"),
            });
        }
    }

    // -------------------------
    // charger.tsv (대표=chger_id 최소값)
    // -------------------------
    var chargerLines = splitLines(chargerText);
    var repChargerByStatId = new Map();

    if (chargerLines.length >= 2) {
        var cIdx = parseHeaderIndex(chargerLines[0]);
        var j = 1;
        while (j < chargerLines.length) {
            var line2 = chargerLines[j];
            j = j + 1;
            if (!line2) continue;

            var cols2 = line2.split("\t");

            var statId2 = trimSafe(getCol(cols2, cIdx, "stat_id"));
            var chgerId2 = trimSafe(getCol(cols2, cIdx, "chger_id"));
            if (statId2 === "") continue;
            if (chgerId2 === "") continue;

            var nextRow = {
                stat_id: statId2,
                chger_id: chgerId2,
                chger_type: getCol(cols2, cIdx, "chger_type"),
                method: getCol(cols2, cIdx, "method"),
                output: getCol(cols2, cIdx, "output"),
            };

            if (repChargerByStatId.has(statId2) === false) {
                repChargerByStatId.set(statId2, nextRow);
            } else {
                var prevRow = repChargerByStatId.get(statId2);
                var prevId = trimSafe(prevRow ? prevRow.chger_id : "");

                // 0패딩("01","02") 전제면 문자열 비교로 최소값 판정 가능
                if (chgerId2 < prevId) {
                    repChargerByStatId.set(statId2, nextRow);
                }
            }
        }
    }

    // -------------------------
    // stat.tsv ((stat_id|chger_id)별 최신 1개)
    // -------------------------
    var statLines = splitLines(statText);
    var statByKey = new Map();

    if (statLines.length >= 2) {
        var stIdx = parseHeaderIndex(statLines[0]);
        var k = 1;
        while (k < statLines.length) {
            var line3 = statLines[k];
            k = k + 1;
            if (!line3) continue;

            var cols3 = line3.split("\t");

            var statId3 = trimSafe(getCol(cols3, stIdx, "stat_id"));
            var chgerId3 = trimSafe(getCol(cols3, stIdx, "chger_id"));
            if (statId3 === "") continue;
            if (chgerId3 === "") continue;

            var nextObj = {
                stat_id: statId3,
                chger_id: chgerId3,
                stat: getCol(cols3, stIdx, "stat"),
                stat_upd_dt: getCol(cols3, stIdx, "stat_upd_dt"),
                last_tsdt: getCol(cols3, stIdx, "last_tsdt"),
                last_tedt: getCol(cols3, stIdx, "last_tedt"),
                chger_time: getCol(cols3, stIdx, "chger_time"),
            };

            var key = statId3 + "|" + chgerId3;

            if (statByKey.has(key) === false) {
                statByKey.set(key, nextObj);
            } else {
                var prevObj = statByKey.get(key);

                var prevKey = pickLatestKeyFromStatObj(prevObj);
                var nextKey = pickLatestKeyFromStatObj(nextObj);

                if (compareTimeString(prevKey, nextKey) < 0) {
                    statByKey.set(key, nextObj);
                }
            }
        }
    }

    CACHE.stationById = stationById;
    CACHE.repChargerByStatId = repChargerByStatId;
    CACHE.statByKey = statByKey;
    CACHE.stationCount = stationById.size;
    CACHE.ready = true;
    CACHE.builtAtMs = Date.now();
}

async function ensureCacheReady(request) {
    if (CACHE.ready === true) return;

    var stationText = await fetchPublicText(request, "/station.tsv");
    var chargerText = await fetchPublicText(request, "/charger.tsv");
    var statText = await fetchPublicText(request, "/stat.tsv");

    buildCacheFrom3Tsv(stationText, chargerText, statText);
}

function mapChgerTypeToSpeedLabel(chgerType) {
    var code = toStringSafe(chgerType);
    if (code === "02") return "완속";
    if (code === "07") return "완속";
    if (code === "08") return "완속";
    if (code !== "") return "급속";
    return "";
}

function matchStation(st, region, city, stationName) {
    if (region !== "") {
        if (toStringSafe(st.zcode) !== region) return false;
    }
    if (city !== "") {
        if (toStringSafe(st.zscode) !== city) return false;
    }

    var q = trimSafe(stationName);
    if (q !== "") {
        if (toStringSafe(st.stat_nm).indexOf(q) < 0) return false;
    }

    return true;
}

function matchChargeType(chargerObj, chargeType) {
    var q = trimSafe(chargeType);
    if (q === "") return true;
    if (!chargerObj) return false;

    var speed = mapChgerTypeToSpeedLabel(chargerObj.chger_type);
    if (speed === q) return true;
    return false;
}

function buildResultRows(region, city, chargeType, stationName) {
    var out = [];
    var entries = Array.from(CACHE.stationById.values());

    var i = 0;
    while (i < entries.length) {
        var st = entries[i];
        i = i + 1;

        if (matchStation(st, region, city, stationName) === false) continue;

        // 대표 charger(최소 chger_id)
        var chargerObj = null;
        if (CACHE.repChargerByStatId.has(st.stat_id)) {
            chargerObj = CACHE.repChargerByStatId.get(st.stat_id);
        }

        // 충전기 타입 필터는 대표 기준
        if (matchChargeType(chargerObj, chargeType) === false) continue;

        // 대표 charger의 상태를 찾아서 넣기
        var statObj = null;
        if (chargerObj) {
            var repChgerId = trimSafe(chargerObj.chger_id);
            if (repChgerId !== "") {
                var key = st.stat_id + "|" + repChgerId;
                if (CACHE.statByKey.has(key)) {
                    statObj = CACHE.statByKey.get(key);
                }
            }
        }

        var statNum = null;
        if (statObj && trimSafe(statObj.stat) !== "") {
            statNum = Number(statObj.stat);
            if (Number.isNaN(statNum)) statNum = null;
        }

        out.push({
            chargingStation: {
                statId: st.stat_id,
                statNm: st.stat_nm,
                addr: st.addr,
                zcode: st.zcode,
                zscode: st.zscode,
            },
            charger: chargerObj
                ? {
                    statId: chargerObj.stat_id,
                    chgerId: chargerObj.chger_id,
                    chgerType: chargerObj.chger_type,
                    method: chargerObj.method,
                    output: chargerObj.output,
                }
                : null,
            chargerStat: statObj
                ? {
                    statId: statObj.stat_id,
                    chgerId: statObj.chger_id,
                    stat: statNum,
                    statUpdDt: statObj.stat_upd_dt,
                    lastTsdt: statObj.last_tsdt,
                    lastTedt: statObj.last_tedt,
                    chgerTime: statObj.chger_time,
                }
                : null,
        });
    }

    return out;
}

export async function GET(request) {
    try {
        var url = new URL(request.url);
        var sp = url.searchParams;

        var init = trimSafe(sp.get("init"));
        var region = trimSafe(sp.get("region"));
        var city = trimSafe(sp.get("city"));
        var chargeType = trimSafe(sp.get("chargeType"));
        var stationName = trimSafe(sp.get("stationName"));

        await ensureCacheReady(request);

        if (init === "1") {
            return NextResponse.json(
                {
                    ok: true,
                    cached: true,
                    stationCount: CACHE.stationCount,
                    builtAtMs: CACHE.builtAtMs,
                },
                { status: 200 }
            );
        }

        var rows = buildResultRows(region, city, chargeType, stationName);
        return NextResponse.json(rows, { status: 200 });
    } catch (e) {
        return NextResponse.json(
            { error: toStringSafe(e && e.message ? e.message : "Internal Server Error") },
            { status: 500 }
        );
    }
}
