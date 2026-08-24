/**
 * Keyboard-aware `renderScrollComponent` adapter for FlatList/SectionList
 * (blueprint §6.3).
 *
 * Use ONLY where an editable field is actually part of the virtualized
 * scrolling region (e.g. a list footer containing an input). A search bar
 * fixed above a list does not need it — it is already visible. Never wrap a
 * long FlatList inside a KeyboardAwareFormScrollView; that breaks
 * virtualization and creates competing vertical scroll owners.
 *
 * Usage:
 *
 *   <FlatList
 *     renderScrollComponent={KeyboardAwareListScrollComponent}
 *     keyboardShouldPersistTaps="handled"
 *     ...
 *   />
 *
 * Props forwarded by FlatList/SectionList (keyboardShouldPersistTaps,
 * keyboardDismissMode, contentContainerStyle, refresh controls, …) win over
 * this component's defaults.
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

const KeyboardAwareListScrollComponent = forwardRef(
  function KeyboardAwareListScrollComponent(props, ref) {
    const {
      bottomOffset = KEYBOARD_FIELD_CLEARANCE,
      keyboardDismissMode,
      ...listScrollProps
    } = props;

    const resolvedDismissMode =
      keyboardDismissMode ??
      (Platform.OS === "ios"
        ? KEYBOARD_DISMISS_MODE_IOS
        : KEYBOARD_DISMISS_MODE_ANDROID);

    if (IS_WEB) {
      return (
        <ScrollView
          ref={ref}
          keyboardDismissMode={resolvedDismissMode}
          {...listScrollProps}
        />
      );
    }

    return (
      <KeyboardAwareScrollView
        ref={ref}
        bottomOffset={bottomOffset}
        keyboardDismissMode={resolvedDismissMode}
        {...listScrollProps}
      />
    );
  }
);

KeyboardAwareListScrollComponent.displayName =
  "KeyboardAwareListScrollComponent";

export default KeyboardAwareListScrollComponent;
