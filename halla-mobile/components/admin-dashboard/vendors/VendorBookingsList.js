import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";

const VendorBookingsList = ({ bookings }) => {
  if (!bookings || bookings.length === 0) {
    return <EmptyState icon="receipt-outline" title="No Bookings" message="This vendor has no bookings yet" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookings</Text>
      {bookings.map((item) => (
        <View key={item._id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.serviceName || item.eventName || "Booking"}</Text>
            {item.status && <StatusBadge status={item.status} size="small" />}
          </View>
          {item.amount != null && <Text style={styles.amount}>{item.amount} SAR</Text>}
          {item.date && <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing[16] },
  title: { ...textStyles.titleMedium, color: colors.natural[900], marginBottom: spacing[12] },
  card: { backgroundColor: backgrounds.card[1], padding: spacing[12], marginBottom: spacing[8], borderRadius: borderRadius[8] },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { ...textStyles.bodyMedium, color: colors.natural[900], flex: 1 },
  amount: { ...textStyles.labelLarge, color: colors.primary[500], marginTop: spacing[4] },
  date: { ...textStyles.bodySmall, color: colors.natural[450], marginTop: spacing[4] },
});

export default VendorBookingsList;
