import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "../../../localization";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MoreInfoPopup = ({ visible, vendor, onClose }) => {
  const { t } = useTranslation("marketplace");
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [heroError, setHeroError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (visible) {
      setHeroError(false);
      setLogoError(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!vendor) return null;

  const {
    name,
    image,
    companyName,
    logo,
    rating,
    reviewCount,
    duration,
    price,
    included,
    location,
    website,
    email,
    phone,
  } = vendor;

  const hasIncluded = Array.isArray(included) && included.length > 0;
  const hasContact = location || website || email || phone;
  const hasRating = rating != null && Number(rating) > 0;
  const reviewCountNum = Number(reviewCount) || 0;
  const hasHero = !!image && !heroError;
  const hasLogo = !!logo && !logoError;
  const hasPrice = price != null && price !== "";
  const heroInitial = (name || companyName || "?").trim().charAt(0).toUpperCase();
  const logoInitial = (companyName || name || "?").trim().charAt(0).toUpperCase();

  const phoneDigits = phone ? String(phone).replace(/[^\d]/g, "") : "";
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : null;

  const handleOpen = (url) => url && Linking.openURL(url);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* ───────── HERO ───────── */}
          <View style={styles.hero}>
            {hasHero ? (
              <Image
                source={{ uri: image }}
                style={styles.heroImage}
                resizeMode="cover"
                onError={() => setHeroError(true)}
              />
            ) : (
              <View style={styles.heroFallback}>
                <Text style={styles.heroFallbackInitial}>{heroInitial}</Text>
              </View>
            )}
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.10)",
                "rgba(0,0,0,0.35)",
                "rgba(0,0,0,0.75)",
              ]}
              style={styles.heroGradient}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {name}
              </Text>
              <View style={styles.heroMeta}>
                {hasRating && (
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="star" size={13} color="#F5B342" />
                    <Text style={styles.heroMetaStrong}>
                      {Number(rating).toFixed(1)}
                    </Text>
                    {reviewCountNum > 0 && (
                      <Text style={styles.heroMetaDim}>({reviewCountNum})</Text>
                    )}
                  </View>
                )}
                {location && (
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="location-outline" size={13} color="#FFF" />
                    <Text style={styles.heroMetaText} numberOfLines={1}>
                      {location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ───────── BODY ───────── */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Vendor identity */}
            {(companyName || logo) && (
              <View style={styles.vendorCard}>
                <View style={styles.vendorLogo}>
                  {hasLogo ? (
                    <Image
                      source={{ uri: logo }}
                      style={styles.vendorLogoImage}
                      resizeMode="contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <View style={styles.vendorLogoFallback}>
                      <Text style={styles.vendorLogoFallbackText}>
                        {logoInitial}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.vendorMeta}>
                  <Text style={styles.vendorLabel}>
                    {t("vendor.providedBy", "مقدم الخدمة")}
                  </Text>
                  <Text style={styles.vendorName} numberOfLines={1}>
                    {companyName || name}
                  </Text>
                </View>
              </View>
            )}

            {/* Meta chips */}
            {(hasPrice || duration) && (
              <View style={styles.metaGrid}>
                {hasPrice && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipLabel}>
                      {t("vendor.price")}
                    </Text>
                    <Text style={styles.metaChipValue}>
                      {price} {t("vendor.sar")}
                    </Text>
                  </View>
                )}
                {duration && (
                  <View style={styles.metaChip}>
                    <View style={styles.metaChipLabelRow}>
                      <Ionicons name="time-outline" size={13} color="#9A9A9A" />
                      <Text style={styles.metaChipLabel}>
                        {t("vendor.serviceDuration")}
                      </Text>
                    </View>
                    <Text style={styles.metaChipValue}>{duration}</Text>
                  </View>
                )}
              </View>
            )}

            {/* What's included */}
            {hasIncluded && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("vendor.whatsIncluded")}
                </Text>
                <View style={styles.includedList}>
                  {included.map((item, index) => (
                    <View key={index} style={styles.includedItem}>
                      <View style={styles.includedCheck}>
                        <Ionicons name="checkmark" size={13} color="#A67749" />
                      </View>
                      <Text style={styles.includedText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Contact */}
            {hasContact && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("vendor.contactInfo")}
                </Text>
                <View style={styles.contactList}>
                  {location && (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIcon}>
                        <Ionicons name="location-outline" size={14} color="#A67749" />
                      </View>
                      <Text style={styles.contactText}>{location}</Text>
                    </View>
                  )}
                  {website && (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => handleOpen(website)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactIcon}>
                        <Ionicons name="globe-outline" size={14} color="#A67749" />
                      </View>
                      <Text style={styles.contactText} numberOfLines={1}>
                        {website}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {email && (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => handleOpen(`mailto:${email}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactIcon}>
                        <Ionicons name="mail-outline" size={14} color="#A67749" />
                      </View>
                      <Text style={styles.contactText} numberOfLines={1}>
                        {email}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {phone && (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => handleOpen(`tel:${phone}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactIcon}>
                        <Ionicons name="call-outline" size={14} color="#A67749" />
                      </View>
                      <Text
                        style={[styles.contactText, { writingDirection: "ltr" }]}
                      >
                        {`‪${phone}‬`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* ───────── STICKY CTA FOOTER ───────── */}
          {phone && (
            <View style={styles.ctaFooter}>
              {whatsappUrl && (
                <TouchableOpacity
                  style={[styles.ctaButton, styles.ctaButtonWhatsapp]}
                  onPress={() => handleOpen(whatsappUrl)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                  <Text style={styles.ctaButtonText}>
                    {t("vendor.whatsapp", "واتساب")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ctaButton, styles.ctaButtonPrimary]}
                onPress={() => handleOpen(`tel:${phone}`)}
                activeOpacity={0.85}
              >
                <Ionicons name="call-outline" size={18} color="#FFF" />
                <Text style={styles.ctaButtonText}>
                  {t("vendor.callNow")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  /* ────── OVERLAY ────── */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.55)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFAF7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.92,
    overflow: "hidden",
  },

  /* ────── HERO ────── */
  hero: {
    height: 200,
    position: "relative",
    backgroundColor: "#1A1A1A",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  heroFallbackInitial: {
    fontFamily: "Cairo_700Bold",
    fontSize: 88,
    color: "rgba(255,255,255,0.95)",
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  heroGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  heroContent: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    gap: 8,
  },
  heroTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
    color: "#FFF",
    lineHeight: 28,
  },
  heroMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroMetaStrong: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#FFF",
  },
  heroMetaDim: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  heroMetaText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
    maxWidth: 200,
  },

  /* ────── SCROLL BODY ────── */
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 32 },

  /* ────── VENDOR IDENTITY ────── */
  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  vendorLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F4EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  vendorLogoImage: { width: "100%", height: "100%" },
  vendorLogoFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  vendorLogoFallbackText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    color: "#FFF",
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  vendorMeta: { flex: 1, gap: 2 },
  vendorLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
    color: "#9A9A9A",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  vendorName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 20,
  },

  /* ────── META CHIPS ────── */
  metaGrid: { flexDirection: "row", gap: 10 },
  metaChip: {
    flex: 1,
    padding: 14,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    gap: 4,
  },
  metaChipLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaChipLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#6B6B6B",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metaChipValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 17,
    color: "#1A1A1A",
    lineHeight: 22,
  },

  /* ────── SECTIONS ────── */
  section: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#1A1A1A",
  },

  /* Included */
  includedList: { gap: 10 },
  includedItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  includedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(194,142,92,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  includedText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20,
  },

  /* Contact */
  contactList: { gap: 4 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F4EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: 13.5,
    color: "#4A4A4A",
    lineHeight: 18,
  },

  /* ────── CTA FOOTER ────── */
  ctaFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingBottom: 18,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
  },
  ctaButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaButtonPrimary: {
    backgroundColor: "#C28E5C",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButtonWhatsapp: {
    backgroundColor: "#25D366",
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14.5,
    color: "#FFF",
  },
});

export default MoreInfoPopup;
