import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAdminBusinessById,
  useUpdateBusinessStatus,
  useRevokeBusinessAssignment,
  useRegenerateBusinessAssignment,
} from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import { getLocalized } from "@halla/shared/utils/locale";
import TopBar from "../../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import StatusBadge from "../../../components/admin-dashboard/common/StatusBadge";
import ManagePlanModal from "../../../components/admin-dashboard/common/ManagePlanModal";
import { ReplaceLogoModal } from "../../../components/admin-dashboard/businesses";
import {
  backgrounds,
  spacing,
  colors,
  borderRadius,
  typography,
  textStyles,
} from "../../../styles/tokens";

const ACTIONABLE_STATUSES = ["pending_payment", "payment_processing", "paid"];

const ASSIGNMENT_COLORS = {
  pending_payment: { color: "#d38200", bg: "#fbf3e6" },
  payment_processing: { color: "#d38200", bg: "#fbf3e6" },
  paid: { color: "#3498db", bg: "#e8f4fd" },
  active: { color: "#2a8c5b", bg: "#eaf4ef" },
  activation_failed: { color: "#c0392b", bg: "#f9ebea" },
  failed: { color: "#c0392b", bg: "#f9ebea" },
  expired: { color: "#767676", bg: "#f2f2f2" },
  cancelled: { color: "#767676", bg: "#f2f2f2" },
  superseded: { color: "#767676", bg: "#f2f2f2" },
  refunded: { color: "#9B59B6", bg: "#f5eef8" },
};

const fmtDate = (d, locale) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const capitalize = (s) =>
  typeof s === "string" && s.length ? s[0].toUpperCase() + s.slice(1) : s;

const remainingInvites = (sub) => {
  if (!sub) return "—";
  if (sub.invitePool === null || sub.invitePool === undefined) return "∞";
  if (sub.invitesRemaining !== undefined && sub.invitesRemaining !== null) {
    return String(sub.invitesRemaining);
  }
  return String(
    (sub.invitePool || 0) + (sub.compensationPool || 0) - (sub.invitesConsumed || 0)
  );
};

const StatCard = ({ icon, label, value, badge }) => (
  <View style={statStyles.card}>
    <View style={statStyles.iconWrap}>
      <Ionicons name={icon} size={16} color={colors.primary[500]} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={statStyles.label} numberOfLines={1}>{label}</Text>
      {badge ? (
        <View style={[statStyles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[statStyles.badgeText, { color: badge.color }]} numberOfLines={1}>
            {badge.label}
          </Text>
        </View>
      ) : (
        <Text style={statStyles.value} numberOfLines={1}>{value ?? "—"}</Text>
      )}
    </View>
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[12],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius[8],
    backgroundColor: `${colors.primary[500]}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: typography.fontSize.label.small, color: colors.natural[450], marginBottom: 2 },
  value: { fontSize: typography.fontSize.title.small, fontWeight: typography.fontWeight.semibold, color: colors.natural[900] },
  badge: { alignSelf: "flex-start", paddingHorizontal: spacing[8], paddingVertical: 2, borderRadius: borderRadius[20] },
  badgeText: { fontSize: 11, fontWeight: typography.fontWeight.semibold },
});

const ActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last }) => {
  const { isRTL } = useTranslation();
  return (
  <TouchableOpacity
    style={[actionStyles.row, !last && actionStyles.rowBorder]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.7}
  >
    <View style={actionStyles.rowLeft}>
      <View style={[actionStyles.iconWrap, { backgroundColor: iconBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={16} color={iconColor} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={actionStyles.label}>{label}</Text>
        {!!sublabel && <Text style={actionStyles.sublabel}>{sublabel}</Text>}
      </View>
    </View>
    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.natural[300]} />
  </TouchableOpacity>
  );
};

const actionStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.natural[150] },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing[12], flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: borderRadius[8], alignItems: "center", justifyContent: "center" },
  label: { ...textStyles.bodyMedium, color: colors.natural[900], fontWeight: typography.fontWeight.semibold },
  sublabel: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginTop: 2 },
});

const BusinessDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { businessId } = route.params;
  const { t, currentLanguage } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.BUSINESSES);

  const { data: resp, isLoading, error, refetch } = useAdminBusinessById(businessId);
  const updateStatus = useUpdateBusinessStatus();
  const revokeAssignment = useRevokeBusinessAssignment();
  const regenerateAssignment = useRegenerateBusinessAssignment();
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [logoModalVisible, setLogoModalVisible] = useState(false);

  useEffect(() => {
    if (error) toast.error(t("businessDetails.loadFailed"));
  }, [error, t, toast]);

  const business = resp?.data?.business || resp?.data || null;

  if (isLoading || !business) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("businessDetails.title")} showBack={true} />
        <View style={styles.centerState}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary[500]} />
          ) : (
            <Text style={styles.centerText}>{t("businessDetails.notFound")}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const sub = business.subscription || null;
  const assignments = business.assignments || [];
  const setupFee = business.setupFee || null;
  const isSuspended = business.status === "suspended";
  const subStatus = sub?.status || null;
  const expiresAt = sub?.currentPeriodEnd || sub?.expiresAt || null;
  const planName =
    getLocalized(sub?.planId || {}, "name", currentLanguage) ||
    sub?.planId?.code ||
    sub?.planType ||
    "—";

  const handleToggleStatus = () => {
    Alert.alert(
      isSuspended ? t("businessDetails.activate") : t("businessDetails.suspend"),
      isSuspended ? t("businessDetails.activateMessage") : t("businessDetails.suspendMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: isSuspended ? t("common.activate") : t("common.suspend"),
          style: isSuspended ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                businessId: business.id || business._id,
                status: isSuspended ? "active" : "suspended",
              });
              toast.success(
                isSuspended ? t("businessDetails.activated") : t("businessDetails.suspended")
              );
              refetch();
            } catch {
              toast.error(t("businessDetails.updateStatusFailed"));
            }
          },
        },
      ]
    );
  };

  const handleShareLink = async (link) => {
    if (!link) return;
    try {
      await Share.share({ message: link });
    } catch (_) {
      /* dismissed */
    }
  };

  const handleRegenerate = async (assignmentId) => {
    try {
      const result = await regenerateAssignment.mutateAsync({ businessId, assignmentId });
      const link = result?.data?.link;
      toast.success(t("businessDetails.assignments.regenerateSuccess"));
      if (link) handleShareLink(link);
    } catch (e) {
      toast.error(e.message || t("common.error"));
    }
  };

  const handleRevoke = (assignmentId) => {
    Alert.alert(
      t("businessDetails.assignments.revoke"),
      t("businessDetails.assignments.confirmRevoke"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("businessDetails.assignments.revoke"),
          style: "destructive",
          onPress: async () => {
            try {
              await revokeAssignment.mutateAsync({ businessId, assignmentId });
              toast.success(t("businessDetails.assignments.revokeSuccess"));
            } catch (e) {
              toast.error(e.message || t("common.error"));
            }
          },
        },
      ]
    );
  };

  const initial = (business.name || "?").trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("businessDetails.title")} showBack={true} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroName} numberOfLines={1}>{business.name || "—"}</Text>
            {!!business.email && (
              <Text style={styles.heroSub} numberOfLines={1}>{business.email}</Text>
            )}
          </View>
          {business.status ? <StatusBadge status={business.status} size="small" /> : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-outline"
            label={t("businessDetails.totalEvents")}
            value={business.statistics?.totalEvents ?? 0}
          />
          <StatCard
            icon="shield-checkmark-outline"
            label={t("businessDetails.subStatus")}
            badge={
              subStatus
                ? { label: capitalize(subStatus), color: colors.primary[600], bg: colors.primary[50] }
                : { label: "—", color: colors.natural[450], bg: colors.natural[150] }
            }
          />
          {setupFee ? (
            <StatCard
              icon="cash-outline"
              label={t("businessDetails.setupFee")}
              badge={
                setupFee.settled
                  ? { label: t("businessDetails.setupFeeSettled"), color: colors.success[500], bg: `${colors.success[500]}15` }
                  : { label: t("businessDetails.setupFeeUnsettled"), color: colors.warning[500], bg: colors.warning[50] }
              }
            />
          ) : null}
          <StatCard
            icon="people-outline"
            label={t("businessDetails.remaining")}
            value={remainingInvites(sub)}
          />
        </View>

        {/* Contact */}
        <SectionCard title={t("businessDetails.contactInfo")} icon="person-outline">
          <InfoRow icon="call-outline" label={t("businessDetails.phone")} value={business.phoneNumber} />
          <InfoRow icon="mail-outline" label={t("businessDetails.email")} value={business.email} />
          <InfoRow
            icon="document-text-outline"
            label={t("businessDetails.description")}
            value={business.businessData?.description || t("businessDetails.noDescription")}
          />
          <InfoRow icon="time-outline" label={t("businessDetails.joinDate")} value={fmtDate(business.createdAt, currentLanguage)} last />
        </SectionCard>

        {/* Subscription */}
        <SectionCard title={t("businessDetails.subscriptionInfo")} icon="card-outline">
          {sub ? (
            <>
              <InfoRow icon="star-outline" label={t("businessDetails.plan")} value={planName} />
              <InfoRow
                icon="checkmark-circle-outline"
                label={t("businessDetails.status")}
                badge={subStatus ? <StatusBadge status={subStatus} size="small" /> : null}
              />
              <InfoRow icon="people-outline" label={t("businessDetails.remaining")} value={remainingInvites(sub)} last={!expiresAt} />
              {expiresAt && (
                <InfoRow icon="time-outline" label={t("businessDetails.expiresAt")} value={fmtDate(expiresAt, currentLanguage)} last />
              )}
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={28} color={colors.natural[300]} />
              <Text style={styles.emptyText}>{t("businessDetails.noPlan")}</Text>
            </View>
          )}
        </SectionCard>

        {/* Assignments */}
        <SectionCard title={t("businessDetails.assignments.title")} icon="documents-outline">
          {assignments.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="documents-outline" size={28} color={colors.natural[300]} />
              <Text style={styles.emptyText}>{t("businessDetails.assignments.empty")}</Text>
            </View>
          ) : (
            assignments.map((a, idx) => {
              const sc = ASSIGNMENT_COLORS[a.status] || {
                color: colors.natural[450],
                bg: colors.natural[150],
              };
              const actionable = ACTIONABLE_STATUSES.includes(a.status);
              const last = idx === assignments.length - 1;
              return (
                <View
                  key={a.id || a._id || idx}
                  style={[styles.assignment, !last && styles.assignmentBorder]}
                >
                  <View style={styles.assignmentTop}>
                    <Text style={styles.assignmentPlan} numberOfLines={1}>
                      {a.planCode || "—"}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusPillText, { color: sc.color }]}>
                        {t(`businessDetails.assignments.status.${a.status}`, capitalize(a.status))}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.assignmentMeta}>
                    {t(`businessDetails.assignments.mode.${a.mode}`, a.mode)}
                    {a.total != null ? ` · ${a.total} ${a.currency || "SAR"}` : ""}
                    {` · ${fmtDate(a.createdAt, currentLanguage)}`}
                  </Text>
                  {canEdit && actionable && (
                    <View style={styles.assignmentActions}>
                      {!!a.link && (
                        <TouchableOpacity
                          style={styles.assignmentBtn}
                          onPress={() => handleShareLink(a.link)}
                        >
                          <Ionicons name="share-outline" size={15} color={colors.primary[600]} />
                          <Text style={styles.assignmentBtnText}>
                            {t("businessDetails.assignments.copyLink")}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.assignmentBtn}
                        onPress={() => handleRegenerate(a.id || a._id)}
                        disabled={regenerateAssignment.isPending}
                      >
                        <Ionicons name="refresh-outline" size={15} color={colors.primary[600]} />
                        <Text style={styles.assignmentBtnText}>
                          {t("businessDetails.assignments.regenerate")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.assignmentBtn, styles.assignmentBtnDanger]}
                        onPress={() => handleRevoke(a.id || a._id)}
                        disabled={revokeAssignment.isPending}
                      >
                        <Ionicons name="close-circle-outline" size={15} color={colors.error[500]} />
                        <Text style={[styles.assignmentBtnText, { color: colors.error[500] }]}>
                          {t("businessDetails.assignments.revoke")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </SectionCard>

        {/* Admin actions */}
        {canEdit && (
          <SectionCard title={t("businessDetails.adminActions")} icon="shield-outline">
            <ActionRow
              icon="card-outline"
              iconBg={`${colors.primary[500]}15`}
              iconColor={colors.primary[500]}
              label={t("businessDetails.managePlan")}
              sublabel={t("businessDetails.managePlanSublabel")}
              onPress={() => setPlanModalVisible(true)}
            />
            <ActionRow
              icon="image-outline"
              iconBg={`${colors.primary[500]}15`}
              iconColor={colors.primary[500]}
              label={t("businessDetails.editLogo", "Change logo")}
              sublabel={t("businessDetails.editLogoSublabel", "Upload a new business logo")}
              onPress={() => setLogoModalVisible(true)}
            />
            <ActionRow
              icon={isSuspended ? "checkmark-circle-outline" : "pause-circle-outline"}
              iconBg={isSuspended ? colors.success[50] : colors.warning[50]}
              iconColor={isSuspended ? colors.success[500] : colors.warning[500]}
              label={isSuspended ? t("businessDetails.activate") : t("businessDetails.suspend")}
              sublabel={isSuspended ? t("businessDetails.activateSublabel") : t("businessDetails.suspendSublabel")}
              onPress={handleToggleStatus}
              loading={updateStatus.isPending}
              last
            />
          </SectionCard>
        )}

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      <ManagePlanModal
        visible={planModalVisible}
        onClose={() => setPlanModalVisible(false)}
        entity={business}
        entityType="business"
        onSave={() => refetch()}
      />

      <ReplaceLogoModal
        visible={logoModalVisible}
        onClose={() => setLogoModalVisible(false)}
        businessId={business.id || business._id}
        businessName={business.name}
        onSaved={() => refetch()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  scroll: { flex: 1, backgroundColor: backgrounds.artboard },
  content: { padding: spacing[16], gap: spacing[12] },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[12] },
  centerText: { ...textStyles.bodyMedium, color: colors.natural[450] },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", ...textStyles.titleLarge },
  heroName: { ...textStyles.titleMedium, color: colors.natural[900] },
  heroSub: { fontSize: typography.fontSize.body.medium, color: colors.natural[450], marginTop: 2 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  empty: { alignItems: "center", gap: spacing[8], paddingVertical: spacing[20] },
  emptyText: { fontSize: typography.fontSize.body.small, color: colors.natural[400] },
  assignment: { paddingHorizontal: spacing[16], paddingVertical: spacing[12], gap: spacing[8] },
  assignmentBorder: { borderBottomWidth: 1, borderBottomColor: colors.natural[150] },
  assignmentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[8] },
  assignmentPlan: { ...textStyles.bodyMedium, color: colors.natural[900], fontWeight: typography.fontWeight.semibold, flex: 1 },
  assignmentMeta: { fontSize: typography.fontSize.body.small, color: colors.natural[450] },
  statusPill: { paddingHorizontal: spacing[8], paddingVertical: 2, borderRadius: borderRadius[20] },
  statusPillText: { fontSize: 11, fontWeight: typography.fontWeight.semibold },
  assignmentActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8], marginTop: spacing[4] },
  assignmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  assignmentBtnDanger: { borderColor: colors.error[500] },
  assignmentBtnText: { fontSize: typography.fontSize.body.small, color: colors.primary[600], fontWeight: typography.fontWeight.medium },
});

export default BusinessDetailsScreen;
