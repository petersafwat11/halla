import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView
} from "react-native";
import Svg, { Path } from "react-native-svg";

const CheckIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke="#C28E5C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EventTypeModal = ({
  visible,
  onClose,
  onSelect,
  selectedType,
  eventTypes
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              نوع المناسبة
            </Text>
            <Text style={styles.headerSubtitle}>
              اختر نوع المناسبة المناسب لك
            </Text>
          </View>

          {/* Event Types List */}
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {eventTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeItem,
                  selectedType === type.value && styles.typeItemSelected]}
                onPress={() => onSelect(type.value)}
                activeOpacity={0.7}
              >
                <View style={styles.typeItemContent}>
                  <Text style={styles.typeEmoji}>{type.emoji}</Text>
                  <Text
                    style={[
                      styles.typeLabel,
                      selectedType === type.value && styles.typeLabelSelected]}
                  >
                    {type.label}
                  </Text>
                </View>
                {selectedType === type.value && (
                  <View style={styles.checkIconContainer}>
                    <CheckIcon />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>إلغاء</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    alignItems: "center"
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: "80%"
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 4,
    textAlign: "right"
  },  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "right"
  },
  headerSublistContainer: {
    paddingHorizontal: 24,
    maxHeight: 400
  },
  typeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F9F4EF",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent"
  },
  typeItemSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#C28E5C"
  },
  typeItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  typeEmoji: {
    fontSize: 24
  },
  typeLabel: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C"
  },
  typeLabelSelected: {
    color: "#C28E5C"
  },
  checkIconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  closeButton: {
    marginTop: 16,
    marginHorizontal: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center"
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565"
  }
});

export default EventTypeModal;
