import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { colors, spacing, typography } from "../../styles/tokens";
import DirectionalIonicon from "../common/DirectionalIonicon";
import {
  resolveLabelDirection,
  resolveStrongDirection,
} from "../../hooks/useInputDirection";

/**
 * Logical-start app bar.
 *
 * Layout: [ back + page title ] ........ [ optional actions ]
 * The title intentionally sits beside the back affordance instead of floating
 * in the center of the safe area. A plain `row` follows the inherited RTL/LTR
 * layout, so Arabic places this cluster on the right and English on the left.
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
  logoSource = null,
}) => {
  const navigation = useNavigation();
  const { t, isRTL } = useTranslation("common");
  // Chrome (label direction) always follows the UI locale; the title's base
  // writing direction follows its own first strong character so a Latin
  // event/business name stays LTR inside an Arabic app bar and vice versa
  // (blueprint §6: backend values are adaptive, never page-locale forced).
  const chromeDirection = resolveLabelDirection("localized", { isRTL });
  const titleDirection = resolveStrongDirection(title ?? "", isRTL);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  };

  // Logical start control: back control > custom content > nothing.
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
    return null;
  };

  // Logical end slot: custom content > touch-target-sized balance slot.
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
        <View style={styles.startCluster}>
          {renderStart()}
          {!!logoSource && (
            <Image
              source={logoSource}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityLabel="Halaa"
            />
          )}
          {!!title && (
            <Text
              style={[styles.title, chromeDirection, { writingDirection: titleDirection }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityRole="header"
            >
              {title}
            </Text>
          )}
        </View>
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
  startCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  endSlot: {
    minWidth: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    flexShrink: 0,
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
  title: {
    flexShrink: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.title.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
  },
  brandLogo: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
});

export default TopBar;
