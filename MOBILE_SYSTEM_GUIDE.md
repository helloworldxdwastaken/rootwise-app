# 📱 Rootwise Mobile - Complete System Guide

**React Native app for iOS and Android**

**Last Updated:** November 23, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready to Build

---

## 📋 **Overview**

Rootwise Mobile is a native iOS and Android app built with **React Native (Expo)** that connects to the Rootwise backend API.

**Key Features:**
- 💬 AI wellness chat (Groq AI)
- 📊 Real-time health tracking
- 🍎 Apple HealthKit integration
- 🤖 Google Fit integration
- 🎨 Matches web app design
- 🔔 Push notifications
- 📈 Weekly patterns & insights

---

## 🏗️ **Architecture**

### **Tech Stack:**
- React Native 0.76.5
- Expo SDK 52
- TypeScript 5.3
- Axios (API client)
- Lottie (animations)
- AsyncStorage (local data)

### **Backend Integration:**
- Connects to existing Rootwise API
- No backend changes needed
- Shares same database
- Same authentication

### **Native Modules:**
- `expo-apple-health` - iOS HealthKit
- `expo-health-connect` - Android Health Connect
- `expo-notifications` - Push notifications
- `expo-linear-gradient` - UI gradients

---

## 📂 **File Structure Explained**

```
rootwise-mobile/
├── App.tsx                      # Entry point with navigation
├── app.json                     # Expo configuration
├── eas.json                     # Build profiles
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
│
├── src/
│   ├── screens/                 # 4 main screens
│   │   ├── LoginScreen.tsx      # Email/password login
│   │   ├── RegisterScreen.tsx   # Account creation
│   │   ├── OverviewScreen.tsx   # Main dashboard
│   │   └── ChatScreen.tsx       # Full-screen AI chat
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth state management
│   │
│   ├── services/
│   │   ├── api.ts               # Backend API client (18 endpoints)
│   │   └── healthData.ts        # HealthKit/Google Fit integration
│   │
│   ├── constants/
│   │   └── theme.ts             # Design system (colors, spacing)
│   │
│   └── types/                   # TypeScript definitions
│
├── assets/                      # Images & Lottie files
│   ├── icon.png                # App icon (1024x1024)
│   ├── splash.png              # Splash screen
│   ├── adaptive-icon.png       # Android adaptive icon
│   └── lottie/                 # Copy from web app
│       ├── mindfull_chill.json
│       ├── tired_low.json
│       └── productive.json
│
└── .github/
    └── workflows/
        └── build.yml            # Auto-build on push
```

---

## 🎨 **Design System**

### **Colors (From Web App):**
```typescript
{
  primary: '#174D3A',       // Deep green
  primaryLight: '#A6C7A3',  // Light green  
  accent: '#F4C977',        // Warm amber
  background: '#fdf8f3',    // Cream
  success: '#34d399',       // Emerald
  error: '#f87171',         // Red
  warning: '#fbbf24',       // Amber
}
```

### **Spacing:**
```typescript
{
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
}
```

### **Border Radius:**
```typescript
{
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999
}
```

**These match the web app exactly for brand consistency.**

---

## 📱 **Screen Breakdown**

### **1. LoginScreen**
```
┌─────────────────────┐
│      🌿 Logo        │
│                     │
│  Welcome back       │
│                     │
│  [Email input]      │
│  [Password input]   │
│                     │
│  [Sign in button]   │
│                     │
│  ─── or ───         │
│                     │
│  [Create account]   │
│                     │
│  Disclaimer text    │
└─────────────────────┘
```

**Features:**
- Glassmorphic card design
- Decorative gradient circles
- Error messages
- Loading states
- Auto-focus on email
- Keyboard-aware scrolling

### **2. RegisterScreen**
```
┌─────────────────────┐
│      🌿 Logo        │
│                     │
│  Create account     │
│                     │
│  [Name input]       │
│  [Email input]      │
│  [Password input]   │
│  [Confirm password] │
│                     │
│  [Create button]    │
│                     │
│  ─── or ───         │
│                     │
│  [Sign in instead]  │
│                     │
│  Important banner   │
└─────────────────────┘
```

**Features:**
- All fields validated
- Password match check
- Min 6 characters
- Auto-login after register
- Medical disclaimer

### **3. OverviewScreen** (Main Dashboard)
```
┌─────────────────────┐
│  GOOD MORNING,      │
│  ENMANUEL           │
│  [Sign out]         │
│                     │
│  ┌───────────────┐  │
│  │ ENERGY        │  │
│  │ 😄 7/10       │  │
│  │ [Update]      │  │
│  └───────────────┘  │
│                     │
│  ┌──────┐ ┌──────┐  │
│  │ 🌙   │ │ 💧   │  │
│  │ Sleep│ │Water │  │
│  │ 5hr  │ │ 2/6  │  │
│  │[Log] │ │ [+1] │  │
│  └──────┘ └──────┘  │
│                     │
│  ┌───────────────┐  │
│  │ AI INSIGHTS   │  │
│  │ 🔴 Fatigue    │  │
│  │ 🟡 Dehydrate  │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ 💬 Chat AI    │  │
│  │ Get insights  │  │
│  └───────────────┘  │
│                     │
│  [Upgrade to Plus] │
└─────────────────────┘
```

**Features:**
- Pull-to-refresh
- Real-time data from database
- Quick log buttons
- Energy bar with emoji
- Symptom cards with reasoning
- Chat CTA button
- Pricing redirect (to web)

### **4. ChatScreen**
```
┌─────────────────────┐
│ ← Wellness Asst     │
├─────────────────────┤
│                     │
│  R  Hi! How are you │
│     today?          │
│     11:37 AM        │
│                     │
│          I'm tired  │
│          11:38 AM   │
│                  You│
│                     │
│  R  I understand... │
│     Let me help     │
│     11:38 AM        │
│                     │
├─────────────────────┤
│ [Type message...][→]│
└─────────────────────┘
```

**Features:**
- Auto-scrolling to latest
- AI avatar (gradient circle)
- User avatar
- Timestamps
- Loading indicator
- Message bubbles (different colors)
- Context-aware AI
- Auto-logs health data from messages

---

## 🔌 **API Integration**

### **Authentication Flow:**
```typescript
// 1. Register
POST /api/auth/register
Body: { email, password, name }
  ↓
// 2. Auto-login
POST /api/auth/callback/credentials
Body: { email, password }
  ↓
Response: { token, user }
  ↓
// 3. Store token
AsyncStorage.setItem('session_token', token)
  ↓
// 4. Navigate to Overview
```

### **Health Tracking Flow:**
```typescript
// Load data
GET /api/health/today
  ↓
Display in UI
  ↓
// User logs energy
POST /api/health/today { energyScore: 7 }
  ↓
// Auto-analyze
POST /api/health/analyze-symptoms
  ↓
// Update UI
GET /api/health/today (with analyzed symptoms)
```

### **AI Chat Flow:**
```typescript
// User sends message
const message = "I'm tired today"
  ↓
POST /api/chat/quick
Body: {
  message,
  context: {
    energyScore: 7,
    sleepHours: "5hr",
    hydrationGlasses: 2
  }
}
  ↓
AI analyzes and responds
  ↓
AI extracts: energy, symptoms
  ↓
Auto-saves to database
  ↓
Response with dataExtracted flag
  ↓
App refreshes health data
```

---

## 🍎 **Apple HealthKit Integration**

### **Setup:**

**1. Request Permissions (First Launch):**
```typescript
import { initializeHealthData } from './src/services/healthData';

// On app launch
await initializeHealthData();
// Shows iOS permission dialog
```

**2. Sync Data:**
```typescript
import { syncHealthData } from './src/services/healthData';

// On Overview screen mount
const healthData = await syncHealthData();
// Auto-imports: sleep, steps
```

### **Data Imported:**

| HealthKit Data | Rootwise Field | Frequency |
|----------------|----------------|-----------|
| Sleep Analysis | sleepHours | Daily (last night) |
| Steps | steps (future) | Real-time |
| Height | heightCm | One-time (profile) |
| Weight | weightKg | One-time (profile) |
| Date of Birth | dateOfBirth | One-time (profile) |
| Biological Sex | sex | One-time (profile) |

### **Privacy:**
- User controls permissions in iOS Settings → Health → Data Access
- App only reads, never writes health data
- Data stays on device unless user explicitly logs it

### **Implementation:**

**File:** `src/services/healthData.ts`

```typescript
// Request permissions
await AppleHealthKit.requestPermissions(['SLEEP_ANALYSIS', 'STEPS', ...]);

// Fetch sleep
const sleepData = await AppleHealthKit.getSleepSamples({
  startDate: yesterday,
  endDate: today,
});

// Calculate total hours
const hours = calculateSleepHours(sleepData);

// Auto-log to Rootwise
await healthAPI.logMetric({ sleepHours: hours });
```

---

## 🤖 **Android Health Connect**

### **Setup:**

**1. Ensure Health Connect Installed:**
- App checks if Google Fit or Samsung Health installed
- Prompts user to install if missing

**2. Request Permissions:**
```typescript
await HealthConnect.requestPermissions([
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Height' },
  { accessType: 'read', recordType: 'Weight' },
]);
```

**3. Sync:**
```typescript
const data = await getHealthConnectData();
// Returns: sleepHours, steps
```

### **Data Sources:**
- Google Fit
- Samsung Health
- Fitbit (if synced to Health Connect)
- Any app using Health Connect API

---

## 🔔 **Push Notifications (Future)**

### **Planned Features:**

**Daily Reminders:**
- "Good morning! Log your energy"
- "Time to hydrate 💧"
- "Evening check-in"

**AI Insights:**
- "Pattern detected: You sleep better on weekends"
- "Your energy is trending up this week!"
- "Reminder: Low water intake yesterday"

**Implementation:**
```typescript
import * as Notifications from 'expo-notifications';

// Schedule daily reminder
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Morning Check-in",
    body: "How's your energy today?",
  },
  trigger: {
    hour: 9,
    minute: 0,
    repeats: true,
  },
});
```

---

## 🚀 **Building & Deployment**

### **Development:**

```bash
# Start Expo dev server
npx expo start

# Run on simulator/emulator
npm run ios      # iOS (Mac only)
npm run android  # Android

# Run on physical device
# Scan QR code with Expo Go app
```

### **Production Builds:**

**Option 1: EAS Build (Recommended)**

```bash
# Setup EAS
npm install -g eas-cli
eas login
eas build:configure

# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**Option 2: GitHub Actions (Auto)**

```bash
# Push to GitHub
git add .
git commit -m "Initial mobile app"
git push origin main

# GitHub Actions automatically:
# 1. Builds Android APK
# 2. Builds iOS IPA
# 3. Uploads artifacts
```

**Required GitHub Secrets:**
- `EXPO_TOKEN` - Get from expo.dev account settings

### **Build Profiles (eas.json):**

**Development:**
- Development client
- Internal distribution
- Fast iteration

**Preview:**
- APK for Android (no Play Store)
- Ad-hoc for iOS (TestFlight)
- For testing

**Production:**
- App Bundle for Android (Play Store)
- IPA for iOS (App Store)
- Optimized builds

---

## 🔐 **Security**

### **Authentication:**
- Same JWT tokens as web app
- Stored in AsyncStorage (secure on device)
- Auto-logout on 401
- Session timeout handled

### **Data Protection:**
- All API calls over HTTPS
- No sensitive data cached
- Health data encrypted on device
- Backend validates all requests

### **Permissions:**
- Health data: Read-only
- Notifications: Optional
- Camera: Not used
- Location: Not used

---

## 🎯 **User Flows**

### **First-Time User:**
```
1. Opens app
2. Sees Login screen
3. Taps "Create account"
4. Fills registration form
5. Auto-logged in
6. (Future: AI onboarding - not yet in mobile)
7. Lands on Overview screen
8. Prompted for HealthKit/Health Connect permissions
9. Sleep auto-imports
10. Can log energy, chat with AI
```

### **Returning User:**
```
1. Opens app
2. Auto-logged in (token in storage)
3. Overview screen loads
4. Health data syncs from device
5. Sleep automatically updated
6. Can view patterns, chat with AI
```

### **Daily Check-in:**
```
1. Morning: Open app
2. Sleep auto-imported from device
3. Log energy (slider or chat)
4. AI analyzes → shows symptoms
5. Chat for personalized advice
6. Throughout day: +1 water as you drink
7. Evening: Review patterns
```

---

## 🔄 **Data Synchronization**

### **What Syncs:**

**Mobile → Backend → Web:**
- ✅ Energy logs
- ✅ Sleep logs (manual or auto)
- ✅ Hydration tracking
- ✅ Chat messages (if using full chat API)
- ✅ Profile updates

**Device Health → Mobile → Backend:**
- ✅ Sleep hours (auto-imported)
- ✅ Steps (displayed, not sent yet)
- ✅ Biological data (profile pre-fill)

**Backend → Mobile:**
- ✅ User profile
- ✅ Medical conditions
- ✅ AI memories
- ✅ Weekly patterns

### **Offline Support (Future):**

```typescript
// Queue actions when offline
const offlineQueue = [];

if (!isOnline) {
  offlineQueue.push({ type: 'logEnergy', value: 7 });
}

// Sync when online
when (isOnline) {
  for (const action of offlineQueue) {
    await api.post(...);
  }
}
```

---

## 💡 **Key Decisions & Rationale**

### **Why Expo?**
- ✅ Faster development
- ✅ Easy builds (EAS)
- ✅ Good health integrations
- ✅ OTA updates
- ✅ Can eject if needed

### **Why not save pricing in app?**
- ❌ Apple takes 30% cut
- ✅ Redirect to web for purchases
- ✅ Avoid App Store payment rules
- ✅ Keep full revenue

### **Why full-screen chat instead of split?**
- ✅ Mobile screens too small for split
- ✅ Better UX on mobile
- ✅ Easy to navigate back
- ✅ Full keyboard space

### **Why AsyncStorage for tokens?**
- ✅ Secure on device
- ✅ Persists between app launches
- ✅ Standard practice
- ✅ Fast access

### **Why auto-import sleep?**
- ✅ Reduces user effort
- ✅ More accurate (from device sensors)
- ✅ Users already track in Health apps
- ✅ Key insight for wellness

---

## 🧪 **Testing Checklist**

### **Authentication:**
- [ ] Register new account
- [ ] Login with credentials
- [ ] Logout
- [ ] Invalid credentials show error
- [ ] Token persists between app restarts

### **Health Tracking:**
- [ ] Log energy manually
- [ ] Sleep auto-imports from HealthKit/Health Connect
- [ ] Water increments with +1 button
- [ ] Data saves to backend
- [ ] Overview refreshes after logging

### **AI Chat:**
- [ ] Send message, receive response
- [ ] AI remembers user's name
- [ ] AI references health data
- [ ] Typing indicator shows
- [ ] Message history preserved in session
- [ ] Auto-logging: "energy is 3" → saves energy: 3

### **AI Symptom Analysis:**
- [ ] Low energy + poor sleep = Fatigue detected
- [ ] Low water = Dehydration Risk
- [ ] Confidence levels shown
- [ ] Reasoning displayed

### **Health Data Sync:**
- [ ] iOS: Add sleep in Health app → syncs to Rootwise
- [ ] Android: Add sleep in Google Fit → syncs
- [ ] Steps displayed
- [ ] Biological data pre-fills profile

### **UI/UX:**
- [ ] Glassmorphism effects render correctly
- [ ] Gradients display properly
- [ ] Colors match web app
- [ ] Scrolling smooth
- [ ] Keyboard doesn't cover inputs
- [ ] Pull-to-refresh works

---

## 📊 **Performance**

### **Bundle Size:**
- Android APK: ~50-60 MB
- iOS IPA: ~45-55 MB

### **Load Times:**
- Cold start: < 3 seconds
- Overview load: < 1 second
- Chat response: 1-2 seconds
- Health sync: < 500ms

### **Optimization:**
- Lazy loading for Lottie
- Image optimization
- API request caching
- Minimal re-renders

---

## 🐛 **Common Issues & Solutions**

### **Issue: Can't connect to backend**
```
Error: Network request failed
```
**Solution:**
1. Update `API_BASE_URL` in `src/services/api.ts`
2. For iOS simulator: use computer's IP (not localhost)
3. For Android emulator: use `10.0.2.2:3000`
4. Ensure backend is running

### **Issue: HealthKit not syncing (iOS)**
```
HealthKit data not appearing
```
**Solution:**
1. Check permissions in Settings → Health → Data Access
2. Grant Read permissions to Rootwise
3. Add test data in Health app (Sleep, Steps)
4. Restart app

### **Issue: Health Connect not working (Android)**
```
Health Connect API error
```
**Solution:**
1. Install Google Fit or Samsung Health from Play Store
2. Grant permissions in app
3. Add test data
4. Ensure Android 14+ for Health Connect API

### **Issue: Build failed**
```
EAS Build failed
```
**Solution:**
1. Check `eas.json` configuration
2. Ensure Expo account is logged in
3. Check build logs on expo.dev
4. Verify all dependencies compatible

---

## 🎓 **Developer Onboarding**

### **Day 1: Setup**
- [ ] Clone repo
- [ ] Run `npm install`
- [ ] Start `npx expo start`
- [ ] Test on simulator/emulator
- [ ] Create test account
- [ ] Explore UI

### **Day 2: Code Review**
- [ ] Read this guide
- [ ] Review `src/services/api.ts` (backend integration)
- [ ] Review `src/services/healthData.ts` (native modules)
- [ ] Understand auth flow
- [ ] Test API endpoints with Postman

### **Day 3: Features**
- [ ] Test health logging
- [ ] Test AI chat
- [ ] Test health data sync
- [ ] Review symptom analysis
- [ ] Test weekly patterns

### **Day 4: Build**
- [ ] Configure EAS
- [ ] Test build locally
- [ ] Review GitHub Actions
- [ ] Understand deployment flow

---

## 📝 **Deployment Checklist**

### **Before First Deploy:**

**App Store (iOS):**
- [ ] Apple Developer account ($99/year)
- [ ] Bundle identifier: `com.rootwise.app`
- [ ] App Store Connect app created
- [ ] Privacy policy URL ready
- [ ] Support URL ready
- [ ] Screenshots (6.5", 5.5" displays)
- [ ] App icon (1024x1024)

**Play Store (Android):**
- [ ] Google Play Developer account ($25 one-time)
- [ ] Package name: `com.rootwise.app`
- [ ] Play Console app created
- [ ] Privacy policy posted
- [ ] Screenshots (phone, tablet)
- [ ] Feature graphic (1024x500)

**Backend:**
- [ ] Production API URL set
- [ ] CORS configured for mobile app
- [ ] Rate limiting configured
- [ ] Monitoring enabled

**Testing:**
- [ ] TestFlight beta (iOS)
- [ ] Internal testing track (Android)
- [ ] Get feedback
- [ ] Fix bugs
- [ ] Submit for review

---

## 🔗 **Related Documentation**

- **Backend:** `/rootwise/COMPLETE_SYSTEM_GUIDE.md`
- **Web App:** See main Rootwise repo
- **Expo Docs:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/

---

## ✅ **Final Checklist**

**Before Push to GitHub:**
- [x] All files created
- [x] Dependencies listed
- [x] Configuration files ready
- [x] GitHub Actions configured
- [x] Documentation complete
- [ ] Update API_BASE_URL with your backend URL
- [ ] Add app icon to assets/
- [ ] Add splash screen to assets/
- [ ] Copy Lottie files from web app to assets/lottie/
- [ ] Test on at least one device
- [ ] Commit and push

**After Push:**
- [ ] GitHub Actions will attempt build
- [ ] Add `EXPO_TOKEN` to repository secrets
- [ ] Monitor build status
- [ ] Download artifacts
- [ ] Test builds on devices

---

**Built with care for your wellness journey** 🌿

**Ready to install and run with `npm install && npx expo start`**

