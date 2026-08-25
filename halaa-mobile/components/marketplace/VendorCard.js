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
import LocalizedText from "../commen/LocalizedText";
import AdaptiveText from "../commen/AdaptiveText";
import { countToken, priceToken } from "@halaa/shared/utils/displayTokens";
import { formatNumber } from "@halaa/shared/utils/locale";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { getImageUrl } from "../../utils/imageUtils";

const MAX_VISIBLE_TAGS = 3;

const VendorCard = ({ vendor, onPress, index = 0 }) => {
  const { t, currentLanguage } = useTranslation("marketplace");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: Math.min(index, 5) * 45,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        delay: Math.min(index, 5) * 45,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, slideAnim]);

  const handlePress = () => {
    onPress && onPress(vendor);
  };

  // Backend refs are relative "/uploads/…" paths — absolutize for RN Image.
  const coverImage = getImageUrl(
    vendor.presentationImage || vendor.coverImage
  );
  const logo = getImageUrl(vendor.logo);
  const hasImage = !!coverImage && !imageError;
  const hasLogo = !!logo && !logoError;
  const hasRating = vendor.rating != null && Number(vendor.rating) > 0;
  const initial = (vendor.brandName || "?").trim().charAt(0).toUpperCase();
  const logoInitial = (vendor.brandName || "?").trim().charAt(0).toUpperCase();
  const visibleTags = (vendor.serviceCategories || []).slice(0, MAX_VISIBLE_TAGS);
  const translatedTags = visibleTags.map((key) => t(`sections.${key}`, key));
  const extraTagsCount = (vendor.serviceCategories?.length || 0) - visibleTags.length;
  const hasPrice = vendor.minPrice != null && vendor.minPrice !== "";

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ────── Image with logo medallion ────── */}
      <TouchableOpacity style={styles.imageContainer} onPress={handlePress} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={t("vendor.viewProfileFor", { name: vendor.brandName })}>
        {hasImage ? (
          <Image
            source={{ uri: coverImage }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            {/* Brand initial is decorative artwork — physical by design. */}
            <Text style={styles.imageFallbackInitial}>{initial}</Text>
          </View>
        )}

        <View style={styles.logoBadge}>
          {hasLogo ? (
            <Image
              source={{ uri: logo }}
              style={styles.logoBadgeImg}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <View style={styles.logoBadgeFallback}>
              <Text style={styles.logoBadgeFallbackText}>{logoInitial}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ────── Content ────── */}
      <View style={styles.content}>
        <TouchableOpacity onPress={handlePress}>
          {/* Brand name is backend content → adaptive first-strong direction. */}
          <AdaptiveText numberOfLines={1} style={styles.title}>
            {vendor.brandName}
          </AdaptiveText>
        </TouchableOpacity>

        {vendor.description ? (
          <AdaptiveText numberOfLines={2} style={styles.description}>
            {vendor.description}
          </AdaptiveText>
        ) : null}

        <View style={styles.meta}>
          {hasRating ? (
            <View style={styles.rating}>
              {/* Star glyph is semantic, never mirrored. The numeric rating
                  is one LTR-isolated locale-formatted token. */}
              <Ionicons name="star" size={14} color="#F5B342" />
              <LocalizedText style={styles.ratingValue}>
                {isolateLtr(
                  formatNumber(vendor.rating, currentLanguage, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })
                )}
              </LocalizedText>
            </View>
          ) : null}
          {vendor.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#C0A483" />
              <AdaptiveText numberOfLines={1} style={styles.location}>
                {vendor.location}
              </AdaptiveText>
            </View>
          ) : null}
        </View>

        {translatedTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {translatedTags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <LocalizedText style={styles.tagText}>{tag}</LocalizedText>
              </View>
            ))}
            {extraTagsCount > 0 && (
              <View style={styles.tagMore}>
                <LocalizedText style={styles.tagMoreText}>
                  {/* "+N" is ONE atomic LTR-isolated token (blueprint §6):
                      the plus stays welded to the digits and cannot
                      BiDi-detach or flip position inside Arabic copy —
                      same contract as the plans add-ons quantity badge. */}
                  {isolateLtr(`+${countToken(extraTagsCount, currentLanguage)}`)}
                </LocalizedText>
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
          {hasPrice ? (
            <LocalizedText style={styles.price} numberOfLines={1}>
              {/* Structured nested runs: localized label + ONE atomic
                  isolated price token (number + currency cannot split or
                  BiDi-reorder). No JSX string concatenation. */}
              {t("vendor.startsFrom")}
              {" "}
              <Text style={styles.priceValue}>
                {priceToken(vendor.minPrice, vendor.currency || t("vendor.sar"), {
                  locale: currentLanguage,
                })}
              </Text>
            </LocalizedText>
          ) : (
            <LocalizedText style={styles.priceOnRequest}>
              {t("vendor.priceOnRequest")}
            </LocalizedText>
          )}

          <TouchableOpacity
            style={styles.callButton}
            onPress={handlePress}
            activeOpacity={0.85}
          >
            <LocalizedText style={styles.callButtonText}>
              {t("vendor.viewProfile")}
            </LocalizedText>
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

  /* ────── LOGO BADGE ────── */
  // `start` keeps the medallion at the logical reading start in both locales.
  logoBadge: {
    position: "absolute",
    bottom: 12,
    start: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeImg: {
    width: "100%",
    height: "100%",
  },
  logoBadgeFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeFallbackText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#FFF",
    textTransform: "uppercase",
    includeFontPadding: false,
  },

  /* ────── CONTENT ────── */
  content: {
    padding: 16,
    gap: 10,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  description: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#6B6B6B",
    lineHeight: 20,
  },

  /* ────── META (rating + location) ────── */
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ratingValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#1A1A1A",
    lineHeight: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
    minWidth: 0,
  },
  location: {
    flexShrink: 1,
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
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 22,
    flex: 1,
  },
  priceValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#1A1A1A",
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
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
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
