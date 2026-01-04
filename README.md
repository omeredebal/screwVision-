# 🛠️ ScrewVision

> **AI-Powered Screw Classification & Recommendation System**

ScrewVision is a high-performance computer vision application designed to instantly identify and classify industrial screw types. Built with a modern tech stack, it combines a robust **FastAPI** backend with a sleek **React Native** mobile interface to deliver real-time results.

## ✨ Key Features

- **Real-Time Detection**: Instantly classifies screws like *Phillips, Torx, Allen, Hex Socket, Slotted, and Pozidriv*.
- **High Accuracy**: Powered by a custom-trained **YOLOv8** model running on ONNX Runtime.
- **Cross-Platform**: Seamless mobile experience on both iOS and Android.
- **Smart Hints**: Provides size and usage recommendations based on the detected screw type.

## 🏗️ Project Structure

```bash
screwVision/
├── backend/       # FastAPI server & ONNX model logic
├── mobile/        # React Native application source
└── ml/            # Machine learning resources & training scripts
```

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv            # Create virtual environment
source venv/bin/activate        # Activate environment
pip install -r requirements.txt # Install dependencies
python main.py                  # Start the server
```
*Server will run at `http://0.0.0.0:8000`*

### 2. Mobile App Setup

```bash
cd mobile
npm install     # Install packages
npm start       # Launch Expo development server
```

## 🔧 Technology Stack

- **Core**: Python 3.9+, Node.js
- **Machine Learning**: YOLOv8, ONNX Runtime, PyTorch
- **Backend**: FastAPI, OpenCV, Uvicorn
- **Mobile**: React Native, Expo, React Navigation

---
*© 2026 ScrewVision Project*
