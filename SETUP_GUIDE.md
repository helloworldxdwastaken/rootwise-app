# 📱 Rootwise Mobile App - Setup Guide

**Complete setup and configuration guide for the React Native mobile application**

---

## ✅ What's Already Implemented

### Features Complete
- ✅ **Login & Register** - Full authentication with backend
- ✅ **Overview Page** - Health tracking dashboard
- ✅ **Chat Page** - AI-powered wellness assistant
- ✅ **Settings Page** - Account, health profile, clinic history (read-only), device sync
- ✅ **Tab Navigation** - Bottom tabs (Overview, Chat, Settings)
- ✅ **Backend Integration** - All API endpoints connected
- ✅ **Apple Health Integration UI** - Toggle and status display
- ✅ **Google Fit UI** - Coming soon placeholder
- ✅ **Clinic History** - Non-editable display of medical conditions
- ✅ **Modern UI** - Beautiful glassmorphism design

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd "rootwise app"
npm install
```

### 2. Configure Backend URL

Open `src/services/api.ts` and update the API URL:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // For local testing
  : 'https://rootwise.vercel.app/api';  // Production URL
```

**✅ Already configured to connect to `rootwise.vercel.app`**

### 3. Start the App

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Expo Go (recommended for testing)
npm start
```

---

## 🌐 Backend Connection

### Your Backend Options

1. **Localhost** (Development)
   - Make sure your Rootwise web backend is running: `cd rootwise && npm run dev`
   - Use `http://localhost:3000/api` on iOS Simulator
   - Use `http://10.0.2.2:3000/api` on Android Emulator

2. **Vercel** (Production) ✅
   - Backend deployed at: `https://rootwise.vercel.app`
   - API URL configured: `https://rootwise.vercel.app/api`
   - Ready to use in production builds!

### Testing Backend Connection

1. Start the app
2. Try to register a new account
3. If successful, you'll see the Overview page
4. If it fails, check:
   - Backend is running
   - API URL is correct
   - CORS is configured on backend

---

## 📱 App Structure

```
rootwise app/
├── src/
│   ├── screens/             # All screens
│   │   ├── LoginScreen.tsx       # ✅ Working
│   │   ├── RegisterScreen.tsx    # ✅ Working
│   │   ├── OverviewScreen.tsx    # ✅ Working
│   │   ├── ChatScreen.tsx        # ✅ Working
│   │   └── SettingsScreen.tsx    # ✅ Working
│   ├── navigation/          # Navigation setup
│   │   └── AppNavigator.tsx      # ✅ Tab navigation
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx       # ✅ Auth state management
│   ├── services/            # API integration
│   │   ├── api.ts                # ✅ All endpoints
│   │   └── healthData.ts         # ✅ Health tracking
│   ├── constants/           # Theme & config
│   │   └── theme.ts              # Colors, spacing, etc.
│   └── types/               # TypeScript types
├── App.tsx                  # ✅ Main entry point
└── package.json
```

---

## 🔑 Key Features Walkthrough

### 1. Login & Register

**Files:** `src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`

- Beautiful gradient backgrounds
- Form validation
- Error handling
- Auto-login after registration
- Connects to `/api/auth/register` and `/api/auth/callback/credentials`

### 2. Overview Dashboard

**File:** `src/screens/OverviewScreen.tsx`

Features:
- Energy score tracking (1-10 scale with emoji)
- Sleep hours display
- Hydration counter (+1 button)
- AI symptom analysis
- Weekly patterns
- Refresh to reload data

**API Calls:**
- `GET /api/health/today` - Today's metrics
- `GET /api/health/weekly` - 7-day trends
- `POST /api/health/analyze-symptoms` - AI analysis

### 3. Chat with AI

**File:** `src/screens/ChatScreen.tsx`

Features:
- Real-time messaging
- Context-aware AI (knows your health data)
- Message history
- Auto-scrolling
- Beautiful chat bubbles

**API Calls:**
- `POST /api/chat/quick` - Send message, get AI response

### 4. Settings

**File:** `src/screens/SettingsScreen.tsx`

Sections:
- **Account Info** - Name, email (read-only)
- **Health Profile** - DOB, sex, height, weight
- **Device Integration** - Apple Health toggle, Google Fit (coming soon)
- **Clinic History** - Medical conditions (non-editable, view-only)
- **Logout** - Clear session

**API Calls:**
- `GET /api/me/profile` - User & patient profile
- `GET /api/me/conditions` - Medical conditions list
- `POST /api/health-sync/toggle` - Enable/disable device sync

---

## 🍎 Apple Health Integration

### UI Complete ✅

The Settings page has:
- Toggle button to enable/disable
- Connection status indicator
- List of synced data types
- Privacy note

### To Actually Connect Apple Health:

You'll need to:
1. Add HealthKit capability in Xcode
2. Install `react-native-health` package
3. Implement sync logic in `src/services/healthData.ts`

**Example:**
```typescript
import AppleHealthKit from 'react-native-health';

export const syncAppleHealth = async () => {
  // Request permissions
  // Fetch steps, heart rate, sleep data
  // POST to /api/health/today
};
```

---

## 🤖 Android Health (Google Fit)

### UI Prepared ✅

Settings page shows "Coming Soon" badge.

### To Implement:

1. Install `react-native-google-fit`
2. Configure Google Fit API in Google Cloud Console
3. Implement similar sync logic as Apple Health

---

## 🏥 Clinic History

**Location:** Settings > Clinic History section

Features:
- **Read-only** (cannot edit/delete)
- Shows condition name, status (Active/Resolved)
- Diagnosed date & provider
- Condition notes
- Color-coded cards
- Empty state if no conditions

**Backend Source:** `GET /api/me/conditions`

Medical staff or backend admin must add conditions via API.

---

## 🎨 UI Theme

**File:** `src/constants/theme.ts`

Colors:
- Primary: `#10b981` (emerald-500)
- Background: `#f0f9f4` (soft mint)
- Text: `#1e293b` (slate-800)
- Glass effects: Semi-transparent whites with blur

All screens use:
- LinearGradient backgrounds
- Glassmorphism cards
- Consistent spacing
- Framer Motion animations (on web)

---

## 🔧 Troubleshooting

### "Network request failed"
- Check backend is running
- Verify API_BASE_URL is correct
- Try using your computer's IP instead of localhost

### "Cannot find module '@react-navigation/native'"
```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

### "Unable to resolve module 'lottie-react-native'"
```bash
npm install lottie-react-native
```

### Authentication not persisting
- Check AsyncStorage is working: `npm install @react-native-async-storage/async-storage`
- Clear app data and try again

### Backend CORS errors
Add to your backend (Next.js):
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ];
  },
};
```

---

## 📊 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/callback/credentials` | POST | Login |
| `/api/me/profile` | GET | Get user profile |
| `/api/me/conditions` | GET | Get clinic history |
| `/api/health/today` | GET | Today's health data |
| `/api/health/today` | POST | Log health metrics |
| `/api/health/weekly` | GET | Weekly trends |
| `/api/health/analyze-symptoms` | POST | AI symptom analysis |
| `/api/chat/quick` | POST | Send chat message |
| `/api/health-sync/toggle` | POST | Toggle device sync |

---

## ✅ Testing Checklist

1. **Registration**
   - [ ] Open app
   - [ ] Tap "Create Account"
   - [ ] Fill name, email, password
   - [ ] Should register and auto-login
   - [ ] Should see Overview page

2. **Login**
   - [ ] Logout from settings
   - [ ] Enter email/password
   - [ ] Should see Overview page

3. **Overview**
   - [ ] See energy card (or "Log Energy" button)
   - [ ] See sleep/hydration stats
   - [ ] Tap +1 on hydration (should increment)
   - [ ] Pull to refresh (should reload)

4. **Chat**
   - [ ] Tap Chat tab
   - [ ] Send message: "I'm feeling tired"
   - [ ] Should get AI response
   - [ ] Message should appear in chat

5. **Settings**
   - [ ] Tap Settings tab
   - [ ] See your name/email
   - [ ] See health profile (if completed onboarding)
   - [ ] See Apple Health toggle
   - [ ] See clinic history (empty or with conditions)
   - [ ] Tap logout (should return to login)

6. **Backend Integration**
   - [ ] All API calls succeed
   - [ ] No CORS errors
   - [ ] Data persists after app restart

---

## 🚢 Deploying

### TestFlight (iOS)

```bash
# Build for iOS
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios
```

### Google Play (Android)

```bash
# Build for Android
eas build --platform android

# Submit to Google Play
eas submit --platform android
```

---

## 📝 Notes

- **Backend Required:** This app needs the Rootwise backend (rootwise web app) running
- **Real Device Testing:** Use Expo Go for quick testing
- **Production:** Update API_BASE_URL before building
- **Health Sync:** UI ready, implementation pending
- **Clinic History:** Read-only by design for medical compliance

---

## 🆘 Need Help?

1. Check backend is running: Visit `http://localhost:3000` or your Vercel URL
2. Check logs: Look at terminal output for errors
3. Test API directly: Use Postman to test endpoints
4. Clear cache: Delete app, reinstall

---

**Built with ❤️ for wellness** 🌿

**Last Updated:** November 24, 2025

