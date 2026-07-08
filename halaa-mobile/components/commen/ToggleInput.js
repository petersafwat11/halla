import React from "react";
import { View, Text, Switch, StyleSheet, Animated } from "react-native";
import { useFormContext, Controller } from "react-hook-form";

const ToggleInput = ({ name, label, disabled = false, description, rules }) => {
  const { control } = useFormContext();
  const [scaleValue] = React.useState(new Animated.Value(1));

  const handlePress = () => {
    if (!disabled) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value } }) => (
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleValue }] }]}
        >
          <View style={styles.labelContainer}>
            <Text style={[styles.label, disabled && styles.labelDisabled]}>
              {label}
            </Text>
            {description && (
              <View style={styles.content}>
                <Text style={styles.description}>{description}</Text>
              </View>
            )}
          </View>
          <Switch
            value={value || false}
            onValueChange={(val) => {
              handlePress();
              onChange(val);
            }}
            disabled={disabled}
            trackColor={{ false: "#e0e0e0", true: "#d4a574" }}
            thumbColor={value ? "#c28e5c" : "#f4f3f4"}
            ios_backgroundColor="#e0e0e0"
          />
        </Animated.View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 4,
  },
  labelDisabled: {
    color: "#999",
  },
  description: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    lineHeight: 18,
  },
});

export default ToggleInput;
