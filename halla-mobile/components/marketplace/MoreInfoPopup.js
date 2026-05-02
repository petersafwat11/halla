import React from "react";
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
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "../../localization";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MoreInfoPopup = ({ visible, vendor, onClose }) => {
  const { t } = useTranslation("marketplace");
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  if (!vendor) {
    return null;
  }

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleWebsite = (url) => {
    Linking.openURL(url);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Image */}
            <View style={styles.header}>
              <Image
                source={{
                  uri:
                    vendor.image ||
                    "https://api.builder.io/api/v1/image/assets/TEMP/fcdfb1891ef72b7b32774a9d251821471803e423"
                }}
                style={styles.headerImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[
                  "rgba(0, 0, 0, 0.60)",
                  "rgba(0, 0, 0, 0.40)",
                  "rgba(0, 0, 0, 0.70)"]}
                style={styles.gradient}
              />

              <View style={styles.headerContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>

                <Text
                  style={styles.headerTitle}
                >
                  {vendor.name}
                </Text>
              </View>
            </View>

            {/* Content Sections */}
            <View style={styles.content}>
              {/* Service Duration */}
              <View style={styles.infoCard}>
                <View
                  style={styles.infoHeader}
                >
                  <View style={styles.iconBadge}>
                    <Ionicons name="time-outline" size={14} color="#2563EB" />
                  </View>
                  <Text
                    style={styles.infoTitle}
                  >
                    {t("vendor.serviceDuration")}
                  </Text>
                </View>
                <Text style={styles.infoValue}>
                  {vendor.duration || t("vendor.defaultDuration")}
                </Text>
              </View>

              {/* Price Range */}
              <View style={styles.infoCard}>
                <View
                  style={styles.infoHeader}
                >
                  <View style={[styles.iconBadge, styles.iconBadgeYellow]}>
                    <Ionicons name="cash-outline" size={14} color="#D97706" />
                  </View>
                  <Text
                    style={styles.infoTitle}
                  >
                    {t("vendor.priceRange")}
                  </Text>
                </View>
                <Text style={styles.infoValue}>
                  {vendor.priceRange || t("vendor.defaultPriceRange")}
                </Text>
              </View>

              {/* What's Included */}
              <View style={styles.includedCard}>
                <Text
                  style={[
                    styles.includedTitle]}
                >
                  {t("vendor.whatsIncluded")}
                </Text>

                <View style={styles.includedList}>
                  {(
                    vendor.included || [
                      t("vendor.engagementSession"),
                      t("vendor.printRightsIncluded"),
                      t("vendor.dronePhotography"),
                      t("vendor.digitalAlbum"),
                      t("vendor.fullDayCoverage")]
                  ).map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.includedItem]}
                    >
                      <View style={styles.bullet} />
                      <Text
                        style={[
                          styles.includedText]}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Vendor Info */}
              <View style={styles.vendorCard}>
                <View style={styles.vendorHeader}>
                  <View
                    style={styles.vendorInfo}
                  >
                    <View style={styles.vendorDetails}>
                      <Text
                        style={[
                          styles.vendorName]}
                      >
                        {vendor.companyName || t("vendor.defaultName")}
                      </Text>

                      <View
                        style={[
                          styles.vendorStats]}
                      >
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>
                            ({vendor.reviewCount || "127"} {t("vendor.users")})
                          </Text>
                          <Text style={styles.statLabel}>
                            {vendor.rating || "4.9"}
                          </Text>
                          <Ionicons name="star" size={12} color="#262626" />
                        </View>

                        <View style={styles.stat}>
                          <Text style={styles.statValue}>
                            {vendor.experience || "10"} {t("vendor.years")}
                          </Text>
                          <Ionicons
                            name="briefcase-outline"
                            size={12}
                            color="#737373"
                          />
                        </View>
                      </View>
                    </View>

                    {vendor.logo && (
                      <Image
                        source={{ uri: vendor.logo }}
                        style={styles.vendorLogo}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </View>

                {/* Contact Information */}
                <View style={styles.contactSection}>
                  <Text
                    style={[
                      styles.contactTitle]}
                  >
                    {t("vendor.contactInfo")}
                  </Text>

                  <View style={styles.contactList}>
                    {vendor.location && (
                      <TouchableOpacity
                        style={[
                          styles.contactItem]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="#737373"
                        />
                        <Text
                          style={[
                            styles.contactText]}
                        >
                          {vendor.location}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {vendor.website && (
                      <TouchableOpacity
                        style={[
                          styles.contactItem]}
                        onPress={() => handleWebsite(vendor.website)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="globe-outline"
                          size={16}
                          color="#737373"
                        />
                        <Text
                          style={[
                            styles.contactText]}
                        >
                          {vendor.website}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {vendor.email && (
                      <TouchableOpacity
                        style={[
                          styles.contactItem]}
                        onPress={() => handleEmail(vendor.email)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={16}
                          color="#737373"
                        />
                        <Text
                          style={[
                            styles.contactText]}
                        >
                          {vendor.email}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {vendor.phone && (
                      <TouchableOpacity
                        style={[
                          styles.contactItem]}
                        onPress={() => handleCall(vendor.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="call-outline"
                          size={16}
                          color="#737373"
                        />
                        <Text
                          style={[
                            styles.contactText]}
                        >
                          {vendor.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  container: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
    overflow: "hidden"
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.9
  },
  scrollContent: {
    paddingBottom: 40
  },
  header: {
    height: 82,
    position: "relative"
  },
  headerImage: {
    width: "100%",
    height: "100%",
    position: "absolute"
  },
  gradient: {
    position: "absolute",
    width: "100%",
    height: "100%"
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    gap: 24
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    color: "#FFF",
    lineHeight: 32
  },  content: {
    padding: 16,
    gap: 12
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    padding: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },  iconBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 5,
    padding: 5
  },
  iconBadgeYellow: {
    backgroundColor: "#FFFBEB"
  },
  infoTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20
  },  infoValue: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#1C1917",
    lineHeight: 16
  },  includedCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    padding: 20,
    gap: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  includedTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20
  },  includedList: {
    gap: 12
  },
  includedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706"
  },
  includedText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#44403C",
    lineHeight: 16
  },  vendorCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    padding: 20,
    gap: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  vendorHeader: {
    gap: 12
  },
  vendorInfo: {
    flexDirection: "row",
    gap: 8
  },  vendorDetails: {
    flex: 1,
    gap: 8
  },
  vendorName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#262626",
    lineHeight: 20
  },  vendorStats: {
    flexDirection: "row",
    gap: 8
  },  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },  statLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#262626",
    lineHeight: 16
  },
  statValue: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#737373",
    lineHeight: 16
  },
  vendorLogo: {
    width: 24,
    height: 24,
    borderRadius: 4
  },
  contactSection: {
    gap: 8
  },
  contactTitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#262626",
    lineHeight: 20
  },  contactList: {
    gap: 12
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },  contactText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#656565",
    lineHeight: 16
  },});

export default MoreInfoPopup;
