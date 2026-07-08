/**
 * In-app 3DS browser handoff for Moyasar card payments.
 *
 * Moyasar always returns a `redirectUrl` for creditcard/token sources — in
 * BOTH test and live mode — so the user must complete a bank verification
 * step in a browser. Two hard constraints shape this flow:
 *
 *   1. Moyasar's `callback_url` MUST be http(s). It rejects custom schemes
 *      ("URL protocol must be HTTP or HTTPS"), so we cannot hand it
 *      `halaa://…` directly.
 *   2. iOS `ASWebAuthenticationSession` (what openAuthSessionAsync uses)
 *      only auto-closes when the in-app browser navigates to a CUSTOM
 *      scheme returnUrl — an https returnUrl won't dismiss it.
 *
 * So the round-trip is:
 *   - We hand Moyasar a PUBLIC backend bounce endpoint as `callback_url`
 *     (BOUNCE_URL). The web `/host/*` pages are auth-gated; this endpoint
 *     is unauthenticated and does one thing.
 *   - Moyasar redirects there with `?id=<moyasarId>&status=…` appended.
 *   - The endpoint 302s to `halaa://host/payments/return?id=…&status=…`.
 *   - openAuthSessionAsync sees that custom-scheme hop, auto-closes the
 *     sheet, and returns the URL to us — the user never leaves the app.
 *
 * The `/payments/:id/poll` endpoint accepts either the Moyasar UUID or our
 * internal id (dual-id behavior — payments.routes.js:140), so we forward
 * the Moyasar id when present and fall back to the internal paymentId.
 */

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL } from "../config/api";

// Mirrors the `PaymentReturn` deep-link path registered in App.js. Used
// ONLY as the openAuthSessionAsync returnUrl — never sent to Moyasar.
const RETURN_PATH = "host/payments/return";

// Public backend endpoint that 302s to the deep link above. Derived from
// API_BASE_URL so it tracks the same origin/prefix the app already uses.
const BOUNCE_URL = `${API_BASE_URL.replace(/\/+$/, "")}/payments/app-return`;

/** The http(s) URL we hand Moyasar as `callback_url`. */
export const buildMoyasarCallbackUrl = () => BOUNCE_URL;

/**
 * Run the 3DS step in an in-app browser and resolve once the user returns.
 *
 * @param {string} redirectUrl  The Moyasar 3DS URL from the charge response.
 * @param {string|null} fallbackId  Internal paymentId, used if the redirect
 *   didn't carry an `id` (e.g. the user dismissed the sheet early).
 * @returns {Promise<{ moyasarId: string|null, browserType: string }>}
 */
export const runThreeDsSession = async (redirectUrl, fallbackId = null) => {
  const returnUrl = Linking.createURL(RETURN_PATH);
  const result = await WebBrowser.openAuthSessionAsync(redirectUrl, returnUrl);

  let moyasarId = fallbackId;
  if (result?.type === "success" && result.url) {
    try {
      const { queryParams } = Linking.parse(result.url);
      if (queryParams?.id) moyasarId = String(queryParams.id);
    } catch {
      /* keep fallbackId — the poll screen tolerates a missing/internal id */
    }
  }

  return { moyasarId, browserType: result?.type || "unknown" };
};
