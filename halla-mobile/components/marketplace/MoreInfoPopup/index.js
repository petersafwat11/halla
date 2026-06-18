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
    brandName,
    description,
    logo,
    coverImage,
    portfolio = [],
    rating,
    reviewCount,
    location,
    email,
    mobile,
    socialLinks = {},
    services = [],
  } = vendor;

  const hasRating = rating != null && Number(rating) > 0;
  const reviewCountNum = Number(reviewCount) || 0;
  const hasHero = !!coverImage && !heroError;
  const hasLogo = !!logo && !logoError;
  const hasPortfolio = Array.isArray(portfolio) && portfolio.length > 0;
  const hasServices = Array.isArray(services) && services.length > 0;
  const hasContact = location || socialLinks.website || email || mobile;
  const heroInitial = (brandName || "?").trim().charAt(0).toUpperCase();
  const logoInitial = (brandName || "?").trim().charAt(0).toUpperCase();

  const phoneDigits = mobile ? String(mobile).replace(/[^\d]/g, "") : "";
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
                source={{ uri: coverImage }}
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
              <View style={styles.heroLogoWrap}>
                {hasLogo ? (
                  <Image
                    source={{ uri: logo }}
                    style={styles.heroLogo}
                    resizeMode="contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <View style={styles.heroLogoFallbackWrap}>
                    <Text style={styles.heroLogoFallback}>{logoInitial}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {brandName}
              </Text>
              <View style={styles.heroMeta}>
                {hasRating && (
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="star" size={13} color="#F5B342" />
                    <Text style={styles.heroMetaStrong}>
                      {Number(rating).toFixed(1)}
                    </Text>
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
            {/* About Vendor */}
            {description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("vendor.aboutVendor", "عن المزود")}
                </Text>
                <Text style={styles.aboutText}>{description}</Text>
              </View>
            )}

            {/* Portfolio Gallery */}
            {hasPortfolio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("vendor.portfolio", "معرض الأعمال")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.portfolioScroll}
                >
                  {portfolio.map((img, idx) => (
                    <View key={idx} style={styles.portfolioItem}>
                      <Image
                        source={{ uri: img }}
                        style={styles.portfolioImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Services */}
            {hasServices && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("vendor.ourServices", "خدماتنا")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.servicesSlider}
                  style={styles.servicesSliderContainer}
                >
                  {services.map((svc) => (
                    <View key={svc.id} style={styles.serviceCard}>
                      {svc.image ? (
                        <Image
                          source={{ uri: svc.image }}
                          style={styles.serviceCardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.serviceCardImageFallback}>
                          <Text style={styles.serviceCardFallbackText}>
                            {svc.name ? svc.name.charAt(0).toUpperCase() : ""}
                          </Text>
                        </View>
                      )}
                      <View style={styles.serviceCardContent}>
                        <View style={styles.serviceCardHeader}>
                          <Text style={styles.serviceCardName} numberOfLines={1}>
                            {svc.name}
                          </Text>
                          {svc.category ? (
                            <View style={styles.serviceCardCategoryBadge}>
                              <Text style={styles.serviceCardCategoryText}>
                                {svc.category}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        
                        {svc.description ? (
                          <Text style={styles.serviceCardDesc} numberOfLines={3}>
                            {svc.description}
                          </Text>
                        ) : null}

                        {svc.duration ? (
                          <Text style={styles.serviceCardSpec} numberOfLines={1}>
                            {t("vendor.duration", "المدة")}: {svc.duration}
                          </Text>
                        ) : null}

                        {svc.included && svc.included.length > 0 ? (
                          <View style={styles.serviceCardIncludedList}>
                            {svc.included.slice(0, 2).map((item, idx) => (
                              <Text key={idx} style={styles.serviceCardIncludedItem} numberOfLines={1}>
                                • {item}
                              </Text>
                            ))}
                          </View>
                        ) : null}

                        <View style={styles.serviceCardFooter}>
                          {svc.price != null && (
                            <Text style={styles.serviceCardPrice}>
                              {svc.price} {svc.currency || t("vendor.sar")}
                            </Text>
                          )}
                          {mobile && (
                            <TouchableOpacity
                              style={styles.serviceCardInquiry}
                              onPress={() => handleOpen(`tel:${mobile}`)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="call-outline" size={14} color="#FFF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
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
                  {socialLinks.website && (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => handleOpen(socialLinks.website)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactIcon}>
                        <Ionicons name="globe-outline" size={14} color="#A67749" />
                      </View>
                      <Text style={styles.contactText} numberOfLines={1}>
                        {socialLinks.website}
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
                  {mobile && (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => handleOpen(`tel:${mobile}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactIcon}>
                        <Ionicons name="call-outline" size={14} color="#A67749" />
                      </View>
                      <Text
                        style={[styles.contactText, { writingDirection: "ltr" }]}
                      >
                        {`‪${mobile}‬`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* ───────── STICKY CTA FOOTER ───────── */}
          {mobile && (
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
                onPress={() => handleOpen(`tel:${mobile}`)}
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
    height: 220,
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
  heroLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLogo: {
    width: "100%",
    height: "100%",
  },
  heroLogoFallbackWrap: {
    width: "100%",
    height: "100%",
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLogoFallback: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    color: "#FFF",
    textTransform: "uppercase",
    includeFontPadding: false,
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

  /* ────── ABOUT ────── */
  aboutText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 22,
  },

  /* ────── PORTFOLIO ────── */
  portfolioScroll: {
    gap: 10,
    paddingRight: 10,
  },
  portfolioItem: {
    width: 140,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F4EFE9",
  },
  portfolioImage: {
    width: "100%",
    height: "100%",
  },

  /* ────── SERVICES ────── */
  servicesSliderContainer: {
    marginTop: 8,
  },
  servicesSlider: {
    paddingRight: 16,
    gap: 12,
  },
  serviceCard: {
    width: 220,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  serviceCardImage: {
    width: "100%",
    height: 110,
    backgroundColor: "#F4EFE9",
  },
  serviceCardImageFallback: {
    width: "100%",
    height: 110,
    backgroundColor: "#F4EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceCardFallbackText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 32,
    color: "#C28E5C",
  },
  serviceCardContent: {
    padding: 12,
    gap: 8,
  },
  serviceCardHeader: {
    gap: 2,
  },
  serviceCardName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#1A1A1A",
  },
  serviceCardCategoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(194, 142, 92, 0.1)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 2,
  },
  serviceCardCategoryText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 10,
    color: "#C28E5C",
  },
  serviceCardDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: "#6B6B6B",
    lineHeight: 15,
  },
  serviceCardSpec: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    color: "#4A4A4A",
  },
  serviceCardIncludedList: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 6,
  },
  serviceCardIncludedItem: {
    fontFamily: "Cairo_400Regular",
    fontSize: 10.5,
    color: "#6B6B6B",
  },
  serviceCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 8,
    marginTop: 4,
  },
  serviceCardPrice: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#C28E5C",
  },
  serviceCardInquiry: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
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
