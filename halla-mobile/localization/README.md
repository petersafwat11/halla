# Localization Setup for React Native App

This directory contains the complete localization setup for the React Native mobile application, designed to work seamlessly with Arabic (RTL) and English (LTR) languages.

## 📁 Structure

```
localization/
├── config/
│   └── i18nConfig.js          # Main i18n configuration
├── locales/
│   ├── en/                    # English translations
│   │   ├── index.js           # Export file
│   │   ├── common.json        # Common UI elements
│   │   ├── auth.json          # Authentication screens
│   │   ├── home.json          # Home/Dashboard content
│   │   ├── events.json        # Events functionality
│   │   └── settings.json      # Settings screen
│   └── ar/                    # Arabic translations
│       ├── index.js           # Export file
│       ├── common.json        # Common UI elements
│       ├── auth.json          # Authentication screens
│       ├── home.json          # Home/Dashboard content
│       ├── events.json        # Events functionality
│       └── settings.json      # Settings screen
├── providers/
│   └── LanguageProvider.js    # React context provider
├── hooks/
│   └── useTranslation.js      # Custom translation hook
├── index.js                   # Main exports
└── README.md                  # This file
```

## 🚀 Usage

### 1. Basic Setup

Wrap your app with the `LanguageProvider`:

```javascript
import { LanguageProvider } from "./localization";

export default function App() {
  return (
    <LanguageProvider>
      <YourAppContent />
    </LanguageProvider>
  );
}
```

### 2. Using Translations

```javascript
import { useTranslation } from "./localization";

function MyComponent() {
  const { t, isRTL, direction } = useTranslation("common");

  return (
    <View style={{ direction }}>
      <Text>{t("buttons.save")}</Text>
    </View>
  );
}
```

### 3. Language Management

```javascript
import { useLanguage } from "./localization";

function LanguageSelector() {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  return (
    <Button
      onPress={() => changeLanguage(currentLanguage === "en" ? "ar" : "en")}
      title={`Switch to ${currentLanguage === "en" ? "العربية" : "English"}`}
    />
  );
}
```

## 🌍 Features

- **Auto-detection**: Automatically detects device language
- **Persistence**: Saves user's language preference
- **RTL Support**: Built-in right-to-left layout support for Arabic
- **Fallbacks**: Graceful fallbacks for missing translations
- **Type Safety**: Ready for TypeScript integration
- **Performance**: Optimized for React Native with lazy loading

## 📝 Adding New Translations

1. Add the key to the appropriate JSON file in both `en/` and `ar/` directories
2. Use the translation in your component with `t('your.key')`
3. The translation will be automatically available

## 🔧 Configuration

The main configuration is in `config/i18nConfig.js`:

- **Default Language**: Currently set to English
- **Supported Languages**: English (en) and Arabic (ar)
- **RTL Detection**: Automatic RTL support for Arabic
- **Debug Mode**: Enabled in development

## 📱 React Native Specific Features

- Uses `react-native-localize` for device language detection
- `AsyncStorage` for persistence (requires installation)
- Handles device locale changes
- Optimized for mobile performance

## 🛠 Dependencies

Required packages (install with npm/yarn):

- `i18next`
- `react-i18next`
- `react-native-localize`
- `@react-native-async-storage/async-storage`

## 🎯 Best Practices

1. **Namespace Organization**: Use different namespaces (auth, home, events, etc.) for better organization
2. **Consistent Keys**: Use consistent naming conventions like `buttons.save`, `messages.error`
3. **RTL Testing**: Always test with Arabic to ensure proper RTL layout
4. **Fallbacks**: Provide meaningful fallbacks for missing translations
5. **Performance**: Lazy load translation files when needed

## 🔄 Migration from Web Version

This setup is designed to be compatible with the web version's translation structure while being optimized for React Native. Key differences:

- Uses `react-native-localize` instead of browser language detection
- Uses `AsyncStorage` instead of localStorage
- Optimized imports for React Native bundle size
- Built-in RTL support for better mobile experience
