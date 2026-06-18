import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";

const DROPDOWN_STEPS = [
  { step: 1, key: "lastEvent.dropdown.eventDetails" },
  { step: 2, key: "lastEvent.dropdown.guestList" },
  { step: 3, key: "lastEvent.dropdown.invitationDesign" },
  { step: 4, key: "lastEvent.dropdown.invitationCustomization" },
];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function LastEventActions({
  canSendTest,
  canSchedule,
  isCompleted,
  onTestMessagePress,
  onSchedulePress,
  onViewStatsPress,
  onPostEventPress,
  onEditPress,
}) {
  const { t } = useTranslation("home");
  const [showDropdown, setShowDropdown] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1150,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1150,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const flashingStyle = {
    backgroundColor: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["#FFFFFF", "#FAF0E6"],
    }),
    borderColor: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["#D6B392", "#C28E5C"],
    }),
  };

  const handleEditStep = (step) => {
    setShowDropdown(false);
    if (onEditPress) onEditPress(step);
  };

  return (
    <>
      <View style={styles.actionButtonsRow}>
        {canSendTest && onTestMessagePress && (
          <AnimatedTouchableOpacity
            style={[styles.outlineButton, flashingStyle]}
            onPress={onTestMessagePress}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.testMessage")}</Text>
          </AnimatedTouchableOpacity>
        )}
        {canSchedule && onSchedulePress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onSchedulePress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.scheduleEvent")}</Text>
          </TouchableOpacity>
        )}
        {/* Notify Staff intentionally omitted here to match the web
            dashboard card (labbe LastEventActions). Notify Staff lives on
            the single-event page (EventActionsHeader) on both platforms. */}
        {onViewStatsPress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onViewStatsPress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.viewStats")}</Text>
          </TouchableOpacity>
        )}
        {isCompleted && onPostEventPress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onPostEventPress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.sharePostEvent")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isCompleted && (
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowDropdown(!showDropdown)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={12} color="#FFF" />
            <Text style={styles.editButtonText}>{t("lastEvent.buttons.editEvent")}</Text>
            <Ionicons
              name={showDropdown ? "chevron-up" : "chevron-down"}
              size={12}
              color="#FFF"
            />
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdown}>
              {DROPDOWN_STEPS.map((item) => (
                <TouchableOpacity
                  key={item.step}
                  style={styles.dropdownItem}
                  onPress={() => handleEditStep(item.step)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownItemText}>{t(item.key)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  actionButtonsRow: {
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },
  outlineButton: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  outlineButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 18,
  },
  dropdownWrapper: {
    position: "relative",
    width: "100%",
    marginTop: 8,
  },
  editButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    height: 40,
    width: "100%",
  },
  editButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 18,
    letterSpacing: 0.06,
  },
  dropdown: {
    position: "absolute",
    bottom: "100%",
    marginBottom: 8,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  dropdownItemText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    textAlign: "right",
  },
});
