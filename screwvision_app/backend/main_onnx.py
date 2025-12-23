"""
ScrewVision - Object Detection API (ONNX Version)
FastAPI backend for waste classification using ONNX Runtime
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
import onnxruntime as ort
import base64
from typing import List, Dict, Any
import os

app = FastAPI(
    title="ScrewVision API (ONNX)",
    description="Vida Tanıma ve Uç Önerme API'si - ONNX Runtime",
    version="2.0.0",
)

# CORS ayarlari
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model siniflari
CLASS_NAMES = ["phillips", "pozidriv", "torx", "hex", "slotted"]

# Sinif renkleri
CLASS_COLORS = {
    "phillips": "#E67E22",
    "pozidriv": "#3498DB",
    "torx": "#9B59B6",
    "hex": "#2ECC71",
    "slotted": "#95A5A6",
}

# Turkce sinif isimleri
CLASS_LABELS_TR = {
    "phillips": "Phillips (PH)",
    "pozidriv": "Pozidriv (PZ)",
    "torx": "Torx (T)",
    "hex": "Allen (H)",
    "slotted": "Düz (SL)",
}

# ONNX Model yolu

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../screwvision_model/run/weights/best.onnx"))

# Model boyutu (YOLO default)
INPUT_SIZE = 640

# ONNX Session
ort_session = None


def load_model():
    """ONNX modelini yukle"""
    global ort_session
    if ort_session is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model bulunamadi: {MODEL_PATH}")

        # ONNX Runtime session olustur
        providers = ["CoreMLExecutionProvider", "CPUExecutionProvider"]
        ort_session = ort.InferenceSession(MODEL_PATH, providers=providers)

        # Model bilgilerini yazdir
        input_info = ort_session.get_inputs()[0]
        print(f"[OK] ONNX Model yuklendi: {MODEL_PATH}")
        print(
            f"    Input: {input_info.name}, Shape: {input_info.shape}, Type: {input_info.type}"
        )
    return ort_session


def preprocess_image(image: np.ndarray, input_size: int = INPUT_SIZE) -> tuple:
    """
    Goruntyu ONNX modeli icin hazirla
    """
    original_h, original_w = image.shape[:2]

    # Aspect ratio koruyarak yeniden boyutlandir
    scale = min(input_size / original_w, input_size / original_h)
    new_w = int(original_w * scale)
    new_h = int(original_h * scale)

    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    # Padding ekle (letterbox)
    pad_w = (input_size - new_w) // 2
    pad_h = (input_size - new_h) // 2

    padded = np.full((input_size, input_size, 3), 114, dtype=np.uint8)
    padded[pad_h : pad_h + new_h, pad_w : pad_w + new_w] = resized

    # BGR -> RGB
    rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB)

    # Normalize [0, 255] -> [0, 1]
    normalized = rgb.astype(np.float32) / 255.0

    # HWC -> CHW -> NCHW
    transposed = np.transpose(normalized, (2, 0, 1))
    batched = np.expand_dims(transposed, axis=0)

    return batched, scale, pad_w, pad_h, original_w, original_h


def postprocess_detections(
    outputs: np.ndarray,
    scale: float,
    pad_w: int,
    pad_h: int,
    original_w: int,
    original_h: int,
    confidence_threshold: float = 0.25,
    iou_threshold: float = 0.45,
) -> List[Dict[str, Any]]:
    """
    ONNX ciktisini isle ve tespitleri dondur
    YOLOv8 output format: [1, 84, 8400] veya [1, num_classes+4, num_detections]
    """
    detections = []

    # Output shape'i kontrol et
    output = outputs[0]  # Ilk output

    # [1, 84, 8400] -> [84, 8400] -> [8400, 84]
    if len(output.shape) == 3:
        output = output[0]

    # [84, 8400] -> [8400, 84] (transpose)
    if output.shape[0] < output.shape[1]:
        output = output.T

    # Her detection icin: [x_center, y_center, width, height, class_scores...]
    num_detections = output.shape[0]
    num_classes = output.shape[1] - 4

    boxes = []
    scores = []
    class_ids = []

    for i in range(num_detections):
        detection = output[i]

        # Box coordinates
        x_center, y_center, w, h = detection[:4]

        # Class scores
        class_scores = detection[4:]

        # En yuksek skorlu sinif
        class_id = np.argmax(class_scores)
        confidence = class_scores[class_id]

        if confidence < confidence_threshold:
            continue

        # x_center, y_center, w, h -> x1, y1, x2, y2
        x1 = x_center - w / 2
        y1 = y_center - h / 2
        x2 = x_center + w / 2
        y2 = y_center + h / 2

        # Padding'i cikar ve scale'i geri al
        x1 = (x1 - pad_w) / scale
        y1 = (y1 - pad_h) / scale
        x2 = (x2 - pad_w) / scale
        y2 = (y2 - pad_h) / scale

        # Sinirlari kontrol et
        x1 = max(0, min(x1, original_w))
        y1 = max(0, min(y1, original_h))
        x2 = max(0, min(x2, original_w))
        y2 = max(0, min(y2, original_h))

        boxes.append([x1, y1, x2, y2])
        scores.append(float(confidence))
        class_ids.append(int(class_id))

    # NMS uygula
    if len(boxes) > 0:
        boxes_np = np.array(boxes)
        scores_np = np.array(scores)

        # OpenCV NMS
        indices = cv2.dnn.NMSBoxes(
            boxes_np.tolist(), scores_np.tolist(), confidence_threshold, iou_threshold
        )

        if len(indices) > 0:
            indices = indices.flatten()

            for idx in indices:
                x1, y1, x2, y2 = boxes[idx]
                class_id = class_ids[idx]
                confidence = scores[idx]

                # Sinif adini al
                if class_id < len(CLASS_NAMES):
                    class_name = CLASS_NAMES[class_id]
                else:
                    class_name = f"class_{class_id}"

                detections.append(
                    {
                        "class_id": class_id,
                        "class_name": class_name,
                        "class_label": CLASS_LABELS_TR.get(class_name, class_name),
                        "confidence": round(confidence, 3),
                        "bbox": {
                            "x1": int(x1),
                            "y1": int(y1),
                            "x2": int(x2),
                            "y2": int(y2),
                        },
                        "color": CLASS_COLORS.get(class_name, "#FFFFFF"),
                    }
                )

    return detections


def run_inference(image: np.ndarray, confidence: float = 0.25) -> tuple:
    """
    ONNX modeli ile inference yap
    """
    session = load_model()

    # Preprocess
    input_tensor, scale, pad_w, pad_h, orig_w, orig_h = preprocess_image(image)

    # Input adini al
    input_name = session.get_inputs()[0].name

    # Inference
    outputs = session.run(None, {input_name: input_tensor})

    # Postprocess
    detections = postprocess_detections(
        outputs, scale, pad_w, pad_h, orig_w, orig_h, confidence
    )

    return detections, orig_w, orig_h


@app.on_event("startup")
async def startup_event():
    """Uygulama baslagicinda modeli yukle ve IP adresini yazdir"""
    try:
        load_model()
        
        # Yerel IP adresini bul ve yazdir
        import socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            print("\n" + "="*50)
            print(f"Server calisiyor! Mobil uygulamada bu IP'yi kullanin:")
            print(f"👉 http://{local_ip}:8000")
            print("="*50 + "\n")
        except Exception as e:
            print(f"IP adresi bulunamadi: {e}")
            
    except Exception as e:
        print(f"[HATA] Model yukleme hatasi: {e}")


@app.get("/")
async def root():
    """API durumu"""
    return {
        "status": "active",
        "message": "ScrewVision ONNX API calisiyor",
        "version": "2.0.0",
        "runtime": "ONNX Runtime",
    }


@app.get("/health")
async def health_check():
    """Saglik kontrolu"""
    model_loaded = ort_session is not None
    return {
        "status": "healthy" if model_loaded else "unhealthy",
        "model_loaded": model_loaded,
        "model_type": "ONNX",
        "classes": CLASS_NAMES,
    }


@app.get("/classes")
async def get_classes():
    """Mevcut siniflari dondur"""
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
    Goruntude nesne tespiti yap
    """
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Gecersiz dosya tipi. Sadece goruntu dosyalari kabul edilir.",
            )

        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Goruntu okunamadi")

        # ONNX inference
        detections, w, h = run_inference(image, confidence)

        return {
            "success": True,
            "image_size": {"width": w, "height": h},
            "detections_count": len(detections),
            "detections": detections,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error processing image detection: {e}")
        raise HTTPException(status_code=500, detail=f"Tespit hatasi: {str(e)}")


@app.post("/detect/base64")
async def detect_objects_base64(data: dict):
    """
    Base64 kodlu goruntude nesne tespiti yap
    """
    try:
        image_data = data.get("image")
        confidence = data.get("confidence", 0.25)

        if not image_data:
            raise HTTPException(status_code=400, detail="Goruntu verisi gerekli")

        # Base64 header'ini kaldir
        if "," in image_data:
            image_data = image_data.split(",")[1]

        # Decode
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Goruntu decode edilemedi")

        # ONNX inference
        detections, w, h = run_inference(image, confidence)

        return {
            "success": True,
            "image_size": {"width": w, "height": h},
            "detections_count": len(detections),
            "detections": detections,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error processing base64 detection: {e}")
        raise HTTPException(status_code=500, detail=f"Tespit hatasi: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
