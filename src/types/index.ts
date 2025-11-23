// Shared types with backend

export type User = {
  id: string;
  email: string;
  name?: string;
  onboardingCompleted?: boolean;
};

export type HealthData = {
  date: string;
  energyScore: number | null;
  sleepHours: string | null;
  hydrationGlasses: number;
  moodScore: number | null;
  symptoms: string[];
  analyzedSymptoms?: AnalyzedSymptom[];
  notes: string | null;
};

export type AnalyzedSymptom = {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
};

export type WeeklyData = {
  weekData: DayData[];
  avgEnergy: number | null;
  bestDay: { day: string; energy: number } | null;
  worstDay: { day: string; energy: number } | null;
  patterns: Pattern[];
  dataPoints: number;
};

export type DayData = {
  date: string;
  dayName: string;
  energyScore: number | null;
  sleepHours: number | null;
  hydrationGlasses: number;
  symptoms: string[];
  analyzedSymptoms: AnalyzedSymptom[];
};

export type Pattern = {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
};

export type Condition = {
  id: string;
  name: string;
  category: 'CHRONIC' | 'ACUTE' | 'SYMPTOM' | 'DIAGNOSIS';
  notes?: string;
  diagnosedAt?: string;
  isActive: boolean;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export type ApiResponse<T> = {
  data: T;
  error?: string;
};

