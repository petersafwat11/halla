import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";

const CheckboxGroup = ({ name, items, columns = 2, rules }) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const selectedValues = value || [];

        const toggleItem = (itemValue) => {
          const newValues = selectedValues.includes(itemValue)
            ? selectedValues.filter((v) => v !== itemValue)
            : [...selectedValues, itemValue];
          onChange(newValues);
        };

        return (
          <View style={styles.container}>
            <View style={[styles.grid, { gap: 10 }]}>
              {items.map((item) => {
                const isSelected = selectedValues.includes(item.value);
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.item,
                      { width: columns === 2 ? "48%" : "100%" },
                      isSelected && styles.itemSelected,
                    ]}
                    onPress={() => toggleItem(item.value)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {error && (
              <Text style={styles.errorText}>{error.message}</Text>
            )}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F6F3",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#e8e0d8",
    gap: 8,
    marginBottom: 0,
  },
  itemSelected: {
    backgroundColor: "#FBF5EF",
    borderColor: "#C28E5C",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  checkboxSelected: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  itemText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#555",
    flex: 1,
  },
  itemTextSelected: {
    fontFamily: "Cairo_600SemiBold",
    color: "#8B6840",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 6,
  },
});

export default CheckboxGroup;
