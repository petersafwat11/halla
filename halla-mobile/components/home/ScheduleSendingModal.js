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
import DatePicker from "../commen/DatePicker";
import TimePicker from "../commen/TimePicker";
import Button from "../commen/Button";
import { useScheduleSend } from "../../hooks/mutations/useEventMutations";

const getTwoDaysFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildSchema = (t) =>
  z
    .object({
      scheduledDate: z.date({ required_error: t("scheduleSend.validation.dateRequired") }),
      scheduledTime: z.date({ required_error: t("scheduleSend.validation.timeRequired") }),
      channel: z.enum(["whatsapp", "sms"]),
    })
    .refine((data) => data.scheduledDate >= getTwoDaysFromNow(), {
      message: t("scheduleSend.validation.minDate"),
      path: ["scheduledDate"],
    });

// Backend Zod schema for /messaging/schedule expects 24h "HH:mm".
const formatTimeForAPI = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Backend reads `getUTCDate()` from `scheduledDate`, so a local-midnight
// Date serialized via `.toISOString()` shifts the calendar day back one
// in any UTC+ zone (e.g. Riyadh +3). Build UTC-midnight of the picked
// Y/M/D so the backend sees the day the user actually selected.
const toUtcMidnightIso = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  ).toISOString();
};

const ScheduleSendingModal = ({
  visible,
  onClose,
  onSuccess,
  eventId,
  existingSchedule,
}) => {
  const { t } = useTranslation("events");
  const scheduleSend = useScheduleSend();

  const methods = useForm({
    resolver: zodResolver(buildSchema(t)),
    mode: "onChange",
    defaultValues: {
      scheduledDate: existingSchedule?.scheduledDate
        ? new Date(existingSchedule.scheduledDate)
        : null,
      scheduledTime: null,
      channel: existingSchedule?.channel || "whatsapp",
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = methods;

  const channel = watch("channel");
  const isPending = isSubmitting || scheduleSend.isPending;

  const onSubmit = async (data) => {
    try {
      await scheduleSend.mutateAsync({
        eventId,
        scheduledDate: toUtcMidnightIso(data.scheduledDate),
        scheduledTime: formatTimeForAPI(data.scheduledTime),
        channel: data.channel,
      });
      reset();
      if (onSuccess) onSuccess();
      onClose();
      Alert.alert(t("scheduleSend.title"), t("scheduleSend.success"));
    } catch (error) {
      Alert.alert(t("common.error", "خطأ"), error?.message || t("scheduleSend.error"));
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
            <TouchableOpacity onPress={handleClose} hitSlop={8} disabled={isPending}>
              <Ionicons name="close" size={24} color="#2C2C2C" />
            </TouchableOpacity>
            <View style={styles.titleWrapper}>
              <Text style={styles.title}>{t("scheduleSend.title")}</Text>
              <Text style={styles.description}>{t("scheduleSend.description")}</Text>
            </View>
          </View>

          <FormProvider {...methods}>
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentInner}
            >
              {/* Channel Selector */}
              <Text style={styles.fieldLabel}>{t("messaging.channel")}</Text>
              <View style={styles.channelSelector}>
                <TouchableOpacity
                  style={[
                    styles.channelButton,
                    channel === "whatsapp" && styles.channelButtonActive,
                  ]}
                  onPress={() => setValue("channel", "whatsapp")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={16}
                    color={channel === "whatsapp" ? "#FFF" : "#C28E5C"}
                  />
                  <Text
                    style={[
                      styles.channelButtonText,
                      channel === "whatsapp" && styles.channelButtonTextActive,
                    ]}
                  >
                    {t("messaging.whatsapp")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.channelButton,
                    channel === "sms" && styles.channelButtonActive,
                  ]}
                  onPress={() => setValue("channel", "sms")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color={channel === "sms" ? "#FFF" : "#C28E5C"}
                  />
                  <Text
                    style={[
                      styles.channelButtonText,
                      channel === "sms" && styles.channelButtonTextActive,
                    ]}
                  >
                    {t("messaging.sms")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date Picker */}
              <DatePicker
                name="scheduledDate"
                label={t("scheduleSend.date")}
                placeholder={t("scheduleSend.datePlaceholder")}
                minimumDate={getTwoDaysFromNow()}
              />

              {/* Time Picker */}
              <TimePicker
                name="scheduledTime"
                label={t("scheduleSend.time")}
                placeholder={t("scheduleSend.timePlaceholder")}
              />

              {/* Minimum date note */}
              <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={16} color="#C28E5C" />
                <Text style={styles.infoText}>{t("scheduleSend.minDateNote")}</Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <View style={styles.actionBtn}>
                <Button
                  text={t("scheduleSend.cancel")}
                  variant="outline"
                  onPress={handleClose}
                  disabled={isPending}
                />
              </View>
              <View style={styles.actionBtn}>
                <Button
                  text={isPending ? t("scheduleSend.scheduling") : t("scheduleSend.confirm")}
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
    maxHeight: "90%",
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
    alignItems: "flex-end",
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
    textAlign: "right",
  },
  description: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 20,
    textAlign: "right",
  },
  content: {
    paddingHorizontal: 24,
  },
  contentInner: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    marginBottom: 10,
    textAlign: "right",
  },
  channelSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  channelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  channelButtonActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  channelButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
    lineHeight: 20,
  },
  channelButtonTextActive: {
    color: "#FFF",
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

export default ScheduleSendingModal;
