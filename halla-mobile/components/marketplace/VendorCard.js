import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";

const VendorCard = ({ vendor, onCallPress, index }) => {
  const { t } = useTranslation("marketplace");
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: index * 100,
        duration: 400,
        useNativeDriver: true
      })]).start();
  }, []);

  const handleCallPress = () => {
    const pressScale = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(pressScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(pressScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })]).start();
    onCallPress && onCallPress(vendor);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }]}
    >
      {/* Image with Rating Overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              vendor.image ||
              "https://api.builder.io/api/v1/image/assets/TEMP/543836aed36dc03d2fc3fd75e3abf6d31dca012e"
          }}
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Rating Badge */}
        <View style={styles.ratingBadge}>
          <View style={styles.ratingContent}>
            <Text style={styles.ratingCount}>({vendor.reviewCount} {t("vendor.users")})</Text>
            <Text style={styles.ratingValue}>{vendor.rating}</Text>
            <Ionicons name="star" size={12} color="#E29B36" />
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title and Location */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>
            {vendor.name}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#2C2C2C" />
            <Text style={styles.location}>
              {vendor.location}
            </Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {vendor.tags?.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer: Price and Call Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallPress}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={10} color="#F9F4EF" />
            <Text style={styles.callButtonText}>{t("vendor.callNow")}</Text>
          </TouchableOpacity>

          <Text style={styles.price}>
            {vendor.price} {t("vendor.sar")}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  imageContainer: {
    position: "relative",
    height: 220,
    width: "100%"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  ratingBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(17px)",
    borderRadius: 6,
    padding: 6
  },
  ratingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  ratingValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
    color: "#FFF"
  },
  ratingCount: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: "#FFF"
  },
  content: {
    padding: 12
  },
  infoSection: {
    gap: 3,
    marginBottom: 16
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 22
  },locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },  location: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
    lineHeight: 16
  },  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 3
  },  tag: {
    backgroundColor: "#F2F1ED",
    borderRadius: 7837,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  tagText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
    lineHeight: 16
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderTopWidth: 0.8,
    borderTopColor: "#F2F2F2",
    paddingTop: 6
  },  callButton: {
    backgroundColor: "#C28E5C",
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32
  },
  callButtonText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 9,
    color: "#FFF",
    lineHeight: 12
  },
  price: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#C28E5C",
    lineHeight: 20
  },});

export default VendorCard;
