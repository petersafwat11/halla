import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../localization";
import { formatCount } from "@halaa/shared/utils/locale";
import { Svg, Path } from "react-native-svg";

const CalendarIcon = ({ color }) => (
  <Svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <Path
      d="M4.32422 1.07812V2.69975"
      stroke={color}
      strokeWidth="0.810811"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.64844 1.07812V2.69975"
      stroke={color}
      strokeWidth="0.810811"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M1.89258 4.91406H11.0818"
      stroke={color}
      strokeWidth="0.810811"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11.3508 4.59333V9.18792C11.3508 10.8095 10.54 11.8906 8.64812 11.8906H4.3238C2.4319 11.8906 1.62109 10.8095 1.62109 9.18792V4.59333C1.62109 2.97171 2.4319 1.89062 4.3238 1.89062H8.64812C10.54 1.89062 11.3508 2.97171 11.3508 4.59333Z"
      stroke={color}
      strokeWidth="0.810811"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.4841 7.40308H8.48895"
      stroke={color}
      strokeWidth="1.08108"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.4841 9.02808H8.48895"
      stroke={color}
      strokeWidth="1.08108"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.4841 7.40308H6.48895"
      stroke={color}
      strokeWidth="1.08108"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.4841 9.02808H6.48895"
      stroke={color}
      strokeWidth="1.08108"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.4841 7.40308H4.48895"
      stroke={color}
      strokeWidth="1.08108"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.4841 9.02808H4.48895"
      stroke={color}
      strokeWidth="1.08108"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CalendarTickIcon = ({ color }) => (
  <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <Path
      d="M4 1V2.5"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 1V2.5"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M1.75 4.54688H10.25"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11 9.5C11 9.875 10.895 10.23 10.71 10.53C10.365 11.11 9.73 11.5 9 11.5C8.495 11.5 8.035 11.315 7.685 11C7.53 10.87 7.395 10.71 7.29 10.53C7.105 10.23 7 9.875 7 9.5C7 8.395 7.895 7.5 9 7.5C9.6 7.5 10.135 7.76499 10.5 8.17999C10.81 8.53499 11 8.995 11 9.5Z"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.2207 9.49782L8.7157 9.99281L9.7807 9.00781"
      stroke={color}
      strokeWidth="0.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.5 4.25V8.17999C10.135 7.76499 9.6 7.5 9 7.5C7.895 7.5 7 8.395 7 9.5C7 9.875 7.105 10.23 7.29 10.53C7.395 10.71 7.53 10.87 7.685 11H4C2.25 11 1.5 10 1.5 8.5V4.25C1.5 2.75 2.25 1.75 4 1.75H8C9.75 1.75 10.5 2.75 10.5 4.25Z"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5.99725 6.85156H6.00174"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.14764 6.85156H4.15214"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.14764 8.35156H4.15214"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CalendarRemoveIcon = ({ color }) => (
  <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <Path
      d="M4 1V2.5"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 1V2.5"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M1.75 4.54688H10.25"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 11.5C10.1046 11.5 11 10.6046 11 9.5C11 8.39543 10.1046 7.5 9 7.5C7.89543 7.5 7 8.39543 7 9.5C7 10.6046 7.89543 11.5 9 11.5Z"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9.53461 10.055L8.47461 9"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9.52485 9.00781L8.46484 10.0678"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.5 4.25V8.17999C10.135 7.76499 9.6 7.5 9 7.5C7.895 7.5 7 8.395 7 9.5C7 9.875 7.105 10.23 7.29 10.53C7.395 10.71 7.53 10.87 7.685 11H4C2.25 11 1.5 10 1.5 8.5V4.25C1.5 2.75 2.25 1.75 4 1.75H8C9.75 1.75 10.5 2.75 10.5 4.25Z"
      stroke={color}
      strokeWidth="0.75"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5.99725 6.85156H6.00174"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.14764 6.85156H4.15214"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.14764 8.35156H4.15214"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StatsCards = ({
  totalEvents = 0,
  activeEvents = 0,
  endedEvents = 0,
  draftEvents = 0,
  embedded = false,
}) => {
  const { t, currentLanguage } = useTranslation("home");
  const locale = currentLanguage || "ar";
  const cards = [
    {
      label: t("dashboard.stats.all"),
      value: totalEvents,
      icon: <CalendarIcon color="#C28E5C" />,
      tint: "#F9F4EF",
    },
    {
      label: t("dashboard.stats.activeEvents"),
      value: activeEvents,
      icon: <CalendarTickIcon color="#2A8C5B" />,
      tint: "#EAF4EF",
    },
    {
      label: t("dashboard.stats.draftEvents"),
      value: draftEvents,
      icon: <CalendarIcon color="#D38200" />,
      tint: "#FBF3E6",
    },
    {
      label: t("dashboard.stats.endedEvents"),
      value: endedEvents,
      icon: <CalendarRemoveIcon color="#C0392B" />,
      tint: "#F9EBEA",
    },
  ];

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      {cards.map((card, index) => (
        <View key={index} style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: card.tint }]}>
            {card.icon}
          </View>
          {/* Counts are locale-formatted atomic tokens (Arabic digits in
              ar, Latin digits in en) — never raw stored numbers. */}
          <Text style={styles.value}>{formatCount(card.value, locale)}</Text>
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
            {card.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    paddingHorizontal: 24,
  },
  containerEmbedded: {
    paddingHorizontal: 0,
  },
  card: {
    flex: 1,
    padding: 10,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EBE5",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  value: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 26,
  },
});

export default StatsCards;
