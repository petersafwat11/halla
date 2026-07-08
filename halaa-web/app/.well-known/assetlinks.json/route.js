/**
 * Android Digital Asset Links — served at
 * https://halaa.com.sa/.well-known/assetlinks.json
 *
 * Enables Android App Links (autoVerify in app.json intentFilters) so the
 * https reset-password / invitation links open the Halaa app directly.
 *
 * SET `ANDROID_CERT_FINGERPRINT` to the SHA-256 signing-cert fingerprint from
 * Play App Signing (Play Console -> Test and release -> Setup -> App signing ->
 * "SHA-256 certificate fingerprint"). Format: colon-separated hex
 * (AA:BB:...:FF). Multiple fingerprints (e.g. upload + Play signing) can be
 * provided comma-separated. Until set, this serves a placeholder that will NOT
 * verify the app links.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const realFingerprint = process.env.ANDROID_CERT_FINGERPRINT;

  // Loud failure (§5.1): without the real Play App Signing SHA-256, Android App
  // Links will NOT verify and reset/invitation links won't open the app.
  if (!realFingerprint && process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error(
      "[assetlinks] ANDROID_CERT_FINGERPRINT is not set in production — serving a PLACEHOLDER fingerprint. " +
        "Android App Link verification will FAIL until the real Play App Signing SHA-256 is configured."
    );
  }

  const fingerprints = (
    realFingerprint || "REPLACE_WITH_SHA256_FINGERPRINT_FROM_PLAY_APP_SIGNING"
  )
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.halla.app",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
