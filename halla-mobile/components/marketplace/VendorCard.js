import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";

const MAX_VISIBLE_TAGS = 3;

const VendorCard = ({ vendor, onCallPress, index = 0 }) => {
  const { t } = useTranslation("marketplace");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: index * 60,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        delay: index * 60,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, slideAnim]);

  const handleCallPress = () => {
    onCallPress && onCallPress(vendor);
  };

  const hasImage = !!vendor.image && !imageError;
  const hasRating = vendor.rating != null && Number(vendor.rating) > 0;
  const reviewCount = Number(vendor.reviewCount) || 0;
  const initial = (vendor.name || vendor.companyName || "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  const visibleTags = (vendor.tags || []).slice(0, MAX_VISIBLE_TAGS);
  const extraTagsCount = (vendor.tags?.length || 0) - visibleTags.length;
  const hasPrice = vendor.price != null && vendor.price !== "";

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ────── Image with rating overlay ────── */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image
            source={{ uri: vendor.image }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackInitial}>{initial}</Text>
          </View>
        )}

        {hasRating && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color="#F5B342" />
            <Text style={styles.ratingValue}>
              {Number(vendor.rating).toFixed(1)}
            </Text>
            {reviewCount > 0 && (
              <Text style={styles.reviewsCount}>({reviewCount})</Text>
            )}
          </View>
        )}
      </View>

      {/* ────── Content ────── */}
      <View style={styles.content}>
        <View style={styles.heading}>
          {vendor.companyName ? (
            <Text style={styles.vendorName} numberOfLines={1}>
              {vendor.companyName}
            </Text>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {vendor.name}
          </Text>
        </View>

        {vendor.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#9A9A9A" />
            <Text style={styles.location} numberOfLines={1}>
              {vendor.location}
            </Text>
          </View>
        ) : null}

        {visibleTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {visibleTags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {extraTagsCount > 0 && (
              <View style={styles.tagMore}>
                <Text style={styles.tagMoreText}>+{extraTagsCount}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
          {hasPrice ? (
            <Text style={styles.price}>
              {vendor.price} {t("vendor.sar")}
            </Text>
          ) : (
            <Text style={styles.priceOnRequest}>
              {t("vendor.priceOnRequest", "السعر عند الطلب")}
            </Text>
          )}

          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallPress}
            activeOpacity={0.85}
          >
            <Ionicons name="call-outline" size={14} color="#FFF" />
            <Text style={styles.callButtonText}>{t("vendor.callNow")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  /* ────── IMAGE ────── */
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 10,
    backgroundColor: "#F4EFE9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackInitial: {
    fontFamily: "Cairo_700Bold",
    fontSize: 64,
    color: "#FFFFFF",
    textTransform: "uppercase",
    includeFontPadding: false,
  },

  /* ────── RATING ────── */
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(17,24,39,0.78)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
    color: "#FFF",
    lineHeight: 14,
  },
  reviewsCount: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    color: "#FFF",
    opacity: 0.85,
    lineHeight: 14,
  },

  /* ────── CONTENT ────── */
  content: {
    padding: 16,
    gap: 12,
  },
  heading: {
    gap: 4,
  },
  vendorName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    color: "#C28E5C",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 22,
  },

  /* ────── LOCATION ────── */
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  location: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    color: "#6B6B6B",
    lineHeight: 18,
  },

  /* ────── TAGS ────── */
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: "#F5F1EC",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
    color: "#4A4A4A",
    lineHeight: 16,
  },
  tagMore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagMoreText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    color: "#C28E5C",
    lineHeight: 16,
  },

  /* ────── FOOTER ────── */
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EAE3",
    paddingTop: 12,
  },
  price: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  priceOnRequest: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#6B6B6B",
    fontStyle: "italic",
  },
  callButton: {
    backgroundColor: "#C28E5C",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  callButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#FFF",
    lineHeight: 16,
  },
});

export default VendorCard;
