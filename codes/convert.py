from ultralytics import YOLO

# Bu kod YOLO modelini ONXX formatına çevirmek için kullanılmıştır
model = YOLO("best.pt") 


success = model.export(
    format="onnx",     
    opset=12,           
    dynamic=True,       
    simplify=True       
)

print(f"Dönüştürme başarılı mı? {success}")