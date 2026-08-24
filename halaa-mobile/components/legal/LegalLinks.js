/**
 * LegalLinks — reusable inline legal links that open canonical web legal
 * pages (backed by the SAME `@halaa/shared/legal` content the app renders) in an
 * in-app browser.
 *
 * `docTypes` selects which documents to show; paths come from the shared legal
 * manifest (`LEGAL_ROUTES`) so links can never drift from the real routes.
 * Direction-agnostic (RTL handled globally); wraps under font scaling.
 */

import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { LEGAL_ROUTES } from "@halaa/shared/legal";
import { useTranslation } from "../../localization";
import { WEB_BASE_URL } from "../../config/api";
import LocalizedText from "../commen/LocalizedText";
import { colors, spacing, typography } from "../../styles/tokens";

// documentType -> i18n key (settings namespace `tabs.*` or fallback).
const LABEL_KEYS = {
  terms: "tabs.terms",
  privacy: "tabs.privacy",
  "community-rules": "tabs.communityRules",
  refund: "tabs.refund",
  deletion: "tabs.deletion",
  support: "tabs.support",
};

const DEFAULT_LABELS = {
  // Last-resort bilingual fallback data (never rendered while the settings
  // `tabs.*` keys exist) — mirrors the reviewed legal document fixtures.
  terms: "الشروط والأحكام",
  privacy: "سياسة الخصوصية",
  "community-rules": "قواعد المجتمع",
  refund: "سياسة الاسترجاع",
  deletion: "حذف الحساب",
  support: "الدعم الفني",
};

const LegalLinks = ({
  docTypes = ["terms", "privacy", "community-rules"],
  prefix,
  noticeKey,
  style,
  lang: langProp,
}) => {
  const { t, currentLanguage } = useTranslation("settings");
  const lang = langProp || currentLanguage || "ar";

  const prefixText = prefix != null ? prefix : noticeKey ? t(noticeKey) : null;

  const open = (documentType) => {
    const slug = LEGAL_ROUTES[documentType] || documentType;
    WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/${lang}/${slug}`).catch(() => {});
  };

  const getLabel = (documentType) => {
    const key = LABEL_KEYS[documentType];
    const fallback = DEFAULT_LABELS[documentType] || documentType;
    return key ? t(key, { defaultValue: fallback }) : fallback;
  };

  return (
    <View style={[styles.wrap, style]}>
      {!!prefixText && <LocalizedText style={styles.prefix}>{prefixText}</LocalizedText>}
      {docTypes.map((documentType, i) => {
        const label = getLabel(documentType);
        return (
          <React.Fragment key={documentType}>
            {i > 0 && <LocalizedText style={styles.sep}>·</LocalizedText>}
            <TouchableOpacity
              onPress={() => open(documentType)}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={label}
            >
              <LocalizedText style={styles.link}>{label}</LocalizedText>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
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
