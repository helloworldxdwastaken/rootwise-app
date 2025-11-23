# 🌿 Rootwise Mobile App

**Native iOS and Android app for Rootwise wellness tracking with AI assistance.**

Built with React Native (Expo) - connects to Rootwise backend API.

---

## 📱 **Features**

- 💬 **AI Chat** - Conversational wellness guidance (Groq AI)
- 📊 **Health Tracking** - Energy, sleep, hydration, symptoms
- 🤖 **Auto-Logging** - AI extracts health data from your messages
- 📈 **Weekly Patterns** - 7-day trends and insights
- 🍎 **Apple HealthKit** - Auto-import sleep, steps, vitals
- 🤖 **Google Fit** - Android health data integration
- 🎨 **Beautiful UI** - Glassmorphism design matching web app
- 🔔 **Push Notifications** - Reminders and insights
- 🔒 **Secure** - Same authentication as web app

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 20+
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### **Installation**

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS (requires Mac)
npm run ios

# Run on Android
npm run android
```

---

## 🔧 **Configuration**

### **Environment Setup**

Create `.env` file:

```bash
API_BASE_URL=https://your-rootwise-backend.vercel.app
```

### **Update API URL**

Edit `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Your local backend
  : 'https://your-deployed-backend.vercel.app/api';
```

---

## 📂 **Project Structure**

```
rootwise-mobile/
├── src/
│   ├── screens/              # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── OverviewScreen.tsx
│   │   └── ChatScreen.tsx
│   ├── components/           # Reusable components
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx
│   ├── services/             # API & health services
│   │   ├── api.ts           # Backend API client
│   │   └── healthData.ts    # HealthKit/Google Fit
│   ├── constants/
│   │   └── theme.ts         # Colors, spacing (from web app)
│   └── types/               # TypeScript types
├── assets/                  # Images, Lottie files
├── app.json                 # Expo configuration
├── eas.json                 # Build configuration
├── package.json
└── App.tsx                  # Entry point
```

---

## 🎨 **Design System**

**Colors match web app:**
- Primary: `#174D3A` (Deep green)
- Accent: `#F4C977` (Warm amber)
- Background: `#fdf8f3` (Cream)
- Success: `#34d399` (Emerald)

**Typography:**
- Same visual hierarchy as web
- Responsive sizing

---

## 🍎 **Apple HealthKit Integration**

### **Permissions Requested:**
- Steps
- Sleep analysis
- Height
- Weight
- Date of birth
- Biological sex
- Heart rate

### **Auto-Sync Features:**
- Sleep hours imported automatically each morning
- Steps tracked throughout the day
- Biological data pre-fills profile

### **Configuration:**

See `app.json` → `ios.infoPlist` for permission strings.

---

## 🤖 **Google Fit / Health Connect**

### **Permissions Requested:**
- Read steps
- Read sleep
- Read height
- Read weight

### **Auto-Sync:**
- Sleep data synced on app open
- Steps updated in real-time

### **Configuration:**

See `app.json` → `android.permissions`.

---

## 🔐 **Authentication**

Uses same backend as web app:
- API: `/api/auth/register`, `/api/auth/callback/credentials`
- Storage: AsyncStorage for session token
- Auto-logout on 401 responses

---

## 💬 **Chat System**

### **Quick Chat (Overview):**
- Endpoint: `POST /api/chat/quick`
- Stateless, fast responses
- Auto-logs health data from conversation

### **Features:**
- Real-time AI responses
- Message history (local state)
- Context-aware (knows your health data)
- Auto-scrolling
- Typing indicators

---

## 📊 **Health Tracking**

### **Manual Logging:**
- Tap [Log Energy] → Slider → Save
- Tap [Log Sleep] → Input hours → Save
- Tap [+1] on hydration → Increments

### **Auto-Logging:**
Chat: "I'm exhausted, energy is like a 3"
→ AI extracts energy: 3
→ Saves to database
→ Overview updates

### **Data Storage:**
- API: `/api/health/today`
- Syncs with web app
- Same database

---

## 🚀 **Building for Production**

### **EAS Build (Recommended)**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build Android APK
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### **GitHub Actions (Auto-Build)**

Pushes to `main` branch automatically trigger builds.

**Required secrets:**
- `EXPO_TOKEN` - Get from expo.dev

See `.github/workflows/build.yml`

---

## 🔔 **Push Notifications**

### **Setup:**

```typescript
import * as Notifications from 'expo-notifications';

// Request permissions
await Notifications.requestPermissionsAsync();

// Get push token
const token = await Notifications.getExpoPushTokenAsync();

// Send to backend
await api.post('/user/push-token', { token });
```

### **Use Cases:**
- "Time to log your energy!"
- "Don't forget to hydrate"
- "AI detected a pattern - check it out"
- "Your weekly summary is ready"

---

## 📈 **Analytics & Monitoring**

### **Crash Reporting:**
```bash
npm install sentry-expo
```

### **Analytics:**
```bash
npm install expo-analytics
```

---

## 🧪 **Testing**

### **Run on Devices:**

```bash
# iOS (requires Mac + Xcode)
npx expo run:ios

# Android
npx expo run:android

# Both via Expo Go (development)
npx expo start
# Scan QR code with Expo Go app
```

### **Test Health Data:**
- iOS: Use Health app to add test sleep/steps
- Android: Use Google Fit to add test data
- App should sync automatically

---

## 🔗 **Backend Connection**

**This app connects to your existing Rootwise backend:**

### **Endpoints Used:**
- `POST /api/auth/register`
- `POST /api/auth/callback/credentials`
- `GET /api/me/profile`
- `POST /api/health/today`
- `GET /api/health/weekly`
- `POST /api/health/analyze-symptoms`
- `POST /api/chat/quick`
- `POST /api/onboarding/chat`

**No changes needed to backend!** Mobile app works with existing APIs.

---

## 🎯 **Key Differences from Web App**

| Feature | Web | Mobile |
|---------|-----|--------|
| **Chat Layout** | Split-screen | Full screen |
| **Health Data** | Manual only | Auto-import from device |
| **Pricing** | Inline | Redirects to web (avoid Apple fees) |
| **Notifications** | None | Push notifications |
| **Offline** | No | Yes (with sync) |
| **Installation** | Browser | App Store / Play Store |

---

## 📦 **Dependencies**

### **Core:**
- `expo` - Framework
- `react-native` - Native components
- `expo-router` - Navigation

### **UI:**
- `lottie-react-native` - Animations
- `expo-linear-gradient` - Gradients
- `react-native-svg` - Icons

### **Health:**
- `expo-apple-health` - iOS HealthKit
- `expo-health-connect` - Android Health Connect

### **Backend:**
- `axios` - API requests
- `@react-native-async-storage/async-storage` - Local storage

---

## 🐛 **Troubleshooting**

### **Health Data Not Syncing (iOS):**
1. Check Health app permissions: Settings → Health → Data Access
2. Ensure Rootwise has Read access
3. Add test data in Health app
4. Restart app

### **Health Data Not Syncing (Android):**
1. Install Google Fit or Samsung Health
2. Grant permissions in app settings
3. Add test data
4. Restart app

### **API Connection Failed:**
1. Check `API_BASE_URL` in `src/services/api.ts`
2. Ensure backend is deployed and running
3. Check network connection
4. Verify CORS settings on backend

### **Build Failed:**
1. Clear cache: `npx expo start -c`
2. Delete node_modules: `rm -rf node_modules && npm install`
3. Update Expo: `npx expo install expo@latest`

---

## 📱 **App Store Submission**

### **iOS (App Store):**

**Required:**
- Apple Developer account ($99/year)
- Privacy policy URL
- Support URL
- App screenshots

**Steps:**
1. `eas build --platform ios --profile production`
2. `eas submit --platform ios`
3. Fill App Store Connect details
4. Submit for review

### **Android (Play Store):**

**Required:**
- Google Play Developer account ($25 one-time)
- Privacy policy
- Screenshots

**Steps:**
1. `eas build --platform android --profile production`
2. `eas submit --platform android`
3. Fill Play Console details
4. Submit for review

---

## 🔄 **Syncing with Web App**

**Data is shared:**
- ✅ User account
- ✅ Health tracking (same database)
- ✅ AI chat context
- ✅ Conditions & memories
- ✅ Profile data

**Changes on mobile → visible on web**
**Changes on web → visible on mobile**

---

## 🎉 **Getting Started Checklist**

- [ ] `npm install`
- [ ] Update `API_BASE_URL` in `src/services/api.ts`
- [ ] `npx expo start`
- [ ] Test on iOS simulator / Android emulator
- [ ] Test auth (login/register)
- [ ] Test health logging
- [ ] Test AI chat
- [ ] Test health data sync
- [ ] Configure EAS build
- [ ] Setup GitHub secrets
- [ ] Test production build

---

## 📚 **For Complete Backend Documentation**

See the main web app: `/rootwise/COMPLETE_SYSTEM_GUIDE.md`

---

**Built with care for your wellness journey** 🌿

