
from ultralytics import YOLO
import os

# Define paths
model_path = "yolov8n.pt" # Start from pretrained 'nano' model
current_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(current_dir, "screwVision_data", "data.yaml")
project_dir = os.path.join(current_dir, "screwVision_model", "runs", "train")
name = "screwvision_v2_augmented"

def train():
    # Load a model
    model = YOLO(model_path)  # load a pretrained model (recommended for training)

    # Train the model
    # "Professional" settings:
    # - epochs=100: Standard for transfer learning, usually converges effectively.
    # - imgsz=640: Standard resolution for YOLOv8.
    # - patience=20: Early stopping if no improvement for 20 epochs.
    # - batch=-1: AutoBatch (decides best batch size based on GPU/CPU memory).
    # - save=True: Save checkpoints.
    # - exist_ok=True: Overwrite existing experiment name if valid.
    # - augment=False: We already did offline augmentation, but online augmentation (mosaic etc) is still good.
    #   Note: YOLOv8 applies robust online augmentation by default (Mosaic, MixUp). 
    #   Since we added explicit geometric variances offline, standard online aug is fine.
    
    results = model.train(
        data=data_path,
        epochs=100,
        imgsz=640,
        patience=20,
        batch=16, # Conservative batch size for CPU/local training to avoid OOM
        device='mps', # Use Apple Silicon GPU
        project=project_dir,
        name=name,
        exist_ok=True,
        pretrained=True,
        optimizer='auto',
        verbose=True,
        seed=42, # For reproducibility
        plots=True # Save plot results
    )
    
    print("Training Completed.")
    print(f"Results saved to {project_dir}/{name}")
    
    # Validation
    metrics = model.val()
    print("Validation Metrics:", metrics.box.map)
    
    # Export to ONNX
    print("Exporting to ONNX...")
    success = model.export(format='onnx', dynamic=False) # dynamic=False for better compatibility with mobile/opencv
    print(f"Export Success: {success}")

if __name__ == '__main__':
    train()
