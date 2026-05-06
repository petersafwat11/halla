import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Svg, Path } from "react-native-svg";

/**
 * GuestQuotaCounter Component
 * Shows guest usage against subscription limits with progress bar
 */
const GuestQuotaCounter = ({ currentGuests = 0, subscription }) => {
  // Backend /subscription-info shape: { guestLimit, isGuestUnlimited, ... }
  const guestLimit = subscription?.guestLimit ?? 0;
  const isUnlimited = subscription?.isGuestUnlimited === true;
  const hasSubscription = !!subscription;

  // Calculate percentage for progress bar
  const percentage = isUnlimited
    ? 0
    : guestLimit > 0
      ? Math.min(100, Math.round((currentGuests / guestLimit) * 100))
      : 0;

  // Determine status color
  const getStatusColor = () => {
    if (isUnlimited) return "green";
    if (percentage >= 100) return "red";
    if (percentage >= 80) return "orange";
    return "green";
  };

  const statusColor = getStatusColor();
  const remaining = isUnlimited ? "∞" : Math.max(0, guestLimit - currentGuests);
  const isLimitReached = !isUnlimited && guestLimit > 0 && currentGuests >= guestLimit;

  // Color mapping
  const colors = {
    green: "#10B981",
    orange: "#F59E0B",
    red: "#EF4444",
  };

  const progressColors = {
    green: "#10B981",
    orange: "#F59E0B",
    red: "#EF4444",
  };

  if (!hasSubscription) {
    return (
      <View style={styles.container}>
        <View style={styles.noSubscription}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>يرجى الاشتراك لإضافة ضيوف</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Path
              d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"
              fill="#656565"
            />
          </Svg>
          <Text style={styles.title}>حصة الضيوف</Text>
        </View>
        <View
          style={[styles.counter, { backgroundColor: colors[statusColor] }]}
        >
          {isUnlimited ? (
            <Text style={styles.counterText}>∞</Text>
          ) : (
            <Text style={styles.counterText}>
              {currentGuests}/{guestLimit}
            </Text>
          )}
        </View>
      </View>

      {!isUnlimited && (
        <View style={styles.progressWrapper}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, percentage)}%`,
                  backgroundColor: progressColors[statusColor],
                },
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {isUnlimited ? (
          <View style={styles.unlimitedContainer}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.unlimited}>ضيوف غير محدودين</Text>
          </View>
        ) : isLimitReached ? (
          <View style={styles.limitReachedContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.limitReachedText}>
              تم الوصول للحد الأقصى من الضيوف
            </Text>
          </View>
        ) : (
          <Text style={styles.remaining}>متبقي {remaining} ضيف</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noSubscription: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  warningIcon: {
    fontSize: 18,
  },
  warningText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#F59E0B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
  },
  counter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  counterText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
  progressWrapper: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  footer: {
    alignItems: "center",
  },
  unlimitedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkIcon: {
    fontSize: 16,
    color: "#10B981",
  },
  unlimited: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#10B981",
  },
  limitReachedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  limitReachedText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#EF4444",
  },
  remaining: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
  },
});

export default GuestQuotaCounter;
