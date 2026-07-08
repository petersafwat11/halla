import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHostTaqnyatTemplates } from "../../../hooks/taqnyatTemplates";
import { useUpdatePostEventMessagingTemplate } from "../../../hooks/postEvent";

/**
 * Mirror of the web `MessagingTemplatePicker`. Each card surfaces the
 * `templateName`, `bodyText` preview, and `varMapping.length` count.
 * Tapping a card commits the choice via
 * `PATCH /post-event/:eventId/messaging`.
 */
const MessagingTemplatePicker = ({
  eventId,
  selectedTemplateRef,
  t,
  toast,
}) => {
  const { data, isLoading } = useHostTaqnyatTemplates({
    type: "post_event",
  });
  const updateTemplate = useUpdatePostEventMessagingTemplate();

  const templates = data?.data || [];
  const selectedId =
    selectedTemplateRef?._id || selectedTemplateRef || null;

  const handleSelect = (templateId) => {
    if (templateId === selectedId || updateTemplate.isPending) return;
    updateTemplate.mutate(
      { eventId, body: { taqnyatTemplateRef: templateId } },
      {
        onSuccess: () => toast?.success(t("host.messaging.saveSuccess")),
        onError: () => toast?.error(t("host.messaging.saveFailed")),
      }
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t("host.messaging.title")}</Text>
      <Text style={styles.subtitle}>{t("host.messaging.subtitle")}</Text>

      {isLoading ? (
        <ActivityIndicator color="#C28E5C" style={{ marginVertical: 24 }} />
      ) : templates.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={28} color="#C28E5C" />
          <Text style={styles.emptyTitle}>{t("host.messaging.empty")}</Text>
          <Text style={styles.emptyHint}>{t("host.messaging.emptyHint")}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {templates.map((tpl) => {
            const isSelected = String(tpl._id) === String(selectedId);
            return (
              <TouchableOpacity
                key={tpl._id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleSelect(tpl._id)}
                activeOpacity={0.7}
                disabled={updateTemplate.isPending}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {tpl.templateName}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#2A8C5B"
                    />
                  )}
                </View>
                <Text style={styles.cardBody} numberOfLines={3}>
                  {tpl.bodyText}
                </Text>
                <Text style={styles.cardMeta}>
                  {t("host.messaging.varCount", {
                    count: tpl.varMapping?.length || 0,
                  })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  subtitle: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    marginBottom: 4,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  emptyHint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    textAlign: "center",
  },
  cardsRow: { gap: 10, paddingVertical: 4 },
  card: {
    width: 220,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    backgroundColor: "#FDFAF7",
    gap: 6,
  },
  cardSelected: {
    borderColor: "#2A8C5B",
    backgroundColor: "#EAF4EF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
  },
  cardBody: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#444",
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
});

export default MessagingTemplatePicker;
