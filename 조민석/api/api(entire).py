import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from math import ceil
from typing import Dict, List, Optional, Set, Tuple

import requests

# url = "http://apis.data.go.kr/B552584/EvCharger/getChargerStatus"
url = "http://apis.data.go.kr/B552584/EvCharger/getChargerInfo"
service_key = "YOUR_API_KEY_HERE"

NUM_OF_ROWS = 9999
RETRY_SLEEP_SECONDS = 10
MAX_WORKERS = 4

FIELDS = [
    "chgerId",
    "statId",
    "zcode",
    "zscode",
    "busiId",
    "lastTsdt",
    "lastTedt",
    "statUpdDt",
    "stat",
]

STATION_FIELDS = [
    "statId",
    "zcode",
    "zscode",
    "busiId",
    "statNm",
    "addr",
    "addrDetail",
    "lat",
    "lng",
    "busiCall",
    "note",
    "year",
]

CHARGER_FIELDS = [
    "chgerId",
    "statId",
    "zcode",
    "zscode",
    "busiId",
    "chgerType",
    "output",
    "method",
]


def read_last_total(path: str) -> Optional[int]:
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
    except OSError:
        return None
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        total_count = payload.get("total_count")
        if isinstance(total_count, int):
            return total_count
    return None


def append_total_log(path: str, total_count: int) -> None:
    last_total = read_last_total(path)
    if last_total == total_count:
        return
    payload = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_count": total_count,
    }
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def load_existing_keys(path: str, key_fields: Tuple[str, ...]) -> Set[Tuple]:
    if not os.path.exists(path):
        return set()
    keys: Set[Tuple] = set()
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if not isinstance(payload, dict):
                    continue
                key = tuple(payload.get(field) for field in key_fields)
                keys.add(key)
    except OSError:
        return set()
    return keys


def write_jsonl_snapshot(path: str, records: List[Dict]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def append_new_entities(path: str, records: List[Dict]) -> None:
    if not records:
        return
    with open(path, "a", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def fetch_page(page_no: int) -> Tuple[int, int, List[Dict]]:
    params = {
        "serviceKey": service_key,
        "pageNo": str(page_no),
        "numOfRows": str(NUM_OF_ROWS),
        "dataType": "JSON",
    }
    response = requests.get(url, params=params, timeout=20)
    response.raise_for_status()
    if not response.text.strip():
        raise RuntimeError(f"Empty JSON response body on page {page_no}.")
    data = response.json()

    total_count = data.get("totalCount")
    if isinstance(total_count, str) and total_count.strip().isdigit():
        total_count = int(total_count.strip())
    if not isinstance(total_count, int):
        raise RuntimeError(f"Missing totalCount on page {page_no}.")

    items = data.get("items", {}).get("item", [])
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        raise RuntimeError(f"Unexpected items type on page {page_no}.")

    return page_no, total_count, items


while True:
    try:
        first_page_no, expected_total, first_items = fetch_page(1)
        if expected_total < 0:
            raise RuntimeError("Invalid totalCount in first page.")

        total_pages = ceil(expected_total / NUM_OF_ROWS) if expected_total else 1
        results: Dict[int, List[Dict]] = {first_page_no: first_items}

        if total_pages > 1:
            with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, total_pages)) as executor:
                futures = {
                    executor.submit(fetch_page, page_no): page_no
                    for page_no in range(2, total_pages + 1)
                }
                for future in as_completed(futures):
                    page_no, total_count, items = future.result()
                    if total_count != expected_total:
                        raise RuntimeError(
                            f"totalCount changed from {expected_total} to {total_count}."
                        )
                    results[page_no] = items

        station_map: Dict[str, Dict] = {}
        charger_map: Dict[Tuple, Dict] = {}
        for page_no in sorted(results):
            for item in results[page_no]:
                if not isinstance(item, dict):
                    continue
                stat_id = item.get("statId")
                if stat_id:
                    station_map[stat_id] = {
                        field: item.get(field) for field in STATION_FIELDS
                    }
                chger_id = item.get("chgerId")
                if stat_id and chger_id:
                    charger_key = (stat_id, chger_id)
                    charger_map[charger_key] = {
                        field: item.get(field) for field in CHARGER_FIELDS
                    }

        base_dir = os.path.dirname(os.path.abspath(__file__))
        log_dir = os.path.join(base_dir, "log")
        os.makedirs(log_dir, exist_ok=True)

        total_log_path = os.path.join(log_dir, "total_count.jsonl")
        append_total_log(total_log_path, expected_total)

        station_path = os.path.join(log_dir, "station.jsonl")
        charger_path = os.path.join(log_dir, "charger.jsonl")
        new_entities_path = os.path.join(log_dir, "new_entities.jsonl")
        status_log_path = os.path.join(
            log_dir, datetime.now().strftime("%y%m%d-%H%M") + ".jsonl"
        )

        existing_station_keys = load_existing_keys(station_path, ("statId",))
        existing_charger_keys = load_existing_keys(charger_path, ("statId", "chgerId"))

        station_records = list(station_map.values())
        charger_records = list(charger_map.values())

        new_entities: List[Dict] = []
        detected_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for stat_id, record in station_map.items():
            if (stat_id,) not in existing_station_keys:
                new_entities.append(
                    {
                        "entity_type": "station",
                        "detected_at": detected_at,
                        "data": record,
                    }
                )
        for (stat_id, chger_id), record in charger_map.items():
            if (stat_id, chger_id) not in existing_charger_keys:
                new_entities.append(
                    {
                        "entity_type": "charger",
                        "detected_at": detected_at,
                        "data": record,
                    }
                )

        status_rows: List[Dict] = []
        for page_no in sorted(results):
            for item in results[page_no]:
                if not isinstance(item, dict):
                    continue
                status_rows.append({field: item.get(field) for field in FIELDS})

        write_jsonl_snapshot(station_path, station_records)
        write_jsonl_snapshot(charger_path, charger_records)
        write_jsonl_snapshot(status_log_path, status_rows)
        append_new_entities(new_entities_path, new_entities)

        print(
            f"Saved {len(station_records)} stations to {station_path} "
            f"and {len(charger_records)} chargers to {charger_path}"
        )
        print(f"Saved {len(status_rows)} status rows to {status_log_path}")
        if new_entities:
            print(f"Detected {len(new_entities)} new entities in {new_entities_path}")
        break
    except Exception as exc:
        print(f"Error: {exc}. Retrying in {RETRY_SLEEP_SECONDS} seconds...")
        time.sleep(RETRY_SLEEP_SECONDS)
