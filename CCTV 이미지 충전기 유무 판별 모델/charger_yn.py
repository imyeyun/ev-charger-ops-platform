"""
[충전소/충전기 유무 분류 모델 학습 스크립트 - YOLO11 Classify]

필요 라이브러리:
- ultralytics
- torch, torchvision
- scikit-learn

폴더 구조:
- data/charger_yn/yes/  (있음 이미지)
- data/charger_yn/no/   (없음 이미지)

실행:
- python charger_yn.py

출력:
- output/dataset_split/ (train/val 분할본)
- output/charger_yn_cls/weights/best.pt (최종 가중치)
"""

import shutil
from pathlib import Path
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from ultralytics import YOLO


# =====================================================
# 0. 경로/설정
# =====================================================
BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data" / "charger_yn"
OUT_DIR = BASE_DIR / "output"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SPLIT_DIR = OUT_DIR / "dataset_split"
TRAIN_DIR = SPLIT_DIR / "train"
VAL_DIR = SPLIT_DIR / "val"

MODEL_ARCH = "yolo11n-cls.pt"
IMG_SIZE = 224
EPOCHS = 30
BATCH = 32
LR0 = 0.01
DEVICE = 0

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


# =====================================================
# 1. 유틸
# =====================================================
def list_images(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    files = []
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMG_EXTS:
            files.append(p)
    return sorted(files)


def reset_dir(path: Path):
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def copy_files(files: list[Path], dst_dir: Path):
    dst_dir.mkdir(parents=True, exist_ok=True)
    for src in files:
        shutil.copy2(src, dst_dir / src.name)


# =====================================================
# 2. 데이터 분할
# =====================================================
def split_dataset(data_dir: Path, train_dir: Path, val_dir: Path, test_size=0.2, seed=42):
    yes_dir = data_dir / "yes"
    no_dir = data_dir / "no"

    yes_imgs = list_images(yes_dir)
    no_imgs = list_images(no_dir)

    if not yes_dir.exists() or not no_dir.exists():
        raise FileNotFoundError(f"데이터 폴더 구조가 올바르지 않습니다: {yes_dir}, {no_dir}")
    if len(yes_imgs) == 0 or len(no_imgs) == 0:
        raise ValueError("yes/no 폴더에 이미지가 없습니다.")

    X = yes_imgs + no_imgs
    y = (["yes"] * len(yes_imgs)) + (["no"] * len(no_imgs))

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )

    reset_dir(train_dir)
    reset_dir(val_dir)

    copy_files([p for p, lbl in zip(X_train, y_train) if lbl == "yes"], train_dir / "yes")
    copy_files([p for p, lbl in zip(X_train, y_train) if lbl == "no"], train_dir / "no")
    copy_files([p for p, lbl in zip(X_val, y_val) if lbl == "yes"], val_dir / "yes")
    copy_files([p for p, lbl in zip(X_val, y_val) if lbl == "no"], val_dir / "no")

    train_yes = sum(1 for v in y_train if v == "yes")
    train_no = sum(1 for v in y_train if v == "no")
    val_yes = sum(1 for v in y_val if v == "yes")
    val_no = sum(1 for v in y_val if v == "no")

    print("✅ 데이터 분할 완료")
    print(f" - 학습(train): yes {train_yes} / no {train_no}")
    print(f" - 검증(val) : yes {val_yes} / no {val_no}")

    return SPLIT_DIR


# =====================================================
# 3. 모델 학습
# =====================================================
def train_model(dataset_root: Path):
    print("🚀 YOLO 분류 모델 학습을 시작합니다.")
    print("📌 베이스 모델:", MODEL_ARCH)
    print("📌 데이터셋:", dataset_root)

    model = YOLO(MODEL_ARCH)
    results = model.train(
        data=str(dataset_root),
        imgsz=IMG_SIZE,
        epochs=EPOCHS,
        batch=BATCH,
        lr0=LR0,
        device=DEVICE,
        project=str(OUT_DIR),
        name="charger_yn_cls",
        exist_ok=True,
    )

    return model, results


# =====================================================
# 4. 검증
# =====================================================
def validate_model(model: YOLO, dataset_root: Path):
    print("📊 검증(val)을 진행합니다.")
    metrics = model.val(
        data=str(dataset_root),
        device=DEVICE,
    )
    return metrics

# =====================================================
# 5. 평가
# =====================================================
def evaluate_on_val(model: YOLO, val_dir: Path):
    yes_dir = val_dir / "yes"
    no_dir = val_dir / "no"

    yes_imgs = list_images(yes_dir)
    no_imgs = list_images(no_dir)

    paths = yes_imgs + no_imgs
    y_true = (["yes"] * len(yes_imgs)) + (["no"] * len(no_imgs))

    if len(paths) == 0:
        print("⚠️ 검증(val) 이미지가 없습니다:", val_dir)
        return

    y_pred = []
    for p in paths:
        res = model.predict(source=str(p), verbose=False)[0]
        probs = res.probs.data.cpu().numpy().astype(float)
        top_idx = int(probs.argmax())
        pred_label = str(res.names.get(top_idx, str(top_idx)))
        y_pred.append(pred_label)

    print("\n=== ✅ 검증 결과(Classification Report) ===")
    print(classification_report(y_true, y_pred, digits=4, zero_division=0))

    print("\n=== ✅ 혼동행렬(Confusion Matrix) ===")
    labels = ["yes", "no"]
    print(confusion_matrix(y_true, y_pred, labels=labels))


# =====================================================
# 6. 메인
# =====================================================
def main():
    print("🔧 충전소/충전기 유무 분류 모델 학습 스크립트")
    print("📂 원본 데이터 경로:", DATA_DIR)

    dataset_root = split_dataset(DATA_DIR, TRAIN_DIR, VAL_DIR, test_size=0.2, seed=42)
    model, results = train_model(dataset_root)
    _ = validate_model(model, dataset_root)

    cand1 = OUT_DIR / "charger_yn_cls" / "weights" / "best.pt"
    cand2 = OUT_DIR / "runs" / "classify" / "charger_yn_cls" / "weights" / "best.pt"
    best_pt = cand1 if cand1.exists() else cand2

    if best_pt.exists():
        print("✅ 학습 완료(best.pt):", best_pt)
        best_model = YOLO(str(best_pt))
        evaluate_on_val(best_model, VAL_DIR)
    else:
        print("ℹ️ best.pt 경로를 찾지 못했습니다. output 폴더를 확인하세요.")


if __name__ == "__main__":
    main()
