import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormProvider, useForm } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import TopBar from "../../components/plans/TopBar";
import StepHeader from "../../components/createEvent/StepHeader";
import PreviewInvitation from "../../components/createEvent/PreviewInvitation";
import {
  MapPicker,
  PasswordInput,
  TextAreaInput,
  TextInput,
} from "../../components/commen";
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";

/**
 * Deterministic native visual-regression fixture for the complete RTL field
 * and chrome contract. It deliberately avoids account/network data so the
 * same Maestro flow can capture Android + iOS in Arabic + English.
 */
const DirectionVisualTestScreen = () => {
  const { t, currentLanguage } = useTranslation("createEvent");
  const fieldDirection = useFieldDirection("localized");
  const [previewVisible, setPreviewVisible] = useState(false);
  const isArabic = currentLanguage === "ar";
  const methods = useForm({
    defaultValues: {
      eventName: "",
      message: isArabic ? "أهلاً بكم في Halaa 2026" : "Welcome to مناسبة Halaa 2026",
      password: "",
      address: null,
    },
  });

  useEffect(() => {
    methods.setError("eventName", {
      type: "manual",
      message: t("event_name_required"),
    });
  }, [methods, t]);

  const info = (
    <View style={styles.iconButton}>
      <Ionicons name="information-circle-outline" size={24} color="#FFF" />
    </View>
  );
  const close = (
    <View style={styles.iconButton}>
      <Ionicons name="close" size={24} color="#FFF" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} testID="direction-visual-root">
      <TopBar
        title={isArabic ? "إنشاء مناسبة" : "Create event"}
        leftContent={info}
        rightContent={close}
      />
      <FormProvider {...methods}>
        <ScrollView contentContainerStyle={styles.content}>
          <StepHeader
            currentStep={1}
            totalSteps={5}
            title={isArabic ? "تفاصيل" : "Details"}
            description={isArabic ? "أدخل تفاصيل المناسبة" : "Enter event details"}
          />

          <TextInput
            name="eventName"
            label={isArabic ? "اسم المناسبة" : "Event name"}
            placeholder={isArabic ? "أدخل اسم المناسبة" : "Enter event name"}
          />
          <TextAreaInput
            name="message"
            label={isArabic ? "رسالة الدعوة" : "Invitation message"}
            placeholder={isArabic ? "اكتب رسالة" : "Write a message"}
            helper={isArabic ? "يمكنك المزج بين العربية وEnglish" : "Arabic and English can be mixed"}
            maxLength={150}
            numberOfLines={3}
          />
          <PasswordInput
            name="password"
            label={isArabic ? "كلمة المرور" : "Password"}
            placeholder={isArabic ? "أدخل كلمة المرور" : "Enter password"}
          />
          <MapPicker
            name="address"
            label={isArabic ? "العنوان" : "Location"}
            placeholder={isArabic ? "اختر موقع المناسبة" : "Choose event location"}
          />

          <View style={styles.tokensCard}>
            <Text style={[styles.tokensTitle, fieldDirection.text]}>
              {isArabic ? "قيم مختلطة ومعزولة" : "Isolated mixed values"}
            </Text>
            <Text style={[styles.token, fieldDirection.text]}>
              {isArabic ? "الهاتف: " : "Phone: "}{isolateLtr("+966 55 123 4567")}
            </Text>
            <Text style={[styles.token, fieldDirection.text]}>
              {isArabic ? "البريد: " : "Email: "}{isolateLtr("host@halaa.com")}
            </Text>
            <Text style={[styles.token, fieldDirection.text]}>
              {isArabic ? "السعر: " : "Price: "}{isolateLtr("95.00 SAR")}
            </Text>
            <Text style={[styles.token, fieldDirection.text]}>
              {isolateAuto(isArabic ? "حفل Halaa 2026 في Riyadh" : "Halaa مناسبة 2026 in Riyadh")}
            </Text>
          </View>

          <TouchableOpacity
            testID="open-direction-preview"
            accessibilityLabel={isArabic ? "فتح معاينة الدعوة" : "Open invitation preview"}
            style={styles.previewButton}
            onPress={() => setPreviewVisible(true)}
          >
            <Ionicons name="eye-outline" size={20} color="#FFF" />
            <Text style={styles.previewButtonText}>
              {isArabic ? "معاينة الدعوة" : "Preview invitation"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </FormProvider>

      <PreviewInvitation
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        eventTitle={isArabic ? "حفل Halaa 2026" : "Halaa مناسبة 2026"}
        previewBody={
          isArabic
            ? "أهلاً بكم في Halaa 2026 يوم 31 August الساعة 6:30 PM في Riyadh"
            : "Welcome to مناسبة Halaa 2026 on 31 أغسطس at 6:30 PM in الرياض"
        }
        eventDate={new Date("2026-08-31T18:30:00Z")}
        eventTime="6:30 PM"
        location={isArabic ? "Riyadh، شارع الملك" : "King Street، الرياض"}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9F4EF" },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  tokensCard: {
    borderWidth: 1,
    borderColor: "#E4D6C8",
    borderRadius: 12,
    backgroundColor: "#FFF",
    padding: 14,
    gap: 6,
    marginBottom: 16,
  },
  tokensTitle: { fontFamily: "Cairo_700Bold", fontSize: 14, color: "#2C2C2C" },
  token: { fontFamily: "Cairo_400Regular", fontSize: 13, color: "#4A4A4A" },
  previewButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  previewButtonText: { fontFamily: "Cairo_700Bold", fontSize: 15, color: "#FFF" },
});

export default DirectionVisualTestScreen;
