import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Dimensions, SafeAreaView, StatusBar, Animated, Easing, Modal, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default URL if nothing saved
// Default URL fallback
const DEFAULT_URL = 'http://172.23.27.207:8000';
const STORAGE_KEY = '@api_url';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive breakpoints
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Endüstriyel ve profesyonel renkler
const CLASS_COLORS = {
  phillips: '#E67E22',      // Turuncu (Phillips)
  pozidriv: '#3498DB',      // Mavi (Pozidriv)
  torx: '#9B59B6',          // Mor (Torx)
  hex: '#2ECC71',           // Yeşil (Hex/Allen)
  slotted: '#95A5A6',       // Gri (Düz/Slotted)
};

const CLASS_LABELS = {
  phillips: 'Phillips (PH)',
  pozidriv: 'Pozidriv (PZ)',
  torx: 'Torx (T)',
  hex: 'Allen (H)',
  slotted: 'Düz (SL)',
};

const CLASS_EMOJIS = {
  phillips: '➕',
  pozidriv: '❄️',
  torx: '⭐',
  hex: '⬢',
  slotted: '➖',
};

// Helper fonksiyonlar
const shadeColor = (color, percent) => {
  if (!color) return '#000000'; // Safety fallback
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return `#${(0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1)}`;
};

const getConfidenceColor = (confidence) => {
  if (confidence >= 0.8) return '#27AE60';
  if (confidence >= 0.5) return '#F39C12';
  return '#E74C3C';
};

let isDetectingRef = { current: false };

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [apiUrl, setApiUrl] = useState(DEFAULT_URL);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [realtimeDetections, setRealtimeDetections] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const cameraRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  isDetectingRef = useRef(false);

  // Animasyonlar
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const resultCardAnims = useRef([]).current;

  // IP Adresini yukle
  useEffect(() => {
    loadApiUrl();
  }, []);

  const getDynamicIP = () => {
    const { debuggerHost } = Constants.expoConfig || {};
    if (debuggerHost) {
      return `http://${debuggerHost.split(':')[0]}:8000`;
    }
    // Fallback logic for production or if debuggerHost is missing
    const { manifest2 } = Constants;
    const uri = manifest2?.extra?.expoGo?.debuggerHost || manifest2?.extra?.expoClient?.hostUri || Constants.manifest?.hostUri;
    if (uri) {
      return `http://${uri.split(':')[0]}:8000`;
    }
    return DEFAULT_URL;
  };

  const loadApiUrl = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedUrl) {
        setApiUrl(savedUrl);
      } else {
        // Otomatik IP tespiti
        const dynamicUrl = getDynamicIP();
        setApiUrl(dynamicUrl);
        // İsteğe bağlı: Otomatik bulunan adresi kaydetme (her seferinde dinamik bakması daha iyidir, o yüzden kaydetmiyoruz)
      }
    } catch (e) {
      console.log('Failed to load API URL');
    }
  };

  const saveApiUrl = async () => {
    try {
      let finalUrl = tempUrl.trim();
      // "http://" ekle eğer yoksa
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `http://${finalUrl}`;
      }
      // Port yoksa varsayılan portu ekle (opsiyonel, kullanıcının tam girdiği varsayılır ama kolaylık olsun)
      if (!finalUrl.includes(':', 6)) {
        finalUrl = `${finalUrl}:8000`;
      }

      await AsyncStorage.setItem(STORAGE_KEY, finalUrl);
      setApiUrl(finalUrl);
      setIsSettingsVisible(false);
      Alert.alert('Başarılı', `API Adresi güncellendi:\n${finalUrl}`);
    } catch (e) {
      Alert.alert('Hata', 'Ayarlar kaydedilemedi');
    }
  };

  const openSettings = () => {
    // Şu anki URL'den http:// kısmını ve portu temizleyip gösterelim mi?
    // Hayır, direkt olduğu gibi gösterelim, kullanıcı düzenlesin.
    setTempUrl(apiUrl);
    setIsSettingsVisible(true);
  };


  // Pulse efekti - tespit sırasında
  useEffect(() => {
    if (isDetecting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 400, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.ease }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isDetecting]);

  // Scan line animasyonu - kamera aktifken
  useEffect(() => {
    if (isCameraActive) {
      const scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      scanAnimation.start();

      // Glow efekti
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.8, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      glowAnimation.start();

      return () => {
        scanAnimation.stop();
        glowAnimation.stop();
      };
    }
  }, [isCameraActive]);

  // Loading dönen animasyon
  useEffect(() => {
    if (isLoading) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.linear })
      );
      rotateAnimation.start();
      return () => rotateAnimation.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isLoading]);

  // Sonuç kartları animasyonu
  useEffect(() => {
    if (capturedImage && detections.length > 0) {
      // Reset animations
      fadeInAnim.setValue(0);
      slideUpAnim.setValue(50);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeInAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideUpAnim, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 100 }),
      ]).start();
    }
  }, [capturedImage, detections]);

  useEffect(() => {
    if (isCameraActive) {
      startRealtimeDetection();
    } else {
      stopRealtimeDetection();
    }
    return () => stopRealtimeDetection();
  }, [isCameraActive]);

  const startRealtimeDetection = () => {
    if (detectionIntervalRef.current) return;
    detectionIntervalRef.current = setInterval(async () => {
      if (isDetectingRef.current || !cameraRef.current) return;
      try {
        isDetectingRef.current = true;
        setIsDetecting(true);

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
          skipProcessing: true,
        });

        if (!photo || !photo.base64) return;

        const response = await fetch(apiUrl + '/detect/base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: photo.base64, confidence: 0.25 }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRealtimeDetections(data.detections);
            setImageSize({ width: photo.width, height: photo.height });
          }
        }
      } catch (error) {
        // Sessizce geç - canlı tespit hatası kritik değil
      } finally {
        isDetectingRef.current = false;
        setIsDetecting(false);
      }
    }, 1200);
  };

  const stopRealtimeDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setRealtimeDetections([]);
    isDetectingRef.current = false;
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        // Önce canlı tespiti durdur ve bekle
        stopRealtimeDetection();
        setIsLoading(true);

        // Kameranın hazır olması için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 300));

        // Fotoğraf çek
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          skipProcessing: false,
        });

        if (photo && photo.uri) {
          setCapturedImage(photo.uri);
          setIsCameraActive(false);
          await detectObjects(photo.base64);
        } else {
          throw new Error('Fotoğraf alınamadı');
        }
      } catch (error) {
        console.log('Take picture error:', error);
        Alert.alert('Hata', 'Fotoğraf çekilemedi. Lütfen tekrar deneyin.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (!result.canceled && result.assets[0]) {
        setIsLoading(true);
        setCapturedImage(result.assets[0].uri);
        await detectObjects(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Hata', 'Goruntu secilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const detectObjects = async (base64Image) => {
    try {
      const response = await fetch(apiUrl + '/detect/base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, confidence: 0.2 }),
      });
      if (!response.ok) throw new Error('API yanit vermedi');
      const data = await response.json();
      if (data.success) {
        setDetections(data.detections);
        setImageSize(data.image_size);
      }
    } catch (error) {
      Alert.alert('Baglanti Hatasi', 'API baglantisi kurulamadi');
      setDetections([]);
    }
  };

  const resetState = () => {
    setCapturedImage(null);
    setDetections([]);
    setRealtimeDetections([]);
    setIsCameraActive(false);
    stopRealtimeDetection();
  };

  const renderRealtimeBoxes = () => {
    if (realtimeDetections.length === 0 || imageSize.width === 0) return null;

    // Kamera preview boyutları
    const previewHeight = SCREEN_HEIGHT - 180; // Controls için alan
    const previewWidth = SCREEN_WIDTH;

    // Fotoğraf aspect ratio (genişlik/yükseklik)
    const photoAspect = imageSize.width / imageSize.height;
    const previewAspect = previewWidth / previewHeight;

    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;

    // Kamera genellikle fill modda çalışır
    if (photoAspect > previewAspect) {
      // Fotoğraf daha geniş - yüksekliğe göre ölçekle, yanlardan kırp
      displayHeight = previewHeight;
      displayWidth = displayHeight * photoAspect;
      offsetX = (previewWidth - displayWidth) / 2;
    } else {
      // Fotoğraf daha uzun - genişliğe göre ölçekle, üst/alttan kırp  
      displayWidth = previewWidth;
      displayHeight = displayWidth / photoAspect;
      offsetY = (previewHeight - displayHeight) / 2;
    }

    const scaleX = displayWidth / imageSize.width;
    const scaleY = displayHeight / imageSize.height;
    const borderWidth = 3;

    return realtimeDetections.map((det, i) => {
      const color = CLASS_COLORS[det.class_name] || '#FFF';
      const left = det.bbox.x1 * scaleX + offsetX;
      const top = det.bbox.y1 * scaleY + offsetY;
      const width = (det.bbox.x2 - det.bbox.x1) * scaleX;
      const height = (det.bbox.y2 - det.bbox.y1) * scaleY;

      const isNarrow = width < 80;

      return (
        <View key={i} style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          borderWidth: borderWidth,
          borderColor: color,
          borderRadius: 4,
          backgroundColor: `${color}15`,
          zIndex: 10 + i, // Ensure boxes stack properly
        }}>
          {/* Label */}
          <View style={[
            styles.proLabel,
            { backgroundColor: color },
            isNarrow && {
              left: '50%',
              marginLeft: -40, // Half of minWidth (80/2)
              minWidth: 80,
              alignItems: 'center'
            }
          ]}>
            <Text style={styles.proLabelText} numberOfLines={1}>
              {CLASS_EMOJIS[det.class_name]} {Math.round(det.confidence * 100)}%
            </Text>
          </View>
        </View>
      );
    });
  };

  // Sonuç ekranı için box hesaplaması - contain mode
  const getResultDisplayDimensions = () => {
    const containerWidth = SCREEN_WIDTH - scale(32);
    const availableHeight = SCREEN_HEIGHT - 180;
    const maxImageHeight = availableHeight * 0.45;

    if (imageSize.width === 0 || imageSize.height === 0) {
      return { displayWidth: containerWidth, displayHeight: maxImageHeight, offsetX: 0, offsetY: 0 };
    }

    const imageAspect = imageSize.width / imageSize.height;
    const containerAspect = containerWidth / maxImageHeight;

    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;

    if (imageAspect > containerAspect) {
      // Görüntü daha geniş - genişliğe sığdır
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetY = (maxImageHeight - displayHeight) / 2;
    } else {
      // Görüntü daha uzun - yüksekliğe sığdır
      displayHeight = maxImageHeight;
      displayWidth = maxImageHeight * imageAspect;
      offsetX = (containerWidth - displayWidth) / 2;
    }

    return { displayWidth, displayHeight, offsetX, offsetY, containerWidth, maxImageHeight };
  };

  const renderResultBoxes = () => {
    if (!capturedImage || detections.length === 0 || imageSize.width === 0) return null;

    const { displayWidth, displayHeight } = getResultDisplayDimensions();

    // Basit ölçekleme - contain mode için
    const scaleX = displayWidth / imageSize.width;
    const scaleY = displayHeight / imageSize.height;
    const borderWidth = 3;

    return detections.map((det, i) => {
      const color = CLASS_COLORS[det.class_name] || '#FFF';
      const left = det.bbox.x1 * scaleX;
      const top = det.bbox.y1 * scaleY;
      const width = (det.bbox.x2 - det.bbox.x1) * scaleX;
      const height = (det.bbox.y2 - det.bbox.y1) * scaleY;

      const isNarrow = width < 80;

      return (
        <View key={i} style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          borderWidth: borderWidth,
          borderColor: color,
          borderRadius: 4,
          backgroundColor: `${color}15`,
          zIndex: 10 + i,
        }}>
          {/* Label */}
          <View style={[
            styles.proLabel,
            { backgroundColor: color },
            isNarrow && {
              left: '50%',
              marginLeft: -45, // Half of approx minWidth (90/2) for better touch target
              minWidth: 90,
              alignItems: 'center'
            }
          ]}>
            <Text style={styles.proLabelText} numberOfLines={1}>
              {CLASS_EMOJIS[det.class_name]} {Math.round(det.confidence * 100)}%
            </Text>
          </View>
        </View>
      );
    });
  };

  if (!permission) return <View style={styles.center}><ActivityIndicator size="large" color="#2c3e50" /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Kamera izni gerekli</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Izin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isCameraActive) {
    const scanTranslateY = scanLineAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, SCREEN_HEIGHT - 200],
    });

    return (
      <View style={styles.camContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Animated Scan Line */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]}>
            <LinearGradient
              colors={['transparent', 'rgba(52, 152, 219, 0.6)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanLineGradient}
            />
          </Animated.View>

          {/* Detection Boxes Overlay */}
          <View style={styles.overlay}>{renderRealtimeBoxes()}</View>

          {/* Status Badge */}
          <View style={styles.statusContainer}>
            {isDetecting ? (
              <Animated.View style={[styles.statusBadge, styles.statusScanning, { opacity: glowAnim }]}>
                <Animated.View style={[styles.statusDot, styles.dotActive, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.statusText}>Taranıyor...</Text>
              </Animated.View>
            ) : (
              <View style={[styles.statusBadge, styles.statusReady]}>
                <View style={[styles.statusDot, styles.dotReady]} />
                <Text style={styles.statusText}>Hazır</Text>
              </View>
            )}
          </View>

          {/* Detection Count Badge */}
          {realtimeDetections.length > 0 && (
            <View style={styles.badge}>
              <LinearGradient
                colors={['#2980B9', '#2c3e50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badgeGradient}
              >
                <Text style={styles.badgeText}>🎯 {realtimeDetections.length} nesne tespit edildi</Text>
              </LinearGradient>
            </View>
          )}
        </CameraView>

        {/* Realtime Detection Pills */}
        {realtimeDetections.length > 0 && (
          <View style={styles.detListContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detListContent}>
              {realtimeDetections.map((d, i) => {
                // Fallback color if class not found in palette
                const baseColor = CLASS_COLORS[d.class_name] || '#2c3e50';
                return (
                  <LinearGradient
                    key={i}
                    colors={[baseColor, shadeColor(baseColor, -20)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.detItem}
                  >
                    <Text style={styles.detEmoji}>{CLASS_EMOJIS[d.class_name]}</Text>
                    <View style={styles.detInfo}>
                      <Text style={styles.detName}>{CLASS_LABELS[d.class_name]}</Text>
                      <Text style={styles.detConf}>{Math.round(d.confidence * 100)}%</Text>
                    </View>
                  </LinearGradient>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Camera Controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
          style={styles.controls}
        >
          <TouchableOpacity style={styles.controlBtn} onPress={resetState}>
            <View style={styles.controlBtnInner}>
              <Text style={styles.controlBtnIcon}>✕</Text>
            </View>
            <Text style={styles.controlBtnLabel}>İptal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureBtn} onPress={takePicture} disabled={isLoading}>
            <View style={styles.captureBtnOuter}>
              {isLoading ? (
                <ActivityIndicator color="#2c3e50" size="large" />
              ) : (
                <View style={styles.captureBtnInner}>
                  <View style={styles.captureBtnCore} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.controlBtn}>
            <View style={[styles.controlBtnInner, { opacity: 0 }]} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (capturedImage) {
    // getResultDisplayDimensions fonksiyonunu kullan
    const { displayWidth, displayHeight, containerWidth, maxImageHeight } = getResultDisplayDimensions();

    // Tespit sayısına göre dinamik boyutlandırma
    const detectionCount = detections.length;
    const compactMode = detectionCount > 3;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#2c3e50', '#34495e', '#2c3e50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerCompact}>
          <Text style={styles.headerTextCompact}>📊 Analiz Sonucu</Text>
        </LinearGradient>

        <View style={styles.resultContainerFull}>
          <Animated.View style={[styles.resultInner, { opacity: fadeInAnim, transform: [{ translateY: slideUpAnim }] }]}>
            {/* Image + Summary Row */}
            <View style={styles.topSection}>
              {/* Image Container - contain mode ile tam sığdır */}
              <View style={[styles.imageBoxCompact, { height: displayHeight, width: displayWidth, overflow: 'hidden' }]}>
                <Image
                  source={{ uri: capturedImage }}
                  style={{ width: displayWidth, height: displayHeight, borderRadius: scale(12) }}
                  resizeMode="contain"
                />
                {renderResultBoxes()}
              </View>

              {/* Inline Summary */}
              <View style={[styles.summaryInline, { backgroundColor: detections.length > 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={styles.summaryIconSmall}>{detections.length > 0 ? '✅' : '❌'}</Text>
                <Text style={styles.summaryTitleSmall}>
                  {detections.length > 0 ? `${detections.length} Tespit` : 'Bulunamadı'}
                </Text>
                {detections.length > 0 && (
                  <Text style={styles.summarySubSmall}>
                    %{Math.round(detections.reduce((a, b) => a + b.confidence, 0) / detections.length * 100)} güven
                  </Text>
                )}
              </View>
            </View>

            {/* Detection Results - Compact Grid */}
            <View style={styles.resultsSection}>
              {detections.length === 0 ? (
                <View style={styles.emptyResultCompact}>
                  <Text style={styles.emptyIconSmall}>🔎</Text>
                  <Text style={styles.emptyTextSmall}>Tanınabilir vida bulunamadı</Text>
                </View>
              ) : (
                <View style={compactMode ? styles.resultsGrid : styles.resultsList}>
                  {detections.map((d, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        compactMode ? styles.resultItemCompact : styles.resultItemFull,
                        { borderLeftColor: CLASS_COLORS[d.class_name] }
                      ]}
                    >
                      <View style={[styles.resultIconSmall, { backgroundColor: `${CLASS_COLORS[d.class_name]}20` }]}>
                        <Text style={styles.resultEmojiSmall}>{CLASS_EMOJIS[d.class_name]}</Text>
                      </View>
                      <View style={styles.resultInfoCompact}>
                        <Text style={styles.classNameSmall} numberOfLines={1}>{CLASS_LABELS[d.class_name]}</Text>
                        <View style={styles.confRowCompact}>
                          <View style={styles.confBarSmall}>
                            <View style={[styles.confFillSmall, { width: `${d.confidence * 100}%`, backgroundColor: CLASS_COLORS[d.class_name] }]} />
                          </View>
                          <Text style={[styles.confTextSmall, { color: getConfidenceColor(d.confidence) }]}>
                            {Math.round(d.confidence * 100)}%
                          </Text>
                        </View>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>

            {/* Action Button - Fixed at bottom */}
            <TouchableOpacity style={styles.newBtnCompact} onPress={resetState}>
              <LinearGradient
                colors={['#2c3e50', '#34495e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newBtnGradientCompact}
              >
                <Text style={styles.newBtnIconSmall}>🔄</Text>
                <Text style={styles.newBtnTextSmall}>Yeni Analiz</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#2c3e50', '#34495e', '#2c3e50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>🛠️ ScrewVision</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
            <Text style={styles.settingsBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <View style={styles.home}>
        <Image source={require('./assets/final-logo.png')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.subtitle}>Vida Tanıma ve Uç Önerme</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Desteklenen Vida Türleri</Text>
          <View style={styles.classGrid}>
            {Object.entries(CLASS_LABELS).map(([k, v]) => (
              <View key={k} style={[styles.classItem, { borderLeftWidth: 3, borderLeftColor: CLASS_COLORS[k] }]}>
                <Text style={styles.classEmoji}>{CLASS_EMOJIS[k]}</Text>
                <Text style={styles.classText}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsCameraActive(true)}>
          <Text style={styles.primaryBtnText}>📷 Kamera Aç</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
          <Text style={styles.secondaryBtnText}>🖼️ Galeriden Seç</Text>
        </TouchableOpacity>
      </View>
      {
        isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2c3e50" />
            <Text style={styles.loadingText}>Analiz ediliyor...</Text>
          </View>
        )
      }

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSettingsVisible}
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📡 Bağlantı Ayarları</Text>
            <Text style={styles.modalSub}>Backend IP Adresi</Text>

            <TextInput
              style={styles.input}
              onChangeText={setTempUrl}
              value={tempUrl}
              placeholder="http://192.168.1.X:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsSettingsVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveApiUrl}
              >
                <Text style={styles.modalBtnTextSave}>Kaydet</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.ipHint}>
              Bilgisayarınızda terminalde yazan IP adresini buraya girin.{"\n"}
              Örnek: http://192.168.1.35:8000
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3' },
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3' },
  header: { backgroundColor: '#2c3e50', paddingVertical: scale(14), paddingHorizontal: scale(20), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  headerText: { color: '#fff', fontSize: scale(22), fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  settingsBtn: { position: 'absolute', right: 0, padding: 5 },
  settingsBtnText: { fontSize: scale(24) },
  home: { flex: 1, padding: scale(24), paddingTop: scale(10), alignItems: 'center' }, // paddingTop eklendi
  logoImage: { width: scale(160), height: scale(160), marginTop: scale(10), marginBottom: scale(8) }, // marginTop ve marginBottom azaltıldı
  subtitle: { fontSize: scale(17), color: '#546E7A', marginBottom: scale(16), fontWeight: '500', letterSpacing: 0.5 }, // marginBottom azaltıldı
  infoCard: { backgroundColor: '#fff', borderRadius: scale(20), padding: scale(24), width: '100%', marginBottom: scale(12), shadowColor: '#2c3e50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }, // marginBottom azaltıldı
  infoTitle: { fontSize: scale(18), fontWeight: '700', textAlign: 'center', marginBottom: scale(18), color: '#2c3e50' },
  classGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  classItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F9F7', padding: scale(12), borderRadius: scale(24), margin: scale(5), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  classEmoji: { fontSize: scale(22), marginRight: scale(8) },
  classText: { fontSize: scale(14), color: '#37474F', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#2c3e50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(18), paddingHorizontal: scale(24), borderRadius: scale(16), width: '100%', marginBottom: scale(8), shadowColor: '#2c3e50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }, // marginBottom azaltıldı
  primaryBtnText: { color: '#fff', fontSize: scale(18), fontWeight: '700', letterSpacing: 0.5 },
  secondaryBtn: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(18), paddingHorizontal: scale(24), borderRadius: scale(16), width: '100%', borderWidth: 2, borderColor: '#2c3e50', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  secondaryBtnText: { color: '#2c3e50', fontSize: scale(18), fontWeight: '700', letterSpacing: 0.5 },
  btn: { backgroundColor: '#2c3e50', paddingVertical: scale(16), paddingHorizontal: scale(32), borderRadius: scale(12), marginTop: scale(20), shadowColor: '#2c3e50', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  btnText: { color: '#fff', fontSize: scale(16), fontWeight: '700' },
  permText: { fontSize: scale(17), color: '#546E7A', marginBottom: scale(12), fontWeight: '500' },
  // Camera Styles
  camContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Scan Frame
  scanFrame: { position: 'absolute', top: '15%', left: '10%', right: '10%', bottom: '25%', borderWidth: 0 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#2ECC71' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },

  // Scan Line
  scanLine: { position: 'absolute', left: 20, right: 20, height: 3 },
  scanLineGradient: { flex: 1, height: 3, borderRadius: 2 },

  // Status Badge
  statusContainer: { position: 'absolute', top: 60, left: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  statusScanning: { backgroundColor: 'rgba(52, 152, 219, 0.95)' },
  statusReady: { backgroundColor: 'rgba(52, 73, 94, 0.9)' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotActive: { backgroundColor: '#fff', shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  dotReady: { backgroundColor: '#95a5a6' },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Detection Badge
  badge: { position: 'absolute', top: 60, right: 20, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  badgeGradient: { paddingHorizontal: 18, paddingVertical: 10 },
  badgeText: { color: '#fff', fontSize: scale(14), fontWeight: '700', letterSpacing: 0.3 },

  // Detection List
  detListContainer: { position: 'absolute', bottom: 140, left: 0, right: 0 },
  detListContent: { paddingHorizontal: 16 },
  detItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginHorizontal: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  detEmoji: { fontSize: 24, marginRight: 10 },
  detInfo: { flexDirection: 'column' },
  detName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  detConf: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  // Camera Controls
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 40, paddingBottom: 40, paddingHorizontal: 30 },
  controlBtn: { alignItems: 'center' },
  controlBtnInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  controlBtnIcon: { color: '#fff', fontSize: 24, fontWeight: '300' },
  controlBtnLabel: { color: '#fff', fontSize: 12, marginTop: 6, fontWeight: '600' },
  captureBtn: { alignItems: 'center' },
  captureBtnOuter: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  captureBtnInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureBtnCore: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', borderWidth: 3, borderColor: '#2c3e50' },

  // Bounding Box Label
  proLabel: { position: 'absolute', top: -28, left: 0, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  proLabelText: { color: '#fff', fontSize: 13, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  // Result Screen - Full Height (No Scroll)
  headerCompact: { paddingVertical: scale(12), paddingHorizontal: scale(16), alignItems: 'center' },
  headerTextCompact: { color: '#fff', fontSize: scale(18), fontWeight: '700' },
  resultContainerFull: { flex: 1, backgroundColor: '#F0F4F3' },
  resultInner: { flex: 1, padding: scale(16), justifyContent: 'space-between' },

  // Top Section - Image + Summary
  topSection: { alignItems: 'center' },
  imageBoxCompact: { position: 'relative', alignSelf: 'center', backgroundColor: '#1a1a1a', borderRadius: scale(12), overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  summaryInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: scale(10), paddingVertical: scale(8), paddingHorizontal: scale(16), borderRadius: scale(20), gap: scale(8) },
  summaryIconSmall: { fontSize: scale(18) },
  summaryTitleSmall: { fontSize: scale(14), fontWeight: '700', color: '#2c3e50' },
  summarySubSmall: { fontSize: scale(12), color: '#27AE60', fontWeight: '600' },

  // Results Section
  resultsSection: { flex: 1, marginTop: scale(12) },
  resultsList: { gap: scale(8) },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), justifyContent: 'space-between' },

  // Result Item - Full width
  resultItemFull: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: scale(12), borderRadius: scale(12), borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },

  // Result Item - Compact (for 4+ items)
  resultItemCompact: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: scale(10), borderRadius: scale(10), borderLeftWidth: 3, width: '48%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },

  resultIconSmall: { width: scale(36), height: scale(36), borderRadius: scale(18), justifyContent: 'center', alignItems: 'center', marginRight: scale(10) },
  resultEmojiSmall: { fontSize: scale(20) },
  resultInfoCompact: { flex: 1 },
  classNameSmall: { fontSize: scale(13), fontWeight: '700', color: '#263238', marginBottom: scale(4) },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#2c3e50', marginBottom: 20 },
  modalSub: { fontSize: 16, color: '#7f8c8d', marginBottom: 10, alignSelf: 'flex-start', marginLeft: 5 },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, marginBottom: 20, backgroundColor: '#f9f9f9' },
  modalButtons: { flexDirection: 'row', gap: 15, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#ecf0f1' },
  modalBtnSave: { backgroundColor: '#2ecc71' },
  modalBtnTextCancel: { color: '#7f8c8d', fontSize: 16, fontWeight: '600' },
  modalBtnTextSave: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ipHint: { marginTop: 20, textAlign: 'center', color: '#95a5a6', fontSize: 13, lineHeight: 18 },
  confRowCompact: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  confBarSmall: { flex: 1, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  confFillSmall: { height: '100%', borderRadius: 3 },
  confTextSmall: { fontSize: scale(12), fontWeight: '700', minWidth: scale(32) },

  // Empty Result Compact
  emptyResultCompact: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyIconSmall: { fontSize: scale(36), marginBottom: scale(8) },
  emptyTextSmall: { fontSize: scale(14), color: '#546E7A', fontWeight: '600', textAlign: 'center' },

  // Action Button - Compact
  newBtnCompact: { borderRadius: scale(14), overflow: 'hidden', shadowColor: '#1B5E20', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  newBtnGradientCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14) },
  newBtnIconSmall: { fontSize: scale(18), marginRight: scale(8) },
  newBtnTextSmall: { color: '#fff', fontSize: scale(15), fontWeight: '700' },

  // Loading Overlay
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: scale(18), fontSize: scale(19), color: '#1B5E20', fontWeight: '700' },
});
