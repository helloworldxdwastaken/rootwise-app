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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../constants/theme';
import api from '../services/api';

const { width } = Dimensions.get('window');

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
  const floatAnim = useRef(new Animated.Value(0)).current;
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

  // Floating animation for hero icon
  useEffect(() => {
    if (!image) {
      const float = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -8,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      float.start();
      return () => float.stop();
    }
  }, [image]);

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Premium Initial Screen */}
        {!image ? (
          <Animated.View style={[styles.heroContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Animated.View style={[styles.heroIconContainer, { transform: [{ translateY: floatAnim }] }]}>
                <LinearGradient
                  colors={[colors.primary, '#1a5c45', colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroIconGradient}
                >
                  <Ionicons name="restaurant" size={56} color="#fff" />
                </LinearGradient>
                <View style={styles.sparkle1}>
                  <Ionicons name="sparkles" size={20} color={colors.accent} />
                </View>
                <View style={styles.sparkle2}>
                  <Ionicons name="sparkles" size={16} color={colors.primaryLight} />
                </View>
              </Animated.View>
              
              <Text style={styles.heroTitle}>AI Food Scanner</Text>
              <Text style={styles.heroSubtitle}>
                Snap a photo and let AI analyze your meal's nutrition instantly
              </Text>

              {/* Feature Pills */}
              <View style={styles.featurePills}>
                <View style={styles.featurePill}>
                  <Ionicons name="flash" size={14} color={colors.accent} />
                  <Text style={styles.featurePillText}>Instant</Text>
                </View>
                <View style={styles.featurePill}>
                  <Ionicons name="analytics" size={14} color={colors.primary} />
                  <Text style={styles.featurePillText}>Accurate</Text>
                </View>
                <View style={styles.featurePill}>
                  <Ionicons name="leaf" size={14} color={colors.primaryLight} />
                  <Text style={styles.featurePillText}>Smart</Text>
                </View>
              </View>
            </View>

            {/* Action Cards */}
            <View style={styles.actionCardsContainer}>
              {/* Camera Card - Primary */}
              <TouchableOpacity
                style={styles.primaryActionCard}
                onPress={() => pickImage(true)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.primary, '#1a5c45']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryCardGradient}
                >
                  <View style={styles.primaryCardContent}>
                    <View style={styles.primaryIconWrapper}>
                      <Ionicons name="camera" size={32} color="#fff" />
                    </View>
                    <View style={styles.primaryCardText}>
                      <Text style={styles.primaryCardTitle}>Take Photo</Text>
                      <Text style={styles.primaryCardSubtitle}>Use camera to scan food</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.8)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Gallery Card - Secondary */}
              <TouchableOpacity
                style={styles.secondaryActionCard}
                onPress={() => pickImage(false)}
                activeOpacity={0.9}
              >
                <View style={styles.secondaryCardContent}>
                  <View style={styles.secondaryIconWrapper}>
                    <Ionicons name="images" size={28} color={colors.primary} />
                  </View>
                  <View style={styles.secondaryCardText}>
                    <Text style={styles.secondaryCardTitle}>Choose from Gallery</Text>
                    <Text style={styles.secondaryCardSubtitle}>Select existing photo</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
                </View>
              </TouchableOpacity>

              {/* Manual Entry Option */}
              <TouchableOpacity
                style={styles.manualEntryCard}
                onPress={() => setShowManualInput(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={20} color={colors.textLight} />
                <Text style={styles.manualEntryText}>Or enter manually</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Info */}
            <View style={styles.bottomInfo}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.bottomInfoText}>Your photos are analyzed securely and never stored</Text>
            </View>
          </Animated.View>
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
              <Image source={{ uri: image }} style={styles.preview} />
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
    flexGrow: 1,
  },
  // Premium Hero Styles
  heroContainer: {
    flex: 1,
    minHeight: 600,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
  },
  heroIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  heroIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  sparkle1: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 8,
    left: -12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featurePills: {
    flexDirection: 'row',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featurePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  actionCardsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  primaryActionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryCardGradient: {
    padding: 20,
  },
  primaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  primaryCardText: {
    flex: 1,
  },
  primaryCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  secondaryActionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  secondaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  secondaryIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  secondaryCardText: {
    flex: 1,
  },
  secondaryCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  secondaryCardSubtitle: {
    fontSize: 13,
    color: colors.textLight,
  },
  manualEntryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
  },
  manualEntryText: {
    fontSize: 15,
    color: colors.textLight,
    fontWeight: '500',
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
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
});

