import React from "react";
import { resolveFontPatch } from "./cairoFont.js";
const RN = require("react-native");

const OriginalText = RN.Text;
const OriginalTextInput = RN.TextInput;

export const patchStyle = (style) => {
  const flatStyle = RN.StyleSheet.flatten(style) || {};
  const patch = resolveFontPatch(flatStyle);
  if (!patch) {
    return style;
  }
  return [style, patch];
};

const CustomText = React.forwardRef((props, ref) => {
  const newStyle = patchStyle(props.style);
  return React.createElement(OriginalText, { ...props, style: newStyle, ref });
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
  return React.createElement(OriginalTextInput, { ...props, style: newStyle, ref });
});

// Copy all static properties of OriginalTextInput to CustomTextInput
Object.getOwnPropertyNames(OriginalTextInput).forEach((key) => {
  try {
    CustomTextInput[key] = OriginalTextInput[key];
  } catch (e) {
    // Ignore read-only properties
  }
});

const installOverride = (key, component) => {
  const descriptor = Object.getOwnPropertyDescriptor(RN, key);

  // React Native Web exposes module exports as non-configurable getter-only
  // properties. Attempting the old assignment fallback throws before the app
  // can render. Native CommonJS exports remain configurable/writable, so keep
  // the override there and safely leave the web export untouched otherwise.
  if (!descriptor || descriptor.configurable) {
    Object.defineProperty(RN, key, {
      get() {
        return component;
      },
      configurable: true,
    });
    return;
  }

  if (descriptor.writable) {
    RN[key] = component;
  }
};

installOverride("Text", CustomText);
installOverride("TextInput", CustomTextInput);
