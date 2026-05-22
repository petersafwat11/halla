import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAdminWhitelabelById, useUpdateWhitelabelStatus } from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import StatusBadge from "../../../components/admin-dashboard/common/StatusBadge";
import WhitelabelHeroCard from "../../../components/admin-dashboard/whitelabels/WhitelabelHeroCard";
import WhitelabelSubscriptionModal from "../../../components/admin-dashboard/whitelabels/WhitelabelSubscriptionModal";
import ApproveWhitelabelDialog from "../../../components/admin-dashboard/whitelabels/ApproveWhitelabelDialog";
import { backgrounds, colors, spacing, borderRadius, typography, textStyles } from "../../../styles/tokens";

const fmtDate = (d, locale) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const planMeta = (planType, t) => {
  const map = {
    pro: { label: "Pro", color: "#9B59B6", bg: "#F5EEF8" },
    elite: { label: "Elite", color: colors.primary[600] || colors.primary[500], bg: colors.primary[50] },
  };
  return map[planType] || { label: t("whitelabelDetails.planNone"), color: colors.natural[450], bg: colors.natural[150] };
};

const limitLabel = (v, t) => (v === -1 ? t("whitelabelDetails.unlimited") : (v ?? "—"));

const StatCard = ({ icon, label, value, badge }) => (
  <View style={statStyles.card}>
    <View style={statStyles.iconWrap}>
      <Ionicons name={icon} size={16} color={colors.primary[500]} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={statStyles.label} numberOfLines={1}>{label}</Text>
      {badge ? (
        <View style={[statStyles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[statStyles.badgeText, { color: badge.color }]} numberOfLines={1}>{badge.label}</Text>
        </View>
      ) : (
        <Text style={statStyles.value} numberOfLines={1}>{value ?? 0}</Text>
      )}
    </View>
  </View>
);
const statStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: "47%", flexDirection: "row", alignItems: "center", gap: spacing[8],
    backgroundColor: backgrounds.card[1], borderRadius: borderRadius[12], padding: spacing[12],
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: borderRadius[8],
    backgroundColor: `${colors.primary[500]}12`, alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: typography.fontSize.label.small, color: colors.natural[450], marginBottom: 2 },
  value: { fontSize: typography.fontSize.title.small, fontWeight: typography.fontWeight.semibold, color: colors.natural[900] },
  badge: { alignSelf: "flex-start", paddingHorizontal: spacing[8], paddingVertical: 2, borderRadius: borderRadius[20] },
  badgeText: { fontSize: 11, fontWeight: typography.fontWeight.semibold },
});

const ActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last }) => (
  <TouchableOpacity style={[actionStyles.row, !last && actionStyles.rowBorder]} onPress={onPress} disabled={loading} activeOpacity={0.7}>
    <View style={actionStyles.rowLeft}>
      <View style={[actionStyles.iconWrap, { backgroundColor: iconBg }]}>
        {loading ? <ActivityIndicator size="small" color={iconColor} /> : <Ionicons name={icon} size={16} color={iconColor} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={actionStyles.label}>{label}</Text>
        <Text style={actionStyles.sublabel}>{sublabel}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.natural[300]} />
  </TouchableOpacity>
);
const actionStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.natural[150] },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing[12], flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: borderRadius[8], alignItems: "center", justifyContent: "center" },
  label: { ...textStyles.bodyMedium, color: colors.natural[900], fontWeight: typography.fontWeight.semibold },
  sublabel: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginTop: 2 },
});

const HostListItem = ({ host, onPress, currentLanguage, isLast }) => {
  const initials = (host.name || host.username || "?")
    .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
  return (
    <TouchableOpacity style={[hostStyles.row, isLast && hostStyles.rowLast]} onPress={onPress} activeOpacity={0.7}>
      <View style={hostStyles.avatar}><Text style={hostStyles.avatarText}>{initials}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={hostStyles.name} numberOfLines={1}>{host.name || host.username || "—"}</Text>
        {host.email ? <Text style={hostStyles.email} numberOfLines={1}>{host.email}</Text> : null}
        <View style={hostStyles.metaRow}>
          <StatusBadge status={host.status || "inactive"} size="small" />
          <Text style={hostStyles.date}>{fmtDate(host.createdAt, currentLanguage)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.natural[400]} />
    </TouchableOpacity>
  );
};
const hostStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing[12],
    paddingHorizontal: spacing[16], paddingVertical: spacing[12],
    borderBottomWidth: 1, borderBottomColor: colors.natural[150],
  },
  rowLast: { borderBottomWidth: 0 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${colors.primary[500]}15`,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: typography.fontWeight.semibold, color: colors.primary[500] },
  name: { fontSize: typography.fontSize.body.medium, fontWeight: typography.fontWeight.semibold, color: colors.natural[900] },
  email: { fontSize: typography.fontSize.label.small, color: colors.natural[450], marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing[8], marginTop: spacing[4] },
  date: { fontSize: typography.fontSize.label.small, color: colors.natural[400] },
});

const WhitelabelDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { whitelabelId } = route.params;
  const { t, currentLanguage } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.WHITELABELS);

  const { data: resp, isLoading, error, refetch } = useAdminWhitelabelById(whitelabelId);
  const updateStatus = useUpdateWhitelabelStatus();
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  if (error) toast.error(t("whitelabelDetails.loadFailed"));

  const whitelabel = resp?.data?.whitelabel || resp?.data || null;

  if (isLoading || !whitelabel) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("whitelabelDetails.title")} showBack={true} />
        <View style={styles.centerState}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary[500]} />
          ) : (
            <Text style={styles.centerText}>{t("whitelabelDetails.notFound")}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const sub = whitelabel.subscription || null;
  const stats = whitelabel.statistics || {};
  const hosts = whitelabel.recentHosts || [];
  const status = whitelabel.status;
  const isPending = status === "pending";
  const isSuspended = status === "suspended" || isPending;
  const plan = planMeta(sub?.planType, t);

  const warn = (msg) => (toast.warning ? toast.warning(msg) : toast.info?.(msg) ?? toast.error?.(msg));

  const handleToggleStatus = useCallback(() => {
    if (isPending) {
      if (!sub) {
        warn(t("whitelabelDetails.assignPlanFirst"));
        setSubModalVisible(true);
        return;
      }
      setApproveOpen(true);
      return;
    }

    if (isSuspended && !sub) {
      warn(t("whitelabelDetails.assignPlanFirst"));
      setSubModalVisible(true);
      return;
    }

    Alert.alert(
      isSuspended ? t("whitelabelDetails.activateConfirmTitle") : t("whitelabelDetails.suspendConfirmTitle"),
      isSuspended ? t("whitelabelDetails.activateConfirmMessage") : t("whitelabelDetails.suspendConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: isSuspended ? t("common.activate") : t("common.suspend"),
          style: isSuspended ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                whitelabelId: whitelabel._id || whitelabel.id,
                status: isSuspended ? "active" : "suspended",
              });
              toast.success(isSuspended ? t("whitelabelDetails.activated") : t("whitelabelDetails.suspended"));
              refetch();
            } catch {
              toast.error(t("whitelabelDetails.updateStatusFailed"));
            }
          },
        },
      ]
    );
  }, [isPending, isSuspended, sub, whitelabel, updateStatus, t, toast, refetch]);

  const handleConfirmApprove = useCallback(async ({ dispatchSetupEmail }) => {
    try {
      const result = await updateStatus.mutateAsync({
        whitelabelId: whitelabel._id || whitelabel.id,
        status: "active",
        dispatchSetupEmail,
      });
      const emailDispatch = result?.data?.emailDispatch || result?.emailDispatch;
      const emailSent = !!emailDispatch?.sent;
      const noEmailOnFile = emailDispatch?.error === "NO_EMAIL_ON_FILE";
      const passwordAlreadySet = emailDispatch?.error === "PASSWORD_ALREADY_SET";

      if (dispatchSetupEmail && emailSent) {
        toast.success(t("whitelabelDetails.approveDialog.successWithEmail"));
      } else if (dispatchSetupEmail && passwordAlreadySet) {
        warn(t("whitelabelDetails.approveDialog.successPasswordAlreadySet"));
      } else if (dispatchSetupEmail && noEmailOnFile) {
        warn(t("whitelabelDetails.approveDialog.successNoEmailOnFile"));
      } else if (dispatchSetupEmail && emailDispatch?.attempted && !emailSent) {
        warn(t("whitelabelDetails.approveDialog.successEmailFailed"));
      } else {
        toast.success(t("whitelabelDetails.activated"));
      }
      setApproveOpen(false);
      refetch();
    } catch {
      toast.error(t("whitelabelDetails.updateStatusFailed"));
    }
  }, [whitelabel, updateStatus, t, toast, refetch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("whitelabelDetails.title")} showBack={true} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        <WhitelabelHeroCard whitelabel={whitelabel} />

        <View style={styles.statsRow}>
          <StatCard icon="people-outline" label={t("whitelabelDetails.hosts")} value={stats.hostsCount} />
          <StatCard icon="calendar-outline" label={t("whitelabelDetails.events")} value={stats.eventsCount} />
          <StatCard icon="shield-outline" label={t("whitelabelDetails.moderators")} value={stats.moderatorsCount} />
          <StatCard icon="card-outline" label={t("whitelabelDetails.subscriptionPlan")} badge={{ label: plan.label, color: plan.color, bg: plan.bg }} />
        </View>

        <SectionCard title={t("whitelabelDetails.contactInfo")} icon="person-outline">
          <InfoRow icon="call-outline" label={t("whitelabelDetails.phone")} value={whitelabel.phoneNumber} />
          <InfoRow icon="mail-outline" label={t("whitelabelDetails.email")} value={whitelabel.email} />
          <InfoRow icon="time-outline" label={t("whitelabelDetails.joinDate")} value={fmtDate(whitelabel.createdAt, currentLanguage)} last />
        </SectionCard>

        <SectionCard title={t("whitelabelDetails.subscription")} icon="card-outline">
          {sub ? (
            <>
              <InfoRow
                icon="star-outline"
                label={t("whitelabelDetails.plan")}
                badge={
                  <View style={[styles.chip, { backgroundColor: plan.bg }]}>
                    <Text style={[styles.chipText, { color: plan.color }]}>{plan.label}</Text>
                  </View>
                }
              />
              <InfoRow
                icon="checkmark-circle-outline"
                label={t("whitelabelDetails.status")}
                badge={sub.status ? <StatusBadge status={sub.status} size="small" /> : null}
              />
              <InfoRow icon="people-outline" label={t("whitelabelDetails.teamMembersLimit")} value={limitLabel(sub?.limits?.maxUsers, t)} />
              <InfoRow
                icon="calendar-number-outline"
                label={t("whitelabelDetails.eventsPerMonthLimit")}
                value={limitLabel(sub?.limits?.maxEvents, t)}
                last={!sub?.currentPeriodEnd}
              />
              {sub?.currentPeriodEnd ? (
                <InfoRow icon="time-outline" label={t("whitelabelDetails.expires")} value={fmtDate(sub.currentPeriodEnd, currentLanguage)} last />
              ) : null}
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={28} color={colors.natural[300]} />
              <Text style={styles.emptyText}>{t("whitelabelDetails.noPlanSet")}</Text>
              {canEdit ? (
                <TouchableOpacity style={styles.assignBtn} onPress={() => setSubModalVisible(true)} activeOpacity={0.7}>
                  <Text style={styles.assignBtnText}>{t("whitelabelDetails.assignPlan")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </SectionCard>

        {canEdit ? (
          <SectionCard title={t("whitelabelDetails.adminActions")} icon="shield-outline">
            <ActionRow
              icon="card-outline"
              iconBg={`${colors.primary[500]}15`}
              iconColor={colors.primary[500]}
              label={t("whitelabelDetails.manageSubscription")}
              sublabel={t("whitelabelDetails.manageSubscriptionSublabel")}
              onPress={() => setSubModalVisible(true)}
            />
            <ActionRow
              icon={isPending || isSuspended ? "checkmark-circle-outline" : "pause-circle-outline"}
              iconBg={isPending || isSuspended ? colors.success[50] : colors.warning[50]}
              iconColor={isPending || isSuspended ? colors.success[500] : colors.warning[500]}
              label={
                isPending
                  ? t("whitelabelDetails.approveWhitelabel")
                  : isSuspended
                    ? t("whitelabelDetails.activateWhitelabel")
                    : t("whitelabelDetails.suspendWhitelabel")
              }
              sublabel={
                isPending
                  ? t("whitelabelDetails.approveSublabel")
                  : isSuspended
                    ? t("whitelabelDetails.activateSublabel")
                    : t("whitelabelDetails.suspendSublabel")
              }
              onPress={handleToggleStatus}
              loading={updateStatus.isPending}
              last
            />
          </SectionCard>
        ) : null}

        {hosts.length > 0 ? (
          <SectionCard title={`${t("whitelabelDetails.registeredHosts")} (${stats.hostsCount ?? hosts.length})`} icon="people-outline">
            {hosts.map((host, idx) => (
              <HostListItem
                key={host.id || host._id}
                host={host}
                currentLanguage={currentLanguage}
                isLast={idx === hosts.length - 1}
                onPress={() => navigation.navigate("HostDetails", { hostId: host.id || host._id })}
              />
            ))}
          </SectionCard>
        ) : null}

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      <WhitelabelSubscriptionModal
        visible={subModalVisible}
        onClose={() => setSubModalVisible(false)}
        whitelabel={whitelabel}
        onSave={() => refetch()}
      />

      <ApproveWhitelabelDialog
        visible={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleConfirmApprove}
        isPending={updateStatus.isPending}
        whitelabel={whitelabel}
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
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  chip: { paddingHorizontal: spacing[8], paddingVertical: 2, borderRadius: borderRadius[20] },
  chipText: { fontSize: 11, fontWeight: typography.fontWeight.semibold },
  empty: { alignItems: "center", gap: spacing[8], paddingVertical: spacing[20] },
  emptyText: { fontSize: typography.fontSize.body.small, color: colors.natural[400] },
  assignBtn: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[16], paddingVertical: spacing[8],
    backgroundColor: colors.primary[500], borderRadius: borderRadius[10],
  },
  assignBtnText: { color: "#fff", fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.body.small },
});

export default WhitelabelDetailsScreen;
