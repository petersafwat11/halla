/**
 * Design Tokens for Web
 * Generated from Figma export
 * Use these tokens throughout the app for consistent styling
 */

export const colors = {
  natural: {
    50: "#ffffff",
    100: "#fdfdfd",
    150: "#f7f7f7",
    200: "#f2f2f2",
    250: "#dfdfdf",
    300: "#cacaca",
    350: "#a0a0a0",
    400: "#767676",
    450: "#656565",
    500: "#4c4c4c",
    700: "#454545",
    800: "#3d3d3d",
    900: "#2c2c2c",
  },
  primary: {
    50: "#f9f4ef",
    100: "#f5ece4",
    200: "#e3cbb4",
    300: "#d6b392",
    400: "#cea57d",
    500: "#c28e5c",
    600: "#b18154",
    700: "#8a6541",
    800: "#6b4e33",
    900: "#513c27",
  },
  secondary: {
    50: "#eeeceb",
    100: "#c9c5c1",
    200: "#afa9a3",
    300: "#8b827a",
    400: "#756960",
    500: "#524438",
    600: "#4b3e33",
    700: "#3a3028",
    800: "#2d251f",
    900: "#221d18",
  },
  accent: {
    50: "#f6f4f2",
    100: "#e2dbd6",
    200: "#d3cac3",
    300: "#bfb2a7",
    400: "#b3a396",
    500: "#a08c7c",
    600: "#927f71",
    700: "#726358",
    800: "#584d44",
    900: "#433b34",
  },
  error: {
    50: "#f9ebea",
    100: "#ebc2bd",
    200: "#e2a49d",
    300: "#d57a71",
    400: "#cd6155",
    500: "#c0392b",
    600: "#af3427",
    700: "#88281f",
    800: "#6a1f18",
    900: "#511812",
  },
  success: {
    50: "#eaf4ef",
    100: "#bddbcc",
    200: "#9dcab4",
    300: "#70b291",
    400: "#55a37c",
    500: "#2a8c5b",
    600: "#267f53",
    700: "#1e6341",
    800: "#174d32",
    900: "#123b26",
  },
  warning: {
    50: "#fbf3e6",
    100: "#f1d8b0",
    200: "#ebc68a",
    300: "#e2ab54",
    400: "#dc9b33",
    500: "#d38200",
    600: "#c07600",
    700: "#965c00",
    800: "#744800",
    900: "#593700",
  },
  black: {
    10: "rgba(0, 0, 0, 0.1)",
    20: "rgba(0, 0, 0, 0.2)",
    30: "rgba(0, 0, 0, 0.3)",
    40: "rgba(0, 0, 0, 0.4)",
    50: "rgba(0, 0, 0, 0.5)",
    60: "rgba(0, 0, 0, 0.6)",
    70: "rgba(0, 0, 0, 0.7)",
    80: "rgba(0, 0, 0, 0.8)",
    90: "rgba(0, 0, 0, 0.9)",
    100: "#000000",
  },
  white: {
    10: "rgba(255, 255, 255, 0.1)",
    20: "rgba(255, 255, 255, 0.2)",
    30: "rgba(255, 255, 255, 0.3)",
    40: "rgba(255, 255, 255, 0.4)",
    50: "rgba(255, 255, 255, 0.5)",
    60: "rgba(255, 255, 255, 0.6)",
    70: "rgba(255, 255, 255, 0.7)",
    80: "rgba(255, 255, 255, 0.8)",
    90: "rgba(255, 255, 255, 0.9)",
    100: "#ffffff",
  },
};

export const backgrounds = {
  artboard: "#fcfaf8",
  card: {
    1: colors.natural[50],
    2: colors.natural[100],
    3: colors.natural[150],
    4: colors.natural[200],
    5: colors.primary[50],
    6: colors.primary[100],
    7: colors.primary[200],
    8: colors.primary[500],
    9: colors.success[500],
    10: colors.success[50],
    11: colors.error[50],
    12: colors.error[500],
    13: colors.warning[50],
  },
};

export const button = {
  primary: {
    bg: {
      active: colors.primary[500],
      hover: colors.primary[600],
      pressed: colors.primary[800],
      disabled: colors.primary[100],
    },
    fg: {
      active: colors.natural[50],
      disabled: colors.primary[400],
    },
    border: {
      focus: colors.primary[300],
    },
    icon: {
      active: colors.natural[50],
    },
  },
  secondary: {
    bg: {
      active: colors.primary[100],
      hover: "#f5ece4",
      pressed: colors.primary[400],
      disabled: colors.primary[50],
    },
    fg: {
      active: colors.primary[800],
      disabled: colors.primary[300],
    },
    border: {
      focus: colors.primary[400],
    },
    icon: {
      active: colors.primary[800],
    },
  },
  outline: {
    bg: {
      active: colors.natural[50],
      hover: colors.natural[100],
      pressed: colors.natural[150],
      disabled: colors.natural[200],
    },
    fg: {
      active: colors.primary[800],
      disabled: colors.natural[350],
    },
    border: {
      active: colors.primary[300],
      focus: colors.primary[400],
      disabled: colors.natural[300],
    },
  },
  transparent: {
    bg: {
      active: colors.natural[50],
      hover: colors.natural[100],
      pressed: colors.natural[150],
      disabled: colors.natural[200],
    },
    fg: {
      active: colors.primary[800],
      disabled: colors.natural[350],
    },
    border: {
      focus: colors.primary[300],
    },
  },
  destructive: {
    bg: {
      active: colors.error[50],
      hover: colors.error[100],
      pressed: colors.error[100],
      disabled: colors.error[50],
    },
    fg: {
      active: colors.error[500],
      disabled: colors.error[200],
    },
    border: {
      active: colors.error[500],
      focus: colors.error[500],
    },
  },
};

export const form = {
  label: colors.natural[900],
  bg: {
    active: colors.natural[50],
    hover: colors.natural[100],
    error: colors.error[50],
    disabled: colors.natural[100],
  },
  fg: {
    active: colors.natural[400],
    filled: colors.natural[900],
    success: colors.success[500],
    error: colors.error[500],
    disabled: colors.natural[300],
  },
  border: {
    active: colors.natural[250],
    hover: colors.primary[300],
    focused: colors.primary[500],
    error: "#c0392b",
    disabled: colors.natural[250],
  },
  icon: {
    active: colors.primary[500],
    error: colors.error[500],
    disabled: colors.primary[200],
  },
  hint: {
    default: colors.natural[400],
    inform: colors.accent[500],
  },
  labelDisabled: colors.natural[350],
};

export const text = {
  title: {
    white: colors.natural[50],
    black: colors.natural[900],
    brand: colors.primary[500],
    brand2: colors.primary[700],
  },
  body: {
    paragraph: colors.natural[900],
    description: colors.natural[450],
    dimmed: colors.natural[350],
    error: colors.error[500],
    success: colors.success[500],
  },
};

export const border = {
  black: colors.natural[900],
  brand: colors.primary[500],
  brand50: colors.primary[50],
  brand100: colors.primary[100],
  brand200: colors.primary[200],
  gray150: colors.natural[150],
  gray200: colors.natural[200],
  gray250: colors.natural[250],
  gray300: colors.natural[300],
  paragraph: colors.natural[900],
  description: colors.natural[400],
  dimmed: colors.natural[350],
  error: colors.error[500],
  active: colors.success[500],
  warning: colors.warning[400],
};

export const dialog = {
  bg: {
    active: colors.natural[50],
  },
  text: {
    title: colors.natural[900],
    description: colors.natural[450],
  },
  icon: {
    active: colors.natural[500],
  },
};

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  36: 36,
  40: 40,
  44: 44,
  48: 48,
  52: 52,
  56: 56,
  60: 60,
  64: 64,
  68: 68,
  72: 72,
  76: 76,
  80: 80,
  84: 84,
  88: 88,
  92: 92,
  96: 96,
  100: 100,
};

export const borderRadius = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  default: 12,
};

export const typography = {
  fontFamily: {
    english: "Inter",
    arabic: "Cairo",
  },
  fontSize: {
    huge: {
      xxlarge: 56,
      xlarge: 54,
      large: 48,
      medium: 44,
      small: 36,
    },
    display: {
      xxlarge: 56,
      xlarge: 54,
      large: 48,
      medium: 44,
      small: 36,
    },
    headline: {
      large: 32,
      medium: 28,
      small: 24,
    },
    title: {
      large: 24,
      medium: 16,
      small: 14,
    },
    body: {
      large: 16,
      medium: 14,
      small: 12,
    },
    label: {
      large: 14,
      medium: 12,
      small: 11,
    },
    caption: {
      large: 12,
      medium: 12,
      small: 10,
    },
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
  },
  lineHeight: {
    0: 64,
    1: 52,
    2: 44,
    3: 40,
    4: 36,
    5: 32,
    6: 28,
    7: 24,
    8: 20,
    9: 16,
  },
  letterSpacing: {
    default: 0,
    large: 8,
  },
};

export const iconSizes = {
  xxlarge: 40,
  xlarge: 32,
  large: 24,
  medium: 20,
  small: 16,
  xsmall: 12,
};

// Helper function to create text styles
export const createTextStyle = (
  size,
  weight = "regular",
  color = text.body.paragraph,
) => ({
  fontSize: size,
  fontWeight: typography.fontWeight[weight],
  color,
});

// Common text style presets
export const textStyles = {
  headlineLarge: {
    fontSize: typography.fontSize.headline.large,
    lineHeight: typography.lineHeight[3],
    fontWeight: typography.fontWeight.semibold,
  },
  headlineMedium: {
    fontSize: typography.fontSize.headline.medium,
    lineHeight: typography.lineHeight[5],
    fontWeight: typography.fontWeight.semibold,
  },
  headlineSmall: {
    fontSize: typography.fontSize.headline.small,
    lineHeight: typography.lineHeight[6],
    fontWeight: typography.fontWeight.semibold,
  },
  titleLarge: {
    fontSize: typography.fontSize.title.large,
    lineHeight: typography.lineHeight[6],
    fontWeight: typography.fontWeight.medium,
  },
  titleMedium: {
    fontSize: typography.fontSize.title.medium,
    lineHeight: typography.lineHeight[7],
    fontWeight: typography.fontWeight.medium,
  },
  titleSmall: {
    fontSize: typography.fontSize.title.small,
    lineHeight: typography.lineHeight[8],
    fontWeight: typography.fontWeight.medium,
  },
  bodyLarge: {
    fontSize: typography.fontSize.body.large,
    lineHeight: typography.lineHeight[7],
    fontWeight: typography.fontWeight.regular,
  },
  bodyMedium: {
    fontSize: typography.fontSize.body.medium,
    lineHeight: typography.lineHeight[8],
    fontWeight: typography.fontWeight.regular,
  },
  bodySmall: {
    fontSize: typography.fontSize.body.small,
    lineHeight: typography.lineHeight[9],
    fontWeight: typography.fontWeight.regular,
  },
  labelLarge: {
    fontSize: typography.fontSize.label.large,
    lineHeight: typography.lineHeight[8],
    fontWeight: typography.fontWeight.medium,
  },
  labelMedium: {
    fontSize: typography.fontSize.label.medium,
    lineHeight: typography.lineHeight[9],
    fontWeight: typography.fontWeight.medium,
  },
  labelSmall: {
    fontSize: typography.fontSize.label.small,
    lineHeight: typography.lineHeight[9],
    fontWeight: typography.fontWeight.medium,
  },
  captionLarge: {
    fontSize: typography.fontSize.caption.large,
    lineHeight: typography.lineHeight[9],
    fontWeight: typography.fontWeight.regular,
  },
  captionSmall: {
    fontSize: typography.fontSize.caption.small,
    lineHeight: typography.lineHeight[9],
    fontWeight: typography.fontWeight.regular,
  },
};

// Export default object with all tokens
export default {
  colors,
  backgrounds,
  button,
  form,
  text,
  border,
  dialog,
  spacing,
  borderRadius,
  typography,
  iconSizes,
  textStyles,
  createTextStyle,
};
