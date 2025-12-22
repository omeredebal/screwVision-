# 🛠️ ScrewVision

**ScrewVision**, vida başlarını otomatik olarak tanıyan ve uygun tornavida ucunu öneren yapay zeka destekli bir mobil uygulamadır.

## 🌟 Özellikler

*   **Gerçek Zamanlı Tanıma:** Kamera görüntüsü üzerinden anlık vida tespiti.
*   **Geniş Kapsam:** Phillips (PH), Pozidriv (PZ), Torx (T), Allen (H) ve Düz (SL) vida tiplerini destekler.
*   **Doğru Öneri:** Tespit edilen vida için en uygun tornavida ucunu önerir.
*   **Hızlı ve Güvenli:** Cihaz üzerinde (On-Device) veya yerel ağda çalışan ONNX/YOLO modelleri ile yüksek performans.

## 🏗️ Mimari

Proje iki ana bileşenden oluşur:

1.  **Mobile App (Frontend):** React Native ve Expo kullanılarak geliştirilmiştir. Kullanıcı arayüzünü ve kamera işlemlerini yönetir.
2.  **Backend API:** Python ve FastAPI ile geliştirilmiştir. Görüntü işleme ve yapay zeka modelini (YOLOv8 / ONNX) barındırır.

## 🚀 Kurulum ve Çalıştırma

Projeyi çalıştırmak için hem backend hem de mobil uygulamayı ayağa kaldırmanız gerekir.

### Gerekli Ön Hazırlıklar

*   Node.js ve npm
*   Python 3.9+
*   Expo Go (Mobil Cihazınızda)

### 1. Backend'i Başlatma

Terminalde proje dizinine gidin ve backend klasörüne geçin:

```bash
cd screwvision_app/backend
```

Sanal ortamı oluşturun ve bağımlılıkları yükleyin (ilk kez çalıştırıyorsanız):

```bash
python3 -m venv venv
source venv/bin/activate  # Windows için: venv\Scripts\activate
pip install -r requirements.txt
```

Sunucuyu başlatın:

```bash
python main.py
# VEYA ONNX sürümü için:
python main_onnx.py
```

### 2. Mobil Uygulamayı Başlatma

Yeni bir terminal penceresi açın ve mobil klasöre gidin:

```bash
cd screwvision_app/mobile
```

Bağımlılıkları yükleyin:

```bash
npm install
```

Uygulamayı başlatın:

```bash
npx expo start --clear
```

Ekranda beliren QR kodu telefonunuzdaki **Expo Go** uygulaması ile taratın.

## 📂 Klasör Yapısı

*   `screwvision_app/`: Uygulama kaynak kodları.
    *   `backend/`: FastAPI sunucusu ve AI modelleri.
    *   `mobile/`: React Native mobil uygulama kodları.
*   `screwvision_model/`: Eğitilmiş yapay zeka model ağırlıkları (.pt ve .onnx).

## 👥 Ekip

*   ScrewVision Team
