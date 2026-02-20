# api
- https://www.data.go.kr/data/15076352/openapi.do 에서 제공하는 api를 바탕으로 jsonl의 형태로 로그를 만들어내는 python 코드
- 한번에 호출할 수 있는 데이터 크기(NUM_OF_ROWS = 9999) 가 정해져 있기 때문에 ThreadPoolExecutor 를 이용해서 한번에 여러개의 api 요청을 보낸다.
- ThreadPoolExecutor를 이용하면서 nas의 메모리 용량이 부족하였기 때문에 OCI ARM 기반 Ampere 를 사용하여 데이터를 수집함.

## api/api(entire).py
- 전체 지역 데이터 수집
## api/api(seoul).py
- 서울 지역 데이터 수집

# ev_charger_sensor
## 사전조사.md
- 전기차 충전소 충전기에서 사용되는 센서 도메인 조사 및 관련 데이터셋 정리 문서
- 최종적으로 Autosun/PolyU EV 충전 데이터셋 (Mendeley Data): https://data.mendeley.com/datasets/c7gg94tmvz/3  데이터셋 사용

## model.ipynb
- 원본 데이터 processed_data.xlsx 를 processed_data_combined.csv로 변환하고 label을 0 : 정상, 1 : 비정상 -> 0: 정상, 1 : 고장, 2 : 화재 로 세분화하여 수정함. (CODEX CLI 이용)
- 그렇게 만들어진 데이터를 바탕으로 간단한 머신러닝 모델 제작 후 해당 파트 담당자에게 전달
- 0 > 1 > 2 순으로 데이터가 많고 데이터 불균형 문제가 발생.
