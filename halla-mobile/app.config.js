/**
 * Dynamic Expo config.
 *
 * Extends the static `app.json` (still the base config) with values that must
 * come from the environment rather than committed JSON:
 *   - Android Google Maps API key (react-native-maps PROVIDER_DEFAULT renders a
 *     blank map on Android without it)
 *   - Sentry DSN (crash reporting)
 *   - RevenueCat public SDK keys (in-app purchases)
 *
 * Set these as EAS environment variables / build secrets. When unset, the keys
 * are simply omitted so local/dev builds still work (maps blank, Sentry/RC no-op).
 */
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey) {
    config.android = config.android || {};
    config.android.config = {
      ...(config.android.config || {}),
      googleMaps: { apiKey: mapsKey },
    };
  }

  config.extra = {
    ...(config.extra || {}),
    sentryDsn: process.env.SENTRY_DSN || "",
    revenueCat: {
      iosKey: process.env.REVENUECAT_IOS_KEY || "",
      androidKey: process.env.REVENUECAT_ANDROID_KEY || "",
    },
  };

  return config;
};
