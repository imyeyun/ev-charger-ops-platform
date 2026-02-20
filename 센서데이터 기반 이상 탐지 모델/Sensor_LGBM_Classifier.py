import os
import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, early_stopping, log_evaluation
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, f1_score

# =====================================================
# 0. 경로 설정 (제출용: 상대경로)
# =====================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_PATH = os.path.join(BASE_DIR, "data", "lgbm_sample.csv")
OUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUT_DIR, exist_ok=True)

MODEL_PATH = os.path.join(OUT_DIR, "lgbm_model.joblib")
FEATURES_PATH = os.path.join(OUT_DIR, "features.joblib")

TARGET = "detail_label"
GROUP_COL = "transaction_id"


# =====================================================
# 1. Feature Engineering 함수
# =====================================================
def add_features(df):
    df = df.copy()

    df["temp_diff"] = df["charging_gun_temperature1"] - df["charging_gun_temperature2"]
    df["temp_avg"] = (df["charging_gun_temperature1"] + df["charging_gun_temperature2"]) / 2
    df["min_temp"] = df[["charging_gun_temperature1", "charging_gun_temperature2"]].min(axis=1)

    df["power_calc"] = df["chargingv"] * df["charginga"]
    df["temp_per_power"] = df["temp_avg"] / (df["out_power"] + 1)
    df["temp_per_power_calc"] = df["temp_avg"] / (df["power_calc"] + 1)
    df["temp_per_current"] = df["temp_avg"] / (df["charginga"] + 1)
    df["current_per_temp"] = df["charginga"] / (df["temp_avg"].abs() + 1)
    df["power_per_temp"] = df["out_power"] / (df["temp_avg"].abs() + 1)

    return df


# =====================================================
# 2. 데이터 로드 및 전처리
# =====================================================
def load_and_preprocess():
    print("📂 데이터 로드:", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    print("raw shape:", df.shape)

    # 기본 클리닝
    df = df[(df["chargingv"] >= 0) &
            (df["charginga"] >= 0) &
            (df["out_power"] >= 0)]

    df = df[df["total_charging_min"] > 0]
    df["chargingv"] = df["chargingv"].clip(0, 1000)
    df["charginga"] = df["charginga"].clip(0, 1000)
    df["out_power"] = df["out_power"].clip(0, 500)

    df = df.drop_duplicates().fillna(0)

    # 파생 피처 추가
    df = add_features(df)

    # 불필요 컬럼 제거
    DROP_COLS = [
        "id", "sheet_name", "begin_time", "end_time",
        "label", "class_judge", "types", "current_energy_meter_value"
    ]
    df = df.drop(columns=[c for c in DROP_COLS if c in df.columns])

    return df


# =====================================================
# 3. 데이터 분리 (세션 단위 split)
# =====================================================
def split_data(df):
    X = df.drop(columns=[TARGET, GROUP_COL])
    y = df[TARGET].astype(int)
    groups = df[GROUP_COL].astype(str)

    uniq_groups = groups.unique()
    g_train, g_valid = train_test_split(uniq_groups, test_size=0.2, random_state=42)

    train_mask = groups.isin(g_train)
    valid_mask = groups.isin(g_valid)

    return X[train_mask], X[valid_mask], y[train_mask], y[valid_mask]


# =====================================================
# 4. 모델 학습
# =====================================================
def train_model(X_train, y_train, X_valid, y_valid):
    print("🚀 LightGBM 학습 시작")

    model = LGBMClassifier(
        objective="multiclass",
        num_class=len(np.unique(y_train)),
        n_estimators=697,
        learning_rate=0.077,
        num_leaves=91,
        min_child_samples=79,
        max_depth=12,
        subsample=0.70,
        colsample_bytree=0.66,
        class_weight={0: 1, 1: 4, 2: 80},
        n_jobs=-1
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_valid, y_valid)],
        eval_metric="multi_logloss",
        callbacks=[early_stopping(50), log_evaluation(100)]
    )

    return model


# =====================================================
# 5. 평가 및 저장
# =====================================================
def evaluate_and_save(model, X_valid, y_valid, feature_cols):
    pred = model.predict(X_valid)

    print("\n=== Classification Report ===")
    print(classification_report(y_valid, pred, digits=4))

    print("\n=== Confusion Matrix ===")
    print(confusion_matrix(y_valid, pred))

    joblib.dump(model, MODEL_PATH)
    joblib.dump(feature_cols, FEATURES_PATH)

    print("\n✅ 모델 저장 완료:", MODEL_PATH)


# =====================================================
# 6. 메인 실행
# =====================================================
def main():
    df = load_and_preprocess()
    X_train, X_valid, y_train, y_valid = split_data(df)
    model = train_model(X_train, y_train, X_valid, y_valid)
    evaluate_and_save(model, X_valid, y_valid, X_train.columns.tolist())


if __name__ == "__main__":
    main()
