import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Circle, G, Path, Defs, ClipPath, Rect } from "react-native-svg";

const StepIndicator = ({ progress }) => {
  const totalSteps = 4;
  const completedSteps = Math.floor((progress / 100) * totalSteps);
  const currentStep = Math.min(completedSteps + 1, totalSteps);

  return (
    <View style={styles.indicatorContainer}>
      <Svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <G clipPath="url(#clip0)">
          <Path
            d="M0 22C0 9.84974 9.84974 0 22 0C34.1503 0 44 9.84974 44 22C44 34.1503 34.1503 44 22 44C9.84974 44 0 34.1503 0 22ZM40.04 22C40.04 12.0368 31.9632 3.96 22 3.96C12.0368 3.96 3.96 12.0368 3.96 22C3.96 31.9632 12.0368 40.04 22 40.04C31.9632 40.04 40.04 31.9632 40.04 22Z"
            fill="#F5ECE4"
          />
          <Path
            d="M22 1.98C22 0.886478 22.8883 -0.00924683 23.9774 0.0890388C26.1886 0.288593 28.3608 0.822098 30.419 1.67465C33.0882 2.78025 35.5135 4.40076 37.5564 6.44365C39.5992 8.48654 41.2197 10.9118 42.3254 13.581C43.1779 15.6392 43.7114 17.8114 43.911 20.0226C44.0092 21.1117 43.1135 22 42.02 22C40.9265 22 40.0512 21.1109 39.9314 20.024C39.7451 18.3332 39.3203 16.674 38.6668 15.0964C37.7602 12.9077 36.4314 10.919 34.7562 9.24379C33.081 7.56863 31.0923 6.23981 28.9036 5.33321C27.326 4.67975 25.6668 4.25487 23.976 4.06855C22.8891 3.94877 22 3.07352 22 1.98Z"
            fill="#C28E5C"
            transform={`rotate(${(progress / 100) * 360} 22 22)`}
          />
        </G>
        <Defs>
          <ClipPath id="clip0">
            <Rect width="44" height="44" fill="white" />
          </ClipPath>
        </Defs>
      </Svg>
      <Text style={styles.indicatorText}>{currentStep}/4</Text>
    </View>
  );
};

const DropdownModal = ({ visible, onClose, onStepSelect }) => {
  const steps = [
    {
      id: 1,
      title: "تفاصيل المناسبة",
      description: "أضف تفاصيل المناسبة كما تحب.",
      progress: 25
    },
    {
      id: 2,
      title: "قائمة المدعوين",
      description: "ادخل كل المدعوين المختارين لحضور المناسبة",
      progress: 50
    },
    {
      id: 3,
      title: "تخصيص الدعوة",
      description: "قم بتخصيص القالب ودعوتك بشكل سهل",
      progress: 75
    },
    {
      id: 4,
      title: "مراجعة واطلاق المناسبة",
      description: "راجع كل التفاصيل بتركيز",
      progress: 100
    }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>
                اختر الخطوة
              </Text>
            </View>
          </View>

          {/* Steps List */}
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {steps.map((step, index) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepItem,
                  index === 0 && styles.stepItemFirst]}
                onPress={() => {
                  onStepSelect(step.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.stepContent}>
                  <View style={styles.stepText}>
                    <Text
                      style={styles.stepTitle}
                    >
                      {step.title}
                    </Text>
                    <Text
                      style={[
                        styles.stepDescription]}
                    >
                      {step.description}
                    </Text>
                  </View>
                  <StepIndicator progress={step.progress} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>ذهاب</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end"
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: "90%"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 16
  },titleContainer: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 32,
    textAlign: "right"
  },listContainer: {
    paddingHorizontal: 24
  },
  stepItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2"
  },
  stepItemFirst: {
    backgroundColor: "#F9F4EF",
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2"
  },  stepContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },  stepText: {
    flex: 1,
    alignItems: "flex-end"
  },  stepTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
    textAlign: "center",
    letterSpacing: 0.024
  },  stepDescription: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
    textAlign: "center"
  },  indicatorContainer: {
    width: 45,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  indicatorText: {
    position: "absolute",
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
    lineHeight: 20,
    letterSpacing: 0.014
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 24
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
    minWidth: 100,
    alignItems: "center"
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 24,
    letterSpacing: 0.08
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    alignItems: "center"
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 24,
    letterSpacing: 0.08
  }
});

export default DropdownModal;
