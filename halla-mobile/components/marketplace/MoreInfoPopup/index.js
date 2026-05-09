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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "../../../localization";
import VendorMetaInfo from "./VendorMetaInfo";
import VendorProfileCard from "./VendorProfileCard";
import VendorContactCard from "./VendorContactCard";

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
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!vendor) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              {vendor.image ? (
                <Image
                  source={{ uri: vendor.image }}
                  style={styles.headerImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.headerImage, styles.headerImagePlaceholder]} />
              )}
              <LinearGradient
                colors={["rgba(0, 0, 0, 0.60)", "rgba(0, 0, 0, 0.40)", "rgba(0, 0, 0, 0.70)"]}
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
                <Text style={styles.headerTitle}>{vendor.name}</Text>
              </View>
            </View>

            <View style={styles.content}>
              <VendorMetaInfo vendor={vendor} />
              <VendorProfileCard vendor={vendor} />
              <VendorContactCard vendor={vendor} />
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
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
    overflow: "hidden",
  },
  scrollView: { maxHeight: SCREEN_HEIGHT * 0.9 },
  scrollContent: { paddingBottom: 40 },
  header: { height: 82, position: "relative" },
  headerImage: { width: "100%", height: "100%", position: "absolute" },
  headerImagePlaceholder: { backgroundColor: "#1F2937" },
  gradient: { position: "absolute", width: "100%", height: "100%" },
  headerContent: { flexDirection: "row", alignItems: "center", padding: 24, gap: 24 },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    color: "#FFF",
    lineHeight: 32,
  },
  content: { padding: 16, gap: 12 },
});

export default MoreInfoPopup;
export { default as VendorContactCard } from "./VendorContactCard";
export { default as VendorMetaInfo } from "./VendorMetaInfo";
export { default as VendorProfileCard } from "./VendorProfileCard";
