# 🚀 Rootwise Mobile - Quick Start

Get the app running in 5 minutes!

---

## ⚡ **Super Fast Setup:**

```bash
cd "rootwise app"

# 1. Install
npm install

# 2. Start
npx expo start

# 3. Run on device
# Scan QR code with Expo Go app (iOS/Android)
# OR press 'i' for iOS simulator
# OR press 'a' for Android emulator
```

---

## 🔧 **Before First Run:**

### **1. Update API URL**

Edit `src/services/api.ts` line 6:

```typescript
const API_BASE_URL = 'https://YOUR-BACKEND-URL.vercel.app/api';
```

### **2. Copy Lottie Files**

Copy from web app:
```bash
cp ../rootwise/public/emotions/*.json ./assets/lottie/
```

### **3. Add App Icon (Optional)**

Place in `assets/`:
- `icon.png` (1024x1024)
- `splash.png` (1284x2778)

---

## 📱 **Testing**

### **Test Account:**
1. Run app
2. Tap "Create account"
3. Fill form
4. Auto-logged in → Overview screen

### **Test Health Tracking:**
1. Tap "Log Energy"
2. Choose 1-10
3. See energy bar update
4. Tap "+1" on water
5. See hydration update

### **Test AI Chat:**
1. Tap "Chat with AI Assistant"
2. Type: "I'm tired"
3. AI responds with advice
4. Energy auto-logged to database

### **Test Health Sync (iOS):**
1. Open Health app on iPhone
2. Add sleep data for last night
3. Open Rootwise app
4. Sleep should auto-import

---

## 🎯 **Next Steps:**

1. ✅ Test all features
2. ✅ Customize colors if needed
3. ✅ Add your app icons
4. ✅ Configure EAS build
5. ✅ Push to GitHub
6. ✅ GitHub Actions will build Android + iOS

---

**That's it! Your mobile app is ready!** 🎉

For detailed docs, see `MOBILE_SYSTEM_GUIDE.md`

