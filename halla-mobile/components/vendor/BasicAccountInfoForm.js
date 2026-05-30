import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useTranslation } from "../../localization/hooks/useTranslation";
import TextInput from "../commen/TextInput";
import EmailInput from "../commen/EmailInput";
import Button from "../commen/Button";
import { mobileBasicAccountInfoSchema as basicAccountInfoSchema } from "@halla/shared/schemas/vendor";
import PhoneChangeOtpModal from "./PhoneChangeOtpModal";

/**
 * Basic account info: vendor identity (brand + owner) + contact (email + phone).
 * Phone changes are OTP-gated — when the phone field changes we open the OTP
 * modal instead of submitting the phone directly. The other fields go through
 * the regular section save.
 */
const BasicAccountInfoForm = ({ data, onSave, onPhoneChanged, loading }) => {
  const { t } = useTranslation("vendor");
  const methods = useForm({
    resolver: zodResolver(basicAccountInfoSchema),
    defaultValues: {
      ownerFullName: data?.ownerFullName || "",
      brandName: data?.brandName || "",
      email: data?.email || "",
    },
  });
  const [phoneNumber, setPhoneNumber] = useState(data?.phoneNumber || "");
  const [otpCandidate, setOtpCandidate] = useState(null);

  useEffect(() => {
    methods.reset({
      ownerFullName: data?.ownerFullName || "",
      brandName: data?.brandName || "",
      email: data?.email || "",
    });
    setPhoneNumber(data?.phoneNumber || "");
  }, [data?.ownerFullName, data?.brandName, data?.email, data?.phoneNumber]);

  const onSubmit = (formValues) => {
    onSave({
      main: { email: formValues.email },
      vendor: {
        ownerFullName: formValues.ownerFullName,
        brandName: formValues.brandName,
      },
    });
    if ((phoneNumber || "") !== (data?.phoneNumber || "")) {
      setOtpCandidate(phoneNumber);
    }
  };

  return (
    <FormProvider {...methods}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.basicAccountInfo.title", "Basic Account Info")}
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              name="ownerFullName"
              label={t("settings.basicAccountInfo.ownerFullName", "Owner full name")}
              placeholder={t(
                "settings.basicAccountInfo.ownerFullNamePlaceholder",
                "Enter owner full name"
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="brandName"
              label={t("settings.basicAccountInfo.businessName", "Business name")}
              placeholder={t(
                "settings.basicAccountInfo.businessNamePlaceholder",
                "Enter your business name"
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <EmailInput
              name="email"
              label={t("settings.basicAccountInfo.email", "Email")}
              placeholder={t("settings.basicAccountInfo.emailPlaceholder", "you@example.com")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("settings.basicAccountInfo.phoneWhatsapp", "Phone / WhatsApp")}
            </Text>
            <Text style={styles.helper}>
              {t(
                "settings.basicAccountInfo.phoneHelp",
                "Changing your phone number requires verification via OTP."
              )}
            </Text>
            <RNTextInput
              style={styles.phoneInput}
              placeholder="+966 5XX XXX XXXX"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              text={t("settings.saveChanges", "Save changes")}
              onPress={methods.handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>

      <PhoneChangeOtpModal
        visible={!!otpCandidate}
        phoneNumber={otpCandidate}
        onClose={() => setOtpCandidate(null)}
        onSuccess={() => {
          setOtpCandidate(null);
          if (onPhoneChanged) onPhoneChanged();
        }}
      />
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 12 },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 4,
  },
  helper: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#888",
    marginBottom: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  buttonContainer: { marginTop: 16 },
});

export default BasicAccountInfoForm;
