/**
 * PurchaseLegalLinks — Terms / Privacy / Refund links for the purchase surface
 * (§7). Opens the canonical web legal pages (WEB_BASE_URL/<lang>/{terms,privacy,
 * refund}) in an in-app browser via expo-web-browser — robust from any stack and
 * consistent with the byte-identical web/mobile legal content.
 *
 * NOTE: a dedicated Support/Contact page does not yet exist on web or mobile
 * (P1-03) — documented for the legal/SEO session; not linked here.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { WEB_BASE_URL } from "../../config/api";
import { colors, spacing, typography } from "../../styles/tokens";

const LINKS = [
  { key: "legal.terms", path: "terms" },
  { key: "legal.privacy", path: "privacy" },
  { key: "legal.refund", path: "refund" },
];

const PurchaseLegalLinks = ({ t, lang = "ar" }) => {
  const open = (path) => {
    const url = `${WEB_BASE_URL}/${lang}/${path}`;
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      {LINKS.map((l, i) => (
        <React.Fragment key={l.key}>
          {i > 0 && <Text style={styles.sep}>·</Text>}
          <TouchableOpacity onPress={() => open(l.path)} activeOpacity={0.7}>
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
