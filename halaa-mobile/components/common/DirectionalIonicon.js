import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { resolveDirectionalIconName } from "@halaa/shared/utils/directionalIcons";
import { useLanguage } from "../../localization";

/**
 * Ionicon whose horizontal direction follows the selected app language.
 * Unlike I18nManager.isRTL, the language context updates in the same render
 * that changes the translations and also works in Expo Go.
 */
const DirectionalIonicon = ({ name, ...props }) => {
  const { isRTL } = useLanguage();
  const resolvedName = resolveDirectionalIconName(name, isRTL);

  return <Ionicons name={resolvedName} {...props} />;
};

export default DirectionalIonicon;
