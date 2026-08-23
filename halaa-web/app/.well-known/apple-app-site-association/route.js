/**
 * Apple App Site Association (AASA) — served at
 * https://halaa.com.sa/.well-known/apple-app-site-association
 *
 * Enables iOS Universal Links into the Halaa app (password reset + guest
 * invitations) so https links open the app instead of Safari. Apple fetches
 * this exact path over HTTPS with no redirects and expects
 * Content-Type: application/json.
 *
 * `APPLE_ASSOCIATED_APP_ID` may override the value, but the checked-in fallback
 * is the real public Apple Team ID + bundle ID so a missing runtime variable
 * cannot silently break Universal Links or domain-bound OTP AutoFill.
 *
 * Paths must mirror the mobile linking config (App.js) + app.json
 * associatedDomains.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const configuredAppID = process.env.APPLE_ASSOCIATED_APP_ID;
  const appID = /^[A-Z0-9]{10}\.com\.halaa\.app$/.test(configuredAppID || "")
    ? configuredAppID
    : "YR98AH9Z39.com.halaa.app";

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID,
          // Canonical reset path is locale-prefixed change-password; keep
          // unprefixed + /ar + /en variants so the link opens the app
          // regardless of locale. Invitation paths mirror the same shape.
          paths: [
            "/change-password*",
            "/ar/change-password*",
            "/en/change-password*",
            "/invitation/*",
            "/ar/invitation/*",
            "/en/invitation/*",
          ],
        },
      ],
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
