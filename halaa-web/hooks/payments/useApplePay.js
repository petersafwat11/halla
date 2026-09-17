"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Apple Pay (PassKit) wallet session for Moyasar checkout.
 *
 * Moyasar performs the Apple merchant validation on our behalf via
 * `POST https://api.moyasar.com/v1/applepay/initiate`, using the domain
 * registered under Moyasar Dashboard → Apple Pay → Domains. That means no
 * Apple merchant certificate is needed here — only:
 *   1. `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` (a `pk_…` key; public by design),
 *   2. the current domain registered with Moyasar, and
 *   3. `/.well-known/apple-developer-merchantid-domain-association` served
 *      over HTTPS on that domain.
 *
 * The payment token Apple returns is handed to the backend as
 * `source: { type: "applepay", token }`, which the checkout validation
 * already accepts.
 *
 * Docs: https://docs.moyasar.com — Apple Pay merchant validation / POST /payments
 */

const MOYASAR_APPLEPAY_INITIATE = "https://api.moyasar.com/v1/applepay/initiate";
const SUPPORTED_NETWORKS = ["mada", "visa", "masterCard"];
const MERCHANT_CAPABILITIES = ["supports3DS"];
const APPLE_PAY_VERSION = 3;

const getPublishableKey = () =>
  process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY || "";

/**
 * True only where an Apple Pay sheet can actually open: an Apple device with
 * a provisioned card, on a browser exposing PassKit, and with a publishable
 * key configured. Gating on this keeps a dead tab off every other browser.
 */
export const isApplePayAvailable = () => {
  if (typeof window === "undefined") return false;
  const session = window.ApplePaySession;
  if (!session) return false;
  if (!getPublishableKey()) return false;
  try {
    if (typeof session.supportsVersion === "function" && !session.supportsVersion(APPLE_PAY_VERSION)) {
      return false;
    }
    return session.canMakePayments() === true;
  } catch {
    return false;
  }
};

export const useApplePayAvailability = () => {
  // Resolved after mount: `window` does not exist during SSR, and rendering
  // the tab on the server would hydrate-mismatch on non-Apple browsers.
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setAvailable(isApplePayAvailable());
  }, []);

  return available;
};

/**
 * Opens the Apple Pay sheet and resolves with the payment token to charge,
 * plus a `settle` callback.
 *
 * The sheet must not show its checkmark before the charge has actually gone
 * through, or a declined card leaves the host believing they paid. So the
 * session is held open: the caller charges the token and then calls
 * `settle(true|false)`, which is what dismisses the sheet.
 *
 * Must be called synchronously from the user's click — Safari rejects a
 * session begun outside the originating gesture. Resolves `null` when the
 * host cancels the sheet, so the caller can abort quietly rather than
 * surfacing an error.
 */
export const useApplePayToken = () => {
  const available = useApplePayAvailability();

  const requestToken = useCallback(({ amount, currency = "SAR", label, countryCode = "SA" }) => {
    if (!isApplePayAvailable()) {
      return Promise.reject(new Error("APPLE_PAY_UNAVAILABLE"));
    }

    const total = Number(amount);
    if (!Number.isFinite(total) || total <= 0) {
      return Promise.reject(new Error("APPLE_PAY_INVALID_AMOUNT"));
    }

    const session = new window.ApplePaySession(APPLE_PAY_VERSION, {
      countryCode,
      currencyCode: currency,
      supportedNetworks: SUPPORTED_NETWORKS,
      merchantCapabilities: MERCHANT_CAPABILITIES,
      total: { label: label || "Halaa", amount: total.toFixed(2), type: "final" },
    });

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      session.onvalidatemerchant = async (event) => {
        try {
          const response = await fetch(MOYASAR_APPLEPAY_INITIATE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              validation_url: event.validationURL,
              display_name: label || "Halaa",
              domain_name: window.location.hostname,
              publishable_api_key: getPublishableKey(),
            }),
          });
          if (!response.ok) throw new Error("APPLE_PAY_MERCHANT_VALIDATION_FAILED");
          session.completeMerchantValidation(await response.json());
        } catch (error) {
          session.abort();
          settle(reject, error);
        }
      };

      session.onpaymentauthorized = (event) => {
        const token = event?.payment?.token;
        if (!token) {
          session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          settle(reject, new Error("APPLE_PAY_NO_TOKEN"));
          return;
        }
        // The sheet stays open until the charge comes back — see `settle`.
        // Moyasar takes the token as an opaque string.
        settle(resolve, {
          token: JSON.stringify(token),
          settle: (ok) => {
            try {
              session.completePayment(
                ok
                  ? window.ApplePaySession.STATUS_SUCCESS
                  : window.ApplePaySession.STATUS_FAILURE
              );
            } catch {
              // Sheet already dismissed (host closed it, or a double settle).
            }
          },
        });
      };

      session.oncancel = () => settle(resolve, null);

      session.begin();
    });
  }, []);

  return { available, requestToken };
};

export default useApplePayToken;
