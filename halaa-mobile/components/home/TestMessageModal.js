import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import MobileInput from "../commen/MobileInput";
import Button from "../commen/Button";
import { useSendTestMessage } from "../../hooks/messaging";

const buildSchema = (t) =>
  z.object({
    phoneNumber: z
      .string()
      .min(1, t("testMessage.validation.phoneRequired"))
      .regex(/^5[0-9]{8}$/, t("testMessage.validation.phoneFormat")),
  });

const TestMessageModal = ({ visible, onClose, onSuccess, eventId }) => {
  const { t } = useTranslation("events");
  const sendTestMessage = useSendTestMessage();

  const methods = useForm({
    resolver: zodResolver(buildSchema(t)),
    mode: "onChange",
    defaultValues: {
      phoneNumber: "",
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  const isPending = isSubmitting || sendTestMessage.isPending;

  const onSubmit = async (data) => {
    try {
      await sendTestMessage.mutateAsync({
        eventId,
        phoneNumber: data.phoneNumber,
      });
      reset();
      if (onSuccess) onSuccess();
      onClose();
      Alert.alert(t("testMessage.title"), t("testMessage.success"));
    } catch (error) {
      Alert.alert(t("common.error", "خطأ"), error?.message || t("testMessage.error"));
    }
  };

  const handleClose = () => {
    if (!isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
              <Text style={styles.title}>{t("testMessage.title")}</Text>
              <Text style={styles.description}>{t("testMessage.description")}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={8} disabled={isPending}>
              <Ionicons name="close" size={24} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

          <FormProvider {...methods}>
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentInner}
            >
              {/* Phone Number Input */}
              <MobileInput
                name="phoneNumber"
                label={t("testMessage.phoneLabel")}
                placeholder="5XXXXXXXX"
              />

              {/* Info note */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#C28E5C" />
                <Text style={styles.infoText}>{t("testMessage.infoText")}</Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <View style={styles.actionBtn}>
                <Button
                  text={t("testMessage.cancel")}
                  variant="outline"
                  onPress={handleClose}
                  disabled={isPending}
                />
              </View>
              <View style={styles.actionBtn}>
                <Button
                  text={isPending ? t("testMessage.sending") : t("testMessage.send")}
                  variant="primary"
                  onPress={handleSubmit(onSubmit)}
                  loading={isPending}
                  disabled={isPending}
                />
              </View>
            </View>
          </FormProvider>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  titleWrapper: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
  },
  description: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 24,
  },
  contentInner: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F9F4EF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8D4C4",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#6B4E33",
    lineHeight: 20,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  actionBtn: {
    flex: 1,
  },
});

export default TestMessageModal;
