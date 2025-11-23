# Assets Folder

## 📁 Required Assets:

### **App Icons:**
- `icon.png` - 1024x1024px (app icon)
- `adaptive-icon.png` - 1024x1024px (Android adaptive icon)
- `favicon.png` - 48x48px (web favicon)

### **Splash Screen:**
- `splash.png` - 1284x2778px (iPhone 13 Pro Max size)
- Background: `#fdf8f3` (matches brand)

### **Lottie Animations:**

Copy these from the web app (`/rootwise/public/emotions/`):

```
lottie/
├── mindfull_chill.json
├── tired_low.json
└── productive.json
```

**Usage in app:**
```typescript
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./assets/lottie/productive.json')}
  autoPlay
  loop
  style={{ width: 200, height: 200 }}
/>
```

### **Logo:**
- Extract leaf icon from web app
- Use as logo in auth screens
- Consider creating animated version

---

## 🎨 **Design Guidelines:**

**App Icon:**
- Green leaf on cream background
- Rounded square (iOS handles rounding)
- Simple, recognizable
- Matches web app aesthetic

**Splash Screen:**
- Centered Rootwise logo
- Cream background (#fdf8f3)
- Minimal text
- 2-3 second display time

---

## 📋 **To-Do:**

1. Create or export app icon from web design
2. Create splash screen
3. Copy Lottie files from `/rootwise/public/emotions/`
4. Test icons on device (various sizes)
5. Ensure splash screen looks good on all devices

---

**Note:** You can use Figma or Adobe Illustrator to create these assets, or I can help generate them if you provide the web app's icon/logo file.

