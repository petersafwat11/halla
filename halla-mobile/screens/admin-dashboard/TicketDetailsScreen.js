import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAdminTicketById,
  useDeleteAdminTicket,
  useReopenTicket,
} from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { canEditPage, canDeleteOnPage, PAGES } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import { ResolveTicketModal, AssignTicketModal } from "../../components/admin-dashboard/tickets";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../styles/tokens";

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open: { color: "#D38200", bg: "#FBF3E6", label: "Open", icon: "alert-circle-outline" },
  in_progress: { color: "#3498DB", bg: "#E8F4FD", label: "In Progress", icon: "time-outline" },
  resolved: { color: "#2A8C5B", bg: "#EAF4EF", label: "Resolved", icon: "checkmark-circle-outline" },
  closed: { color: "#666", bg: "#F5F5F5", label: "Closed", icon: "close-circle-outline" },
};

const PRIORITY_CONFIG = {
  low: { color: "#2A8C5B", bg: "#EAF4EF", label: "Low" },
  medium: { color: "#D38200", bg: "#FBF3E6", label: "Medium" },
  high: { color: "#C0392B", bg: "#F9EBEA", label: "High" },
  urgent: { color: "#E74C3C", bg: "#FDEDEC", label: "Urgent" },
};

const formatDate = (d, includeTime = false) => {
  if (!d) return "—";
  const opts = { year: "numeric", month: "short", day: "numeric" };
  if (includeTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
  return new Date(d).toLocaleDateString("en-US", opts);
};

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary[500]} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InfoRow = ({ icon, label, value, badge, last }) => (
  <View style={[styles.infoRow, last && styles.infoRowLast]}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={15} color={colors.natural[400]} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    {badge || <Text style={styles.infoValue} numberOfLines={1}>{value ?? "—"}</Text>}
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
const TicketDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { ticketId } = route.params;
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.TICKETS);
  const canDelete = canDeleteOnPage(role, PAGES.TICKETS);

  const { data: resp, isLoading, error, refetch } = useAdminTicketById(ticketId);
  const deleteTicket = useDeleteAdminTicket();
  const reopenTicket = useReopenTicket();

  const [resolveModal, setResolveModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);

  if (error) toast.error("Failed to load ticket");

  // Normalise
  const raw = resp?.data?.ticket || resp?.data;
  const ticket = raw
    ? {
      id: raw.id || raw._id,
      ticketNumber: raw.ticketNumber,
      subject: raw.subject || raw.title,
      message: raw.message || raw.description,
      status: raw.status || "open",
      priority: raw.priority || "medium",
      category: raw.category,
      submittedBy: raw.submittedBy || raw.user,
      assignedTo: raw.assignedTo,
      resolution: raw.resolution,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
    : null;

  const statusCfg = STATUS_CONFIG[ticket?.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[ticket?.priority] || PRIORITY_CONFIG.medium;

  const handleDelete = () => {
    Alert.alert("Delete Ticket", "This cannot be undone. Permanently delete this ticket?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTicket.mutateAsync(ticket.id);
            toast.success("Ticket deleted");
            navigation.goBack();
          } catch { toast.error("Failed to delete ticket"); }
        },
      },
    ]);
  };

  const handleReopen = async () => {
    try {
      await reopenTicket.mutateAsync(ticket.id);
      toast.success("Ticket reopened");
      refetch();
    } catch { toast.error("Failed to reopen ticket"); }
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title="Ticket Details" showBack={true} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.centerStateText}>Loading ticket…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title="Ticket Details" showBack={true} />
        <View style={styles.centerState}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.natural[400]} />
          <Text style={styles.centerStateText}>Ticket not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar
        title="Ticket Details"
        showBack={true}
        rightContent={
          canEdit && ticket.status !== "resolved" && ticket.status !== "closed" ? (
            <TouchableOpacity style={styles.topBarAction} onPress={() => setResolveModal(true)}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          {/* Left color block */}
          <View style={[styles.heroAccent, { backgroundColor: statusCfg.color }]} />
          <View style={styles.heroBody}>
            <View style={styles.heroTop}>
              <Text style={styles.heroTicketNum}>
                #{ticket.ticketNumber || ticket.id?.toString().slice(-8) || "—"}
              </Text>
              <View style={[styles.priorityChip, { backgroundColor: priorityCfg.bg }]}>
                <Text style={[styles.priorityChipText, { color: priorityCfg.color }]}>{priorityCfg.label}</Text>
              </View>
            </View>
            <Text style={styles.heroSubject}>{ticket.subject || "No Subject"}</Text>
            <View style={styles.heroStatusRow}>
              <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
                <Text style={[styles.statusChipText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
              {ticket.category && (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{ticket.category}</Text>
                </View>
              )}
              <Text style={styles.heroDate}>{formatDate(ticket.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* ── Message ── */}
        <SectionCard title="Message" icon="chatbubble-outline">
          <View style={styles.messageBlock}>
            <Text style={styles.messageText}>{ticket.message || "No message content"}</Text>
          </View>
        </SectionCard>

        {/* ── Resolution (if resolved) ── */}
        {ticket.resolution && (
          <SectionCard title="Resolution" icon="checkmark-circle-outline">
            <View style={styles.resolutionBlock}>
              <Text style={styles.resolutionText}>{ticket.resolution.message}</Text>
              {ticket.resolution.by && (
                <View style={styles.resolutionMeta}>
                  <Ionicons name="person-circle-outline" size={14} color={colors.natural[400]} />
                  <Text style={styles.resolutionMetaText}>
                    Resolved by {ticket.resolution.by?.name || ticket.resolution.by?.username || "Admin"}
                    {ticket.resolution.at ? ` · ${formatDate(ticket.resolution.at)}` : ""}
                  </Text>
                </View>
              )}
            </View>
          </SectionCard>
        )}

        {/* ── Ticket info ── */}
        <SectionCard title="Details" icon="information-circle-outline">
          <InfoRow
            icon="person-outline"
            label="Submitted By"
            value={
              ticket.submittedBy?.name ||
              ticket.submittedBy?.username ||
              "Unknown"
            }
          />
          {ticket.submittedBy?.email && (
            <InfoRow icon="mail-outline" label="Email" value={ticket.submittedBy.email} />
          )}
          <InfoRow
            icon="person-circle-outline"
            label="Assigned To"
            value={
              ticket.assignedTo
                ? ticket.assignedTo.name || ticket.assignedTo.username
                : "Unassigned"
            }
          />
          <InfoRow icon="calendar-outline" label="Created" value={formatDate(ticket.createdAt, true)} />
          <InfoRow icon="refresh-outline" label="Updated" value={formatDate(ticket.updatedAt, true)} last />
        </SectionCard>

        {/* ── Admin Actions ── */}
        {(canEdit || canDelete) && (
          <SectionCard title="Admin Actions" icon="shield-outline">
            {/* Assign */}
            {canEdit && (
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: colors.natural[100] }]}
                onPress={() => setAssignModal(true)}
              >
                <View style={styles.actionRowLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: `${colors.primary[500]}15` }]}>
                    <Ionicons name="person-add-outline" size={18} color={colors.primary[500]} />
                  </View>
                  <View>
                    <Text style={styles.actionLabel}>Assign Ticket</Text>
                    <Text style={styles.actionSub}>
                      {ticket.assignedTo ? "Reassign to another moderator" : "Assign to a moderator"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.natural[300]} />
              </TouchableOpacity>
            )}

            {/* Resolve / Reopen */}
            {canEdit && (
              <>
                {ticket.status !== "resolved" && ticket.status !== "closed" && (
                  <TouchableOpacity
                    style={[styles.actionRow, { borderBottomWidth: canDelete ? 1 : 0, borderBottomColor: colors.natural[100] }]}
                    onPress={() => setResolveModal(true)}
                  >
                    <View style={styles.actionRowLeft}>
                      <View style={[styles.actionIcon, { backgroundColor: "#EAF4EF" }]}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#2A8C5B" />
                      </View>
                      <View>
                        <Text style={styles.actionLabel}>Resolve Ticket</Text>
                        <Text style={styles.actionSub}>Mark as resolved and notify submitter</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.natural[300]} />
                  </TouchableOpacity>
                )}
                {(ticket.status === "resolved" || ticket.status === "closed") && (
                  <TouchableOpacity
                    style={[styles.actionRow, { borderBottomWidth: canDelete ? 1 : 0, borderBottomColor: colors.natural[100] }]}
                    onPress={handleReopen}
                    disabled={reopenTicket.isPending}
                  >
                    <View style={styles.actionRowLeft}>
                      <View style={[styles.actionIcon, { backgroundColor: "#FBF3E6" }]}>
                        {reopenTicket.isPending
                          ? <ActivityIndicator size="small" color="#D38200" />
                          : <Ionicons name="refresh-circle-outline" size={18} color="#D38200" />
                        }
                      </View>
                      <View>
                        <Text style={styles.actionLabel}>Reopen Ticket</Text>
                        <Text style={styles.actionSub}>Move back to open status</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.natural[300]} />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Delete */}
            {canDelete && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleDelete}
                disabled={deleteTicket.isPending}
              >
                <View style={styles.actionRowLeft}>
                  <View style={[styles.actionIcon, { backgroundColor: "#FDEDEC" }]}>
                    {deleteTicket.isPending
                      ? <ActivityIndicator size="small" color="#E74C3C" />
                      : <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                    }
                  </View>
                  <View>
                    <Text style={[styles.actionLabel, { color: "#E74C3C" }]}>Delete Ticket</Text>
                    <Text style={styles.actionSub}>Permanently remove this ticket</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.natural[300]} />
              </TouchableOpacity>
            )}
          </SectionCard>
        )}

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      {/* ── Modals ── */}
      <ResolveTicketModal
        visible={resolveModal}
        ticket={ticket}
        onClose={() => setResolveModal(false)}
        onSave={() => { setResolveModal(false); toast.success("Ticket resolved"); refetch(); }}
      />
      <AssignTicketModal
        visible={assignModal}
        ticket={ticket}
        onClose={() => setAssignModal(false)}
        onSave={() => { setAssignModal(false); toast.success("Ticket assigned"); refetch(); }}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.artboard },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing[16], gap: spacing[12] },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
    padding: spacing[32],
  },
  centerStateText: { ...textStyles.bodyMedium, color: colors.natural[450], textAlign: "center" },

  topBarAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  heroCard: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroAccent: { width: 5 },
  heroBody: { flex: 1, padding: spacing[16], gap: spacing[8] },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroTicketNum: { fontSize: 12, color: colors.natural[450], fontWeight: "600" },
  heroSubject: { ...textStyles.titleLarge, color: colors.natural[900] },
  heroStatusRow: { flexDirection: "row", alignItems: "center", gap: spacing[8], flexWrap: "wrap", marginTop: spacing[4] },
  heroDate: { fontSize: 12, color: colors.natural[400], marginLeft: "auto" },

  // Chips
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  priorityChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  priorityChipText: { fontSize: 12, fontWeight: "600" },
  categoryChip: {
    backgroundColor: `${colors.primary[500]}12`,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  categoryChipText: { fontSize: 12, color: colors.primary[500], fontWeight: "500" },

  // Section card
  sectionCard: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.primary[500]}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { ...textStyles.bodyMedium, color: colors.natural[700], fontWeight: "600" },

  // Message block
  messageBlock: { padding: spacing[16] },
  messageText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[800],
    lineHeight: 22,
  },

  // Resolution block
  resolutionBlock: {
    padding: spacing[16],
    backgroundColor: "#EAF4EF40",
    gap: spacing[8],
  },
  resolutionText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[800],
    lineHeight: 22,
  },
  resolutionMeta: { flexDirection: "row", alignItems: "center", gap: spacing[8], marginTop: spacing[4] },
  resolutionMetaText: { fontSize: 12, color: colors.natural[450] },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: spacing[8], flex: 1 },
  infoLabel: { fontSize: typography.fontSize.body.small, color: colors.natural[450] },
  infoValue: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[800],
    fontWeight: "500",
    maxWidth: "55%",
    textAlign: "right",
  },

  // Action rows
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  actionRowLeft: { flexDirection: "row", alignItems: "center", gap: spacing[12], flex: 1 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { ...textStyles.bodyMedium, color: colors.natural[900], fontWeight: "600" },
  actionSub: { fontSize: 11, color: colors.natural[400], marginTop: 1 },
});

export default TicketDetailsScreen;
