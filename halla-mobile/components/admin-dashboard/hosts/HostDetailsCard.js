import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import StatusBadge from "../common/StatusBadge";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

/**
 * HostDetailsCard - Detailed host information card
 *
 * @param {Object} props
 * @param {Object} props.host - Host data object
 */
const HostDetailsCard = ({ host }) => {
  if (!host) return null;

  const {
    name,
    email,
    phoneNumber,
    avatar,
    subscription,
    statistics,
    events,
    createdAt,
    lastLogin,
    emailVerified,
    profileCompleted,
    status,
  } = host;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const renderInfoRow = (icon, label, value, badge = null) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color={colors.primary[500]} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoRight}>
        {badge || <Text style={styles.infoValue}>{value}</Text>}
      </View>
    </View>
  );

  const totalGuests = events?.reduce((sum, e) => sum + (e.guestListLength || 0), 0) || 0;
  const totalEvents = statistics?.totalEvents || 0;
  const activeEvents = statistics?.activeEvents || 0;

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      {renderSection(
        "Profile",
        <>
          <View style={styles.profileHeader}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={colors.primary[500]} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name || "Unnamed Host"}</Text>
              <StatusBadge status={status || "unknown"} size="small" />
            </View>
          </View>
          {renderInfoRow("mail-outline", "Email", email || "N/A")}
          {renderInfoRow("call-outline", "Phone", phoneNumber || "N/A")}
        </>,
      )}

      {/* Subscription Section */}
      {renderSection(
        "Subscription",
        <>
          {renderInfoRow("card-outline", "Plan", subscription?.planId?.nameEn || subscription?.planId?.name || subscription?.planType || "No Plan")}
          {renderInfoRow(
            "calendar-outline",
            "End Date",
            formatDate(subscription?.endDate || subscription?.currentPeriodEnd),
          )}
          {renderInfoRow(
            "checkmark-circle-outline",
            "Status",
            null,
            <StatusBadge status={subscription?.status || "inactive"} size="small" />,
          )}
        </>,
      )}

      {/* Statistics Section */}
      {renderSection(
        "Statistics",
        <>
          {renderInfoRow("calendar-outline", "Total Events", totalEvents)}
          {renderInfoRow("flash-outline", "Active Events", activeEvents)}
          {renderInfoRow("people-outline", "Total Guests", totalGuests)}
        </>,
      )}

      {/* Account Section */}
      {renderSection(
        "Account",
        <>
          {renderInfoRow("time-outline", "Created", formatDate(createdAt))}
          {renderInfoRow("log-in-outline", "Last Login", formatDate(lastLogin))}
          {renderInfoRow(
            "shield-checkmark-outline",
            "Email Verification",
            null,
            <StatusBadge
              status={emailVerified ? "verified" : "pending"}
              size="small"
            />,
          )}
        </>,
      )}
    </View>
  );
};

HostDetailsCard.propTypes = {
  host: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    gap: spacing[20],
  },
  section: {
    gap: spacing[12],
  },
  sectionTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
  },
  sectionContent: {
    gap: spacing[12],
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    marginBottom: spacing[8],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius[20],
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius[20],
    backgroundColor: `${colors.primary[500]}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
    gap: spacing[8],
  },
  profileName: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[8],
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
  },
  infoRight: {
    alignItems: "flex-end",
  },
  infoValue: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.medium,
  },
});

export default HostDetailsCard;
