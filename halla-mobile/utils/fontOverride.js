import React from "react";
import { normalizeCairoFamily } from "./cairoFont";
const RN = require("react-native");

const OriginalText = RN.Text;
const OriginalTextInput = RN.TextInput;

const patchStyle = (style) => {
  const flatStyle = RN.StyleSheet.flatten(style) || {};
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
