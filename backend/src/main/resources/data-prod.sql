-- 중복 방지를 위해 INSERT IGNORE 사용
-- 앱 재시작 시 이미 데이터가 있으면 건너뜀

-- 지역 코드
INSERT IGNORE INTO region_code (zcode, zcode_description) VALUES ('11', '서울');
INSERT IGNORE INTO region_code (zcode, zcode_description) VALUES ('26', '부산');

-- 지역 상세 코드
INSERT IGNORE INTO region_detail_code (zscode, zscode_description) VALUES ('11000', '강남');
INSERT IGNORE INTO region_detail_code (zscode, zscode_description) VALUES ('26000', '해운대');

-- 운영사
INSERT IGNORE INTO agency (busi_id, busid_description) VALUES ('AA', '테스트운영사');

-- 충전소
INSERT IGNORE INTO charging_station
(stat_id, zcode, zscode, busi_id, stat_nm, addr, lat, lng, busi_call, note, year)
VALUES
('ST000001', '11', '11000', 'AA', '테스트 충전소 A', '서울시 강남구 테스트로 1', 37.4979, 127.0276, '02-1234-5678', '테스트용 초기 데이터', 2022);

-- 충전기
INSERT IGNORE INTO charger (chger_id, stat_id, chger_type, output, method)
VALUES ('01', 'ST000001', '02', '50kW', 'DC');

-- 이미지 로그
INSERT IGNORE INTO image_log (img_id, img_time, img_path, stat_id)
VALUES (1, NOW(), 'test-image.jpg', 'ST000001');