/**
 * Apple App Site Association (AASA) — served at
 * https://halaa.com.sa/.well-known/apple-app-site-association
 *
 * Enables iOS Universal Links into the Halaa app (password reset + guest
 * invitations) so https links open the app instead of Safari. Apple fetches
 * this exact path over HTTPS with no redirects and expects
 * Content-Type: application/json.
 *
 * SET `APPLE_APP_ID` to "<TEAM_ID>.com.halaa.app" (Team ID from the Apple
 * Developer account). Until then this serves a placeholder appID that will NOT
 * validate — universal links won't open the app until the real Team ID is set.
 *
 * Paths must mirror the mobile linking config (App.js) + app.json
 * associatedDomains.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const realAppID = process.env.APPLE_APP_ID;
  const appID = realAppID || "TEAMID.com.halaa.app";

  // Loud failure (§5.1): a placeholder appID will NOT validate universal links.
  // In production this must be set to "<TEAM_ID>.com.halaa.app".
  if (!realAppID && process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error(
      "[AASA] APPLE_APP_ID is not set in production — serving a PLACEHOLDER appID. " +
        "Universal links (reset password / invitations) will NOT open the app until the real Team ID is configured."
    );
  }

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
