import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DiscountCodeCard = ({
  discountCode,
  discountApplied,
  validating,
  onCodeChange,
  onApply,
  t,
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>
        <Ionicons name="pricetag-outline" size={16} color="#2C2C2C" />{" "}
        {t("summary.discountCode.title")}
      </Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.discountInputWrapper}>
        <TextInput
          style={[
            styles.discountInput,
            discountApplied && styles.discountInputApplied,
          ]}
          placeholder={t("summary.discountCode.placeholder")}
          placeholderTextColor="#999"
          value={discountCode}
          onChangeText={onCodeChange}
          autoCapitalize="characters"
          editable={!discountApplied}
        />
        <TouchableOpacity
          style={[
            styles.applyButton,
            (discountApplied || !discountCode.trim() || validating) &&
              styles.applyButtonDisabled,
          ]}
          onPress={onApply}
          disabled={discountApplied || !discountCode.trim() || validating}
          activeOpacity={0.7}
        >
          {validating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : discountApplied ? (
            <>
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={styles.applyButtonText}>
                {t("summary.discountCode.applied")}
              </Text>
            </>
          ) : (
            <Text style={styles.applyButtonText}>
              {t("summary.discountCode.apply")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
  },
  cardContent: { gap: 16 },
  discountInputWrapper: { flexDirection: "row", gap: 8 },
  discountInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#E5E7EA",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#2C2C2C",
    backgroundColor: "#FFF",
  },
  discountInputApplied: {
    backgroundColor: "#F5ECE4",
    borderColor: "#C28E5C",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#C28E5C",
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
  },
  applyButtonDisabled: { backgroundColor: "#E5E7EA" },
  applyButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#FFF",
  },
});

export default DiscountCodeCard;
