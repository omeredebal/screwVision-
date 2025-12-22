# 🌿 RecycleEye - Akıllı Atık Sınıflandırma Uygulaması

<p align="center">
  <strong>YOLOv8 + ONNX Runtime tabanlı gerçek zamanlı atık tespit uygulaması</strong>
</p>

---

## 🎯 Proje Hakkında

RecycleEye, YOLOv8 derin öğrenme modeli kullanarak atık türlerini otomatik olarak sınıflandıran bir mobil uygulamadır. ONNX Runtime ile optimize edilmiş inference sayesinde hızlı ve verimli çalışır.

### Desteklenen Atık Türleri (5 Sınıf)

| Emoji | Sınıf | Türkçe Adı | Renk Kodu |
|-------|-------|------------|-----------|
| 🍞 | `ekmek_atiklari` | Ekmek Atıkları | `#D35400` |
| 📄 | `kagit` | Kağıt | `#2980B9` |
| 🌿 | `organik_atik` | Organik Atık | `#27AE60` |
| 🥤 | `plastik` | Plastik | `#8E44AD` |
| 🍽️ | `yemek_artiklari` | Yemek Artıkları | `#C0392B` |

---

## 📁 Proje Yapısı

```
model&sunumlar/
├── recycleye_app/              # 📱 Ana Uygulama
│   ├── backend/                # FastAPI Backend
│   │   ├── main.py            # PyTorch backend (yedek)
│   │   └── main_onnx.py       # ONNX Runtime backend (aktif)
│   ├── mobile/                 # React Native Mobil
│   │   ├── App.js             # Ana uygulama bileşeni
│   │   ├── app.json           # Expo yapılandırması
│   │   └── package.json       # Node.js bağımlılıkları
│   └── README.md              # Bu dosya
│
├── recycleye_model/            # 🧠 Model Dosyaları
│   └── run/
│       ├── weights/
│       │   ├── best.onnx      # ONNX modeli (aktif)
│       │   ├── best.pt        # PyTorch modeli
│       │   └── last.pt        # Son checkpoint
│       ├── args.yaml          # Eğitim parametreleri
│       └── results.csv        # Eğitim sonuçları
│
└── sunum_grafikleri/           # 📊 Sunum Grafikleri
    └── validation_plots/
        └── predictions.json
```

---

## 🚀 Hızlı Başlangıç

### 1️⃣ Backend'i Başlat (ONNX)

# Backend klasörüne git
cd recycleye_app/backend

# Sanal ortamı aktif et (Mac/Linux için)
source venv/bin/activate

# Backend uygulamasını başlat (ONNX sürümü için)
python main_onnx.py

### 2️⃣ Mobil Uygulamayı Başlat

# Mobile klasörüne git
cd recycleye_app/mobile
# Uygulamayı başlat
npm start

Alternatif olarak: npx expo start da kullanılabilir.

### 3️⃣ Test Et

**Expo Go** uygulamasını telefonunuza indirin ve QR kodu okutun.

---

## 🔧 API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/` | API durumu |
| `GET` | `/health` | Sağlık kontrolü |
| `GET` | `/classes` | Mevcut sınıflar |
| `POST` | `/detect` | Dosya yükleme ile tespit |
| `POST` | `/detect/base64` | Base64 ile tespit |

### Örnek Sağlık Kontrolü

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_type": "ONNX",
  "classes": ["ekmek_atiklari", "kagit", "organik_atik", "plastik", "yemek_artiklari"]
}
```

---

## 📱 Mobil Uygulama Özellikleri

- 📷 **Gerçek Zamanlı Tespit:** Kamera açıkken sürekli tarama
- 🖼️ **Galeri Desteği:** Mevcut fotoğraflardan seçim
- 🎯 **Tam Çerçeve Bounding Box:** Tespit edilen nesneler
- 📊 **Güven Skoru:** Her tespit için % değeri
- 🎨 **Renk Kodlaması:** Her sınıf için farklı renk
- ⚡ **Hızlı Inference:** ONNX + CoreML optimizasyonu

---

## 🛠️ Teknik Detaylar

### Backend

| Özellik | Değer |
|---------|-------|
| Framework | FastAPI |
| Model Format | ONNX (opset 17) |
| Runtime | ONNX Runtime + CoreML |
| Input Size | 640x640 |
| Python | 3.9+ |

### Mobil

| Özellik | Değer |
|---------|-------|
| Framework | React Native |
| SDK | Expo SDK 54 |
| Kamera | expo-camera |
| HTTP Client | fetch API |

### Model

| Metrik | Değer |
|--------|-------|
| Mimari | YOLOv8n |
| mAP50 | ~90.6% |
| mAP50-95 | ~73.3% |
| Sınıf Sayısı | 5 |
| Model Boyutu | ~12 MB (ONNX) |

---

## 📋 Gereksinimler

### Backend
```
fastapi
uvicorn
opencv-python
onnxruntime
numpy
python-multipart
```

### Mobil
```
expo
react-native
expo-camera
expo-image-picker
expo-linear-gradient
```

---

## 🎓 Proje Bilgileri

- **Ders:** YAM435 Makine Görmesi
- **Model:** YOLOv8 (Ultralytics)
- **Dataset:** Roboflow (RecycleEye)
- **Tarih:** Aralık 2025

---

## 📄 Lisans

Bu proje eğitim amaçlı geliştirilmiştir.

---

<p align="center">
  Made with 💚 for a cleaner planet
</p>
