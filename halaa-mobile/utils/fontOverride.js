import React from "react";
import { normalizeCairoFamily } from "./cairoFont";
const RN = require("react-native");

const OriginalText = RN.Text;
const OriginalTextInput = RN.TextInput;

// @expo/vector-icons renders each glyph through a plain <Text> whose
// fontFamily is the icon set's own font (e.g. "ionicons", "material",
// "material-community", "FontAwesome5Free-Solid"). Forcing Cairo on those
// would map the icon's Private-Use codepoint onto a font that lacks it, so
// the glyph falls back to a random CJK/box character. Exempt them here.
const ICON_FONT_FAMILIES = new Set([
  "anticon",
  "entypo",
  "evilicons",
  "feather",
  "FontAwesome",
  "Fontisto",
  "foundation",
  "ionicons",
  "material",
  "material-community",
  "octicons",
  "simple-line-icons",
  "zocial",
]);

const isIconFontFamily = (fontFamily) =>
  typeof fontFamily === "string" &&
  (ICON_FONT_FAMILIES.has(fontFamily) || fontFamily.startsWith("FontAwesome"));

const patchStyle = (style) => {
  const flatStyle = RN.StyleSheet.flatten(style) || {};

  // Never rewrite an icon font — let the glyph render in its own family.
  if (isIconFontFamily(flatStyle.fontFamily)) {
    return style;
  }

  const fontFamily = normalizeCairoFamily(flatStyle.fontFamily, flatStyle.fontWeight);

  // Already a loaded Cairo variant — leave the style untouched.
  if (flatStyle.fontFamily === fontFamily) {
    return style;
  }

  // Append the resolved Cairo family; the trailing entry wins RN's merge,
  // overriding any non-Cairo, raw "Cairo", or unloaded Cairo_* family while
  // preserving every other declared property (incl. fontWeight).
  return [style, { fontFamily }];
};

const CustomText = React.forwardRef((props, ref) => {
  const newStyle = patchStyle(props.style);
  return <OriginalText {...props} style={newStyle} ref={ref} />;
});

// Copy all static properties of OriginalText to CustomText
Object.getOwnPropertyNames(OriginalText).forEach((key) => {
  try {
    CustomText[key] = OriginalText[key];
  } catch (e) {
    // Ignore read-only properties
  }
});

const CustomTextInput = React.forwardRef((props, ref) => {
  const newStyle = patchStyle(props.style);
  return <OriginalTextInput {...props} style={newStyle} ref={ref} />;
});

// Copy all static properties of OriginalTextInput to CustomTextInput
Object.getOwnPropertyNames(OriginalTextInput).forEach((key) => {
  try {
    CustomTextInput[key] = OriginalTextInput[key];
  } catch (e) {
    // Ignore read-only properties
  }
});

try {
  Object.defineProperty(RN, "Text", {
    get() {
      return CustomText;
    },
    configurable: true,
  });
  Object.defineProperty(RN, "TextInput", {
    get() {
      return CustomTextInput;
    },
    configurable: true,
  });
} catch (e) {
  RN.Text = CustomText;
  RN.TextInput = CustomTextInput;
}
