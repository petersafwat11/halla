import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCount } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";
import { EVENT_STATUS, EVENT_STATUS_GROUPS } from "@halaa/shared/constants/eventStatus";

const StatsCards = ({ stats, eventStatus, activeFilter, onFilterPress }) => {
  const { t, currentLanguage } = useTranslation("events");

  const allCards = useMemo(() => ({
    confirmed: {
      key: "confirmed",
      label: t("statsCards.confirmed"),
      value: stats?.confirmed ?? 0,
      icon: "checkmark-circle-outline",
      bgColor: "#EAF4EF",
      textColor: "#2A8C5B"
    },
    declined: {
      key: "declined",
      label: t("statsCards.declined"),
      value: stats?.declined ?? 0,
      icon: "close-circle-outline",
      bgColor: "#F9EBEA",
      textColor: "#C0392B"
    },
    pending: {
      key: "noResponse",
      label: t("statsCards.pending"),
      value: stats?.pending ?? 0,
      icon: "time-outline",
      bgColor: "#F9FAFB",
      textColor: "#4B5563"
    },
  }), [stats, t]);

  const cards = useMemo(() => {
    if (!eventStatus) {
      return Object.values(allCards);
    }

    const isPreLaunch = EVENT_STATUS_GROUPS.PRE_LAUNCH.includes(eventStatus);
    const isLive = eventStatus === EVENT_STATUS.LIVE;

    const keys = ["confirmed", "declined"];

    if (isPreLaunch || isLive) {
      keys.push("pending");
    }

    return keys.map((k) => allCards[k]).filter(Boolean);
  }, [eventStatus, allCards]);

  return (
    <View style={styles.container}>
      {cards.map((card, index) => {
        const isActive = activeFilter === card.key;
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.card,
              { backgroundColor: card.bgColor },
              isActive && styles.cardActive,
            ]}
            onPress={() => onFilterPress && onFilterPress(card.key)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              {/* Semantic status icons — never mirrored. */}
              <Ionicons name={card.icon} size={12} color={card.textColor} />
              <LocalizedText
                style={[
                  styles.label,
                  { color: card.textColor }]}
                center
              >
                {card.label}
              </LocalizedText>
            </View>
            <LocalizedText
              style={[
                styles.value,
                { color: card.textColor }]}
              center
            >
              {formatCount(card.value, currentLanguage)}
            </LocalizedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    padding: 12
  },card: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    gap: 5,
    alignItems: "center"
  },
  cardActive: {
    borderWidth: 2,
    borderColor: "#C28E5C",
  },
  cardContent: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 4
  },  label: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    lineHeight: 16
  },value: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    lineHeight: 28
  },});

export default StatsCards;
