import React from "react";
import { Text, StyleSheet, View } from "react-native";
import { resolveTemplateFont } from "../../utils/cairoFont";

export default function OverlayItem({ overlay, value, containerWidth, containerHeight }) {
  if (!value || !containerWidth || !containerHeight) return null;
  const {
    topPct = 0, leftPct = 0, widthPct = 50,
    fontSizeVh = 2, fontWeight = "normal", textAlign = "center",
    color = "#000000", fontFamily,
  } = overlay;

  const top = (topPct / 100) * containerHeight;
  const left = (leftPct / 100) * containerWidth;
  const width = (widthPct / 100) * containerWidth;
  const fontSize = (fontSizeVh / 100) * containerHeight;
  // Force Cairo regardless of the stored overlay font (incl. legacy ids).
  const cairoFontFamily = resolveTemplateFont(fontFamily, fontWeight);

  return (
    <View style={[styles.container, { position: "absolute", top, left, width }]}>
      <Text
        style={{
          fontSize,
          fontWeight,
          textAlign,
          color,
          fontFamily: cairoFontFamily,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
