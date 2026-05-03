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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAdminWhitelabelById,
  useUpdateWhitelabelStatus,
  useUpdateWhitelabelSubscription,
  useDeleteWhitelabel,
} from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { canEditPage, canDeleteOnPage, PAGES } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import { apiFetch } from "../../services/apiClient";
import { SectionCard, InfoRow } from "../../components/admin-dashboard/hosts/HostSectionCard";
import StatusBadge from "../../components/admin-dashboard/common/StatusBadge";
import { WhitelabelSubscriptionModal } from "../../components/admin-dashboard/whitelabels";
import {
  backgrounds,
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
} from "../../styles/tokens";

// ─── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = "https://labbe-backend-production.up.railway.app/api";

const planLabels = {
  ENTERPRISE_BASIC: "Basic",
  ENTERPRISE_PRO: "Pro",
  ENTERPRISE_ULTIMATE: "Ultimate",
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ─── Action Row ────────────────────────────────────────────────────────────────
const ActionRow = ({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  onPress,
  loading,
  last,
  destructive,
}) => (
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
      <View style={actionStyles.textBlock}>
        <Text style={[actionStyles.label, destructive && actionStyles.labelDestructive]}>
          {label}
        </Text>
        <Text style={actionStyles.sublabel}>{sublabel}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.natural[300]} />
  </TouchableOpacity>
);

const actionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  textBlock: {
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius[8],
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
  },
  labelDestructive: { color: colors.error[500] },
  sublabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    marginTop: 2,
  },
});

// ─── Stat Pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ icon, value, label, color }) => (
  <View style={[statStyles.pill, { borderColor: `${color}30` }]}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={[statStyles.value, { color }]}>{value ?? 0}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    backgroundColor: backgrounds.card[1],
    gap: spacing[4],
  },
  value: {
    fontSize: typography.fontSize.title.small,
    fontWeight: typography.fontWeight.semibold,
  },
  label: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    textAlign: "center",
  },
});

// ─── Hero Card ─────────────────────────────────────────────────────────────────
const HeroCard = ({ whitelabel }) => {
  const planCode =
    whitelabel.subscription?.planId?.code || whitelabel.subscription?.planCode;
  const planName =
    whitelabel.subscription?.planId?.nameEn || planLabels[planCode] || planCode;

  return (
    <View style={heroStyles.card}>
      <View style={heroStyles.avatarCircle}>
        <Text style={heroStyles.avatarText}>
          {(whitelabel.name || whitelabel.username || "?").charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={heroStyles.name}>{whitelabel.name || whitelabel.username || "—"}</Text>
      {whitelabel.username ? (
        <Text style={heroStyles.username}>@{whitelabel.username}</Text>
      ) : null}
      <View style={heroStyles.badgeRow}>
        <StatusBadge status={whitelabel.status} />
        {planName ? (
          <View style={heroStyles.planChip}>
            <Ionicons name="star-outline" size={11} color={colors.primary[500]} />
            <Text style={heroStyles.planChipText}>{planName}</Text>
          </View>
        ) : null}
      </View>
      {whitelabel.email ? (
        <View style={heroStyles.metaRow}>
          <Ionicons name="mail-outline" size={13} color={colors.natural[400]} />
          <Text style={heroStyles.metaText}>{whitelabel.email}</Text>
        </View>
      ) : null}
      {whitelabel.phoneNumber ? (
        <View style={heroStyles.metaRow}>
          <Ionicons name="call-outline" size={13} color={colors.natural[400]} />
          <Text style={heroStyles.metaText}>{whitelabel.phoneNumber}</Text>
        </View>
      ) : null}
    </View>
  );
};

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    alignItems: "center",
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[20],
    gap: spacing[8],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary[500]}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  avatarText: {
    fontSize: typography.fontSize.headline.small,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },
  name: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  username: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginTop: spacing[4],
  },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    backgroundColor: "#fdf5ec",
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  planChipText: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  metaText: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
});

// ─── Feature Toggle Row ────────────────────────────────────────────────────────
const FeatureRow = ({ feature, onToggle, last }) => (
  <View style={[featureStyles.row, last && featureStyles.rowLast]}>
    <View style={featureStyles.left}>
      <Text style={featureStyles.name}>{feature.label || feature.name}</Text>
      {feature.description ? (
        <Text style={featureStyles.desc} numberOfLines={2}>
          {feature.description}
        </Text>
      ) : null}
    </View>
    <Switch
      value={!!feature.enabled}
      onValueChange={(val) => onToggle(feature.name, val)}
      trackColor={{
        false: colors.natural[200],
        true: `${colors.primary[500]}60`,
      }}
      thumbColor={feature.enabled ? colors.primary[500] : colors.natural[400]}
    />
  </View>
);

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  rowLast: { borderBottomWidth: 0 },
  left: { flex: 1, marginRight: spacing[12] },
  name: {
    fontSize: typography.fontSize.body.small,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[800],
  },
  desc: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    marginTop: 2,
  },
});

// ─── Tags Row (for event types etc.) ──────────────────────────────────────────
const TagsRow = ({ label, tags }) => {
  if (!tags?.length) return null;
  return (
    <View style={tagStyles.container}>
      <Text style={tagStyles.label}>{label}</Text>
      <View style={tagStyles.row}>
        {tags.map((t, i) => (
          <View key={i} style={tagStyles.chip}>
            <Text style={tagStyles.chipText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const tagStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.natural[150],
  },
  label: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    marginBottom: spacing[8],
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  chip: {
    backgroundColor: `${colors.primary[500]}12`,
    borderRadius: borderRadius[20],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
  },
  chipText: {
    fontSize: typography.fontSize.label.large,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const WhitelabelDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { whitelabelId } = route.params;
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const token = useAuthStore((state) => state.token);
  const canEdit = canEditPage(role, PAGES.WHITELABELS);
  const canDelete = canDeleteOnPage(role, PAGES.WHITELABELS);

  const { data: resp, isLoading, error, refetch } = useAdminWhitelabelById(whitelabelId);
  const updateStatus = useUpdateWhitelabelStatus();
  const deleteWhitelabel = useDeleteWhitelabel();

  const [subModalVisible, setSubModalVisible] = useState(false);
  const [features, setFeatures] = useState([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);

  if (error) toast.error("Failed to load whitelabel details");

  const whitelabel = resp?.data?.whitelabel || resp?.data || null;
  const wlData = whitelabel?.roleData || whitelabel?.whitelabelData || {};
  const planSelection = whitelabel?.planSelection || resp?.data?.planSelection || {};

  // ── Fetch features ────────────────────────────────────────────────────────────
  // Phase 4 W0-AUTH: routed through apiFetch so 401 → refresh kicks in
  // and the request is retried with a fresh access token.
  useEffect(() => {
    if (!whitelabelId || !token) return;
    const fetchFeatures = async () => {
      setFeaturesLoading(true);
      try {
        const res = await apiFetch(`/admin/whitelabels/${whitelabelId}/features`);
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          setFeatures(json.data?.features || []);
        }
      } catch {
        // Features endpoint not available — skip silently
      } finally {
        setFeaturesLoading(false);
      }
    };
    fetchFeatures();
  }, [whitelabelId, token]);

  const handleFeatureToggle = async (featureName, enabled) => {
    try {
      const res = await apiFetch(`/admin/whitelabels/${whitelabelId}/features`, {
        method: "PATCH",
        body: { feature: featureName, enabled },
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) => (f.name === featureName ? { ...f, enabled } : f))
        );
        toast.success("Feature updated");
      } else {
        toast.error("Failed to update feature");
      }
    } catch {
      toast.error("Failed to update feature");
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────────
  if (isLoading || !whitelabel) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title="Whitelabel Details" showBack={true} />
        <View style={styles.centerState}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary[500]} />
          ) : (
            <Text style={styles.centerText}>Whitelabel not found</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const stats = whitelabel.statistics || {};
  const sub = whitelabel.subscription || {};
  const isActive = whitelabel.status === "active";

  const handleToggleStatus = () => {
    Alert.alert(
      isActive ? "Suspend Whitelabel" : "Activate Whitelabel",
      isActive
        ? "This whitelabel will be suspended and lose access."
        : "Reactivate this whitelabel?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isActive ? "Suspend" : "Activate",
          style: isActive ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                whitelabelId: whitelabel._id || whitelabel.id,
                status: isActive ? "suspended" : "active",
              });
              toast.success(`Whitelabel ${isActive ? "suspended" : "activated"}`);
              refetch();
            } catch {
              toast.error("Failed to update status");
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Whitelabel",
      "This cannot be undone. All whitelabel data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWhitelabel.mutateAsync(whitelabel._id || whitelabel.id);
              toast.success("Whitelabel deleted");
              navigation.goBack();
            } catch {
              toast.error("Failed to delete whitelabel");
            }
          },
        },
      ]
    );
  };

  const planSelectionLabel =
    planSelection.planCode === "pro"
      ? "Pro"
      : planSelection.planCode === "elite"
      ? "Elite"
      : planSelection.planCode || "—";

  const billingLabel =
    planSelection.billingCycle === "yearly"
      ? "Yearly"
      : planSelection.billingCycle === "monthly"
      ? "Monthly"
      : "—";

  const hasAddress =
    wlData.address &&
    (wlData.address.city ||
      wlData.address.neighborhood ||
      wlData.address.street ||
      wlData.address.buildingNumber);

  const hasBrandIdentity =
    wlData.arabicName || wlData.englishName || wlData.companyName || wlData.platformName;

  const hasPlanSelection = planSelection.planCode || planSelection.billingCycle;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title="Whitelabel Details" showBack={true} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <HeroCard whitelabel={whitelabel} />

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatPill
            icon="people-outline"
            value={stats.totalHosts}
            label="Hosts"
            color={colors.primary[500]}
          />
          <StatPill
            icon="calendar-outline"
            value={stats.totalEvents}
            label="Events"
            color={colors.warning[500]}
          />
          <StatPill
            icon="shield-outline"
            value={stats.totalModerators}
            label="Moderators"
            color={colors.accent[500]}
          />
        </View>

        {/* ── Brand Identity ────────────────────────────────────────────────── */}
        {hasBrandIdentity ? (
          <SectionCard title="Brand Identity" icon="business-outline">
            {wlData.arabicName ? (
              <InfoRow icon="text-outline" label="Arabic Name" value={wlData.arabicName} />
            ) : null}
            {wlData.englishName ? (
              <InfoRow icon="text-outline" label="English Name" value={wlData.englishName} />
            ) : null}
            {wlData.companyName ? (
              <InfoRow icon="briefcase-outline" label="Company Name" value={wlData.companyName} />
            ) : null}
            {wlData.platformName ? (
              <InfoRow
                icon="globe-outline"
                label="Platform Name"
                value={wlData.platformName}
                last
              />
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── Contact & Info ────────────────────────────────────────────────── */}
        <SectionCard title="Contact & Info" icon="person-outline">
          <InfoRow icon="mail-outline" label="Email" value={whitelabel.email || "—"} />
          <InfoRow icon="call-outline" label="Phone" value={whitelabel.phoneNumber || "—"} />
          <InfoRow icon="globe-outline" label="Domain" value={whitelabel.domain || "—"} />
          <InfoRow
            icon="at-outline"
            label="Username"
            value={whitelabel.username ? `@${whitelabel.username}` : "—"}
          />
          <InfoRow
            icon="calendar-outline"
            label="Joined"
            value={formatDate(whitelabel.createdAt)}
            last
          />
        </SectionCard>

        {/* ── Requirements ─────────────────────────────────────────────────── */}
        {wlData.requirements ? (
          <SectionCard title="Requirements" icon="list-outline">
            <InfoRow
              icon="calendar-number-outline"
              label="Monthly Events"
              value={String(wlData.requirements.numberOfEventsMonthly ?? "—")}
            />
            <InfoRow
              icon="people-outline"
              label="Monthly Guests"
              value={String(wlData.requirements.numberOfGuestsMonthly ?? "—")}
            />
            {wlData.requirements.eventsTypesOther ? (
              <InfoRow
                icon="information-circle-outline"
                label="Other Types"
                value={wlData.requirements.eventsTypesOther}
              />
            ) : null}
            <TagsRow
              label="Event Types"
              tags={wlData.requirements.eventTypes}
            />
          </SectionCard>
        ) : null}

        {/* ── Address ──────────────────────────────────────────────────────── */}
        {hasAddress ? (
          <SectionCard title="Address" icon="location-outline">
            {wlData.address.city ? (
              <InfoRow icon="business-outline" label="City" value={wlData.address.city} />
            ) : null}
            {wlData.address.neighborhood ? (
              <InfoRow icon="map-outline" label="Neighborhood" value={wlData.address.neighborhood} />
            ) : null}
            {wlData.address.street ? (
              <InfoRow icon="navigate-outline" label="Street" value={wlData.address.street} />
            ) : null}
            {wlData.address.buildingNumber ? (
              <InfoRow
                icon="home-outline"
                label="Building No."
                value={String(wlData.address.buildingNumber)}
              />
            ) : null}
            {wlData.address.additionalNumber ? (
              <InfoRow
                icon="add-circle-outline"
                label="Additional No."
                value={String(wlData.address.additionalNumber)}
                last
              />
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── License & Tax ────────────────────────────────────────────────── */}
        {(wlData.licenseNumber || wlData.taxNumber) ? (
          <SectionCard title="License & Tax" icon="document-text-outline">
            {wlData.licenseNumber ? (
              <InfoRow
                icon="document-text-outline"
                label="Commercial Registration"
                value={wlData.licenseNumber}
              />
            ) : null}
            {wlData.taxNumber ? (
              <InfoRow
                icon="receipt-outline"
                label="Tax Number"
                value={wlData.taxNumber}
                last
              />
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── Subscription ─────────────────────────────────────────────────── */}
        {(sub.planCode || sub.planId) ? (
          <SectionCard title="Subscription" icon="card-outline">
            <InfoRow
              icon="star-outline"
              label="Plan"
              value={
                sub.planId?.nameEn ||
                planLabels[sub.planId?.code || sub.planCode] ||
                sub.planCode ||
                "—"
              }
            />
            <InfoRow
              icon="ellipse-outline"
              label="Status"
              value={null}
              badge={<StatusBadge status={sub.status} size="small" />}
            />
            <InfoRow
              icon="time-outline"
              label="Expires"
              value={formatDate(sub.endDate || sub.currentPeriodEnd)}
            />
            {sub.limits?.maxTeamMembers != null ? (
              <InfoRow
                icon="people-outline"
                label="Team Limit"
                value={String(sub.limits.maxTeamMembers)}
              />
            ) : null}
            <InfoRow
              icon="calendar-number-outline"
              label="Events / Month"
              value={
                sub.limits?.maxEventsPerMonth != null
                  ? String(sub.limits.maxEventsPerMonth)
                  : "—"
              }
              last
            />
          </SectionCard>
        ) : null}

        {/* ── Plan Preferences ─────────────────────────────────────────────── */}
        {hasPlanSelection ? (
          <SectionCard title="Plan Preferences" icon="options-outline">
            {planSelection.planCode ? (
              <InfoRow
                icon="star-outline"
                label="Requested Plan"
                value={planSelectionLabel}
              />
            ) : null}
            {planSelection.billingCycle ? (
              <InfoRow icon="repeat-outline" label="Billing Cycle" value={billingLabel} />
            ) : null}
            <InfoRow
              icon="color-palette-outline"
              label="Custom Branding"
              value={planSelection.needsCustomBranding ? "Yes" : "No"}
              last
            />
          </SectionCard>
        ) : null}

        {/* ── Feature Management ────────────────────────────────────────────── */}
        {canEdit && (featuresLoading || features.length > 0) ? (
          <SectionCard title="Feature Management" icon="settings-outline">
            {featuresLoading ? (
              <View style={styles.featuresLoading}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
                <Text style={styles.featuresLoadingText}>Loading features…</Text>
              </View>
            ) : (
              features.map((feature, idx) => (
                <FeatureRow
                  key={feature.name}
                  feature={feature}
                  onToggle={handleFeatureToggle}
                  last={idx === features.length - 1}
                />
              ))
            )}
          </SectionCard>
        ) : null}

        {/* ── Admin Actions ─────────────────────────────────────────────────── */}
        {(canEdit || canDelete) ? (
          <SectionCard title="Admin Actions" icon="shield-outline">
            {canEdit ? (
              <ActionRow
                icon="card-outline"
                iconBg={`${colors.primary[500]}15`}
                iconColor={colors.primary[500]}
                label="Manage Subscription"
                sublabel="Change enterprise plan or status"
                onPress={() => setSubModalVisible(true)}
              />
            ) : null}
            {canEdit ? (
              <ActionRow
                icon={isActive ? "pause-circle-outline" : "checkmark-circle-outline"}
                iconBg={isActive ? colors.warning[50] : colors.success[50]}
                iconColor={isActive ? colors.warning[500] : colors.success[500]}
                label={isActive ? "Suspend Whitelabel" : "Activate Whitelabel"}
                sublabel={
                  isActive
                    ? "Restrict access to this whitelabel"
                    : "Restore access to this whitelabel"
                }
                onPress={handleToggleStatus}
                loading={updateStatus.isPending}
                last={!canDelete}
              />
            ) : null}
            {canDelete ? (
              <ActionRow
                icon="trash-outline"
                iconBg={colors.error[50]}
                iconColor={colors.error[500]}
                label="Delete Whitelabel"
                sublabel="Permanently remove this whitelabel"
                onPress={handleDelete}
                loading={deleteWhitelabel.isPending}
                destructive
                last
              />
            ) : null}
          </SectionCard>
        ) : null}

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      {/* ── Subscription modal ────────────────────────────────────────────── */}
      <WhitelabelSubscriptionModal
        visible={subModalVisible}
        onClose={() => setSubModalVisible(false)}
        whitelabel={whitelabel}
        onSave={() => refetch()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  scroll: { flex: 1, backgroundColor: backgrounds.artboard },
  content: { padding: spacing[16], gap: spacing[12] },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
  },
  centerText: { ...textStyles.bodyMedium, color: colors.natural[450] },
  statsRow: { flexDirection: "row", gap: spacing[8] },
  featuresLoading: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[16],
    gap: spacing[12],
  },
  featuresLoadingText: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
});

export default WhitelabelDetailsScreen;
