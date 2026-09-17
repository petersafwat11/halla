import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { getPaymentMark } from "@halaa/shared/brand/paymentMarks";
import { colors, borderRadius, spacing } from "../../styles/tokens";

/**
 * Renders a payment brand mark from the shared mark data, so mobile shows the
 * SAME artwork as web instead of an approximation built from coloured boxes.
 *
 * Vector marks (Visa, Mastercard, mada) are the vendors' official paths and are
 * drawn to their own aspect ratio inside a fixed height. Wordmarks (stc bank,
 * Apple Pay) are set in type — see the provenance note in the shared module.
 *
 * @param {string} brand - a key from PAYMENT_MARKS
 * @param {number} [height] - rendered height in px; width follows the artwork
 * @param {boolean} [chip] - wrap in the white chip used to line marks up in a row
 */
export default function PaymentBrandMark({ brand, height = 20, chip = false, style }) {
  const mark = getPaymentMark(brand);
  if (!mark) return null;

  const content =
    mark.kind === "vector" ? (
      <VectorMark mark={mark} height={height} />
    ) : (
      <WordMark mark={mark} height={height} />
    );

  if (!chip) return <View style={style}>{content}</View>;

  return (
    <View style={[styles.chip, style]} accessibilityLabel={mark.label}>
      {content}
    </View>
  );
}

const VectorMark = ({ mark, height }) => {
  const [, , vbWidth, vbHeight] = mark.viewBox.split(/\s+/).map(Number);
  const width = Math.round(height * (vbWidth / vbHeight));
  const shapes = mark.shapes.map((shape, index) => (
    <Path key={index} d={shape.d} fill={shape.fill} />
  ));

  return (
    <Svg width={width} height={height} viewBox={mark.viewBox}>
      {mark.transform ? <G transform={mark.transform}>{shapes}</G> : shapes}
    </Svg>
  );
};

// Weights map onto the Cairo family the app loads globally (see cairoFont.js).
const WEIGHT_FONT = {
  bold: "Cairo_700Bold",
  regular: "Cairo_600SemiBold",
  light: "Cairo_400Regular",
};

const WordMark = ({ mark, height }) => {
  const fontSize = Math.round(height * 0.82);
  return (
    <View style={styles.wordmark}>
      {mark.glyph ? (
        <Svg width={fontSize} height={fontSize} viewBox={mark.glyph.viewBox}>
          <Path d={mark.glyph.d} fill={mark.color} />
        </Svg>
      ) : null}
      {mark.words.map((word) => (
        <Text
          key={word.text}
          // Brand wordmarks are Latin and never follow the UI locale.
          style={[
            styles.wordmarkText,
            { color: mark.color, fontSize, fontFamily: WEIGHT_FONT[word.weight] },
          ]}
          allowFontScaling={false}
        >
          {word.text}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    width: 46,
    height: 30,
    borderRadius: borderRadius[8],
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.natural[250],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[4],
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    // Latin wordmark — never mirrored by the RTL layout.
    direction: "ltr",
  },
  wordmarkText: {
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
});
