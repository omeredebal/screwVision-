
import os
import cv2
import albumentations as A
import glob
import shutil

# Dataset Paths
DATASET_DIR = "/Users/omeredebal/Desktop/4. sınıf projeler/screwVison/screwVision_data"
SETS = ['train', 'valid', 'test']

# Augmentation Pipeline
# We want to create robust variations:
# 1. Rotations (critical for screws)
# 2. Flips (symmetry)
# 3. Lighting changes (robustness)

def get_augmentations():
    # Target: ~1000 images total. Original: ~111.
    # We need ~9 variations per original image.
    return [
        # 1. Rotation Group (Geometric) - Crucial for screws
        (A.Compose([
            A.Rotate(limit=(15, 60), p=1.0),
            A.RandomBrightnessContrast(p=0.4),
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_rot_pos"),
        
        (A.Compose([
            A.Rotate(limit=(-60, -15), p=1.0),
            A.RandomGamma(p=0.3),
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_rot_neg"),

        # 2. Flip Group (Symmetry)
        (A.Compose([
            A.VerticalFlip(p=1.0),
            A.GaussNoise(var_limit=(10.0, 50.0), p=0.4), # Add noise to flip
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_vflip_noise"),
        
        (A.Compose([
            A.HorizontalFlip(p=1.0),
            A.MotionBlur(blur_limit=5, p=0.3), # Add potential motion blur
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_hflip_blur"),

        # 3. Lighting & Environment Group (Robustness)
        (A.Compose([
            A.CLAHE(clip_limit=4.0, tile_grid_size=(8, 8), p=1.0), # Enhance local contrast (good for details like screw heads)
            A.HueSaturationValue(hue_shift_limit=10, sat_shift_limit=20, val_shift_limit=10, p=0.5),
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_clahe_hsv"),

        (A.Compose([
            A.ChannelShuffle(p=1.0), # Simulate different camera color biases
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_ch_shuffle"),
        
        (A.Compose([
            # Simulating shadows/highlights
            A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=1.0),
            A.ISONoise(p=0.5),
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_high_contrast"),

        # 4. Complex Combination
        (A.Compose([
            A.Rotate(limit=180, p=1.0), # Full rotation
            A.OneOf([
                A.GaussNoise(p=1),
                A.MotionBlur(p=1),
            ], p=0.5),
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_complex_1"),
        
         (A.Compose([
            A.Perspective(scale=(0.05, 0.1), p=1.0), # Slight perspective change
            A.Sharpen(alpha=(0.2, 0.5), lightness=(0.5, 1.0), p=0.5) # Sharpening details
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'])), 
        "_persist_sharp"),
    ]

def read_yolo_label(label_path):
    bboxes = []
    class_labels = []
    if os.path.exists(label_path):
        with open(label_path, 'r') as f:
            lines = f.readlines()
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls = int(parts[0])
                    x_center = float(parts[1])
                    y_center = float(parts[2])
                    w = float(parts[3])
                    h = float(parts[4])
                    bboxes.append([x_center, y_center, w, h])
                    class_labels.append(cls)
    return bboxes, class_labels

def save_yolo_label(output_path, bboxes, class_labels):
    with open(output_path, 'w') as f:
        for bbox, cls in zip(bboxes, class_labels):
            # Clip bbox to [0, 1] to avoid errors, though albumentations handles valid ones
            x_c, y_c, w, h = bbox
            x_c = max(0, min(1, x_c))
            y_c = max(0, min(1, y_c))
            w = max(0, min(1, w))
            h = max(0, min(1, h))
            f.write(f"{cls} {x_c:.6f} {y_c:.6f} {w:.6f} {h:.6f}\n")

def process_dataset():
    pipelines = get_augmentations()
    
    total_generated = 0
    
    for split in SETS:
        img_dir = os.path.join(DATASET_DIR, split, "images")
        lbl_dir = os.path.join(DATASET_DIR, split, "labels")
        
        if not os.path.exists(img_dir):
            continue
            
        print(f"Processing {split} set...")
        
        # Get all images
        image_files = glob.glob(os.path.join(img_dir, "*.jpg")) + \
                      glob.glob(os.path.join(img_dir, "*.png")) + \
                      glob.glob(os.path.join(img_dir, "*.jpeg"))
                      
        for img_path in image_files:
            basename = os.path.splitext(os.path.basename(img_path))[0]
            ext = os.path.splitext(os.path.basename(img_path))[1]
            label_path = os.path.join(lbl_dir, basename + ".txt")
            
            # Read Image
            image = cv2.imread(img_path)
            if image is None:
                continue
                
            # Read Label
            bboxes, class_labels = read_yolo_label(label_path)
            
            # Apply pipelines
            for aug, suffix in pipelines:
                try:
                    augmented = aug(image=image, bboxes=bboxes, class_labels=class_labels)
                    aug_img = augmented['image']
                    aug_bboxes = augmented['bboxes']
                    aug_labels = augmented['class_labels']
                    
                    # Generate new filenames
                    new_basename = basename + suffix
                    new_img_path = os.path.join(img_dir, new_basename + ext)
                    new_lbl_path = os.path.join(lbl_dir, new_basename + ".txt")
                    
                    # Save Image
                    cv2.imwrite(new_img_path, aug_img)
                    
                    # Save Label
                    save_yolo_label(new_lbl_path, aug_bboxes, aug_labels)
                    
                    total_generated += 1
                except Exception as e:
                    print(f"Error augmenting {basename}: {e}")
                    
    print(f"Done! Generated {total_generated} new images.")

if __name__ == "__main__":
    process_dataset()
