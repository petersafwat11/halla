import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Pressable
} from "react-native";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";

/**
 * Onboarding popup shown in the host create-event wizard. All copy is
 * app-authored → `LocalizedText` roles so title/body/buttons always follow
 * the UI locale (blueprint §6); centre alignment is the designed layout and
 * the writing direction still comes from the locale.
 */
const YourEventManagedByUsPopup = ({ visible, onClose, onContactUs }) => {
  const { t } = useTranslation("createEvent");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            {/* Image */}
            <Image
              source={{
                // eslint-disable-next-line no-restricted-syntax -- third-party (api.builder.io), not the labbe backend.
                uri: "https://api.builder.io/api/v1/image/assets/TEMP/81b61464bd4ea192b71ab86caee3678fbacffef8?width=320"
              }}
              style={styles.image}
              resizeMode="contain"
            />

            {/* Title and Description */}
            <View style={styles.textContainer}>
              <LocalizedText role="pageTitle" style={styles.title} center>
                {t("managed_popup_title")}
              </LocalizedText>
              <LocalizedText role="body" style={styles.description} center>
                {t("managed_popup_description")}
              </LocalizedText>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onContactUs}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("managed_popup_contact")}
              testID="managed-popup-contact-button"
            >
              <LocalizedText style={styles.primaryButtonText}>
                {t("managed_popup_contact")}
              </LocalizedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <LocalizedText style={styles.secondaryButtonText}>
                {t("managed_popup_skip")}
              </LocalizedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  modalContainer: {
    width: "100%",
    maxWidth: 342,
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden"
  },
  content: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24
  },
  image: {
    width: 160,
    height: 160
  },
  textContainer: {
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    gap: 16
  },
  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 32,
    textAlign: "center"
  },
  description: {
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 24,
    letterSpacing: 0.08,
    textAlign: "center"
  },
  buttonContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    backgroundColor: "#FFF",
    paddingHorizontal: 24,
    paddingVertical: 4,
    paddingBottom: 20,
    gap: 16
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 24,
    letterSpacing: 0.08
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 24,
    letterSpacing: 0.08
  }
});

export default YourEventManagedByUsPopup;
