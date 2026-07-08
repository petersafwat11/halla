import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const Button = ({
  text,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary", // primary, secondary, outline
  size = "medium", // small, medium, large
  fullWidth = true,
  style,
  textStyle,
}) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`button_${size}`]];

    if (fullWidth) {
      baseStyle.push(styles.buttonFullWidth);
    }

    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    }

    if (variant === "outline") {
      baseStyle.push(styles.buttonOutline);
    } else if (variant === "secondary") {
      baseStyle.push(styles.buttonSecondary);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText, styles[`buttonText_${size}`]];

    if (variant === "outline") {
      baseStyle.push(styles.buttonTextOutline);
    } else if (variant === "secondary") {
      baseStyle.push(styles.buttonTextSecondary);
    }

    return baseStyle;
  };

  const ButtonContent = () => (
    <Animated.View
      style={[getButtonStyle(), style, { transform: [{ scale: scaleValue }] }]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#c28e5c" : "#fff"}
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{text}</Text>
      )}
    </Animated.View>
  );

  if (variant === "primary" && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#c28e5c", "#a67c52"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[getButtonStyle(), style]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[getTextStyle(), textStyle]}>{text}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <ButtonContent />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonFullWidth: {
    width: "100%",
  },
  button_small: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  button_medium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonDisabled: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#c28e5c",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonText: {
    fontFamily: "Cairo_600SemiBold",
    color: "#fff",
  },
  buttonText_small: {
    fontSize: 14,
  },
  buttonText_medium: {
    fontSize: 16,
  },
  buttonText_large: {
    fontSize: 18,
  },
  buttonTextOutline: {
    color: "#c28e5c",
  },
  buttonTextSecondary: {
    color: "#2c2c2c",
  },
});

export default Button;
