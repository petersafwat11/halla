/**
 * LegalLinks — reusable inline legal links that open the canonical web legal
 * pages (backed by the SAME `@halaa/shared/legal` content the app renders) in an
 * in-app browser. Works from unauthenticated surfaces (signup) where the in-app
 * legal screens (which live in authenticated stacks) aren't reachable.
 *
 * `docTypes` selects which documents to show; paths come from the shared legal
 * manifest (`LEGAL_ROUTES`) so links can never drift from the real routes.
 * Direction-agnostic (RTL handled globally); wraps under font scaling.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { LEGAL_ROUTES } from "@halaa/shared/legal";
import { useTranslation } from "../../localization";
import { WEB_BASE_URL } from "../../config/api";
import { colors, spacing, typography } from "../../styles/tokens";

// documentType -> i18n key (settings namespace `tabs.*`).
const LABEL_KEYS = {
  terms: "tabs.terms",
  privacy: "tabs.privacy",
  "community-rules": "tabs.communityRules",
  refund: "tabs.refund",
  deletion: "tabs.deletion",
  support: "tabs.support",
};

const LegalLinks = ({
  docTypes = ["terms", "privacy", "community-rules"],
  prefix,
  noticeKey,
}) => {
  const { t, currentLanguage } = useTranslation("settings");
  const lang = currentLanguage || "ar";
  // Prefix text: explicit `prefix` wins; else resolve `noticeKey` from the
  // settings namespace so callers in other namespaces don't need the string.
  const prefixText = prefix != null ? prefix : noticeKey ? t(noticeKey) : null;

  const open = (documentType) => {
    const slug = LEGAL_ROUTES[documentType] || documentType;
    WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/${lang}/${slug}`).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      {!!prefixText && <Text style={styles.prefix}>{prefixText}</Text>}
      {docTypes.map((documentType, i) => (
        <React.Fragment key={documentType}>
          {i > 0 && <Text style={styles.sep}>·</Text>}
          <TouchableOpacity
            onPress={() => open(documentType)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t(LABEL_KEYS[documentType])}
          >
            <Text style={styles.link}>{t(LABEL_KEYS[documentType])}</Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    marginTop: spacing[16],
    paddingHorizontal: spacing[12],
  },
  prefix: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
  },
  link: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.small,
    color: colors.primary[600],
    textDecorationLine: "underline",
  },
  sep: {
    color: colors.natural[300],
    fontSize: typography.fontSize.label.small,
  },
});

export default LegalLinks;
