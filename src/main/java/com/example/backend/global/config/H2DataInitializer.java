package com.example.backend.global.config;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class H2DataInitializer implements ApplicationRunner {

  private final JdbcTemplate jdbcTemplate;

  public H2DataInitializer(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public void run(ApplicationArguments args) {
    Integer existingCount = jdbcTemplate.queryForObject(
      "select count(*) from charging_station",
      Integer.class
    );

    if (existingCount != null && existingCount > 0) {
      return;
    }

    jdbcTemplate.update(
      "insert into region_code (zcode, zcode_description) values (?, ?)",
      "11",
      "서울"
    );
    jdbcTemplate.update(
      "insert into region_code (zcode, zcode_description) values (?, ?)",
      "26",
      "부산"
    );

    jdbcTemplate.update(
      "insert into region_detail_code (zscode, zscode_description) values (?, ?)",
      "11000",
      "강남"
    );
    jdbcTemplate.update(
      "insert into region_detail_code (zscode, zscode_description) values (?, ?)",
      "26000",
      "해운대"
    );

    jdbcTemplate.update(
      "insert into agency (busi_id, busid_description) values (?, ?)",
      "AA",
      "테스트운영사"
    );

    jdbcTemplate.update(
      """
      insert into charging_station
      (stat_id, zcode, zscode, busi_id, stat_nm, addr, lat, lng, busi_call, note, install_year)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      "ST000001",
      "11",
      "11000",
      "AA",
      "테스트 충전소 A",
      "서울시 강남구 테스트로 1",
      37.4979,
      127.0276,
      "02-1234-5678",
      "테스트용 초기 데이터",
      2022
    );
    jdbcTemplate.update(
      """
      insert into charging_station
      (stat_id, zcode, zscode, busi_id, stat_nm, addr, lat, lng, busi_call, note, install_year)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      "ST000002",
      "26",
      "26000",
      "AA",
      "테스트 충전소 B",
      "부산시 해운대구 테스트로 2",
      35.1631,
      129.1635,
      "051-987-6543",
      "테스트용 초기 데이터",
      2023
    );

    jdbcTemplate.update(
      "insert into charger (chger_id, stat_id, chger_type, output, method) values (?, ?, ?, ?, ?)",
      "01",
      "ST000001",
      "02",
      "50kW",
      "DC"
    );
    jdbcTemplate.update(
      "insert into charger (chger_id, stat_id, chger_type, output, method) values (?, ?, ?, ?, ?)",
      "01",
      "ST000002",
      "01",
      "7kW",
      "AC"
    );

    LocalDateTime now = LocalDateTime.now();
    jdbcTemplate.update(
      """
      insert into charger_log
      (chger_time, chger_id, stat_id, last_tsdt, last_tedt, stat_upd_dt, stat)
      values (?, ?, ?, ?, ?, ?, ?)
      """,
      Timestamp.valueOf(now.minusMinutes(15)),
      "01",
      "ST000001",
      Timestamp.valueOf(now.minusHours(1)),
      Timestamp.valueOf(now.minusMinutes(30)),
      Timestamp.valueOf(now.minusMinutes(10)),
      2
    );
    jdbcTemplate.update(
      """
      insert into charger_log
      (chger_time, chger_id, stat_id, last_tsdt, last_tedt, stat_upd_dt, stat)
      values (?, ?, ?, ?, ?, ?, ?)
      """,
      Timestamp.valueOf(now.minusMinutes(5)),
      "01",
      "ST000002",
      Timestamp.valueOf(now.minusHours(2)),
      Timestamp.valueOf(now.minusHours(1)),
      Timestamp.valueOf(now.minusMinutes(3)),
      3
    );

    jdbcTemplate.update(
      """
      insert into sensor_log
      (sensor_time, chger_id, stat_id, total_charging_kwh, total_charging_min, current_soc,
       current_energy_meter_value, chargingv, charginga, out_power,
       charging_gun_temperature1, charging_gun_temperature2, types)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      Timestamp.valueOf(now.minusMinutes(12)),
      "01",
      "ST000001",
      120.5,
      360,
      75,
      12.3,
      380.0,
      120.0,
      45.6,
      48,
      50,
      1
    );
    jdbcTemplate.update(
      """
      insert into sensor_log
      (sensor_time, chger_id, stat_id, total_charging_kwh, total_charging_min, current_soc,
       current_energy_meter_value, chargingv, charginga, out_power,
       charging_gun_temperature1, charging_gun_temperature2, types)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      Timestamp.valueOf(now.minusMinutes(7)),
      "01",
      "ST000002",
      80.0,
      240,
      60,
      8.7,
      220.0,
      32.0,
      7.0,
      40,
      41,
      2
    );

    jdbcTemplate.update(
      "insert into image_log (img_id, img_time, img_path, stat_id) values (?, ?, ?, ?)",
      1L,
      Timestamp.valueOf(now.minusMinutes(20)),
      "/static/images/sample-a.jpg",
      "ST000001"
    );
    jdbcTemplate.update(
      "insert into image_log (img_id, img_time, img_path, stat_id) values (?, ?, ?, ?)",
      2L,
      Timestamp.valueOf(now.minusMinutes(9)),
      "/static/images/sample-b.jpg",
      "ST000002"
    );

    // request, request_outbound 데이터 추가
    jdbcTemplate.update(
            """
            insert into request
            (req_id, chger_id, stat_id, title, content, req_type, req_dt, status)
            values (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            1L,
            "01",
            "ST000001",
            "충전 중 오류 발생",
            "충전 시작 후 5분 뒤 오류 코드가 표시됩니다.",
            "COMPLAINT",
            Timestamp.valueOf(now.minusHours(3)),
            "PENDING"
    );
    jdbcTemplate.update(
            """
            insert into request
            (req_id, chger_id, stat_id, title, content, req_type, req_dt, status)
            values (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            2L,
            "01",
            "ST000002",
            "충전기 점검 요청",
            "케이블 연결이 느슨해 보여 점검 요청드립니다.",
            "REPAIR",
            Timestamp.valueOf(now.minusDays(1)),
            "IN_PROGRESS"
    );

    jdbcTemplate.update(
            """
            insert into request_outbound
            (proc_id, answer, answer_dt, req_id)
            values (?, ?, ?, ?)
            """,
            2L,
            "충전기 케이블 상태를 확인하고 교체 일정을 안내드리겠습니다.",
            Timestamp.valueOf(now.minusHours(20)),
            2L
    );

  }
}
