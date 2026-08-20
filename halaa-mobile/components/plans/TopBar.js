import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { colors, spacing, typography } from "../../styles/tokens";
import DirectionalIonicon from "../common/DirectionalIonicon";

/**
 * Symmetric three-column app bar (P1-08).
 *
 * Layout: [ start slot ] [ centered title ] [ end slot ]
 *  - start / end slots are equal-width and hold 44x44 controls (or custom
 *    content), so the title is mathematically centered independent of the side
 *    controls and does NOT shift between RTL and LTR.
 *  - The bar is direction-agnostic: it uses logical start/end via a plain `row`
 *    (React Native auto-flips `row` under the inherited layout direction),
 *    so there is NO hardcoded `row-reverse` and no manual double reversal.
 *  - The back chevron is chosen once from the resolved layout direction.
 *  - Minimum touch target is 44x44; the title truncates and exposes a
 *    screen-reader header label.
 *  - Safe-area insets are owned by the outer screen shell (SafeAreaView).
 */
const TOUCH = 44;

const TopBar = ({
  title,
  showBack = false,
  onBack,
  rightContent = null,
  leftContent = null,
}) => {
  const navigation = useNavigation();
  const { t } = useTranslation("common");

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  };

  // Logical start slot: back control > custom content > spacer.
  const renderStart = () => {
    if (showBack) {
      return (
        <TouchableOpacity
          style={styles.control}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t("back", { defaultValue: "Back" })}
          hitSlop={{ top: spacing[8], bottom: spacing[8], left: spacing[8], right: spacing[8] }}
        >
          <DirectionalIonicon
            name="chevron-back"
            size={24}
            color={colors.primary[50]}
          />
        </TouchableOpacity>
      );
    }
    if (leftContent) {
      return <View style={styles.slotContent}>{leftContent}</View>;
    }
    return <View style={styles.control} />;
  };

  // Logical end slot: custom content > spacer (keeps title centered).
  const renderEnd = () => {
    if (rightContent) {
      return <View style={[styles.slotContent, styles.slotEnd]}>{rightContent}</View>;
    }
    return <View style={styles.control} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[500]} />

      <View style={styles.content}>
        {/* Absolutely-centered title layer: centered across the full bar width,
            independent of the side slots, so it never shifts between RTL/LTR.
            Rendered behind the slots and padded away from the 44px controls. */}
        {!!title && (
          <View style={styles.titleLayer} pointerEvents="none">
            <Text
              style={styles.title}
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityRole="header"
            >
              {title}
            </Text>
          </View>
        )}

        <View style={styles.startSlot}>{renderStart()}</View>
        <View style={styles.spacer} />
        <View style={styles.endSlot}>{renderEnd()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary[500],
  },
  content: {
    // `row` auto-flips under the inherited RTL direction — logical
    // start/end, no hardcoded row-reverse.
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    minHeight: 57,
    width: "100%",
  },
  // Equal-width side slots keep the absolutely-centered title balanced.
  startSlot: {
    minWidth: TOUCH,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  endSlot: {
    minWidth: TOUCH,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  spacer: {
    flex: 1,
  },
  control: {
    width: TOUCH,
    height: TOUCH,
    justifyContent: "center",
    alignItems: "center",
  },
  slotContent: {
    justifyContent: "center",
    minHeight: TOUCH,
  },
  slotEnd: {
    alignItems: "flex-end",
  },
  // Title layer spans the whole bar and centers its text; the 44px horizontal
  // insets keep long titles from colliding with the corner controls.
  titleLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: TOUCH + spacing[8],
  },
  title: {
    textAlign: "center",
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
  },
});

export default TopBar;
