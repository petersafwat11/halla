/**
 * Shared full-form scroll owner (blueprint §6.2).
 *
 * Exactly one component owns focus scrolling for a given vertical scroll
 * region. Full-screen forms and wizard screens render this instead of a raw
 * ScrollView; it keeps the focused field's caret at least
 * KEYBOARD_FIELD_CLEARANCE px above the keyboard on both platforms, dismisses
 * the keyboard interactively (iOS) / on drag (Android), and falls back to an
 * ordinary ScrollView on web.
 *
 * Contract:
 * - preserves the standard ScrollView API (style, contentContainerStyle,
 *   refresh controls, refs) so most migrations are import/tag replacements;
 * - no hardcoded page padding;
 * - `bottomOffset` escape hatch for a documented different clearance;
 * - `enabled={false}` escape hatch for preview/canvas states with no
 *   editable controls (renders an ordinary ScrollView).
 *
 * Do not nest this component inside another keyboard-aware scroll view.
 */
import React, { forwardRef } from "react";
import { Platform, ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  KEYBOARD_FIELD_CLEARANCE,
  KEYBOARD_DISMISS_MODE_IOS,
  KEYBOARD_DISMISS_MODE_ANDROID,
} from "./keyboardConstants";

const IS_WEB = Platform.OS === "web";

const KeyboardAwareFormScrollView = forwardRef(function KeyboardAwareFormScrollView(
  {
    bottomOffset = KEYBOARD_FIELD_CLEARANCE,
    enabled = true,
    showsVerticalScrollIndicator = false,
    keyboardShouldPersistTaps = "handled",
    keyboardDismissMode,
    ...scrollViewProps
  },
  ref
) {
  const resolvedDismissMode =
    keyboardDismissMode ??
    (Platform.OS === "ios"
      ? KEYBOARD_DISMISS_MODE_IOS
      : KEYBOARD_DISMISS_MODE_ANDROID);

  // Web has no software-keyboard contract here: ordinary ScrollView fallback.
  // `enabled={false}` opts preview/canvas states out of focus scrolling.
  if (IS_WEB || !enabled) {
    return (
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={resolvedDismissMode}
        {...scrollViewProps}
      />
    );
  }

  return (
    <KeyboardAwareScrollView
      ref={ref}
      bottomOffset={bottomOffset}
      enabled={enabled}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={resolvedDismissMode}
      {...scrollViewProps}
    />
  );
});

KeyboardAwareFormScrollView.displayName = "KeyboardAwareFormScrollView";

export default KeyboardAwareFormScrollView;
