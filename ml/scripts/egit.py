from ultralytics import YOLO

def main():
    # 1. Modeli yükle (Sıfırdan başlamak yerine önceden eğitilmiş ağırlıkları kullanıyoruz)
    model = YOLO('yolov8m.pt') 

    # 2. Eğitimi başlat
    model.train(
        data='data.yaml',  # Oluşturduğun yaml dosyasının adı
        epochs=50,         # Veri setin küçükse 50-100, büyükse daha fazla
        imgsz=640,         # Resim boyutu
        batch=16,          # Bellek hatası alırsan bunu düşür (8 veya 4 yap)
        name='benim_modelim', # Eğitim sonuçlarının kaydedileceği klasör adı
        device=0           # GPU kullanmak için 0, işlemci için 'cpu'
    )

if __name__ == '__main__':
    main()