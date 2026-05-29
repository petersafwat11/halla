import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHostTaqnyatTemplates } from "../../../hooks/taqnyatTemplates";
import {
  useGeneratePostEventTokens,
  useSendPostEventAccessLinks,
} from "../../../hooks/postEvent";

const FILTERS = ["attended", "confirmed", "all"];

/**
 * Modal that lets the host (a) pick a guest filter and (b) optionally
 * override the saved Taqnyat template, then dispatches the two-step
 * flow: generate access tokens, then send the access-link messages.
 */
const AccessLinksSheet = ({
  visible,
  onClose,
  eventId,
  savedTemplateRef,
  t,
  toast,
}) => {
  const [filter, setFilter] = useState("attended");
  const [overrideRef, setOverrideRef] = useState(null);

  const { data: tplResponse, isLoading: loadingTemplates } =
    useHostTaqnyatTemplates(
      { category: "post_event" },
      { enabled: visible }
    );
  const templates = tplResponse?.data || [];

  const generateTokens = useGeneratePostEventTokens();
  const sendLinks = useSendPostEventAccessLinks();

  const effectiveTemplateId = useMemo(() => {
    return overrideRef || savedTemplateRef?._id || savedTemplateRef || null;
  }, [overrideRef, savedTemplateRef]);

  const handleSend = () => {
    const body = { filter };
    generateTokens.mutate(
      { eventId, body },
      {
        onSuccess: () => {
          const sendBody = { filter };
          if (overrideRef) sendBody.taqnyatTemplateRef = overrideRef;
          sendLinks.mutate(
            { eventId, body: sendBody },
            {
              onSuccess: (response) => {
                const summary = response?.data || {};
                const breakdown = summary.channelBreakdown || {};
                toast?.success(
                  t("host.accessLinks.success", {
                    count: summary.sent || 0,
                  })
                );
                if (
                  (breakdown.whatsapp ?? 0) +
                    (breakdown.sms ?? 0) +
                    (breakdown.failed ?? 0) >
                  0
                ) {
                  toast?.info(
                    t("host.accessLinks.channelBreakdown", {
                      whatsapp: breakdown.whatsapp || 0,
                      sms: breakdown.sms || 0,
                      failed: breakdown.failed || 0,
                    })
                  );
                }
                onClose?.();
              },
              onError: (err) => {
                if (err?.data?.body?.reason === "no_template") {
                  toast?.error(t("host.accessLinks.noTemplateConfigured"));
                } else {
                  toast?.error(
                    err?.message || t("host.errors.sendFailed")
                  );
                }
              },
            }
          );
        },
        onError: (err) =>
          toast?.error(err?.message || t("host.errors.sendFailed")),
      }
    );
  };

  const sending = generateTokens.isPending || sendLinks.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("host.accessLinks.title")}</Text>
            <TouchableOpacity onPress={onClose} disabled={sending}>
              <Ionicons name="close" size={22} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            {t("host.accessLinks.filterLabel")}
          </Text>
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  filter === f && styles.filterChipActive,
                ]}
                onPress={() => setFilter(f)}
                disabled={sending}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === f && styles.filterChipTextActive,
                  ]}
                >
                  {t(
                    `host.accessLinks.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            {t("host.accessLinks.templatePicker")}
          </Text>
          {loadingTemplates ? (
            <ActivityIndicator color="#C28E5C" />
          ) : templates.length === 0 ? (
            <Text style={styles.noTemplateText}>
              {t("host.accessLinks.noTemplateConfigured")}
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templatesRow}
            >
              {templates.map((tpl) => {
                const isActive =
                  String(tpl._id) === String(effectiveTemplateId);
                return (
                  <TouchableOpacity
                    key={tpl._id}
                    style={[
                      styles.tplCard,
                      isActive && styles.tplCardActive,
                    ]}
                    onPress={() =>
                      setOverrideRef(
                        overrideRef === tpl._id ? null : tpl._id
                      )
                    }
                    disabled={sending}
                  >
                    <Text style={styles.tplName} numberOfLines={1}>
                      {tpl.templateName}
                    </Text>
                    <Text style={styles.tplBody} numberOfLines={2}>
                      {tpl.bodyText}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size={16} color="#FFF" />
            ) : (
              <Ionicons name="send-outline" size={16} color="#FFF" />
            )}
            <Text style={styles.sendButtonText}>
              {t("host.accessLinks.send")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 12,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 16, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  label: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginTop: 4,
  },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    backgroundColor: "#FDFAF7",
  },
  filterChipActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
  filterChipTextActive: { color: "#FFF" },
  noTemplateText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#C28E5C",
    paddingVertical: 8,
  },
  templatesRow: { gap: 8, paddingVertical: 4 },
  tplCard: {
    width: 200,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    backgroundColor: "#FDFAF7",
    gap: 4,
  },
  tplCardActive: {
    borderColor: "#2A8C5B",
    backgroundColor: "#EAF4EF",
  },
  tplName: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  tplBody: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    lineHeight: 16,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#FFF" },
});

export default AccessLinksSheet;
