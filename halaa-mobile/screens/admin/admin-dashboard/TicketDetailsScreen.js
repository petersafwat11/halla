import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAdminTicketById,
  useDeleteAdminTicket,
  useReopenTicket,
} from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { formatDate as formatLocaleDate, formatDateTime as formatLocaleDateTime } from "@halaa/shared/utils/locale";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { getImageUrl } from "../../../utils/imageUtils";
import TopBar from "../../../components/plans/TopBar";
import DirectionalIonicon from "../../../components/common/DirectionalIonicon";
import AdaptiveText from "../../../components/commen/AdaptiveText";
import LocalizedText from "../../../components/commen/LocalizedText";
import { ResolveTicketModal, AssignTicketModal, TicketSectionCard, TicketInfoRow, TicketHeroCard } from "../../../components/admin-dashboard/tickets";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../styles/tokens";

const STATUS_CONFIG = {
  open: { color: "#D38200", bg: "#FBF3E6", labelKey: "open", icon: "alert-circle-outline" },
  in_progress: { color: "#3498DB", bg: "#E8F4FD", labelKey: "in_progress", icon: "time-outline" },
  resolved: { color: "#2A8C5B", bg: "#EAF4EF", labelKey: "resolved", icon: "checkmark-circle-outline" },
  closed: { color: "#666", bg: "#F5F5F5", labelKey: "closed", icon: "close-circle-outline" },
};

const PRIORITY_CONFIG = {
  low: { color: "#2A8C5B", bg: "#EAF4EF", labelKey: "low" },
  medium: { color: "#D38200", bg: "#FBF3E6", labelKey: "medium" },
  high: { color: "#C0392B", bg: "#F9EBEA", labelKey: "high" },
  urgent: { color: "#E74C3C", bg: "#FDEDEC", labelKey: "urgent" },
};

const TicketDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { ticketId } = route.params;
  const { t, currentLanguage } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.TICKETS);
  const canDelete = canDeleteOnPage(role, PAGES.TICKETS);

  const formatDate = (d, includeTime = false) => {
    if (!d) return "—";
    return includeTime ? formatLocaleDateTime(d, currentLanguage) : formatLocaleDate(d, currentLanguage);
  };

  const { data: resp, isLoading, error, refetch } = useAdminTicketById(ticketId);
  const deleteTicket = useDeleteAdminTicket();
  const reopenTicket = useReopenTicket();

  const [resolveModal, setResolveModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  if (error) toast.error(t("ticketDetails.loadFailed"));

  const raw = resp?.data?.ticket;
  const ticket = raw ? {
    id: raw.id, ticketNumber: raw.ticketNumber, subject: raw.subject,
    message: raw.message, status: raw.status || "open", priority: raw.priority || "medium",
    category: raw.category, submittedBy: raw.user, assignedTo: raw.assignedTo,
    assignmentNote: raw.assignmentNote,
    attachment: raw.attachment || null,
    resolution: raw.resolution, createdAt: raw.createdAt, updatedAt: raw.updatedAt,
  } : null;

  const statusCfg = STATUS_CONFIG[ticket?.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[ticket?.priority] || PRIORITY_CONFIG.medium;
  const statusLabel = t(`ticketDetails.statuses.${statusCfg.labelKey}`, statusCfg.labelKey);
  const priorityLabel = t(`ticketDetails.priorities.${priorityCfg.labelKey}`, priorityCfg.labelKey);

  const handleDelete = () => {
    Alert.alert(t("ticketDetails.deleteConfirmTitle"), t("ticketDetails.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive", onPress: async () => {
          try { await deleteTicket.mutateAsync(ticket.id); toast.success(t("ticketDetails.ticketDeleted")); navigation.goBack(); }
          catch { toast.error(t("ticketDetails.deleteFailed")); }
        }
      },
    ]);
  };

  const handleReopen = async () => {
    try { await reopenTicket.mutateAsync(ticket.id); toast.success(t("ticketDetails.ticketReopened")); refetch(); }
    catch { toast.error(t("ticketDetails.reopenFailed")); }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("ticketDetails.title")} showBack={true} />
        <View style={styles.centerState}><ActivityIndicator size="large" color={colors.primary[500]} /><LocalizedText style={styles.centerStateText}>{t("ticketDetails.loading")}</LocalizedText></View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("ticketDetails.title")} showBack={true} />
        <View style={styles.centerState}><Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.natural[400]} /><LocalizedText style={styles.centerStateText}>{t("ticketDetails.notFound")}</LocalizedText></View>
      </SafeAreaView>
    );
  }

  const submitterName = ticket.submittedBy?.name || ticket.submittedBy?.username || t("ticketDetails.unknown");
  const assignedName = ticket.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.username || ticket.assignedTo.email || t("ticketDetails.unassigned") : t("ticketDetails.unassigned");
  const resolvedBy = ticket.resolution?.by ? ticket.resolution.by?.name || ticket.resolution.by?.username || t("ticketDetails.admin") : "";
  // Interpolated meta sentence (blueprint §6) — the resolver name is adaptive
  // content and the date a locale-formatted token, both first-strong isolated
  // so punctuation cannot spill across scripts.
  const resolutionMetaText = ticket.resolution?.at
    ? t("ticketDetails.resolvedByMeta", {
        name: isolateAuto(resolvedBy),
        date: isolateAuto(formatDate(ticket.resolution.at)),
      })
    : t("ticketDetails.resolvedByMetaNoDate", { name: isolateAuto(resolvedBy) });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("ticketDetails.title")} showBack={true}
        rightContent={canEdit && ticket.status !== "resolved" && ticket.status !== "closed" ? (
          <TouchableOpacity
            style={styles.topBarAction}
            onPress={() => setResolveModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t("tickets.resolve.resolve")}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {/* Semantic resolve action — never mirrored. */}
            <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        ) : null}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        <TicketHeroCard ticket={ticket} statusCfg={statusCfg} priorityCfg={priorityCfg} statusLabel={statusLabel} priorityLabel={priorityLabel} t={t} />

        <TicketSectionCard title={t("ticketDetails.message")} icon="chatbubble-outline">
          <View style={styles.messageBlock}>
            {/* Ticket message is arbitrary user/backend content. */}
            <AdaptiveText style={styles.messageText}>
              {ticket.message || t("ticketDetails.noMessage")}
            </AdaptiveText>
          </View>
        </TicketSectionCard>

        {ticket.attachment?.url && (
          <TicketSectionCard title={t("ticketDetails.attachment", "Attachment")} icon="attach-outline">
            <View style={styles.attachmentContainer}>
              {ticket.attachment.type === "image" ? (
                <TouchableOpacity
                  style={styles.attachmentThumbWrap}
                  onPress={() => setImageViewerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: getImageUrl(ticket.attachment.url) }}
                    style={styles.attachmentThumb}
                  />
                  <View style={styles.attachmentThumbOverlay}>
                    <Ionicons name="expand-outline" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.attachmentVideoThumb}
                  onPress={() => Linking.openURL(ticket.attachment.url).catch(() => {})}
                  activeOpacity={0.8}
                >
                  <Ionicons name="videocam" size={24} color="#c28e5c" />
                  <View style={styles.attachmentPlayBadge}>
                    <Ionicons name="play" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
              <LocalizedText style={styles.attachmentLabel}>
                {ticket.attachment.type === "image"
                  ? t("ticketDetails.viewImage", "View Image")
                  : t("ticketDetails.viewVideo", "Play Video")}
              </LocalizedText>
            </View>
          </TicketSectionCard>
        )}

        {ticket.resolution && (
          <TicketSectionCard title={t("ticketDetails.resolution")} icon="checkmark-circle-outline">
            <View style={styles.resolutionBlock}>
              {/* Resolution body is moderator-authored free content. */}
              <AdaptiveText style={styles.resolutionText}>{ticket.resolution.message}</AdaptiveText>
              {ticket.resolution.by && (
                <View style={styles.resolutionMeta}>
                  <Ionicons name="person-circle-outline" size={14} color={colors.natural[400]} />
                  <LocalizedText style={styles.resolutionMetaText}>{resolutionMetaText}</LocalizedText>
                </View>
              )}
            </View>
          </TicketSectionCard>
        )}

        {ticket.assignmentNote && (
          <TicketSectionCard
            title={t("ticketDetails.assignmentNotes")}
            icon="document-text-outline"
          >
            <View style={styles.messageBlock}>
              <AdaptiveText style={styles.messageText}>{ticket.assignmentNote}</AdaptiveText>
            </View>
          </TicketSectionCard>
        )}

        <TicketSectionCard title={t("ticketDetails.details")} icon="information-circle-outline">
          <TicketInfoRow icon="person-outline" label={t("ticketDetails.submittedBy")} value={submitterName} mode="adaptive" />
          {ticket.submittedBy?.email && <TicketInfoRow icon="mail-outline" label={t("ticketDetails.email")} value={ticket.submittedBy.email} mode="ltr" />}
          <TicketInfoRow icon="person-circle-outline" label={t("ticketDetails.assignedTo")} value={assignedName} mode="adaptive" />
          <TicketInfoRow icon="calendar-outline" label={t("ticketDetails.created")} value={isolateAuto(formatDate(ticket.createdAt, true))} mode="localized" />
          <TicketInfoRow icon="refresh-outline" label={t("ticketDetails.updated")} value={isolateAuto(formatDate(ticket.updatedAt, true))} mode="localized" last />
        </TicketSectionCard>

        {(canEdit || canDelete) && (
          <TicketSectionCard title={t("ticketDetails.adminActions")} icon="shield-outline">
            {canEdit && (
              <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: colors.natural[100] }]} onPress={() => setAssignModal(true)}>
                <View style={styles.actionRowLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: `${colors.primary[500]}15` }]}><Ionicons name="person-add-outline" size={18} color={colors.primary[500]} /></View>
                  <View><LocalizedText style={styles.actionLabel}>{t("ticketDetails.assignTicket")}</LocalizedText>
                    <LocalizedText style={styles.actionSub}>{ticket.assignedTo ? t("ticketDetails.reassignTicketSublabel") : t("ticketDetails.assignTicketSublabel")}</LocalizedText></View>
                </View>
                <DirectionalIonicon name="chevron-forward" size={18} color={colors.natural[300]} />
              </TouchableOpacity>
            )}
            {canEdit && ticket.status !== "resolved" && ticket.status !== "closed" && (
              <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: canDelete ? 1 : 0, borderBottomColor: colors.natural[100] }]} onPress={() => setResolveModal(true)}>
                <View style={styles.actionRowLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: "#EAF4EF" }]}><Ionicons name="checkmark-circle-outline" size={18} color="#2A8C5B" /></View>
                  <View><LocalizedText style={styles.actionLabel}>{t("ticketDetails.resolveTicket")}</LocalizedText><LocalizedText style={styles.actionSub}>{t("ticketDetails.resolveTicketSublabel")}</LocalizedText></View>
                </View>
                <DirectionalIonicon name="chevron-forward" size={18} color={colors.natural[300]} />
              </TouchableOpacity>
            )}
            {canEdit && (ticket.status === "resolved" || ticket.status === "closed") && (
              <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: canDelete ? 1 : 0, borderBottomColor: colors.natural[100] }]} onPress={handleReopen} disabled={reopenTicket.isPending}>
                <View style={styles.actionRowLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: "#FBF3E6" }]}>
                    {reopenTicket.isPending ? <ActivityIndicator size="small" color="#D38200" /> : <Ionicons name="refresh-circle-outline" size={18} color="#D38200" />}
                  </View>
                  <View><LocalizedText style={styles.actionLabel}>{t("ticketDetails.reopenTicket")}</LocalizedText><LocalizedText style={styles.actionSub}>{t("ticketDetails.reopenTicketSublabel")}</LocalizedText></View>
                </View>
                <DirectionalIonicon name="chevron-forward" size={18} color={colors.natural[300]} />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity style={styles.actionRow} onPress={handleDelete} disabled={deleteTicket.isPending}>
                <View style={styles.actionRowLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: "#FDEDEC" }]}>
                    {deleteTicket.isPending ? <ActivityIndicator size="small" color="#E74C3C" /> : <Ionicons name="trash-outline" size={18} color="#E74C3C" />}
                  </View>
                  <View><LocalizedText style={[styles.actionLabel, { color: "#E74C3C" }]}>{t("ticketDetails.deleteTicket")}</LocalizedText><LocalizedText style={styles.actionSub}>{t("ticketDetails.deleteTicketSublabel")}</LocalizedText></View>
                </View>
                <DirectionalIonicon name="chevron-forward" size={18} color={colors.natural[300]} />
              </TouchableOpacity>
            )}
          </TicketSectionCard>
        )}

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      {ticket?.attachment?.type === "image" && (
        <Modal
          visible={imageViewerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageViewerVisible(false)}
        >
          <TouchableOpacity
            style={styles.viewerOverlay}
            activeOpacity={1}
            onPress={() => setImageViewerVisible(false)}
          >
            <Image
              source={{ uri: getImageUrl(ticket.attachment.url) }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.viewerClose}
              onPress={() => setImageViewerVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {/* Close is a semantic action — never mirrored; anchored to the
                  logical end edge. */}
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      <ResolveTicketModal visible={resolveModal} ticket={ticket} onClose={() => setResolveModal(false)} onSave={() => { setResolveModal(false); toast.success(t("ticketDetails.ticketResolved")); refetch(); }} />
      <AssignTicketModal visible={assignModal} ticket={ticket} onClose={() => setAssignModal(false)} onSave={() => { setAssignModal(false); toast.success(t("ticketDetails.ticketAssigned")); refetch(); }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.artboard }, scroll: { flex: 1 }, scrollContent: { padding: spacing[16], gap: spacing[12] },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[12], padding: spacing[32] },
  centerStateText: { ...textStyles.bodyMedium, color: colors.natural[450], textAlign: "center" },
  // 32px visual chip + 6px hitSlop on every side = 44×44 touch target.
  topBarAction: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  messageBlock: { padding: spacing[16] }, messageText: { fontSize: typography.fontSize.body.medium, color: colors.natural[800], lineHeight: 22 },
  resolutionBlock: { padding: spacing[16], backgroundColor: "#EAF4EF40", gap: spacing[8] }, resolutionText: { fontSize: typography.fontSize.body.medium, color: colors.natural[800], lineHeight: 22 },
  resolutionMeta: { flexDirection: "row", alignItems: "center", gap: spacing[8], marginTop: spacing[4] }, resolutionMetaText: { fontSize: 12, color: colors.natural[450] },
  attachmentContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    padding: spacing[16],
  },
  attachmentThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  attachmentThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    backgroundColor: "#eee",
  },
  attachmentThumbOverlay: {
    position: "absolute",
    end: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentVideoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f5ece4",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  attachmentPlayBadge: {
    position: "absolute",
    end: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#c28e5c",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentLabel: {
    flex: 1,
    fontSize: 14,
    color: "#c28e5c",
    fontWeight: "600",
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
  viewerClose: {
    position: "absolute",
    top: 48,
    end: 24,
  },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  actionRowLeft: { flexDirection: "row", alignItems: "center", gap: spacing[12], flex: 1 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { ...textStyles.bodyMedium, color: colors.natural[900], fontWeight: "600" }, actionSub: { fontSize: 11, color: colors.natural[400], marginTop: 1 },
});

export default TicketDetailsScreen;
