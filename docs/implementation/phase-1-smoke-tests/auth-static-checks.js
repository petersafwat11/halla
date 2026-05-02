#!/usr/bin/env node
/**
 * Phase 1a static contract checks.
 *
 * Run from repo root: `node docs/implementation/phase-1-smoke-tests/auth-static-checks.js`
 *
 * These checks do not require a live backend; they assert that the source
 * code has the structural changes required by Phase 1a. They run in any
 * environment, including CI without DB access. Failure exits non-zero.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");

const checks = [];

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (err) {
    checks.push({ name, ok: false, error: err.message });
  }
}

function expect(value, message) {
  if (!value) throw new Error(message);
}

// 1. Env: 90d default removed; 15m + refresh days added
check("env: 15m access TTL + refresh days", () => {
  const env = read("labbe-backend-/src/config/env.js");
  expect(!env.includes("'90d'"), "JWT_EXPIRES_IN still defaults to '90d'");
  expect(env.includes("'15m'"), "JWT_EXPIRES_IN should default to '15m'");
  expect(env.includes("REFRESH_TOKEN_EXPIRES_DAYS"), "REFRESH_TOKEN_EXPIRES_DAYS not defined");
});

// 2. RefreshToken model exists with TTL index
check("RefreshTokenModel created with TTL index", () => {
  const m = read("labbe-backend-/models/RefreshTokenModel.js");
  expect(m.includes("expireAfterSeconds"), "Missing TTL index on expiresAt");
  expect(m.includes("tokenHash"), "tokenHash field missing");
  expect(m.includes("revokedAt"), "revokedAt field missing");
  expect(m.includes("replacedBy"), "replacedBy field missing");
});

// 3. UserModel constants flipped
check("UserModel: lock 30m + reset 1h", () => {
  const u = read("labbe-backend-/models/UserModel.js");
  expect(u.includes("LOCK_TIME = 30 * 60 * 1000"), "Lock time still 15m");
  expect(u.includes("60 * 60 * 1000; // 1 hour"), "Reset token TTL still 10m");
});

// 4. Auth service exposes the new token-pair API and dropped signToken
check("AuthService has issueTokenPair / rotate / revoke; no signToken", () => {
  const s = read("labbe-backend-/src/modules/auth/auth.service.js");
  expect(s.includes("issueTokenPair"), "issueTokenPair missing");
  expect(s.includes("rotateRefreshToken"), "rotateRefreshToken missing");
  expect(s.includes("revokeRefreshToken"), "revokeRefreshToken missing");
  expect(s.includes("revokeAllForUser"), "revokeAllForUser missing");
  expect(!/this\.signToken\(/.test(s), "service still calls this.signToken()");
});

// 5. Legacy middleware exports gone
check("Auth middleware: legacy exports removed", () => {
  const a = read("labbe-backend-/src/shared/middleware/auth.js");
  expect(!a.includes("exports.signToken"), "exports.signToken still present");
  expect(!a.includes("exports.createSendToken"), "exports.createSendToken still present");
  expect(!a.includes("process.env.JWT_EXPIRES_IN"), "Direct env read still present");
  const idx = read("labbe-backend-/src/shared/middleware/index.js");
  expect(!idx.includes("signToken"), "index still re-exports signToken");
  expect(!idx.includes("createSendToken"), "index still re-exports createSendToken");
});

// 6. Refresh route exists
check("Auth routes: POST /refresh", () => {
  const r = read("labbe-backend-/src/modules/auth/auth.routes.js");
  expect(/router\.post\("\/refresh"/.test(r), "POST /refresh route missing");
});

// 7. Controller sets two cookies
check("Auth controller: access_token + refresh_token cookies", () => {
  const c = read("labbe-backend-/src/modules/auth/auth.controller.js");
  expect(c.includes("access_token"), "access_token cookie name missing");
  expect(c.includes("refresh_token"), "refresh_token cookie name missing");
  expect(c.includes("config.jwt.refreshCookiePath"), "refresh cookie path not used");
});

// 8. Web client: silent refresh + new base URL
check("Web apiClient (fetch): silent refresh + /api/v2 base", () => {
  const a = read("labbe/services/apiClient.js");
  expect(a.includes("/api/v2"), "Web apiClient default URL not bumped to /api/v2");
  expect(a.includes("_refreshOnce"), "Silent refresh helper missing");
  expect(a.includes("/auth/refresh"), "Refresh path not referenced");
});

// 8b. Axios client: cookies must flow + 401 retry must run
check("Web apiClient (axios): withCredentials + silent refresh", () => {
  const a = read("labbe/services/new-backend/apiClient.js");
  expect(a.includes("withCredentials: true"), "axios instance missing withCredentials");
  expect(a.includes("_refreshOnce"), "axios response interceptor missing _refreshOnce");
  expect(a.includes("/api/v2"), "axios default URL not bumped to /api/v2");
});

// 8c. useAuthMutation.resetPassword must read user from data.user
check("useAuthMutation: resetPassword unpacks data.user", () => {
  const m = read("labbe/hooks/reactQueryHooks/useAuthMutation.js");
  // Find the resetPassword mutation block and ensure it reads response.data?.user
  const resetBlock = m.split("resetPassword:")[1]?.split("// Host Signup")[0] || "";
  expect(/response\.data\??\.user/.test(resetBlock), "resetPassword should read response.data.user");
});

// 9. Mobile apiFetch wrapper for 401 + refresh
check("Mobile apiFetch wrapper exists with refresh-on-401", () => {
  const w = read("halla-mobile/services/apiClient.js");
  expect(w.includes("apiFetch"), "apiFetch export missing");
  expect(w.includes("refreshTokens"), "wrapper does not call store.refreshTokens()");
  expect(w.includes("response.status === 401"), "wrapper does not check 401");
});

// 10. Mobile: secureStorage wrapper + no role fallbacks
check("Mobile: secure storage + role fallback removed", () => {
  const ss = read("halla-mobile/services/secureStorage.js");
  expect(ss.includes("expo-secure-store"), "secureStorage doesn't reference expo-secure-store");
  const store = read("halla-mobile/stores/authStore.js");
  // Strip block + line comments before checking, so the comment that
  // documents the removed fallback doesn't trip the assertion.
  const stripped = store
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\*.*$/gm, "")
    .replace(/\/\/.*$/gm, "");
  expect(!/\|\|\s*"vendor"/.test(stripped), 'Mobile authStore still has || "vendor" fallback');
  expect(!/\|\|\s*"host"/.test(stripped), 'Mobile authStore still has || "host" fallback');
  expect(store.includes("requireRole"), "Mobile authStore should require server-issued role");
  const pkg = JSON.parse(read("halla-mobile/package.json"));
  expect(pkg.dependencies["expo-secure-store"], "expo-secure-store not in package.json");
});

// 10. Mobile navigator no longer silently routes to host
check("Mobile AppNavigator: no silent host fallback", () => {
  const n = read("halla-mobile/navigation/AppNavigator.js");
  expect(!/defaulting to host/.test(n), "Default still routes unknown roles to HostStack");
  expect(/Unsupported account type/i.test(n), "Error screen for unsupported role missing");
});

// Report
let failed = 0;
for (const c of checks) {
  if (c.ok) {
    console.log(`PASS  ${c.name}`);
  } else {
    failed++;
    console.error(`FAIL  ${c.name}\n      ${c.error}`);
  }
}

if (failed) {
  console.error(`\n${failed} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed.`);
