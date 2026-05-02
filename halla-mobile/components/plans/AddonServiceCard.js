import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const AddonServiceCard = ({
  title,
  description,
  price,
  unit,
  quantity,
  isSelected = false,
  onToggle,
}) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

  return (
    <TouchableOpacity
      style={[styles.addonCard, isSelected && styles.addonCardSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.pricing}>
          {quantity && (
            <Text style={styles.quantity}>
              {quantity} {unit}
            </Text>
          )}
          <View style={styles.priceTag}>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.currency}>{t("currency")}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  addonCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 2,
    borderColor: "#E5E7EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addonCardSelected: {
    borderColor: "#C28E5C",
    backgroundColor: "#FFFBF7",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E5E7EA",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  content: {
    flex: 1,
    gap: 8,
  },
  info: {
    gap: 4,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
  },
  description: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
    lineHeight: 18,
  },
  pricing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantity: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#8A6541",
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  price: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#C28E5C",
  },
  currency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#8A6541",
  },
});

export default AddonServiceCard;
