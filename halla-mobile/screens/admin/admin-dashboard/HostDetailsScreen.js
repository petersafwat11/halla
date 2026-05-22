import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAdminHostById, useUpdateHostStatus } from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import StatusBadge from "../../../components/admin-dashboard/common/StatusBadge";
import HostHeroCard from "../../../components/admin-dashboard/hosts/HostHeroCard";
import HostEventsList from "../../../components/admin-dashboard/hosts/HostEventsList";
import SubscriptionModal from "../../../components/admin-dashboard/hosts/SubscriptionModal";
import { backgrounds, spacing, colors, borderRadius, typography, textStyles } from "../../../styles/tokens";

const fmtDate = (d, locale) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const capitalize = (s) => (typeof s === "string" && s.length ? s[0].toUpperCase() + s.slice(1) : s);

const planMeta = (planType, t) => {
  if (!planType || planType === "trial") return { label: t("hostDetails.trial", "Trial"), color: colors.natural[450], bg: colors.natural[150] };
  if (planType.startsWith("single_")) {
    return { label: `Single ${planType.replace("single_", "").replace("_plus", "+")}`, color: "#3498DB", bg: "#E8F4FD" };
  }
  const map = {
    lite: { label: "Lite", color: "#9B59B6", bg: "#F5EEF8" },
    pro: { label: "Pro", color: colors.primary[500], bg: colors.primary[50] },
    elite: { label: "Elite", color: colors.error[500], bg: colors.error[50] },
  };
  return map[planType] || { label: planType, color: colors.natural[450], bg: colors.natural[150] };
};

const subStatusMeta = (status) => {
  const map = {
    active: { color: colors.success[500], bg: `${colors.success[500]}15` },
    trial: { color: "#9B59B6", bg: "#F5EEF8" },
    expired: { color: colors.error[500], bg: `${colors.error[500]}15` },
    cancelled: { color: colors.natural[450], bg: colors.natural[150] },
  };
  return map[status] || { color: colors.natural[450], bg: colors.natural[150] };
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
          <Text style={[statStyles.badgeText, { color: badge.color }]} numberOfLines={1}>{badge.label}</Text>
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
    width: 32, height: 32, borderRadius: borderRadius[8],
    backgroundColor: `${colors.primary[500]}12`,
    alignItems: "center", justifyContent: "center",
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

const HostDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { hostId } = route.params;
  const { t, currentLanguage } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.HOSTS);

  const { data: hostResp, isLoading, error, refetch } = useAdminHostById(hostId);
  const updateStatus = useUpdateHostStatus();
  const [subModalVisible, setSubModalVisible] = useState(false);

  useEffect(() => {
    if (error) toast.error(t("hostDetails.loadFailed"));
  }, [error, t, toast]);

  const host = hostResp?.data?.data?.host || hostResp?.data?.data || null;

  if (isLoading || !host) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("hostDetails.title")} showBack={true} />
        <View style={styles.centerState}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary[500]} />
          ) : (
            <Text style={styles.centerText}>{t("hostDetails.notFound")}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const sub = host.subscription || null;
  const events = host.events || [];
  const isSuspended = host.status === "suspended";
  const plan = planMeta(sub?.planType, t);
  const subStatus = sub?.status || null;
  const guestsLimit = sub?.limits?.maxInvitesPerEvent ?? sub?.limits?.invitePool ?? null;
  const rawEventsLimit = sub?.limits?.maxEvents;
  const eventsLimit = rawEventsLimit === -1 ? "∞" : rawEventsLimit ?? null;

  const handleToggleStatus = () => {
    Alert.alert(
      isSuspended ? t("hostDetails.activateHost") : t("hostDetails.suspendHost"),
      isSuspended ? t("hostDetails.activateMessage") : t("hostDetails.suspendMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: isSuspended ? t("common.activate") : t("common.suspend"),
          style: isSuspended ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                hostId: host.id || host._id,
                status: isSuspended ? "active" : "suspended",
              });
              toast.success(isSuspended ? t("hostDetails.activated") : t("hostDetails.suspended"));
              refetch();
            } catch {
              toast.error(t("hostDetails.updateStatusFailed"));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("hostDetails.title")} showBack={true} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        <HostHeroCard host={host} />

        <View style={styles.statsRow}>
          <StatCard icon="calendar-outline" label={t("hostDetails.eventsCount")} value={events.length} />
          <StatCard icon="card-outline" label={t("hostDetails.plan")} badge={{ label: plan.label, color: plan.color, bg: plan.bg }} />
          <StatCard icon="people-outline" label={t("hostDetails.guestsLimit")} value={guestsLimit ?? "—"} />
          <StatCard
            icon="shield-checkmark-outline"
            label={t("hostDetails.subStatus")}
            badge={subStatus ? { label: capitalize(subStatus), ...subStatusMeta(subStatus) } : { label: "—", color: colors.natural[450], bg: colors.natural[150] }}
          />
        </View>

        <SectionCard title={t("hostDetails.contactInfo")} icon="person-outline">
          <InfoRow icon="call-outline" label={t("hostDetails.phone")} value={host.phoneNumber} />
          <InfoRow icon="mail-outline" label={t("hostDetails.email")} value={host.email} />
          <InfoRow icon="time-outline" label={t("hostDetails.joinDate")} value={fmtDate(host.createdAt, currentLanguage)} last />
        </SectionCard>

        <SectionCard title={t("hostDetails.subscriptionInfo")} icon="card-outline">
          {sub ? (
            <>
              <InfoRow
                icon="star-outline"
                label={t("hostDetails.plan")}
                badge={
                  <View style={[styles.chip, { backgroundColor: plan.bg }]}>
                    <Text style={[styles.chipText, { color: plan.color }]}>{plan.label}</Text>
                  </View>
                }
              />
              <InfoRow
                icon="checkmark-circle-outline"
                label={t("hostDetails.status")}
                badge={subStatus ? <StatusBadge status={subStatus} size="small" /> : null}
              />
              <InfoRow icon="calendar-number-outline" label={t("hostDetails.eventsLimit")} value={eventsLimit ?? "—"} />
              <InfoRow icon="people-outline" label={t("hostDetails.guestsLimit")} value={guestsLimit ?? "—"} last={!sub.currentPeriodEnd} />
              {sub.currentPeriodEnd && (
                <InfoRow icon="time-outline" label={t("hostDetails.expiresAt")} value={fmtDate(sub.currentPeriodEnd, currentLanguage)} last />
              )}
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={28} color={colors.natural[300]} />
              <Text style={styles.emptyText}>{t("hostDetails.noPlan")}</Text>
            </View>
          )}
        </SectionCard>

        {canEdit && (
          <SectionCard title={t("hostDetails.adminActions")} icon="shield-outline">
            <ActionRow
              icon="card-outline"
              iconBg={`${colors.primary[500]}15`}
              iconColor={colors.primary[500]}
              label={t("hostDetails.manageSubscription")}
              sublabel={t("hostDetails.managePlanSublabel")}
              onPress={() => setSubModalVisible(true)}
            />
            <ActionRow
              icon={isSuspended ? "checkmark-circle-outline" : "pause-circle-outline"}
              iconBg={isSuspended ? colors.success[50] : colors.warning[50]}
              iconColor={isSuspended ? colors.success[500] : colors.warning[500]}
              label={isSuspended ? t("hostDetails.activateHost") : t("hostDetails.suspendHost")}
              sublabel={isSuspended ? t("hostDetails.activateSublabel") : t("hostDetails.suspendSublabel")}
              onPress={handleToggleStatus}
              loading={updateStatus.isPending}
              last
            />
          </SectionCard>
        )}

        <HostEventsList
          events={events}
          onEventPress={(ev) => navigation.navigate("EventDetails", { eventId: ev.id || ev._id })}
        />

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      <SubscriptionModal visible={subModalVisible} onClose={() => setSubModalVisible(false)} host={host} />
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
});

export default HostDetailsScreen;
