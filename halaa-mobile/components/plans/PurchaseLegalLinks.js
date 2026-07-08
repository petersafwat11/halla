/**
 * PurchaseLegalLinks — legal links for the purchase surface (§7).
 *
 * Opens the canonical web legal pages in an in-app browser via expo-web-browser.
 * The web routes are now backed by the SAME shared legal content package
 * (`@halla/shared/legal`) that these mobile screens render, so web/mobile parity
 * is guaranteed by construction. Paths come from the shared legal manifest
 * (`LEGAL_ROUTES`) so the links can never drift from the actual routes.
 *
 * Checkout surface docs = Terms, Privacy, Refund (+ Support now that it exists).
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { LEGAL_ROUTES } from "@halla/shared/legal";
import { WEB_BASE_URL } from "../../config/api";
import { colors, spacing, typography } from "../../styles/tokens";

const LINKS = [
  { key: "legal.terms", documentType: "terms" },
  { key: "legal.privacy", documentType: "privacy" },
  { key: "legal.refund", documentType: "refund" },
  { key: "legal.support", documentType: "support" },
];

const PurchaseLegalLinks = ({ t, lang = "ar" }) => {
  const open = (documentType) => {
    const slug = LEGAL_ROUTES[documentType] || documentType;
    const url = `${WEB_BASE_URL}/${lang}/${slug}`;
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      {LINKS.map((l, i) => (
        <React.Fragment key={l.key}>
          {i > 0 && <Text style={styles.sep}>·</Text>}
          <TouchableOpacity
            onPress={() => open(l.documentType)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t(l.key)}
          >
            <Text style={styles.link}>{t(l.key)}</Text>
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
    marginTop: spacing[8],
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

export default PurchaseLegalLinks;
