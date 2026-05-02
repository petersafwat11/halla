// DEPRECATED: This component references old plan types (direct/managed).
// The plan system has been migrated to planFamily (basic/premium) + billingType (event/monthly).
// Do not use this component — use PlanFamilySelector instead.
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const ServiceModeToggle = ({ serviceMode, onChange }) => {
  const { t } = useTranslation("plans");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("serviceMode.title")}</Text>
        <Text style={styles.headerSubtitle}>{t("serviceMode.subtitle")}</Text>
      </View>

      <View style={styles.toggleWrapper}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            serviceMode === "direct" && styles.activeButton,
          ]}
          onPress={() => onChange("direct")}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={styles.iconWrapper}>
              <Ionicons
                name="hand-left-outline"
                size={24}
                color={serviceMode === "direct" ? "#FFF" : "#C28E5C"}
              />
            </View>
            <View style={styles.buttonText}>
              <Text
                style={[
                  styles.buttonTitle,
                  serviceMode === "direct" && styles.activeButtonTitle,
                ]}
              >
                {t("serviceMode.direct.title")}
              </Text>
              <Text
                style={[
                  styles.buttonDescription,
                  serviceMode === "direct" && styles.activeButtonDescription,
                ]}
              >
                {t("serviceMode.direct.description")}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            serviceMode === "managed" && styles.activeButton,
          ]}
          onPress={() => onChange("managed")}
          activeOpacity={0.8}
        >
          {serviceMode === "managed" && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>
                {t("serviceMode.managed.badge")}
              </Text>
            </View>
          )}
          <View style={styles.buttonContent}>
            <View style={styles.iconWrapper}>
              <Ionicons
                name="crown-outline"
                size={24}
                color={serviceMode === "managed" ? "#FFF" : "#C28E5C"}
              />
            </View>
            <View style={styles.buttonText}>
              <Text
                style={[
                  styles.buttonTitle,
                  serviceMode === "managed" && styles.activeButtonTitle,
                ]}
              >
                {t("serviceMode.managed.title")}
              </Text>
              <Text
                style={[
                  styles.buttonDescription,
                  serviceMode === "managed" && styles.activeButtonDescription,
                ]}
              >
                {t("serviceMode.managed.description")}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.hintContainer}>
        <Text style={styles.hintIcon}>
          {serviceMode === "managed" ? "✨" : "🎯"}
        </Text>
        <Text style={styles.hintText}>
          {serviceMode === "managed"
            ? t("serviceMode.managed.hint")
            : t("serviceMode.direct.hint")}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#2C2C2C",
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#656565",
    textAlign: "center",
  },
  toggleWrapper: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EA",
    position: "relative",
    overflow: "visible",
  },
  activeButton: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  premiumBadge: {
    position: "absolute",
    top: -8,
    right: 12,
    backgroundColor: "#8A6541",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  premiumBadgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 10,
    color: "#FFF",
  },
  buttonContent: {
    alignItems: "center",
    gap: 8,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(194, 142, 92, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    alignItems: "center",
    gap: 4,
  },
  buttonTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    textAlign: "center",
  },
  activeButtonTitle: {
    color: "#FFF",
  },
  buttonDescription: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
    textAlign: "center",
  },
  activeButtonDescription: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F5ECE4",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  hintIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  hintText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#6B4E33",
    lineHeight: 18,
  },
});

export default ServiceModeToggle;
