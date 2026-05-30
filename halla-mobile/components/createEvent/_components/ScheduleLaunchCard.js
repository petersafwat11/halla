import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLanguage, useTranslation } from "../../../localization";
import { formatDateTime } from "@halla/shared/utils/locale";
import Svg, { Path } from "react-native-svg";

const CalendarIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path d="M5.33301 1.33325V3.33325" stroke="#C28E5C" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.667 1.33325V3.33325" stroke="#C28E5C" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.6667 2.33325C12.8867 2.45325 14 3.29992 14 6.43325V10.5533C14 13.2999 13.3333 14.6733 10 14.6733H6C2.66667 14.6733 2 13.2999 2 10.5533V6.43325C2 3.29992 3.11333 2.45992 5.33333 2.33325H10.6667Z" stroke="#C28E5C" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ScheduleLaunchCard = ({ sendSchedule, scheduleDate, scheduleTime, t }) => {
  const { currentLanguage } = useLanguage();

  const renderScheduleText = () => {
    if (sendSchedule === "now" || !scheduleDate) {
      return t("summary.schedule.launchesImmediately");
    }
    const sourceMs = scheduleDate instanceof Date
      ? scheduleDate.getTime()
      : new Date(scheduleDate).getTime();
    if (Number.isNaN(sourceMs)) {
      return t("summary.schedule.launchesImmediately");
    }
    const dt = new Date(sourceMs);
    const timeMatch = /^(\d{1,2}):(\d{2}):(AM|PM)$/i.exec(scheduleTime);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = parseInt(timeMatch[2], 10);
      const period = timeMatch[3].toUpperCase();
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      dt.setHours(hour, min, 0, 0);
    }
    const formatted = formatDateTime(dt, currentLanguage, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
    return formatted;
  };

  return (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleHeader}>
        <View style={styles.scheduleIcon}><CalendarIcon /></View>
        <Text style={styles.scheduleTitle}>{t("summary.schedule.title")}</Text>
      </View>
      <Text style={styles.scheduleValue}>{renderScheduleText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scheduleCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  scheduleHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  scheduleIcon: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "#C28E5C", alignItems: "center", justifyContent: "center" },
  scheduleTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  scheduleValue: { fontSize: 13, fontFamily: "Cairo_500Medium", color: "#2C2C2C", textAlign: "right", lineHeight: 20 },
});

export default ScheduleLaunchCard;
