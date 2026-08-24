import React from "react";
import { Text } from "react-native";
import { isolateAuto } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../localization";
import { resolveStrongDirection } from "../../hooks/useInputDirection";

/**
 * User/backend content whose script can differ from the UI locale
 * (blueprint §6): guest names, categories, addresses, template names,
 * notification bodies. The base writing direction is the first strong
 * character of the value (Latin → LTR, Arabic → RTL) with a fallback to
 * the UI locale for neutral-only strings, and mixed runs are wrapped in a
 * first-strong isolate so surrounding punctuation cannot spill across
 * scripts.
 */
const AdaptiveText = ({ children, style, numberOfLines, isolate = true }) => {
  const { isRTL } = useTranslation();
  const text = children == null ? "" : String(children);
  const writingDirection = resolveStrongDirection(text, isRTL);

  return (
    <Text numberOfLines={numberOfLines} style={[{ writingDirection }, style]}>
      {isolate && text.length > 0 ? isolateAuto(text) : children}
    </Text>
  );
};

export default AdaptiveText;
