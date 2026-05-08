import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAdminWhitelabelById, useUpdateWhitelabelStatus, useUpdateWhitelabelSubscription, useDeleteWhitelabel, useAdminWhitelabelFeatures, useUpdateAdminWhitelabelFeatureMutation } from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import StatusBadge from "../../../components/admin-dashboard/common/StatusBadge";
import { WhitelabelSubscriptionModal, WhitelabelHeroCard, WhitelabelStatsRow, WhitelabelActionRow } from "../../../components/admin-dashboard/whitelabels";
import { backgrounds, colors, spacing, borderRadius, typography, textStyles } from "../../../styles/tokens";

const formatDate = (d) => { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); };

const FeatureRow = ({ feature, onToggle, last }) => (
  <View style={[featureStyles.row, last && featureStyles.rowLast]}>
    <View style={featureStyles.left}>
      <Text style={featureStyles.name}>{feature.label || feature.name}</Text>
      {feature.description && <Text style={featureStyles.desc} numberOfLines={2}>{feature.description}</Text>}
    </View>
    <Switch value={!!feature.enabled} onValueChange={(val) => onToggle(feature.name, val)} trackColor={{ false: colors.natural[200], true: `${colors.primary[500]}60` }} thumbColor={feature.enabled ? colors.primary[500] : colors.natural[400]} />
  </View>
);
const featureStyles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[16], paddingVertical: spacing[12], borderBottomWidth: 1, borderBottomColor: colors.natural[150] }, rowLast: { borderBottomWidth: 0 }, left: { flex: 1, marginRight: spacing[12] }, name: { fontSize: typography.fontSize.body.small, fontWeight: typography.fontWeight.medium, color: colors.natural[800] }, desc: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginTop: 2 } });

const TagsRow = ({ label, tags }) => {
  if (!tags?.length) return null;
  return (<View style={tagStyles.container}><Text style={tagStyles.label}>{label}</Text><View style={tagStyles.row}>{tags.map((t, i) => (<View key={i} style={tagStyles.chip}><Text style={tagStyles.chipText}>{t}</Text></View>))}</View></View>);
};
const tagStyles = StyleSheet.create({ container: { paddingHorizontal: spacing[16], paddingVertical: spacing[12], borderTopWidth: 1, borderTopColor: colors.natural[150] }, label: { fontSize: typography.fontSize.body.small, color: colors.natural[450], marginBottom: spacing[8] }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] }, chip: { backgroundColor: `${colors.primary[500]}12`, borderRadius: borderRadius[20], paddingHorizontal: spacing[12], paddingVertical: spacing[4] }, chipText: { fontSize: typography.fontSize.label.large, color: colors.primary[500], fontWeight: typography.fontWeight.medium } });

const WhitelabelDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { whitelabelId } = route.params;
  const { t } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const token = useAuthStore((state) => state.token);
  const canEdit = canEditPage(role, PAGES.WHITELABELS);
  const canDelete = canDeleteOnPage(role, PAGES.WHITELABELS);
  const { data: resp, isLoading, error, refetch } = useAdminWhitelabelById(whitelabelId);
  const updateStatus = useUpdateWhitelabelStatus();
  const deleteWhitelabel = useDeleteWhitelabel();
  const [subModalVisible, setSubModalVisible] = useState(false);
  const { data: featuresResp, isLoading: featuresLoading } = useAdminWhitelabelFeatures(whitelabelId);
  const featureMutation = useUpdateAdminWhitelabelFeatureMutation(whitelabelId);

  if (error) toast.error(t("whitelabelDetails.loadFailed"));

  const whitelabel = resp?.data?.whitelabel || resp?.data || null;
  const wlData = whitelabel?.roleData || whitelabel?.whitelabelData || {};
  const planSelection = whitelabel?.planSelection || resp?.data?.planSelection || {};
  const features = featuresResp?.data?.features || featuresResp?.features || [];

  const handleFeatureToggle = async (featureName, enabled) => {
    try {
      await featureMutation.mutateAsync({ feature: featureName, enabled });
      toast.success(t("whitelabelDetails.featureUpdated"));
    } catch { toast.error(t("whitelabelDetails.featureUpdateFailed")); }
  };

  if (isLoading || !whitelabel) {
    return (<SafeAreaView style={styles.safeArea} edges={["top"]}><TopBar title={t("whitelabelDetails.title")} showBack={true} /><View style={styles.centerState}>{isLoading ? <ActivityIndicator size="large" color={colors.primary[500]} /> : <Text style={styles.centerText}>{t("whitelabelDetails.notFound")}</Text>}</View></SafeAreaView>);
  }

  const stats = whitelabel.statistics || {};
  const sub = whitelabel.subscription || {};
  const isActive = whitelabel.status === "active";

  const handleToggleStatus = () => Alert.alert(isActive ? t("whitelabelDetails.suspendConfirmTitle") : t("whitelabelDetails.activateConfirmTitle"), isActive ? t("whitelabelDetails.suspendConfirmMessage") : t("whitelabelDetails.activateConfirmMessage"), [{ text: t("common.cancel"), style: "cancel" }, { text: isActive ? t("common.suspend") : t("common.activate"), style: isActive ? "destructive" : "default", onPress: async () => { try { await updateStatus.mutateAsync({ whitelabelId: whitelabel._id || whitelabel.id, status: isActive ? "suspended" : "active" }); toast.success(isActive ? t("whitelabelDetails.suspended") : t("whitelabelDetails.activated")); refetch(); } catch { toast.error(t("whitelabelDetails.updateStatusFailed")); } } }]);
  const handleDelete = () => Alert.alert(t("whitelabelDetails.deleteConfirmTitle"), t("whitelabelDetails.deleteConfirmMessage"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.delete"), style: "destructive", onPress: async () => { try { await deleteWhitelabel.mutateAsync(whitelabel._id || whitelabel.id); toast.success(t("whitelabelDetails.deleted")); navigation.goBack(); } catch { toast.error(t("whitelabelDetails.deleteFailed")); } } }]);

  const planSelectionLabel = planSelection.planCode === "pro" ? t("whitelabelDetails.planSelection.pro") : planSelection.planCode === "elite" ? t("whitelabelDetails.planSelection.elite") : planSelection.planCode || "—";
  const billingLabel = planSelection.billingCycle === "yearly" ? t("whitelabelDetails.yearly") : planSelection.billingCycle === "monthly" ? t("whitelabelDetails.monthly") : "—";
  const hasAddress = wlData.address && (wlData.address.city || wlData.address.neighborhood || wlData.address.street || wlData.address.buildingNumber);
  const hasBrandIdentity = wlData.arabicName || wlData.englishName || wlData.companyName || wlData.platformName;
  const hasPlanSelection = planSelection.planCode || planSelection.billingCycle;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("whitelabelDetails.title")} showBack={true} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />} showsVerticalScrollIndicator={false}>
        <WhitelabelHeroCard whitelabel={whitelabel} />
        <WhitelabelStatsRow stats={stats} />

        {hasBrandIdentity && (<SectionCard title={t("whitelabelDetails.brandIdentity")} icon="business-outline">
          {wlData.arabicName && <InfoRow icon="text-outline" label={t("whitelabelDetails.arabicName")} value={wlData.arabicName} />}
          {wlData.englishName && <InfoRow icon="text-outline" label={t("whitelabelDetails.englishName")} value={wlData.englishName} />}
          {wlData.companyName && <InfoRow icon="briefcase-outline" label={t("whitelabelDetails.companyName")} value={wlData.companyName} />}
          {wlData.platformName && <InfoRow icon="globe-outline" label={t("whitelabelDetails.platformName")} value={wlData.platformName} last />}
        </SectionCard>)}

        <SectionCard title={t("whitelabelDetails.contactInfo")} icon="person-outline">
          <InfoRow icon="mail-outline" label={t("common.email")} value={whitelabel.email || "—"} />
          <InfoRow icon="call-outline" label={t("common.phone")} value={whitelabel.phoneNumber || "—"} />
          <InfoRow icon="globe-outline" label={t("whitelabelDetails.domain")} value={whitelabel.domain || "—"} />
          <InfoRow icon="at-outline" label={t("whitelabelDetails.username")} value={whitelabel.username ? `@${whitelabel.username}` : "—"} />
          <InfoRow icon="calendar-outline" label={t("whitelabelDetails.joined")} value={formatDate(whitelabel.createdAt)} last />
        </SectionCard>

        {wlData.requirements && (<SectionCard title={t("whitelabelDetails.requirements")} icon="list-outline">
          <InfoRow icon="calendar-number-outline" label={t("whitelabelDetails.monthlyEvents")} value={String(wlData.requirements.numberOfEventsMonthly ?? "—")} />
          <InfoRow icon="people-outline" label={t("whitelabelDetails.monthlyGuests")} value={String(wlData.requirements.numberOfGuestsMonthly ?? "—")} />
          {wlData.requirements.eventsTypesOther && <InfoRow icon="information-circle-outline" label={t("whitelabelDetails.otherTypes")} value={wlData.requirements.eventsTypesOther} />}
          <TagsRow label={t("whitelabelDetails.eventTypes")} tags={wlData.requirements.eventTypes} />
        </SectionCard>)}

        {hasAddress && (<SectionCard title={t("whitelabelDetails.address")} icon="location-outline">
          {wlData.address.city && <InfoRow icon="business-outline" label={t("whitelabelDetails.city")} value={wlData.address.city} />}
          {wlData.address.neighborhood && <InfoRow icon="map-outline" label={t("whitelabelDetails.neighborhood")} value={wlData.address.neighborhood} />}
          {wlData.address.street && <InfoRow icon="navigate-outline" label={t("whitelabelDetails.street")} value={wlData.address.street} />}
          {wlData.address.buildingNumber && <InfoRow icon="home-outline" label={t("whitelabelDetails.buildingNumber")} value={String(wlData.address.buildingNumber)} />}
          {wlData.address.additionalNumber && <InfoRow icon="add-circle-outline" label={t("whitelabelDetails.additionalNumber")} value={String(wlData.address.additionalNumber)} last />}
        </SectionCard>)}

        {(wlData.licenseNumber || wlData.taxNumber) && (<SectionCard title={t("whitelabelDetails.licenseTax")} icon="document-text-outline">
          {wlData.licenseNumber && <InfoRow icon="document-text-outline" label={t("whitelabelDetails.commercialRegistration")} value={wlData.licenseNumber} />}
          {wlData.taxNumber && <InfoRow icon="receipt-outline" label={t("whitelabelDetails.taxNumber")} value={wlData.taxNumber} last />}
        </SectionCard>)}

        {(sub.planCode || sub.planId) && (<SectionCard title={t("whitelabelDetails.subscription")} icon="card-outline">
          <InfoRow icon="star-outline" label={t("whitelabelDetails.plan")} value={sub.planId?.nameEn || t(`whitelabelDetails.plans.${sub.planId?.code || sub.planCode}`) || sub.planCode || "—"} />
          <InfoRow icon="ellipse-outline" label={t("whitelabelDetails.status")} value={null} badge={<StatusBadge status={sub.status} size="small" />} />
          <InfoRow icon="time-outline" label={t("whitelabelDetails.expires")} value={formatDate(sub.endDate || sub.currentPeriodEnd)} />
          {sub.limits?.maxTeamMembers != null && <InfoRow icon="people-outline" label={t("whitelabelDetails.teamLimit")} value={String(sub.limits.maxTeamMembers)} />}
          <InfoRow icon="calendar-number-outline" label={t("whitelabelDetails.eventsPerMonth")} value={sub.limits?.maxEvents != null ? String(sub.limits.maxEvents) : "—"} last />
        </SectionCard>)}

        {hasPlanSelection && (<SectionCard title={t("whitelabelDetails.planPreferences")} icon="options-outline">
          {planSelection.planCode && <InfoRow icon="star-outline" label={t("whitelabelDetails.requestedPlan")} value={planSelectionLabel} />}
          {planSelection.billingCycle && <InfoRow icon="repeat-outline" label={t("whitelabelDetails.billingCycle")} value={billingLabel} />}
          <InfoRow icon="color-palette-outline" label={t("whitelabelDetails.customBranding")} value={planSelection.needsCustomBranding ? t("whitelabelDetails.yes") : t("whitelabelDetails.no")} last />
        </SectionCard>)}

        {canEdit && (featuresLoading || features.length > 0) && (<SectionCard title={t("whitelabelDetails.featureManagement")} icon="settings-outline">
          {featuresLoading ? (<View style={styles.featuresLoading}><ActivityIndicator size="small" color={colors.primary[500]} /><Text style={styles.featuresLoadingText}>{t("whitelabelDetails.loadingFeatures")}</Text></View>) : features.map((feature, idx) => (<FeatureRow key={feature.name} feature={feature} onToggle={handleFeatureToggle} last={idx === features.length - 1} />))}
        </SectionCard>)}

        {(canEdit || canDelete) && (<SectionCard title={t("whitelabelDetails.adminActions")} icon="shield-outline">
          {canEdit && <WhitelabelActionRow icon="card-outline" iconBg={`${colors.primary[500]}15`} iconColor={colors.primary[500]} label={t("whitelabelDetails.manageSubscription")} sublabel={t("whitelabelDetails.manageSubscriptionSublabel")} onPress={() => setSubModalVisible(true)} />}
          {canEdit && <WhitelabelActionRow icon={isActive ? "pause-circle-outline" : "checkmark-circle-outline"} iconBg={isActive ? colors.warning[50] : colors.success[50]} iconColor={isActive ? colors.warning[500] : colors.success[500]} label={isActive ? t("whitelabelDetails.suspendWhitelabel") : t("whitelabelDetails.activateWhitelabel")} sublabel={isActive ? t("whitelabelDetails.suspendSublabel") : t("whitelabelDetails.activateSublabel")} onPress={handleToggleStatus} loading={updateStatus.isPending} last={!canDelete} />}
          {canDelete && <WhitelabelActionRow icon="trash-outline" iconBg={colors.error[50]} iconColor={colors.error[500]} label={t("whitelabelDetails.deleteWhitelabel")} sublabel={t("whitelabelDetails.deleteSublabel")} onPress={handleDelete} loading={deleteWhitelabel.isPending} destructive last />}
        </SectionCard>)}

        <View style={{ height: spacing[32] }} />
      </ScrollView>
      <WhitelabelSubscriptionModal visible={subModalVisible} onClose={() => setSubModalVisible(false)} whitelabel={whitelabel} onSave={() => refetch()} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: backgrounds.card[8] }, scroll: { flex: 1, backgroundColor: backgrounds.artboard }, content: { padding: spacing[16], gap: spacing[12] }, centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[12] }, centerText: { ...textStyles.bodyMedium, color: colors.natural[450] }, featuresLoading: { flexDirection: "row", alignItems: "center", padding: spacing[16], gap: spacing[12] }, featuresLoadingText: { fontSize: typography.fontSize.body.small, color: colors.natural[450] } });

export default WhitelabelDetailsScreen;
