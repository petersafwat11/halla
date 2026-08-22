/**
 * Dynamic Expo config.
 *
 * Extends the static `app.json` (still the base config) with values that must
 * come from the environment rather than committed JSON:
 *   - Platform-restricted Google Maps SDK keys for Android and iOS
 *   - Sentry DSN (crash reporting)
 *   - RevenueCat public SDK keys (in-app purchases)
 *
 * Set these as EAS environment variables / build secrets. When unset, the keys
 * are simply omitted so local/dev builds still work (maps blank, Sentry/RC no-op).
 */
module.exports = ({ config }) => {
  const androidMapsKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const iosMapsKey =
    process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (androidMapsKey) {
    config.android = config.android || {};
    config.android.config = {
      ...(config.android.config || {}),
      googleMaps: { apiKey: androidMapsKey },
    };
  }
  if (iosMapsKey) {
    config.ios = config.ios || {};
    config.ios.config = {
      ...(config.ios.config || {}),
      googleMapsApiKey: iosMapsKey,
    };
  }

  config.extra = {
    ...(config.extra || {}),
    sentryDsn: process.env.SENTRY_DSN || "",
    // Tags Sentry events by environment (set per EAS profile, e.g. production).
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT || "production",
    revenueCat: {
      iosKey: process.env.REVENUECAT_IOS_KEY || "",
      androidKey: process.env.REVENUECAT_ANDROID_KEY || "",
    },
    maps: {
      androidConfigured: !!androidMapsKey,
      iosConfigured: !!iosMapsKey,
    },
  };

  return config;
};
