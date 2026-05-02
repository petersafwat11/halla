import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

const StatsCard = ({ icon: Icon, iconColor, label, value, trend, trendColor }) => (
  <View style={styles.card}>
    <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
      {Icon && <Icon name={Icon} size={20} color="#FFF" />}
    </View>
    <View style={styles.contentContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {trend && (
          <View style={[styles.trendContainer, { backgroundColor: trendColor }]}>
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        )}
      </View>
    </View>
  </View>
);

const VendorStatsCards = ({
  rating = 4.5,
  activeServices = 5,
  inactiveServices = 2,
  totalServices = 7,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StatsCard
          Icon="calendar-check"
          iconColor="#376607"
          label="التقييم الكلى"
          value={rating}
          trend="قريباً"
          trendColor="rgba(192, 57, 43, 0.1)"
        />
        <StatsCard
          Icon="store"
          iconColor="#B5A107"
          label="الخدمات الغير نشطة"
          value={inactiveServices}
          trend="قريباً"
          trendColor="rgba(192, 57, 43, 0.1)"
        />
      </View>

      <View style={styles.row}>
        <StatsCard
          Icon="people"
          iconColor="#C28E5C"
          label="الخدمات النشطة"
          value={activeServices}
          trend="قريباً"
          trendColor="rgba(42, 140, 91, 0.1)"
        />
        <StatsCard
          Icon="calendar-check"
          iconColor="#376607"
          label="إجمالى الخدمات"
          value={totalServices}
          trend="قريباً"
          trendColor="rgba(192, 57, 43, 0.1)"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  row: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  card: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  valueRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
  },
  trendContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    fontFamily: "Cairo_400Regular",
    color: "#C0392B",
  },
});

export default VendorStatsCards;
