import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Pressable
} from "react-native";
const YourEventManagedByUsPopup = ({ visible, onClose, onContactUs }) => {
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
                uri: "https://api.builder.io/api/v1/image/assets/TEMP/81b61464bd4ea192b71ab86caee3678fbacffef8?width=320"
              }}
              style={styles.image}
              resizeMode="contain"
            />

            {/* Title and Description */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                دعوتك علينا
              </Text>
              <Text style={styles.description}>
                ممكن تبعتلنا كل التفاصيل، واحنا هنخليلك كل الخطوات سهلة وبسيطة!
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onContactUs}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>تواصل معنا</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>تخطى</Text>
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
  },  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 32,
    textAlign: "center"
  },description: {
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 24,
    letterSpacing: 0.08,
    textAlign: "center"
  },buttonContainer: {
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
