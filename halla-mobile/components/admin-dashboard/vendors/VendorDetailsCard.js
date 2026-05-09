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
 * VendorDetailsCard - Detailed vendor information card
 *
 * @param {Object} props
 * @param {Object} props.vendor - Vendor data object
 */
const VendorDetailsCard = ({ vendor }) => {
  const {
    businessName,
    businessDescription,
    category,
    ownerName,
    email,
    phone,
    avatar,
    averageRating = 0,
    totalReviews = 0,
    completedBookings = 0,
    totalRevenue = 0,
    createdAt,
    approvalDate,
    status,
  } = vendor;

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

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons
            key={i}
            name="star"
            size={16}
            color={colors.warning[500]}
          />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons
            key={i}
            name="star-half"
            size={16}
            color={colors.warning[500]}
          />,
        );
      } else {
        stars.push(
          <Ionicons
            key={i}
            name="star-outline"
            size={16}
            color={colors.natural[300]}
          />,
        );
      }
    }
    return stars;
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

  return (
    <View style={styles.container}>
      {/* Business Section */}
      {renderSection(
        "Business",
        <>
          <View style={styles.profileHeader}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="storefront"
                  size={40}
                  color={colors.primary[500]}
                />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{businessName}</Text>
              <StatusBadge status={status} size="small" />
            </View>
          </View>
          {renderInfoRow("pricetag-outline", "Category", category || "N/A")}
          {businessDescription && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{businessDescription}</Text>
            </View>
          )}
        </>,
      )}

      {/* Owner Section */}
      {renderSection(
        "Owner",
        <>
          {renderInfoRow("person-outline", "Name", ownerName)}
          {renderInfoRow("mail-outline", "Email", email)}
          {renderInfoRow("call-outline", "Phone", phone || "N/A")}
        </>,
      )}

      {/* Rating Section */}
      {renderSection(
        "Rating",
        <>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons
                name="star-outline"
                size={20}
                color={colors.primary[500]}
              />
              <Text style={styles.infoLabel}>Average Rating</Text>
            </View>
            <View style={styles.ratingContainer}>
              {renderStars(averageRating)}
              <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
            </View>
          </View>
          {renderInfoRow("chatbox-outline", "Total Reviews", totalReviews)}
        </>,
      )}

      {/* Statistics Section */}
      {renderSection(
        "Statistics",
        <>
          {renderInfoRow(
            "checkmark-circle-outline",
            "Completed",
            completedBookings,
          )}
          {renderInfoRow(
            "cash-outline",
            "Total Revenue",
            formatCurrency(totalRevenue),
          )}
        </>,
      )}

      {/* Account Section */}
      {renderSection(
        "Account",
        <>
          {renderInfoRow("time-outline", "Created", formatDate(createdAt))}
          {renderInfoRow(
            "checkmark-done-outline",
            "Approved",
            formatDate(approvalDate),
          )}
          {renderInfoRow(
            "shield-checkmark-outline",
            "Status",
            null,
            <StatusBadge status={status} size="small" />,
          )}
        </>,
      )}
    </View>
  );
};

VendorDetailsCard.propTypes = {
  vendor: PropTypes.shape({
    businessName: PropTypes.string.isRequired,
    businessDescription: PropTypes.string,
    category: PropTypes.string,
    ownerName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    phone: PropTypes.string,
    avatar: PropTypes.string,
    averageRating: PropTypes.number,
    totalReviews: PropTypes.number,
    completedBookings: PropTypes.number,
    totalRevenue: PropTypes.number,
    createdAt: PropTypes.string,
    approvalDate: PropTypes.string,
    status: PropTypes.string.isRequired,
  }).isRequired,
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
  descriptionContainer: {
    gap: spacing[8],
    paddingTop: spacing[8],
  },
  descriptionLabel: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
  },
  descriptionText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    lineHeight: typography.fontSize.body.medium * 1.5,
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
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  ratingText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.medium,
  },
});

export default VendorDetailsCard;
