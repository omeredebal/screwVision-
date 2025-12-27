
from ultralytics import YOLO
import os

# Path to the best trained weights
current_dir = os.path.dirname(os.path.abspath(__file__))
pt_path = os.path.join(current_dir, "screwVision_model", "runs", "train", "screwvision_v2_augmented", "weights", "best.pt")

if not os.path.exists(pt_path):
    print(f"Error: File not found at {pt_path}")
    exit(1)

print(f"Loading model from {pt_path}...")
model = YOLO(pt_path)

print("Exporting to ONNX with opset=18 for compatibility...")
# Export with opset=12 (highly compatible standard)
path = model.export(format="onnx", opset=12, dynamic=False)

print(f"Export Success: {path}")
