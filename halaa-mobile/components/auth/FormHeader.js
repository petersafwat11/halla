import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import LocalizedText from "../commen/LocalizedText";

/**
 * Shared auth-form header. Title/subtitle are app-authored copy, so they
 * render through the localized text-role contract: the writing direction
 * follows the UI locale and centered alignment keeps terminal punctuation at
 * the sentence end — never a value's script, never physical alignment.
 */
const FormHeader = ({ title, subtitle }) => {
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
      <LocalizedText role="pageTitle" center style={styles.title}>
        {title}
      </LocalizedText>
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
    marginBottom: 32,
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
