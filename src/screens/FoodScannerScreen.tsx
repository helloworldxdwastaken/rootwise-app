import React, { useState, useRef } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../constants/theme';
import api from '../services/api';

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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for analyze button
  React.useEffect(() => {
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

      const result = await api.post('/food/analyze', {
        imageBase64,
        mealType: selectedMealType,
      });

      if (result.data.success) {
        setAnalysis(result.data.analysis);
        setUnclearResult(null);
      } else if (result.data.unclear) {
        // Image was unclear - show message and options
        setUnclearResult({
          reason: result.data.reason,
          suggestion: result.data.suggestion,
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
      const result = await api.post('/food/log', {
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

      if (result.data.success) {
        Alert.alert(
          'Logged! 🎉',
          `${analysis.calories} calories added to your food log.`,
          [
            {
              text: 'Scan Another',
              onPress: () => {
                setImage(null);
                setAnalysis(null);
              },
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Log error:', error);
      Alert.alert('Error', 'Failed to save food log.');
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
  };

  const logManualFood = async () => {
    if (!manualFood.trim()) {
      Alert.alert('Missing Info', 'Please enter what you ate.');
      return;
    }

    const calories = parseInt(manualCalories) || 0;
    if (calories <= 0) {
      Alert.alert('Missing Info', 'Please enter estimated calories.');
      return;
    }

    setSaving(true);
    try {
      const result = await api.post('/food/log', {
        description: manualFood.trim(),
        calories,
        protein: parseInt(manualProtein) || 0,
        carbs: parseInt(manualCarbs) || 0,
        fat: parseInt(manualFat) || 0,
        fiber: null,
        mealType: selectedMealType,
        portionSize: '1 serving (manual entry)',
        confidence: 1.0, // User entered it manually
      });

      if (result.data.success) {
        Alert.alert(
          'Logged! 🎉',
          `${calories} calories added to your food log.`,
          [
            {
              text: 'Log Another',
              onPress: reset,
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Log error:', error);
      Alert.alert('Error', 'Failed to save food log.');
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Food Scanner</Text>
          <Text style={styles.subtitle}>
            Take a photo of your meal to estimate calories
          </Text>
        </View>

        {/* Image Preview or Camera Buttons */}
        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} />
            <TouchableOpacity style={styles.clearButton} onPress={reset}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraButtons}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => pickImage(true)}
            >
              <View style={styles.cameraIconWrapper}>
                <Ionicons name="camera" size={48} color={colors.primary} />
              </View>
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => pickImage(false)}
            >
              <View style={styles.cameraIconWrapper}>
                <Ionicons name="images" size={48} color={colors.primary} />
              </View>
              <Text style={styles.cameraButtonText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>
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

        {/* Manual Input Form */}
        {showManualInput && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.manualInputContainer}
          >
            <View style={styles.manualCard}>
              <View style={styles.manualHeader}>
                <Text style={styles.manualTitle}>Manual Entry</Text>
                <TouchableOpacity onPress={() => setShowManualInput(false)}>
                  <Ionicons name="close" size={24} color={colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>What did you eat?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Chicken salad with rice"
                value={manualFood}
                onChangeText={setManualFood}
                multiline
              />
              
              <Text style={styles.inputLabel}>Estimated Calories *</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="e.g., 450"
                value={manualCalories}
                onChangeText={setManualCalories}
                keyboardType="number-pad"
              />
              
              <Text style={styles.inputLabel}>Macros (optional)</Text>
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
              <Text style={styles.inputLabel}>Meal Type</Text>
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
                style={[styles.logButton, saving && styles.logButtonDisabled]}
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
          </KeyboardAvoidingView>
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
  },
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
  cameraButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.glassBorder,
    borderStyle: 'dashed',
  },
  cameraIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.success,
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
  manualInputContainer: {
    marginTop: 8,
  },
  manualCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
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
    marginBottom: 8,
    marginTop: 12,
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
});

