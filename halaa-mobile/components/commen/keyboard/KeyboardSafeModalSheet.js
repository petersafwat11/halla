/**
 * Shared native modal/sheet frame with exactly one declared keyboard owner
 * (blueprint §6.4).
 *
 * Owns:
 * - React Native Modal lifecycle + Android onRequestClose;
 * - transparent overlay with sibling backdrop hit region (outside-tap close
 *   without stealing drags/taps aimed at the sheet);
 * - keyboard-controller KeyboardAvoidingView around the sheet presentation —
 *   the single displacement owner (iOS pads; Android relies on the explicit
 *   `resize` softwareKeyboardLayoutMode declared in app.json);
 * - closed-state safe-area bottom padding (kept OUTSIDE the avoiding view so
 *   keyboard height and home-indicator inset are never blindly summed);
 * - fixed header slot, flexible body slot (minHeight 0 / flexShrink 1),
 *   optional footer slot that stays attached above the keyboard;
 * - max sheet height from live useWindowDimensions(), not a stale capture;
 * - scroll-body option (KeyboardAwareFormScrollView) or direct/virtualized
 *   body (FlatList/SectionList keep their own virtualization);
 * - onShow-based focus handoff for sheets that request autofocus (never focus
 *   before the native modal reports presentation);
 * - keyboard dismissal before completing a close transition.
 *
 * Three layouts (§6.4):
 * | Layout                                        | Props                          |
 * |-----------------------------------------------|--------------------------------|
 * | Fixed header + aware scroll body              | header + children, scrollBody  |
 * | Fixed header + virtualized body + sticky foot | header + FlatList child,       |
 * |                                               | scrollBody={false} + footer    |
 * | Small centered card                           | centered                       |
 */
import React, { useCallback } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardAwareFormScrollView from "./KeyboardAwareFormScrollView";
import {
  CENTERED_SHEET_MAX_HEIGHT_RATIO,
  SHEET_MAX_HEIGHT_RATIO,
} from "./keyboardConstants";

const IS_IOS = Platform.OS === "ios";

const KeyboardSafeModalSheet = ({
  visible,
  onClose,
  onShow,
  onRequestClose,
  header = null,
  footer = null,
  children = null,
  scrollBody = true,
  centered = false,
  maxHeightRatio,
  dismissOnBackdropPress = true,
  animationType = "slide",
  keyboardVerticalOffset = 0,
  contentContainerStyle,
  bodyStyle,
  sheetStyle,
  accessibilityLabel,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const resolvedMaxHeightRatio =
    maxHeightRatio ??
    (centered ? CENTERED_SHEET_MAX_HEIGHT_RATIO : SHEET_MAX_HEIGHT_RATIO);
  const maxSheetHeight = Math.round(windowHeight * resolvedMaxHeightRatio);

  const requestClose = useCallback(() => {
    // Dismiss the keyboard BEFORE unmounting so an active input never leaves
    // a stale frame behind during the close/navigation transition (§10).
    Keyboard.dismiss();
    onClose?.();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (onRequestClose) {
      onRequestClose();
      return;
    }
    requestClose();
  }, [onRequestClose, requestClose]);

  const bodyContent = scrollBody ? (
    <KeyboardAwareFormScrollView
      contentContainerStyle={[
        centered
          ? styles.centeredScrollContent
          : styles.scrollContent,
        contentContainerStyle,
      ]}
      alwaysBounceVertical={false}
      nestedScrollEnabled
    >
      {children}
    </KeyboardAwareFormScrollView>
  ) : (
    children
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={handleRequestClose}
      onShow={onShow}
    >
      <View style={[styles.overlay, centered && styles.overlayCentered]}>
        {/* Backdrop and sheet are SIBLING hit regions: taps outside close the
            sheet; taps/drag gestures inside never reach the backdrop. */}
        <Pressable
          style={styles.backdrop}
          onPress={dismissOnBackdropPress ? requestClose : undefined}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
        {/* Closed-state safe-area padding lives OUTSIDE the avoiding view so
            keyboard displacement and home-indicator inset are not summed. */}
        <View
          style={
            centered ? styles.cardSafeArea : { paddingBottom: insets.bottom }
          }
          pointerEvents="box-none"
        >
          <KeyboardAvoidingView
            behavior={IS_IOS ? "padding" : undefined}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={styles.avoider}
            pointerEvents="box-none"
          >
            <View
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel}
              testID={testID}
              style={[
                styles.sheet,
                centered && styles.sheetCentered,
                { maxHeight: maxSheetHeight },
                sheetStyle,
              ]}
            >
              {header}
              <View style={[styles.body, bodyStyle]}>{bodyContent}</View>
              {footer ? (
                <View style={styles.footerSlot}>{footer}</View>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayCentered: {
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  avoider: {
    flexShrink: 1,
  },
  cardSafeArea: {},
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexShrink: 1,
    overflow: "hidden",
  },
  sheetCentered: {
    borderRadius: 20,
  },
  body: {
    minHeight: 0,
    flexShrink: 1,
  },
  footerSlot: {
    flexShrink: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centeredScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
});

export default KeyboardSafeModalSheet;
