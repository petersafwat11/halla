/**
 * Design Tokens Usage Examples
 * This file demonstrates how to use the design tokens in your React Native components
 */

import { StyleSheet } from "react-native";
import tokens from "./tokens";

// Example 1: Basic Component Styling
export const basicStyles = StyleSheet.create({
  container: {
    backgroundColor: tokens.backgrounds.artboard,
    padding: tokens.spacing[16],
    borderRadius: tokens.borderRadius.default,
  },
  card: {
    backgroundColor: tokens.backgrounds.card[1],
    padding: tokens.spacing[20],
    borderRadius: tokens.borderRadius[12],
    borderWidth: 1,
    borderColor: tokens.border.gray250,
    marginBottom: tokens.spacing[16],
  },
  title: {
    ...tokens.textStyles.headlineMedium,
    color: tokens.text.title.black,
    marginBottom: tokens.spacing[8],
  },
  description: {
    ...tokens.textStyles.bodyMedium,
    color: tokens.text.body.description,
  },
});

// Example 2: Button Styles
export const buttonStyles = StyleSheet.create({
  // Primary Button
  primaryButton: {
    backgroundColor: tokens.button.primary.bg.active,
    paddingVertical: tokens.spacing[12],
    paddingHorizontal: tokens.spacing[24],
    borderRadius: tokens.borderRadius[8],
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...tokens.textStyles.labelLarge,
    color: tokens.button.primary.fg.active,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  primaryButtonDisabled: {
    backgroundColor: tokens.button.primary.bg.disabled,
  },
  primaryButtonTextDisabled: {
    color: tokens.button.primary.fg.disabled,
  },

  // Secondary Button
  secondaryButton: {
    backgroundColor: tokens.button.secondary.bg.active,
    paddingVertical: tokens.spacing[12],
    paddingHorizontal: tokens.spacing[24],
    borderRadius: tokens.borderRadius[8],
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    ...tokens.textStyles.labelLarge,
    color: tokens.button.secondary.fg.active,
    fontWeight: tokens.typography.fontWeight.semibold,
  },

  // Outline Button
  outlineButton: {
    backgroundColor: tokens.button.outline.bg.active,
    paddingVertical: tokens.spacing[12],
    paddingHorizontal: tokens.spacing[24],
    borderRadius: tokens.borderRadius[8],
    borderWidth: 1,
    borderColor: tokens.button.outline.border.active,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    ...tokens.textStyles.labelLarge,
    color: tokens.button.outline.fg.active,
    fontWeight: tokens.typography.fontWeight.semibold,
  },

  // Destructive Button
  destructiveButton: {
    backgroundColor: tokens.button.destructive.bg.active,
    paddingVertical: tokens.spacing[12],
    paddingHorizontal: tokens.spacing[24],
    borderRadius: tokens.borderRadius[8],
    borderWidth: 1,
    borderColor: tokens.button.destructive.border.active,
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveButtonText: {
    ...tokens.textStyles.labelLarge,
    color: tokens.button.destructive.fg.active,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});

// Example 3: Form Input Styles
export const formStyles = StyleSheet.create({
  inputContainer: {
    marginBottom: tokens.spacing[16],
  },
  label: {
    ...tokens.textStyles.labelMedium,
    color: tokens.form.label,
    marginBottom: tokens.spacing[8],
  },
  input: {
    backgroundColor: tokens.form.bg.active,
    borderWidth: 1,
    borderColor: tokens.form.border.active,
    borderRadius: tokens.borderRadius[8],
    paddingVertical: tokens.spacing[12],
    paddingHorizontal: tokens.spacing[16],
    ...tokens.textStyles.bodyMedium,
    color: tokens.form.fg.filled,
  },
  inputFocused: {
    borderColor: tokens.form.border.focused,
  },
  inputError: {
    backgroundColor: tokens.form.bg.error,
    borderColor: tokens.form.border.error,
  },
  inputDisabled: {
    backgroundColor: tokens.form.bg.disabled,
    borderColor: tokens.form.border.disabled,
    color: tokens.form.fg.disabled,
  },
  hint: {
    ...tokens.textStyles.captionSmall,
    color: tokens.form.hint.default,
    marginTop: tokens.spacing[4],
  },
  errorText: {
    ...tokens.textStyles.captionSmall,
    color: tokens.form.fg.error,
    marginTop: tokens.spacing[4],
  },
  successText: {
    ...tokens.textStyles.captionSmall,
    color: tokens.form.fg.success,
    marginTop: tokens.spacing[4],
  },
});

// Example 4: Card Styles with Different Variants
export const cardStyles = StyleSheet.create({
  defaultCard: {
    backgroundColor: tokens.backgrounds.card[1],
    padding: tokens.spacing[16],
    borderRadius: tokens.borderRadius[12],
    borderWidth: 1,
    borderColor: tokens.border.gray200,
    marginBottom: tokens.spacing[12],
  },
  elevatedCard: {
    backgroundColor: tokens.backgrounds.card[1],
    padding: tokens.spacing[20],
    borderRadius: tokens.borderRadius[16],
    shadowColor: tokens.colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: tokens.spacing[16],
  },
  brandCard: {
    backgroundColor: tokens.backgrounds.card[5],
    padding: tokens.spacing[16],
    borderRadius: tokens.borderRadius[12],
    borderWidth: 1,
    borderColor: tokens.border.brand100,
  },
  successCard: {
    backgroundColor: tokens.backgrounds.card[10],
    padding: tokens.spacing[16],
    borderRadius: tokens.borderRadius[12],
    borderWidth: 1,
    borderColor: tokens.colors.success[200],
  },
  errorCard: {
    backgroundColor: tokens.backgrounds.card[11],
    padding: tokens.spacing[16],
    borderRadius: tokens.borderRadius[12],
    borderWidth: 1,
    borderColor: tokens.colors.error[200],
  },
  warningCard: {
    backgroundColor: tokens.backgrounds.card[13],
    padding: tokens.spacing[16],
    borderRadius: tokens.borderRadius[12],
    borderWidth: 1,
    borderColor: tokens.colors.warning[200],
  },
});

// Example 5: Typography Styles
export const typographyStyles = StyleSheet.create({
  h1: {
    ...tokens.textStyles.headlineLarge,
    color: tokens.text.title.black,
    marginBottom: tokens.spacing[16],
  },
  h2: {
    ...tokens.textStyles.headlineMedium,
    color: tokens.text.title.black,
    marginBottom: tokens.spacing[12],
  },
  h3: {
    ...tokens.textStyles.headlineSmall,
    color: tokens.text.title.black,
    marginBottom: tokens.spacing[12],
  },
  h4: {
    ...tokens.textStyles.titleLarge,
    color: tokens.text.title.black,
    marginBottom: tokens.spacing[8],
  },
  h5: {
    ...tokens.textStyles.titleMedium,
    color: tokens.text.title.black,
    marginBottom: tokens.spacing[8],
  },
  h6: {
    ...tokens.textStyles.titleSmall,
    color: tokens.text.title.black,
    marginBottom: tokens.spacing[8],
  },
  bodyLarge: {
    ...tokens.textStyles.bodyLarge,
    color: tokens.text.body.paragraph,
    marginBottom: tokens.spacing[12],
  },
  bodyMedium: {
    ...tokens.textStyles.bodyMedium,
    color: tokens.text.body.paragraph,
    marginBottom: tokens.spacing[8],
  },
  bodySmall: {
    ...tokens.textStyles.bodySmall,
    color: tokens.text.body.paragraph,
    marginBottom: tokens.spacing[8],
  },
  caption: {
    ...tokens.textStyles.captionSmall,
    color: tokens.text.body.dimmed,
  },
  brandText: {
    ...tokens.textStyles.bodyMedium,
    color: tokens.text.title.brand,
  },
  errorText: {
    ...tokens.textStyles.bodySmall,
    color: tokens.text.body.error,
  },
  successText: {
    ...tokens.textStyles.bodySmall,
    color: tokens.text.body.success,
  },
});

// Example 6: List Item Styles
export const listStyles = StyleSheet.create({
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.backgrounds.card[1],
    padding: tokens.spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.gray200,
  },
  listItemIcon: {
    width: tokens.iconSizes.large,
    height: tokens.iconSizes.large,
    marginRight: tokens.spacing[12],
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    ...tokens.textStyles.bodyMedium,
    color: tokens.text.body.paragraph,
    fontWeight: tokens.typography.fontWeight.medium,
    marginBottom: tokens.spacing[4],
  },
  listItemDescription: {
    ...tokens.textStyles.bodySmall,
    color: tokens.text.body.description,
  },
  listItemChevron: {
    width: tokens.iconSizes.small,
    height: tokens.iconSizes.small,
    marginLeft: tokens.spacing[8],
  },
});

// Example 7: Dialog/Modal Styles
export const dialogStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tokens.colors.black[50],
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing[20],
  },
  dialog: {
    backgroundColor: tokens.dialog.bg.active,
    borderRadius: tokens.borderRadius[16],
    padding: tokens.spacing[24],
    width: "100%",
    maxWidth: 400,
    shadowColor: tokens.colors.black[100],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: tokens.spacing[16],
  },
  dialogIcon: {
    width: tokens.iconSizes.large,
    height: tokens.iconSizes.large,
    marginRight: tokens.spacing[12],
  },
  dialogTitle: {
    ...tokens.textStyles.titleLarge,
    color: tokens.dialog.text.title,
    flex: 1,
  },
  dialogDescription: {
    ...tokens.textStyles.bodyMedium,
    color: tokens.dialog.text.description,
    marginBottom: tokens.spacing[24],
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing[12],
  },
});

// Example 8: Badge/Chip Styles
export const badgeStyles = StyleSheet.create({
  badge: {
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[12],
    borderRadius: tokens.borderRadius[20],
    alignSelf: "flex-start",
  },
  badgeText: {
    ...tokens.textStyles.labelSmall,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  badgePrimary: {
    backgroundColor: tokens.colors.primary[100],
  },
  badgePrimaryText: {
    color: tokens.colors.primary[800],
  },
  badgeSuccess: {
    backgroundColor: tokens.colors.success[100],
  },
  badgeSuccessText: {
    color: tokens.colors.success[800],
  },
  badgeError: {
    backgroundColor: tokens.colors.error[100],
  },
  badgeErrorText: {
    color: tokens.colors.error[800],
  },
  badgeWarning: {
    backgroundColor: tokens.colors.warning[100],
  },
  badgeWarningText: {
    color: tokens.colors.warning[800],
  },
  badgeNeutral: {
    backgroundColor: tokens.colors.natural[200],
  },
  badgeNeutralText: {
    color: tokens.colors.natural[800],
  },
});

// Example 9: Icon Container Styles
export const iconStyles = StyleSheet.create({
  iconContainer: {
    width: tokens.iconSizes.large,
    height: tokens.iconSizes.large,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerSmall: {
    width: tokens.iconSizes.small,
    height: tokens.iconSizes.small,
  },
  iconContainerMedium: {
    width: tokens.iconSizes.medium,
    height: tokens.iconSizes.medium,
  },
  iconContainerLarge: {
    width: tokens.iconSizes.large,
    height: tokens.iconSizes.large,
  },
  iconContainerXLarge: {
    width: tokens.iconSizes.xlarge,
    height: tokens.iconSizes.xlarge,
  },
  iconContainerXXLarge: {
    width: tokens.iconSizes.xxlarge,
    height: tokens.iconSizes.xxlarge,
  },
  iconPrimary: {
    tintColor: tokens.colors.primary[500],
  },
  iconSecondary: {
    tintColor: tokens.colors.natural[500],
  },
  iconError: {
    tintColor: tokens.colors.error[500],
  },
  iconSuccess: {
    tintColor: tokens.colors.success[500],
  },
  iconWarning: {
    tintColor: tokens.colors.warning[500],
  },
});

// Example 10: Divider Styles
export const dividerStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: tokens.border.gray200,
    marginVertical: tokens.spacing[16],
  },
  dividerThick: {
    height: 2,
    backgroundColor: tokens.border.gray250,
    marginVertical: tokens.spacing[20],
  },
  dividerBrand: {
    height: 1,
    backgroundColor: tokens.border.brand200,
    marginVertical: tokens.spacing[16],
  },
  verticalDivider: {
    width: 1,
    backgroundColor: tokens.border.gray200,
    marginHorizontal: tokens.spacing[16],
  },
});

// Export all styles
export default {
  basicStyles,
  buttonStyles,
  formStyles,
  cardStyles,
  typographyStyles,
  listStyles,
  dialogStyles,
  badgeStyles,
  iconStyles,
  dividerStyles,
};
