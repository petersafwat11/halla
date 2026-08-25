import React from "react";
import { View, StyleSheet, Animated, Image } from "react-native";
import LocalizedText from "../commen/LocalizedText";

/**
 * Shared auth-form header. Title/subtitle are app-authored copy, so they
 * render through the localized text-role contract: the writing direction
 * follows the UI locale and centered alignment keeps terminal punctuation at
 * the sentence end — never a value's script, never physical alignment.
 *
 * Pass `logo` (a require() image source) to render the brand mark instead of
 * a text title; `subtitle` still renders beneath it when provided.
 */
const FormHeader = ({ title, subtitle, logo }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {logo && <Image source={logo} style={styles.logo} resizeMode="contain" />}
      {!!title && (
        <LocalizedText role="pageTitle" center style={styles.title}>
          {title}
        </LocalizedText>
      )}
      {subtitle && (
        <LocalizedText role="description" center style={styles.subtitle}>
          {subtitle}
        </LocalizedText>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 32,
    alignItems: "center",
  },
  logo: {
    width: 84,
    height: 84,
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
  },
});

export default FormHeader;
