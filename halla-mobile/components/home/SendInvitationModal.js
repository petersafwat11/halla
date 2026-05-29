import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Button from "../commen/Button";
import { useSendBulkInvitations } from "../../hooks/messaging";

const SendInvitationModal = ({
  visible,
  onClose,
  onSuccess,
  eventId,
  selectedGuestIds = [],
}) => {
  const { t } = useTranslation("events");
  const [channel, setChannel] = useState("sms");
  const sendBulk = useSendBulkInvitations();

  const isPending = sendBulk.isPending;
  const selectedCount = selectedGuestIds.length;

  const handleConfirm = async () => {
    if (selectedCount === 0) {
      Alert.alert(t("common.error", "خطأ"), t("messaging.noGuestsWithPhone"));
      return;
    }
    try {
      await sendBulk.mutateAsync({ guestIds: selectedGuestIds, eventId, channel });
      if (onSuccess) onSuccess();
      onClose();
      Alert.alert(
        t("messaging.sendInvitation"),
        t("messaging.invitationsSent_other", { count: selectedCount })
      );
    } catch (error) {
      Alert.alert(t("common.error", "خطأ"), error?.message || t("messaging.sendError"));
    }
  };

  const handleClose = () => {
    if (!isPending) onClose();
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
              <Text style={styles.title}>{t("messaging.sendInvitation")}</Text>
            </View>
          </View>

          <View style={styles.content}>
            {/* Selected guests count */}
            <View style={styles.guestCountRow}>
              <Ionicons name="people-outline" size={18} color="#C28E5C" />
              <Text style={styles.guestCountText}>
                <Text style={styles.guestCountLabel}>{t("messaging.selectedGuests")}: </Text>
                <Text style={styles.guestCountValue}>{selectedCount}</Text>
              </Text>
            </View>

            {/* Channel selector */}
            <Text style={styles.sectionLabel}>{t("messaging.selectChannel")}</Text>

            <TouchableOpacity
              style={[styles.channelOption, channel === "sms" && styles.channelOptionActive]}
              onPress={() => setChannel("sms")}
              activeOpacity={0.7}
            >
              <View style={styles.channelOptionLeft}>
                <View style={[styles.radio, channel === "sms" && styles.radioActive]}>
                  {channel === "sms" && <View style={styles.radioInner} />}
                </View>
                <View style={styles.channelInfo}>
                  <View style={styles.channelNameRow}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={channel === "sms" ? "#C28E5C" : "#656565"}
                    />
                    <Text
                      style={[styles.channelName, channel === "sms" && styles.channelNameActive]}
                    >
                      {t("messaging.sms")}
                    </Text>
                  </View>
                  <Text style={styles.channelDesc}>{t("messaging.smsInfo")}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.channelOption,
                channel === "whatsapp" && styles.channelOptionActive,
              ]}
              onPress={() => setChannel("whatsapp")}
              activeOpacity={0.7}
            >
              <View style={styles.channelOptionLeft}>
                <View style={[styles.radio, channel === "whatsapp" && styles.radioActive]}>
                  {channel === "whatsapp" && <View style={styles.radioInner} />}
                </View>
                <View style={styles.channelInfo}>
                  <View style={styles.channelNameRow}>
                    <Ionicons
                      name="logo-whatsapp"
                      size={18}
                      color={channel === "whatsapp" ? "#C28E5C" : "#656565"}
                    />
                    <Text
                      style={[
                        styles.channelName,
                        channel === "whatsapp" && styles.channelNameActive,
                      ]}
                    >
                      {t("messaging.whatsapp")}
                    </Text>
                  </View>
                  <Text style={styles.channelDesc}>{t("messaging.whatsappInfo")}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

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
                text={isPending ? t("messaging.sending") : t("messaging.send")}
                variant="primary"
                onPress={handleConfirm}
                loading={isPending}
                disabled={isPending || selectedCount === 0}
              />
            </View>
          </View>
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
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  titleWrapper: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
    textAlign: "right",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  guestCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5ECE4",
    borderRadius: 10,
    padding: 12,
    justifyContent: "flex-end",
  },
  guestCountText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    textAlign: "right",
  },
  guestCountLabel: {
    fontFamily: "Cairo_400Regular",
    color: "#656565",
  },
  guestCountValue: {
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    textAlign: "right",
    marginTop: 4,
  },
  channelOption: {
    borderWidth: 1.5,
    borderColor: "#DFDFDF",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFF",
  },
  channelOptionActive: {
    borderColor: "#C28E5C",
    backgroundColor: "#FDF8F4",
  },
  channelOptionLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#DFDFDF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioActive: {
    borderColor: "#C28E5C",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C28E5C",
  },
  channelInfo: {
    flex: 1,
    gap: 4,
    alignItems: "flex-end",
  },
  channelNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  channelName: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
    lineHeight: 22,
  },
  channelNameActive: {
    color: "#C28E5C",
  },
  channelDesc: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#A0A0A0",
    lineHeight: 18,
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

export default SendInvitationModal;
