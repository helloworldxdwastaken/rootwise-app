import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../constants/theme';
import api, { foodAPI } from '../services/api';

interface FoodAnalysis {
  description: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  portionSize: string;
  confidence: number;
  healthNotes: string | null;
  mealType: string;
}

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER';

interface UnclearResult {
  reason: string;
  suggestion: string;
}

export default function FoodScannerScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('OTHER');
  const [unclearResult, setUnclearResult] = useState<UnclearResult | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualFood, setManualFood] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [isEstimated, setIsEstimated] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Ask for camera permission upfront for embedded preview
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  // Pulse animation for analyze button
  useEffect(() => {
    if (image && !analysis) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [image, analysis]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to scan food.');
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      if (photo?.uri) {
        setImage(photo.uri);
        setAnalysis(null);
        setUnclearResult(null);
        setShowManualInput(false);
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        `Please allow ${useCamera ? 'camera' : 'photo library'} access to scan food.`
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      setAnalysis(null);
      // Auto-detect meal type based on time
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11) setSelectedMealType('BREAKFAST');
      else if (hour >= 11 && hour < 15) setSelectedMealType('LUNCH');
      else if (hour >= 17 && hour < 21) setSelectedMealType('DINNER');
      else setSelectedMealType('SNACK');
    }
  };

  const analyzeFood = async () => {
    if (!image) return;

    setAnalyzing(true);
    setUnclearResult(null);
    try {
      // Get base64 from the image
      const response = await fetch(image);
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });

      const imageBase64 = await base64Promise;

      const result = await foodAPI.analyze(imageBase64, selectedMealType);

      if (result.success) {
        setAnalysis(result.analysis);
        setUnclearResult(null);
      } else if (result.unclear) {
        // Image was unclear - show message and options
        setUnclearResult({
          reason: result.reason,
          suggestion: result.suggestion,
        });
        setAnalysis(null);
      } else {
        Alert.alert('Error', 'Could not analyze the food image.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze food. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const logFood = async () => {
    if (!analysis) return;

    setSaving(true);
    try {
      const result = await foodAPI.log({
        description: analysis.description,
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        fiber: analysis.fiber,
        mealType: selectedMealType,
        portionSize: analysis.portionSize,
        confidence: analysis.confidence,
      });

      console.log('Food log API response:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('Food logged successfully! ID:', result.foodLog?.id);
        Alert.alert(
          'Logged! 🎉',
          `${analysis.calories} calories added to your food log.\n\nID: ${result.foodLog?.id || 'saved'}`,
          [
            {
              text: 'Scan Another',
              onPress: () => {
                setImage(null);
                setAnalysis(null);
              },
            },
            { text: 'Done', style: 'cancel', onPress: reset },
          ]
        );
      } else {
        console.error('Food log failed - no success flag:', result);
        Alert.alert('Error', result.error || 'Failed to save food log.');
      }
    } catch (error: any) {
      console.error('Log error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to save food log.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setUnclearResult(null);
    setShowManualInput(false);
    setManualFood('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setIsEstimated(false);
  };

  // AI estimation from text description
  const estimateNutrition = async () => {
    if (!manualFood.trim()) {
      Alert.alert('Enter Food First', 'Please describe what you ate before estimating.');
      return;
    }

    setEstimating(true);
    try {
      const result = await foodAPI.estimateFromText(manualFood.trim(), selectedMealType);

      if (result.success && result.estimation) {
        const est = result.estimation;
        setManualCalories(est.calories?.toString() || '');
        setManualProtein(est.protein?.toString() || '');
        setManualCarbs(est.carbs?.toString() || '');
        setManualFat(est.fat?.toString() || '');
        setIsEstimated(true);
      } else {
        Alert.alert('Could Not Estimate', result.message || 'Try being more specific about what you ate.');
      }
    } catch (error: any) {
      console.error('Estimation error:', error);
      Alert.alert('Estimation Failed', 'Could not estimate nutrition. Please enter values manually.');
    } finally {
      setEstimating(false);
    }
  };

  const logManualFood = async () => {
    if (!manualFood.trim()) {
      Alert.alert('Missing Info', 'Please enter what you ate.');
      return;
    }

    let calories = parseInt(manualCalories) || 0;
    
    // If no calories entered, try to estimate first
    if (calories <= 0) {
      setEstimating(true);
      try {
        const result = await foodAPI.estimateFromText(manualFood.trim(), selectedMealType);
        if (result.success && result.estimation?.calories) {
          const est = result.estimation;
          calories = est.calories;
          setManualCalories(est.calories?.toString() || '');
          setManualProtein(est.protein?.toString() || '');
          setManualCarbs(est.carbs?.toString() || '');
          setManualFat(est.fat?.toString() || '');
          setIsEstimated(true);
          setEstimating(false);
          
          // Show confirmation with estimated values
          Alert.alert(
            'AI Estimated ≈',
            `Based on "${manualFood.trim()}":\n\n` +
            `≈ ${est.calories} calories\n` +
            `≈ ${est.protein}g protein\n` +
            `≈ ${est.carbs}g carbs\n` +
            `≈ ${est.fat}g fat\n\n` +
            `Log this meal?`,
            [
              { text: 'Edit First', style: 'cancel' },
              { text: 'Log It', onPress: () => saveFood(est.calories, est.protein, est.carbs, est.fat, true) },
            ]
          );
          return;
        } else {
          setEstimating(false);
          Alert.alert('Enter Calories', 'Could not estimate automatically. Please enter calories manually.');
          return;
        }
      } catch (error) {
        setEstimating(false);
        Alert.alert('Enter Calories', 'Please enter estimated calories.');
        return;
      }
    }

    await saveFood(calories, parseInt(manualProtein) || 0, parseInt(manualCarbs) || 0, parseInt(manualFat) || 0, isEstimated);
  };

  const saveFood = async (calories: number, protein: number, carbs: number, fat: number, estimated: boolean) => {
    setSaving(true);
    try {
      const result = await foodAPI.log({
        description: manualFood.trim(),
        calories,
        protein,
        carbs,
        fat,
        fiber: null,
        mealType: selectedMealType,
        portionSize: estimated ? '1 serving (AI estimated)' : '1 serving (manual entry)',
        confidence: estimated ? 0.8 : 1.0,
      });

      console.log('Manual food log response:', JSON.stringify(result, null, 2));

      if (result.success) {
        Alert.alert(
          'Logged! 🎉',
          `${estimated ? '≈ ' : ''}${calories} calories added to your food log.`,
          [
            {
              text: 'Log Another',
              onPress: reset,
            },
            { text: 'Done', style: 'cancel', onPress: reset },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save food log.');
      }
    } catch (error: any) {
      console.error('Log error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to save food log.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const mealTypes: { key: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'BREAKFAST', label: 'Breakfast', icon: 'sunny-outline' },
    { key: 'LUNCH', label: 'Lunch', icon: 'partly-sunny-outline' },
    { key: 'DINNER', label: 'Dinner', icon: 'moon-outline' },
    { key: 'SNACK', label: 'Snack', icon: 'cafe-outline' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Premium Initial Screen */}
        {!image && !showManualInput ? (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], gap: 16 }}>
            <View style={styles.cameraShell}>
              <LinearGradient
                colors={['#f4f8f2', '#eef4ef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cameraBackdrop}
              >
                <View style={styles.cameraFrame}>
                  {hasCameraPermission === false && (
                    <View style={styles.cameraPermission}>
                      <Ionicons name="lock-closed" size={22} color={colors.textLight} />
                      <Text style={styles.cameraPermissionTitle}>Camera access needed</Text>
                      <Text style={styles.cameraPermissionText}>
                        Allow camera to scan your meal directly.
                      </Text>
                      <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
                        <Text style={styles.permissionButtonText}>Allow camera</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {hasCameraPermission === null && (
                    <View style={styles.cameraPermission}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.cameraPermissionText}>Preparing camera…</Text>
                    </View>
                  )}

                  {hasCameraPermission === true && (
                    <>
                      <CameraView
                        ref={(ref) => (cameraRef.current = ref)}
                        style={styles.cameraPreview}
                        facing="back"
                        ratio="4:3"
                      />
                      <View style={[styles.frameCorner, styles.frameCornerTL]} />
                      <View style={[styles.frameCorner, styles.frameCornerTR]} />
                      <View style={[styles.frameCorner, styles.frameCornerBL]} />
                      <View style={[styles.frameCorner, styles.frameCornerBR]} />
                    </>
                  )}
                </View>
              </LinearGradient>
            </View>

            <View style={styles.bottomActionCard}>
              <Text style={styles.bottomActionTitle}>Add a meal</Text>
              <Text style={styles.bottomActionSubtitle}>Center the plate and snap, or choose another way to add</Text>

              <View style={styles.bottomButtonsRow}>
                <TouchableOpacity
                  style={styles.bottomButton}
                  onPress={() => pickImage(false)}
                  activeOpacity={0.9}
                >
                  <Ionicons name="images-outline" size={18} color={colors.primary} />
                  <Text style={styles.bottomButtonText}>Choose from gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bottomButton, styles.bottomButtonGhost]}
                  onPress={() => setShowManualInput(true)}
                  activeOpacity={0.9}
                >
                  <Ionicons name="create-outline" size={18} color={colors.text} />
                  <Text style={[styles.bottomButtonText, { color: colors.text }]}>Enter manually</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomInfoRow}>
                <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                <Text style={styles.bottomInfoText}>Your photos are analyzed securely and never stored.</Text>
              </View>
            </View>

            {hasCameraPermission === true && (
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={[styles.shutterButton, capturing && { opacity: 0.6 }]}
                  onPress={capturePhoto}
                  disabled={capturing}
                >
                  {capturing ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <View style={styles.shutterInner} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        ) : !image && showManualInput ? (
          /* Manual Entry Full Screen */
          <View style={styles.manualFullScreen}>
            <View style={styles.manualCard}>
              <View style={styles.manualHeader}>
                <Text style={styles.manualTitle}>Manual Entry</Text>
                <TouchableOpacity 
                  onPress={() => setShowManualInput(false)}
                  style={styles.closeButtonTouchable}
                >
                  <Ionicons name="close" size={28} color={colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>What did you eat?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 1 burrito with 4 corn balls"
                value={manualFood}
                onChangeText={(text) => {
                  setManualFood(text);
                  setIsEstimated(false);
                }}
                multiline
              />
              
              {/* AI Estimate Button */}
              <TouchableOpacity
                style={[styles.estimateButton, estimating && styles.estimateButtonDisabled]}
                onPress={estimateNutrition}
                disabled={estimating || !manualFood.trim()}
              >
                {estimating ? (
                  <>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={styles.estimateButtonText}>Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                    <Text style={styles.estimateButtonText}>
                      {isEstimated ? 'Re-estimate with AI' : 'Estimate with AI ✨'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {isEstimated && (
                <View style={styles.estimatedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.estimatedBadgeText}>AI Estimated (≈ approximate)</Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>
                {isEstimated ? '≈ Calories' : 'Estimated Calories'} {!isEstimated && '*'}
              </Text>
              <TextInput
                style={[styles.numberInput, isEstimated && styles.estimatedInput]}
                placeholder="e.g., 450"
                value={manualCalories}
                onChangeText={(text) => {
                  setManualCalories(text);
                  if (text !== manualCalories) setIsEstimated(false);
                }}
                keyboardType="number-pad"
              />
              
              <Text style={styles.inputLabel}>
                {isEstimated ? '≈ Macros' : 'Macros (optional)'}
              </Text>
              <View style={styles.macroInputs}>
                <View style={styles.macroInputGroup}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <TextInput
                    style={styles.macroInput}
                    placeholder="g"
                    value={manualProtein}
                    onChangeText={setManualProtein}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.macroInputGroup}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <TextInput
                    style={styles.macroInput}
                    placeholder="g"
                    value={manualCarbs}
                    onChangeText={setManualCarbs}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.macroInputGroup}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <TextInput
                    style={styles.macroInput}
                    placeholder="g"
                    value={manualFat}
                    onChangeText={setManualFat}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Meal Type in manual mode */}
              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Meal Type</Text>
              <View style={styles.mealTypes}>
                {mealTypes.map((meal) => (
                  <TouchableOpacity
                    key={meal.key}
                    style={[
                      styles.mealTypeButton,
                      selectedMealType === meal.key && styles.mealTypeButtonActive,
                    ]}
                    onPress={() => setSelectedMealType(meal.key)}
                  >
                    <Ionicons
                      name={meal.icon}
                      size={18}
                      color={selectedMealType === meal.key ? '#fff' : colors.text}
                    />
                    <Text
                      style={[
                        styles.mealTypeText,
                        selectedMealType === meal.key && styles.mealTypeTextActive,
                      ]}
                    >
                      {meal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={[styles.logButton, styles.manualLogButton, saving && styles.logButtonDisabled]}
                onPress={logManualFood}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.logButtonText}>Log Meal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Header when image is selected */}
            <View style={styles.header}>
              <Text style={styles.title}>Food Scanner</Text>
              <Text style={styles.subtitle}>
                Analyzing your meal
              </Text>
            </View>

            {/* Image Preview */}
            <View style={styles.previewContainer}>
              <Image source={{ uri: image! }} style={styles.preview} />
              <TouchableOpacity style={styles.clearButton} onPress={reset}>
                <Ionicons name="close-circle" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Meal Type Selector */}
        {image && !analysis && (
          <View style={styles.mealTypeContainer}>
            <Text style={styles.sectionLabel}>Meal Type</Text>
            <View style={styles.mealTypes}>
              {mealTypes.map((meal) => (
                <TouchableOpacity
                  key={meal.key}
                  style={[
                    styles.mealTypeButton,
                    selectedMealType === meal.key && styles.mealTypeButtonActive,
                  ]}
                  onPress={() => setSelectedMealType(meal.key)}
                >
                  <Ionicons
                    name={meal.icon}
                    size={20}
                    color={selectedMealType === meal.key ? '#fff' : colors.text}
                  />
                  <Text
                    style={[
                      styles.mealTypeText,
                      selectedMealType === meal.key && styles.mealTypeTextActive,
                    ]}
                  >
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Analyze Button */}
        {image && !analysis && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
              onPress={analyzeFood}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.analyzeButtonText}>Analyzing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={24} color="#fff" />
                  <Text style={styles.analyzeButtonText}>Analyze Food</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Unclear Image Message */}
        {unclearResult && !showManualInput && (
          <View style={styles.unclearContainer}>
            <View style={styles.unclearCard}>
              <Ionicons name="warning-outline" size={48} color={colors.warning} />
              <Text style={styles.unclearTitle}>Couldn't Identify Food</Text>
              <Text style={styles.unclearReason}>{unclearResult.reason}</Text>
              <View style={styles.suggestionBox}>
                <Ionicons name="bulb-outline" size={20} color={colors.info} />
                <Text style={styles.suggestionText}>{unclearResult.suggestion}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Retake Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.manualButton}
                onPress={() => setShowManualInput(true)}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={styles.manualButtonText}>Enter Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}


        {/* Analysis Results */}
        {analysis && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultCard}>
              <Text style={styles.foodDescription}>{analysis.description}</Text>
              
              {analysis.items.length > 0 && (
                <Text style={styles.foodItems}>
                  {analysis.items.join(' • ')}
                </Text>
              )}

              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{analysis.calories}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{analysis.protein}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{analysis.carbs}g</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{analysis.fat}g</Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>

              {analysis.healthNotes && (
                <View style={styles.healthNotes}>
                  <Ionicons name="information-circle" size={18} color={colors.info} />
                  <Text style={styles.healthNotesText}>{analysis.healthNotes}</Text>
                </View>
              )}

              <View style={styles.confidenceRow}>
                <Text style={styles.portionText}>
                  Portion: {analysis.portionSize}
                </Text>
                <Text style={styles.confidenceText}>
                  {Math.round(analysis.confidence * 100)}% confident
                </Text>
              </View>
            </View>

            {/* Log Button */}
            <TouchableOpacity
              style={[styles.logButton, saving && styles.logButtonDisabled]}
              onPress={logFood}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={24} color="#fff" />
                  <Text style={styles.logButtonText}>Log This Meal</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.retakeButton} onPress={reset}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.retakeButtonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  // Camera-first layout
  cameraShell: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cameraBackdrop: {
    padding: 12,
    borderRadius: 28,
  },
  cameraFrame: {
    height: 340,
    borderRadius: 24,
    backgroundColor: '#0f282205',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  frameCorner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 6,
  },
  frameCornerTL: {
    top: 16,
    left: 16,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  frameCornerTR: {
    top: 16,
    right: 16,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  frameCornerBL: {
    bottom: 16,
    left: 16,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  frameCornerBR: {
    bottom: 16,
    right: 16,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  cameraIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cameraSubtitle: {
    fontSize: 13,
    color: colors.textLight,
  },
  cameraControls: {
    paddingVertical: 22,
    marginTop: 12,
    alignItems: 'center',
  },
  shutterButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  shutterInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.primary,
  },
  cameraPermission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  cameraPermissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cameraPermissionText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bottomActionCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  bottomActionSubtitle: {
    fontSize: 13,
    color: colors.textLight,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bottomButtonGhost: {
    backgroundColor: '#fff',
    borderColor: colors.glassBorder,
  },
  bottomButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  bottomInfoText: {
    fontSize: 12,
    color: colors.textLight,
  },
  // Original styles (kept for when image is selected)
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 16,
  },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  mealTypeContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 12,
  },
  mealTypes: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  mealTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  mealTypeTextActive: {
    color: '#fff',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  foodDescription: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  foodItems: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  nutritionLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  healthNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: `${colors.info}10`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  healthNotesText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  portionText: {
    fontSize: 13,
    color: colors.textLight,
  },
  confidenceText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  logButtonDisabled: {
    opacity: 0.7,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  retakeButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  // Unclear result styles
  unclearContainer: {
    marginTop: 8,
  },
  unclearCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unclearTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  unclearReason: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${colors.info}15`,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    width: '100%',
  },
  manualButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Manual input styles
  manualFullScreen: {
    flex: 1,
  },
  manualInputContainer: {
    marginTop: 8,
  },
  closeButtonTouchable: {
    padding: 4,
  },
  manualCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  manualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 10,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 50,
  },
  numberInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  macroInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  macroInputGroup: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 6,
  },
  macroInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    textAlign: 'center',
  },
  manualLogButton: {
    marginTop: 24,
  },
  // AI Estimation styles
  estimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}10`,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderStyle: 'dashed',
  },
  estimateButtonDisabled: {
    opacity: 0.6,
  },
  estimateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  estimatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.success}15`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  estimatedBadgeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  estimatedInput: {
    backgroundColor: `${colors.success}08`,
    borderColor: `${colors.success}30`,
  },
});
