/**
 * Shared keyboard-scaffold constants — the single source of truth for every
 * keyboard-aware owner in the app (blueprint §6, guardrail §12 rule 10).
 *
 * Page-local keyboard offsets, clearance margins, and dismiss-mode literals
 * are prohibited: import from this module so caret clearance stays identical
 * across screens, sheets, lists, and platforms.
 */

/**
 * Minimum px between a focused field's caret (and its immediate validation
 * message) and the keyboard / keyboard toolbar. Used as the default
 * `bottomOffset` of KeyboardAwareFormScrollView and as sheet footer padding.
 */
export const KEYBOARD_FIELD_CLEARANCE = 16;

/** Dragging a form dismisses the keyboard interactively on iOS… */
export const KEYBOARD_DISMISS_MODE_IOS = "interactive";

/** …and on drag on Android. */
export const KEYBOARD_DISMISS_MODE_ANDROID = "on-drag";

/**
 * Bottom sheets may occupy at most this fraction of the live window height,
 * computed from useWindowDimensions() — never a stale captured window height.
 */
export const SHEET_MAX_HEIGHT_RATIO = 0.9;

/** Small centered cards (OTP / confirmation / rating) stay visually compact. */
export const CENTERED_SHEET_MAX_HEIGHT_RATIO = 0.8;

/**
 * Files allowed to import react-native-keyboard-controller directly (outside
 * components/commen/keyboard). Keep in sync with __tests__/keyboard/.
 */
export const KEYBOARD_CONTROLLER_DIRECT_IMPORT_ALLOWLIST = [
  "components/commen/keyboard/KeyboardAwareFormScrollView.js",
  "components/commen/keyboard/KeyboardAwareListScrollComponent.js",
  "components/commen/keyboard/KeyboardSafeModalSheet.js",
];
