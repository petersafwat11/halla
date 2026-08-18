const fs = require("node:fs");
const crypto = require("node:crypto");

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function createAppleToken() {
  const issuerId = process.env.APPLE_ISSUER_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  if (!issuerId || !keyId || !keyPath) {
    throw new Error("Apple export requires APPLE_ISSUER_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY_PATH");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + 15 * 60, aud: "appstoreconnect-v1" }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign("sha256", Buffer.from(signingInput), {
    key: fs.readFileSync(keyPath),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${signature.toString("base64url")}`;
}

module.exports = { createAppleToken };
