const fs = require("node:fs");
const crypto = require("node:crypto");

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

async function createGoogleAccessToken() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!keyPath) throw new Error("Google export requires GOOGLE_SERVICE_ACCOUNT_PATH");
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.token_uri) {
    throw new Error("Google service account file is missing required authentication fields");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = encode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: serviceAccount.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), serviceAccount.private_key);
  const assertion = `${signingInput}.${signature.toString("base64url")}`;

  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Google OAuth token exchange failed with HTTP ${response.status}`);
  const body = await response.json();
  if (!body.access_token) throw new Error("Google OAuth token response did not include an access token");
  return body.access_token;
}

module.exports = { createGoogleAccessToken };
