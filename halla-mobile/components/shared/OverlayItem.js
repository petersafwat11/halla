import React from "react";
import { Text, StyleSheet, View } from "react-native";

export default function OverlayItem({ overlay, value, containerWidth, containerHeight }) {
  if (!value || !containerWidth || !containerHeight) return null;
  const {
    topPct = 0, leftPct = 0, widthPct = 50, heightPct,
    fontSizeVh = 2, fontWeight = "normal", textAlign = "center",
    color = "#000000", fontFamily,
  } = overlay;

  const top = (topPct / 100) * containerHeight;
  const left = (leftPct / 100) * containerWidth;
  const width = (widthPct / 100) * containerWidth;
  const height = heightPct ? (heightPct / 100) * containerHeight : undefined;
  const fontSize = (fontSizeVh / 100) * containerHeight;

  return (
    <View style={[styles.container, { position: "absolute", top, left, width, height }]}>
      <Text
        style={{
          fontSize,
          fontWeight,
          textAlign,
          color,
          fontFamily,
        }}
        numberOfLines={height ? undefined : 1}
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
