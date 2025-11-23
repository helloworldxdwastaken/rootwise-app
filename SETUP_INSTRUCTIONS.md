# 📋 Rootwise Mobile - Setup Instructions

**Follow these steps to get the app running.**

---

## 🎯 **Step 1: Install Dependencies**

```bash
cd "rootwise app"
npm install
```

**This installs:**
- React Native & Expo
- Navigation libraries
- Health data modules
- UI components
- API client

---

## 🔗 **Step 2: Configure Backend URL**

Edit `src/services/api.ts` (line 6):

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR-COMPUTER-IP:3000/api'  // Development
  : 'https://your-rootwise-backend.vercel.app/api';  // Production
```

**Important for iOS Simulator:**
- Don't use `localhost` - use your computer's IP address
- Find IP: Run `ifconfig` (Mac) or `ipconfig` (Windows)
- Example: `http://192.168.1.100:3000/api`

**For Android Emulator:**
- Use `http://10.0.2.2:3000/api` (special Android localhost)

---

## 🎨 **Step 3: Copy Assets from Web App**

### **Copy Lottie Animations:**

```bash
# From project root
cp rootwise/public/emotions/*.json "rootwise app/assets/lottie/"
```

These are:
- `mindfull_chill.json`
- `tired_low.json`
- `productive.json`

### **Create App Icons:**

**Option A:** Use online tool
1. Go to https://icon.kitchen/
2. Upload web app's leaf icon
3. Generate iOS + Android icons
4. Download and place in `assets/`

**Option B:** Manual
- `assets/icon.png` - 1024x1024 (cream background + green leaf)
- `assets/splash.png` - Logo centered on cream background
- `assets/adaptive-icon.png` - Same as icon.png

---

## 📱 **Step 4: Run the App**

### **Start Expo:**

```bash
npx expo start
```

### **Run on Device/Simulator:**

**iOS (Mac only):**
```bash
press 'i' in terminal
```

**Android:**
```bash
press 'a' in terminal
```

**Physical Device:**
1. Install "Expo Go" from App Store / Play Store
2. Scan QR code from terminal
3. App opens in Expo Go

---

## 🧪 **Step 5: Test**

### **Test Authentication:**
1. Tap "Create new account"
2. Fill: Name, Email, Password
3. Tap "Create account"
4. Should auto-login → Overview screen

### **Test Health Logging:**
1. Tap "Log Energy"
2. (For now, edit code to add modal/picker)
3. Or modify to use prompt
4. Save → See energy bar update

### **Test Chat:**
1. Tap "Chat with AI Assistant"
2. Type: "I'm feeling tired"
3. AI responds
4. Check if energy logged automatically

### **Test Health Sync (iOS):**
1. Open Health app on iPhone
2. Tap "Sleep"
3. Add manual sleep data (e.g., 7 hours)
4. Open Rootwise app
5. Should see sleep auto-imported

---

## 🚀 **Step 6: Build for Production**

### **Option A: EAS Build**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build
eas build --platform android --profile production
eas build --platform ios --profile production
```

### **Option B: GitHub Actions**

```bash
# 1. Create GitHub repo
git init
git add .
git commit -m "Initial commit: Rootwise Mobile"
git remote add origin https://github.com/YOUR-USERNAME/rootwise-mobile.git
git push -u origin main

# 2. Add secret in GitHub
# Go to Settings → Secrets → New repository secret
# Name: EXPO_TOKEN
# Value: Get from https://expo.dev/settings/access-tokens

# 3. Push triggers auto-build
git push

# 4. Check Actions tab for build status
# 5. Download APK/IPA from artifacts
```

---

## 🍎 **Step 7: Test Health Data (Optional)**

### **iOS - Apple HealthKit:**

1. Build on real device or simulator
2. App requests Health permissions → Allow
3. Open Health app
4. Add test data:
   - Sleep: 7 hours last night
   - Steps: 5000 steps today
5. Return to Rootwise
6. Data should appear

### **Android - Health Connect:**

1. Install Google Fit from Play Store
2. Build on real device
3. App requests permissions → Allow
4. Open Google Fit
5. Add test data (sleep, steps)
6. Return to Rootwise
7. Data should sync

---

## 🎯 **What You Get:**

✅ **Complete mobile app** ready to run  
✅ **Connects to existing backend** (no changes needed)  
✅ **HealthKit/Google Fit** integration  
✅ **AI chat** with auto-logging  
✅ **Beautiful UI** matching web app  
✅ **GitHub Actions** for auto-builds  
✅ **Complete documentation**  

---

## 🐛 **Common Issues:**

### **"Cannot connect to API"**
→ Check `API_BASE_URL` in `src/services/api.ts`  
→ Use computer IP, not localhost (for simulators)

### **"Module not found"**
→ Run `npm install` again  
→ Clear cache: `npx expo start -c`

### **"Build failed on GitHub"**
→ Add `EXPO_TOKEN` secret  
→ Check Actions tab for error logs

### **"Health data not importing"**
→ Grant permissions in device settings  
→ Add test data in Health app  
→ Restart Rootwise app

---

## 📞 **Need Help?**

1. Check `MOBILE_SYSTEM_GUIDE.md` - Complete documentation
2. Check `README.md` - Feature overview
3. Check Expo docs: https://docs.expo.dev
4. Check main backend docs: `../rootwise/COMPLETE_SYSTEM_GUIDE.md`

---

**Happy building!** 🎉

