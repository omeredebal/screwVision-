"""YEDEK PYTORCH VERSİYONU
RecycleEye - Object Detection API
FastAPI backend for waste classification using YOLOv8
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from ultralytics import YOLO
import base64
from typing import List, Dict, Any
import os

app = FastAPI(
    title="ScrewVision API",
    description="Vida Tanıma ve Uç Önerme API'si",
    version="1.0.0",
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model sınıfları
CLASS_NAMES = ["phillips", "pozidriv", "torx", "hex", "slotted"]

# Sınıf renkleri - Endüstriyel
CLASS_COLORS = {
    "phillips": "#E67E22",   # Turuncu
    "pozidriv": "#3498DB",   # Mavi
    "torx": "#9B59B6",       # Mor
    "hex": "#2ECC71",        # Yeşil
    "slotted": "#95A5A6",    # Gri
}

# Türkçe sınıf isimleri
CLASS_LABELS_TR = {
    "phillips": "Phillips (PH)",
    "pozidriv": "Pozidriv (PZ)",
    "torx": "Torx (T)",
    "hex": "Allen (H)",
    "slotted": "Düz (SL)",
}

# Model yolu (.pt dosyası)
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "screwvision_model/run/weights/best.pt",
)

# YOLO model
model = None


def load_model():
    """YOLO modelini yükle"""
    global model
    if model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model bulunamadı: {MODEL_PATH}")
        model = YOLO(MODEL_PATH)
        print(f"✅ Model yüklendi: {MODEL_PATH}")
    return model


def process_detections(
    results, confidence_threshold: float = 0.25
) -> List[Dict[str, Any]]:
    """YOLO sonuçlarını işle"""
    detections = []

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            conf = float(box.conf[0])
            if conf < confidence_threshold:
                continue

            class_id = int(box.cls[0])
            xyxy = box.xyxy[0].cpu().numpy()

            # Sınıf adını al
            if class_id < len(CLASS_NAMES):
                class_name = CLASS_NAMES[class_id]
            else:
                class_name = f"class_{class_id}"

            detections.append(
                {
                    "class_id": class_id,
                    "class_name": class_name,
                    "class_label": CLASS_LABELS_TR.get(class_name, class_name),
                    "confidence": round(conf, 3),
                    "bbox": {
                        "x1": int(xyxy[0]),
                        "y1": int(xyxy[1]),
                        "x2": int(xyxy[2]),
                        "y2": int(xyxy[3]),
                    },
                    "color": CLASS_COLORS.get(class_name, "#FFFFFF"),
                }
            )

    return detections


@app.on_event("startup")
async def startup_event():
    """Uygulama başlangıcında modeli yükle"""
    try:
        load_model()
    except Exception as e:
        print(f"❌ Model yükleme hatası: {e}")


@app.get("/")
async def root():
    """API durumu"""
    return {
        "status": "active",
        "message": "ScrewVision API çalışıyor",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Sağlık kontrolü"""
    model_loaded = model is not None
    return {
        "status": "healthy" if model_loaded else "unhealthy",
        "model_loaded": model_loaded,
        "classes": CLASS_NAMES,
    }


@app.get("/classes")
async def get_classes():
    """Mevcut sınıfları döndür"""
    return {
        "classes": [
            {
                "id": i,
                "name": name,
                "label": CLASS_LABELS_TR.get(name, name),
                "color": CLASS_COLORS.get(name, "#FFFFFF"),
            }
            for i, name in enumerate(CLASS_NAMES)
        ]
    }


@app.post("/detect")
async def detect_objects(file: UploadFile = File(...), confidence: float = 0.25):
    """
    Görüntüde nesne tespiti yap
    """
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Geçersiz dosya tipi. Sadece görüntü dosyaları kabul edilir.",
            )

        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Görüntü okunamadı")

        yolo_model = load_model()

        # YOLO inference - model 320x320 için eğitilmiş
        results = yolo_model(image, conf=confidence, imgsz=320, verbose=False)

        # Sonuçları işle
        detections = process_detections(results, confidence)

        h, w = image.shape[:2]

        return {
            "success": True,
            "image_size": {"width": w, "height": h},
            "detections_count": len(detections),
            "detections": detections,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tespit hatası: {str(e)}")


@app.post("/detect/base64")
async def detect_objects_base64(data: dict):
    """
    Base64 kodlu görüntüde nesne tespiti yap
    """
    try:
        image_data = data.get("image")
        confidence = data.get("confidence", 0.25)

        if not image_data:
            raise HTTPException(status_code=400, detail="Görüntü verisi gerekli")

        # Base64 header'ını kaldır
        if "," in image_data:
            image_data = image_data.split(",")[1]

        # Decode
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Görüntü decode edilemedi")

        yolo_model = load_model()

        # YOLO inference - model 320x320 için eğitilmiş
        results = yolo_model(image, conf=confidence, imgsz=320, verbose=False)

        # Sonuçları işle
        detections = process_detections(results, confidence)

        h, w = image.shape[:2]

        return {
            "success": True,
            "image_size": {"width": w, "height": h},
            "detections_count": len(detections),
            "detections": detections,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tespit hatası: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
