from ultralytics import YOLO

def main():
    # YOLO nun medium modeli 
    model = YOLO('yolov8m.pt') 

    # 2. Eğitimi başlat
    model.train(
        data='data.yaml',  # Oluşturulan yaml dosyası
        epochs=50,         
        imgsz=640,         # Resim boyutun 640 olarak resize etmek için
        batch=16,          # son eğittim model t4 kullandığım için 32 idi
        name='benim_modelim',
        device=0           # gpu kullanımı
    )

if __name__ == '__main__':
    main()