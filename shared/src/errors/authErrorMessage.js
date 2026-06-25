/**
 * Resolve an ApiError (or any plain object with the same fields) to a
 * translated user-facing message via the `auth` namespace.
 *
 * Lookup priority:
 *   1) OTP subtype  (otpErrorType + meta cooldown/attemptsLeft)
 *   2) Account status (suspended / pending / rejected / inactive)
 *   3) Account lockout with dynamic `remainingMinutes`
 *   4) Code + field  (CONFLICT.email, DUPLICATE_FIELD.phoneNumber)
 *   5) Token-expired family (TOKEN_INVALID_OR_EXPIRED, VERIFICATION_LINK_EXPIRED)
 *   6) Code default subkey
 *   7) Status fallback (network, server, unknown)
 *
 * Returns `{ message, type, field, code, actionLink }`. Mobile callers
 * that don't render `actionLink` simply ignore it.
 */
const PREFIX = "authErrors";

const isConflictCode = (code) => code === "CONFLICT" || code === "DUPLICATE_FIELD";

export const authErrorMessage = (error, t) => {
  if (!error || typeof t !== "function") return null;

  const status = error.status ?? null;
  const code = error.code || null;
  const field = error.field || null;
  const otpErrorType = error.otpErrorType || null;
  const accountStatus = error.accountStatus || null;
  const remainingMinutes = error.remainingMinutes ?? null;
  const meta = error.meta || null;

  // 1) OTP subtypes — backend ships `otpErrorType` ∈
  //    {invalid, expired, max_attempts, cooldown, not_found, send_failed}.
  if (code === "OTP_ERROR" && otpErrorType) {
    let key = `${PREFIX}.OTP_ERROR.${otpErrorType}`;
    let interp = {};
    if (otpErrorType === "cooldown" && meta?.waitSeconds) {
      key = `${PREFIX}.OTP_ERROR.cooldown_with_seconds`;
      interp = { seconds: meta.waitSeconds };
    } else if (otpErrorType === "invalid" && meta?.attemptsLeft > 0) {
      key = `${PREFIX}.OTP_ERROR.invalid_with_attempts`;
      interp = { attemptsLeft: meta.attemptsLeft };
    }
    const msg = t(key, { defaultValue: "", ...interp });
    if (msg) {
      return { message: msg, type: "otp", field: null, actionLink: false, code };
    }
  }

  // 2) Account status
  if (code === "ACCOUNT_STATUS_ERROR" && accountStatus) {
    const msg = t(`${PREFIX}.ACCOUNT_STATUS_ERROR.${accountStatus}`, { defaultValue: "" });
    if (msg) {
      return { message: msg, type: "account", field: null, actionLink: false, code };
    }
  }

  // 3) Account lockout with dynamic minutes
  if (code === "ACCOUNT_LOCKED" && remainingMinutes) {
    const msg = t(`${PREFIX}.ACCOUNT_LOCKED_WITH_MINUTES`, {
      defaultValue: "",
      minutes: remainingMinutes,
    });
    if (msg) {
      return { message: msg, type: "account", field: null, actionLink: false, code };
    }
  }

  // 4) Code + field
  if (code && field) {
    const msg = t(`${PREFIX}.${code}.${field}`, { defaultValue: "" });
    if (msg) {
      const conflict = isConflictCode(code);
      return {
        message: msg,
        type: conflict ? "duplicate" : "validation",
        field,
        actionLink: conflict ? "login" : false,
        code,
      };
    }
  }

  // 5) Token-expired family — offers `requestNewLink` action on web
  if (code === "TOKEN_INVALID_OR_EXPIRED" || code === "VERIFICATION_LINK_EXPIRED") {
    const msg = t(`${PREFIX}.${code}`, { defaultValue: "" });
    if (msg) {
      return { message: msg, type: "token", field: null, actionLink: "requestNewLink", code };
    }
  }

  // 6) Code default subkey
  if (code) {
    const defaultMsg = t(`${PREFIX}.${code}.default`, { defaultValue: "" });
    const directMsg = t(`${PREFIX}.${code}`, { defaultValue: "" });
    const msg = defaultMsg || directMsg;
    if (msg && typeof msg === "string") {
      const conflict = isConflictCode(code);
      return {
        message: msg,
        type: conflict ? "duplicate" : "validation",
        field: field || null,
        actionLink: conflict ? "login" : false,
        code,
      };
    }
  }

  // 7) Transport / status fallbacks
  if (code === "NETWORK_ERROR") {
    return { message: t(`${PREFIX}.NETWORK_ERROR`), type: "network", field: null, actionLink: false, code };
  }
  if (code === "TIMEOUT") {
    return { message: t(`${PREFIX}.TIMEOUT`), type: "network", field: null, actionLink: false, code };
  }
  if (status >= 500) {
    return { message: t(`${PREFIX}.SERVER`), type: "general", field: null, actionLink: false, code };
  }
  if (status === 0) {
    return { message: t(`${PREFIX}.NETWORK`), type: "network", field: null, actionLink: false, code };
  }
  return { message: t(`${PREFIX}.UNKNOWN`), type: "general", field: null, actionLink: false, code };
};

export default authErrorMessage;
