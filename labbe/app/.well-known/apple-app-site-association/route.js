/**
 * Apple App Site Association (AASA) — served at
 * https://halaa.com.sa/.well-known/apple-app-site-association
 *
 * Enables iOS Universal Links into the Halaa app (password reset + guest
 * invitations) so https links open the app instead of Safari. Apple fetches
 * this exact path over HTTPS with no redirects and expects
 * Content-Type: application/json.
 *
 * SET `APPLE_APP_ID` to "<TEAM_ID>.com.halla.app" (Team ID from the Apple
 * Developer account). Until then this serves a placeholder appID that will NOT
 * validate — universal links won't open the app until the real Team ID is set.
 *
 * Paths must mirror the mobile linking config (App.js) + app.json
 * associatedDomains.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const appID = process.env.APPLE_APP_ID || "TEAMID.com.halla.app";

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID,
          paths: ["/reset-password/*", "/invitation/*"],
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
