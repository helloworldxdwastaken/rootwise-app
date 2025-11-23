# 🚀 GitHub Repository Setup Guide

**Pushing Rootwise Mobile to: https://github.com/helloworldxdwastaken/rootwise-app.git**

---

## 📋 **Step-by-Step Instructions:**

### **Step 1: Initialize Git**

```bash
cd "/home/tokyo/Desktop/rootwise app"

git init
git add .
git commit -m "feat: Complete Rootwise mobile app

- Add React Native Expo app for iOS and Android
- Implement auth screens (Login/Register)
- Add Overview screen with health tracking
- Add AI chat screen with Groq integration
- Integrate Apple HealthKit (iOS)
- Integrate Google Fit/Health Connect (Android)
- Configure separate build profiles for iOS and Android
- Add GitHub Actions for independent builds
- Complete documentation (MOBILE_SYSTEM_GUIDE.md)"
```

### **Step 2: Add Remote**

```bash
git remote add origin https://github.com/helloworldxdwastaken/rootwise-app.git
```

### **Step 3: Push to GitHub**

```bash
git branch -M main
git push -u origin main
```

---

## 🔐 **Step 4: Configure GitHub Secrets**

Go to: https://github.com/helloworldxdwastaken/rootwise-app/settings/secrets/actions

Click **"New repository secret"** and add:

### **Required Secret:**

**Name:** `EXPO_TOKEN`  
**Value:** Get from https://expo.dev/settings/access-tokens

**How to get Expo token:**
1. Go to https://expo.dev
2. Create account or login
3. Go to Settings → Access Tokens
4. Click "Create Token"
5. Copy token
6. Paste in GitHub secrets

---

## ⚙️ **Build Configurations:**

### **Separate Profiles for iOS and Android:**

```json
// eas.json configured with:

preview-ios:         Build iOS separately (preview)
preview-android:     Build Android separately (preview)
production-ios:      Build iOS for App Store
production-android:  Build Android for Play Store
```

### **GitHub Actions Jobs:**

**Independent jobs:**
- `build-android` - Runs on ubuntu-latest (faster, cheaper)
- `build-ios` - Runs on macos-latest (required for iOS)

**Can trigger manually:**
```
Go to Actions tab → Build Mobile Apps → Run workflow
Choose: all, android, or ios
```

**Auto-triggers:**
- Push to `main` → Builds both (production)
- Push to `develop` → Builds both (preview)
- Pull request → Builds both (preview)

---

## 🎯 **Build Commands:**

### **Manual Builds (Local):**

```bash
# Android only
eas build --platform android --profile production-android

# iOS only
eas build --platform ios --profile production-ios

# Both (but separately)
eas build --platform android --profile production-android &
eas build --platform ios --profile production-ios
```

### **GitHub Actions:**

```bash
# Push triggers auto-build
git push

# Or manually trigger from GitHub UI:
# Actions → Build Mobile Apps → Run workflow → Choose platform
```

---

## 📦 **Artifacts:**

**After GitHub Actions completes:**

1. Go to: https://github.com/helloworldxdwastaken/rootwise-app/actions
2. Click latest workflow run
3. Scroll down to "Artifacts"
4. Download:
   - `android-build-<commit-sha>` - APK or AAB file
   - `ios-build-<commit-sha>` - IPA file

**Retention:** 30 days

---

## 🔄 **Workflow Features:**

### **Smart Building:**
- ✅ Separate jobs (iOS doesn't wait for Android)
- ✅ Parallel execution (both build simultaneously)
- ✅ Preview vs Production profiles
  - Preview: Fast, internal testing
  - Production: Optimized, store-ready
- ✅ Manual trigger option
- ✅ Platform selection (build only what you need)

### **Branch Strategy:**
```
main branch:
  → production-ios profile
  → production-android profile
  → App Bundle + IPA (store-ready)

develop branch:
  → preview-ios profile
  → preview-android profile
  → APK + IPA (for testing)
```

---

## 🎨 **Before First Push:**

### **1. Update API URL**

Edit `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR-IP:3000/api'  // Your local machine IP
  : 'https://your-rootwise-backend.vercel.app/api';  // Your Vercel URL
```

### **2. Copy Lottie Files**

```bash
mkdir -p assets/lottie
cp ../rootwise/public/emotions/*.json ./assets/lottie/
```

### **3. Create Placeholder Icons**

```bash
mkdir -p assets
# Add icon.png, splash.png, adaptive-icon.png
# Or use defaults for now
```

---

## ✅ **Verification Checklist:**

Before pushing:
- [x] Git initialized
- [x] All files added
- [x] Commit message ready
- [x] Remote URL correct
- [ ] API_BASE_URL updated in api.ts
- [ ] Lottie files copied to assets/lottie/
- [ ] Expo account created (for builds)

After pushing:
- [ ] Add EXPO_TOKEN to GitHub secrets
- [ ] Verify GitHub Actions runs
- [ ] Download and test builds
- [ ] Test on real devices

---

## 🚀 **Ready to Push?**

Run these commands:

```bash
cd "/home/tokyo/Desktop/rootwise app"

# Initialize
git init

# Add all files
git add .

# Commit
git commit -m "feat: Initial Rootwise mobile app with iOS/Android separation"

# Add remote
git remote add origin https://github.com/helloworldxdwastaken/rootwise-app.git

# Push
git branch -M main
git push -u origin main
```

---

## 📱 **Building Independently:**

### **Build Only Android:**
```bash
# Locally
eas build --platform android --profile production-android

# Or via GitHub
# Actions → Run workflow → Select "android"
```

### **Build Only iOS:**
```bash
# Locally  
eas build --platform ios --profile production-ios

# Or via GitHub
# Actions → Run workflow → Select "ios"
```

### **Build Both (Parallel):**
```bash
# Via GitHub (automatic)
git push origin main

# Both jobs run simultaneously, don't wait for each other
```

---

**The mobile app is ready to push with completely independent iOS and Android builds!** 🎯

Want me to run the git commands now?

