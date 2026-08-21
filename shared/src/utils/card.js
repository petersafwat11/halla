/**
 * Strict Card validation, formatting, and Moyasar wire-normalization utilities.
 */

/**
 * Format raw expiry input while user is typing or pasting into an MM/YY field.
 * Auto-inserts '/' after the 2-digit month boundary when moving forward,
 * and does not trap the caret when deleting.
 *
 * @param {string} input - Raw input string from onChange/onChangeText
 * @param {string} [prevInput=""] - Previous value of the input to detect deletion
 * @returns {{ formatted: string, month: string, year: string }}
 */
export function formatExpiryInput(input = "", prevInput = "") {
  const deleting = typeof prevInput === "string" && input.length < prevInput.length;
  const digits = String(input || "").replace(/\D/g, "").slice(0, 4);

  let formatted = digits;
  if (digits.length >= 3) {
    formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  } else if (digits.length === 2 && !deleting) {
    formatted = `${digits}/`;
  }

  const mm = digits.slice(0, 2);
  const yy = digits.slice(2, 4);

  return {
    formatted,
    month: mm,
    year: yy.length === 2 ? `20${yy}` : "",
  };
}

/**
 * Parses any expiry representation (e.g., "12/26", "1226", "12-26", "12 / 2026", { month: 12, year: 2026 })
 * into normalized 2-digit month and 4-digit year.
 *
 * @param {string|{ month?: string|number, year?: string|number }} expiry
 * @returns {{ month: string, year: string, monthNum: number, yearNum: number, isValidFormat: boolean }}
 */
export function parseCardExpiry(expiry) {
  if (!expiry) {
    return { month: "", year: "", monthNum: NaN, yearNum: NaN, isValidFormat: false };
  }

  let monthStr = "";
  let yearStr = "";

  if (typeof expiry === "object" && expiry !== null) {
    if (expiry.month !== undefined && expiry.month !== null) {
      monthStr = String(expiry.month).trim();
    }
    if (expiry.year !== undefined && expiry.year !== null) {
      yearStr = String(expiry.year).trim();
    }
  } else if (typeof expiry === "string") {
    const cleaned = expiry.trim();
    if (cleaned.includes("/") || cleaned.includes("-") || cleaned.includes(".")) {
      const parts = cleaned.split(/[\/\-\.]/).map((p) => p.trim().replace(/\D/g, ""));
      if (parts.length >= 2) {
        monthStr = parts[0];
        yearStr = parts[1];
      }
    } else {
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length === 4) {
        monthStr = digits.slice(0, 2);
        yearStr = digits.slice(2, 4);
      } else if (digits.length === 6) {
        monthStr = digits.slice(0, 2);
        yearStr = digits.slice(2, 6);
      } else if (digits.length === 3) {
        // e.g. 526 -> 05/26
        monthStr = digits.slice(0, 1);
        yearStr = digits.slice(1, 3);
      }
    }
  }

  const monthNum = parseInt(monthStr, 10);
  let yearNum = parseInt(yearStr, 10);

  if (!isNaN(yearNum) && yearNum < 100) {
    yearNum = 2000 + yearNum;
  }

  const normMonth = !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12
    ? String(monthNum).padStart(2, "0")
    : monthStr;
  const normYear = !isNaN(yearNum) ? String(yearNum) : yearStr;

  const isValidFormat =
    !isNaN(monthNum) &&
    monthNum >= 1 &&
    monthNum <= 12 &&
    !isNaN(yearNum) &&
    yearNum >= 2000 &&
    yearNum <= 2099;

  return {
    month: normMonth,
    year: normYear,
    monthNum,
    yearNum,
    isValidFormat,
  };
}

/**
 * Validates whether a card expiry date is structurally valid and not expired.
 * A card is considered valid through the last second of the month stated on the card.
 *
 * @param {string|number} monthInput
 * @param {string|number|Date} [yearInput]
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ valid: boolean, errorKey: string|null, errorCode: string|null }}
 */
export function validateCardExpiry(monthInput, yearInput, referenceDate = new Date()) {
  let month = monthInput;
  let year = yearInput;

  if (yearInput === undefined || yearInput instanceof Date) {
    // Single argument mode e.g. validateCardExpiry("12/26", refDate)
    const ref = yearInput instanceof Date ? yearInput : referenceDate;
    const parsed = parseCardExpiry(monthInput);
    month = parsed.month;
    year = parsed.year;
    referenceDate = ref;
  }

  if (!month || !year) {
    return {
      valid: false,
      errorKey: "checkout.errors.expiryRequired",
      errorCode: "EXPIRY_REQUIRED",
    };
  }

  const parsed = parseCardExpiry({ month, year });
  const m = parsed.monthNum;
  const y = parsed.yearNum;

  if (isNaN(m) || m < 1 || m > 12) {
    return {
      valid: false,
      errorKey: "checkout.errors.expiryMonthInvalid",
      errorCode: "INVALID_MONTH",
    };
  }

  const now = referenceDate instanceof Date ? referenceDate : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (isNaN(y) || y < currentYear || (y === currentYear && m < currentMonth)) {
    return {
      valid: false,
      errorKey: "checkout.errors.expiryExpired",
      errorCode: "EXPIRED",
    };
  }

  if (y > currentYear + 25) {
    return {
      valid: false,
      errorKey: "checkout.errors.expiryExpired",
      errorCode: "INVALID_YEAR",
    };
  }

  return {
    valid: true,
    errorKey: null,
    errorCode: null,
  };
}

/**
 * Luhn algorithm card number check.
 * @param {string} number
 * @returns {boolean}
 */
export function checkLuhn(number = "") {
  const digits = String(number).replace(/\D/g, "");
  if (!digits || digits.length < 12 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Detect card brand from number prefix (Visa, Mastercard, Mada, or Unknown).
 * @param {string} number
 * @returns {"visa"|"mastercard"|"mada"|"unknown"}
 */
export function detectCardBrand(number = "") {
  const clean = String(number).replace(/\D/g, "");
  if (!clean) return "unknown";

  const p6 = clean.substring(0, 6);
  const p4 = clean.substring(0, 4);
  const mada6 = [
    "406136", "410621", "417633", "422817", "422818", "422819", "428331", "428671", "428672", "428673", "431361", "432328", "434673", "439953", "440533", "440647", "445564", "446393", "446404", "446672", "455036", "455708", "457865", "457997", "458456", "462220", "468541", "468542", "468543", "483010", "483011", "483012", "484783", "486094", "486095", "486096", "489317", "489318", "489319", "493137", "504300", "506959", "506960", "506961", "506962", "506963", "513213", "520058", "521076", "524130", "524514", "529415", "529741", "530060", "530906", "531095", "531196", "532013", "535822", "535989", "536023", "537767", "539931", "543085", "543357", "549760", "554180", "557606", "558848", "585265", "588845", "588846", "588847", "588848", "588849", "588850", "588851", "588982", "588983", "589005", "589206", "604906", "605141", "636120", "968201", "968202", "968203", "968204", "968205", "968206", "968207", "968208", "968209", "968211"
  ];
  if (mada6.includes(p6)) return "mada";

  const p4Num = parseInt(p4, 10);
  if (p4Num === 5892 || p4Num === 9682) return "mada";

  if (clean.startsWith("4")) return "visa";

  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) {
    return "mastercard";
  }

  return "unknown";
}

/**
 * Builds the canonical wire format source for Moyasar/Backend payment checkout.
 * Month is an integer (1..12), Year is a 4-digit integer (e.g. 2026).
 *
 * @param {object} cardData - { name, number, month, year, cvc } or { name, number, expiry, cvc }
 * @returns {object}
 */
export function buildCreditCardSource(cardData = {}) {
  const parsedExpiry = parseCardExpiry(
    cardData.expiry || { month: cardData.month, year: cardData.year }
  );

  return {
    type: "creditcard",
    name: String(cardData.name || "").trim(),
    number: String(cardData.number || "").replace(/\D/g, ""),
    month: parsedExpiry.monthNum,
    year: parsedExpiry.yearNum,
    cvc: String(cardData.cvc || "").trim(),
  };
}
