import React from "react";
import { Text, StyleSheet } from "react-native";
import { useTranslation } from "../../localization";

/**
 * App-authored translated UI copy (blueprint §6).
 *
 * Always follows the active locale's writing direction and native logical
 * alignment — never the script of individual characters, never a physical
 * `textAlign: "right"`. `textAlign: "left"` is intentionally used as the
 * logical start edge: React Native mirrors physical left/right under the
 * app's forced RTL, while `auto`/start follows the layout direction.
 * Centering is allowed when the design calls for it, but the writing
 * direction is still set so terminal punctuation stays at the sentence end.
 *
 * Roles map to the shared type scale so pages stop re-declaring label,
 * heading and caption typography inline.
 */
const ROLE_STYLES = StyleSheet.create({
  pageTitle: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#767676",
  },
  error: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
  },
  caption: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#767676",
  },
});

const LocalizedText = ({ role, center = false, style, numberOfLines, children }) => {
  const { isRTL } = useTranslation();

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        role ? ROLE_STYLES[role] : null,
        {
          writingDirection: isRTL ? "rtl" : "ltr",
          textAlign: center ? "center" : "left",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export default LocalizedText;
