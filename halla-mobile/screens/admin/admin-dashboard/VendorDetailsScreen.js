import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, StyleSheet, Image, Modal, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAdminVendorById, useUpdateVendorStatus } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../stores/authStore";
import { useTranslation } from "../../../localization";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import VendorHeroCard from "../../../components/admin-dashboard/vendors/VendorHeroCard";
import { colors, spacing, borderRadius, typography, backgrounds, textStyles } from "../../../styles/tokens";

const IMAGE_BASE = "https://labbe-backend-production.up.railway.app";
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

const fmtDate = (d, locale) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
};

const IdentitySection = ({ vendor, roleData, t, currentLanguage }) => (
  <SectionCard title={t("vendorDetails.identity", "Identity")} icon="person-outline">
    <InfoRow icon="business-outline" label={t("vendorDetails.brandName")} value={roleData?.brandName || vendor.brandName} />
    <InfoRow icon="person-outline" label={t("vendorDetails.ownerName")} value={roleData?.ownerFullName || roleData?.ownerName || vendor.name} />
    <InfoRow icon="mail-outline" label={t("common.email")} value={vendor.email || roleData?.email} />
    <InfoRow icon="call-outline" label={t("common.phone")} value={vendor.phoneNumber || roleData?.phone} />
    <InfoRow icon="calendar-outline" label={t("vendorDetails.registrationDate")} value={fmtDate(vendor.createdAt, currentLanguage)} last />
  </SectionCard>
);

const DescriptionSection = ({ roleData, t }) => {
  const desc = roleData?.serviceDescription;
  const other = roleData?.otherData;
  return (
    <SectionCard title={t("vendorDetails.serviceDescription")} icon="document-text-outline">
      <View style={descStyles.block}>
        <Text style={descStyles.text}>{desc || t("vendorDetails.noDescription")}</Text>
      </View>
      {other ? (
        <View style={[descStyles.block, descStyles.blockBorder]}>
          <Text style={descStyles.label}>{t("vendorDetails.additionalInfo")}</Text>
          <Text style={descStyles.text}>{other}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
};
const descStyles = StyleSheet.create({
  block: { paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  blockBorder: { borderTopWidth: 1, borderTopColor: colors.natural[150] },
  label: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginBottom: spacing[4] },
  text: { fontSize: typography.fontSize.body.small, color: colors.natural[800], lineHeight: 20 },
});

const LocationSection = ({ roleData, t }) => {
  const sl = roleData?.serviceLocation;
  const region = sl?.regionNameAr || sl?.regionNameEn || sl?.region;
  const city = sl?.cityNameAr || sl?.cityNameEn || sl?.city;
  const coverage = sl?.coverageType;
  return (
    <SectionCard title={t("vendorDetails.serviceLocation")} icon="location-outline">
      {!sl ? (
        <View style={emptyStyles.row}><Text style={emptyStyles.text}>{t("vendorDetails.noLocation")}</Text></View>
      ) : (
        <>
          <InfoRow icon="map-outline" label={t("vendorDetails.region")} value={region} />
          <InfoRow icon="business-outline" label={t("vendorDetails.city")} value={city} />
          <InfoRow icon="navigate-outline" label={t("vendorDetails.coverageType")} value={coverage} last />
        </>
      )}
    </SectionCard>
  );
};

const CommercialSection = ({ roleData, t }) => (
  <SectionCard title={t("vendorDetails.commercialVerification", "Commercial Verification")} icon="shield-checkmark-outline">
    <InfoRow icon="document-text-outline" label={t("vendorDetails.commercialRecordNumber")} value={roleData?.commercialRecordNumber || roleData?.commercialRecord} />
    <InfoRow icon="card-outline" label={t("vendorDetails.nationalIdNumber")} value={roleData?.nationalId} last />
  </SectionCard>
);

const SocialLinksSection = ({ roleData, t }) => {
  const links = roleData?.socialLinks || {};
  const entries = [
    { key: "instagram", icon: "logo-instagram", label: "Instagram" },
    { key: "facebook", icon: "logo-facebook", label: "Facebook" },
    { key: "tiktok", icon: "musical-notes-outline", label: "TikTok" },
    { key: "twitter", icon: "logo-twitter", label: "Twitter / X" },
    { key: "website", icon: "globe-outline", label: t("vendorDetails.domain") },
  ].filter((e) => links[e.key]);

  return (
    <SectionCard title={t("vendorDetails.socialLinks")} icon="share-social-outline">
      {!entries.length ? (
        <View style={emptyStyles.row}><Text style={emptyStyles.text}>{t("vendorDetails.noLinks")}</Text></View>
      ) : entries.map((e, i) => (
        <TouchableOpacity key={e.key} onPress={() => Linking.openURL(links[e.key]).catch(() => {})} activeOpacity={0.7}>
          <InfoRow icon={e.icon} label={e.label} value={links[e.key]} last={i === entries.length - 1} />
        </TouchableOpacity>
      ))}
    </SectionCard>
  );
};

const CategoriesSection = ({ vendor, roleData, t }) => {
  const cats = vendor?.serviceCategories || roleData?.serviceCategories;
  const entries = cats ? Object.entries(cats).filter(([, v]) => Array.isArray(v) && v.length) : [];
  return (
    <SectionCard title={t("vendorDetails.serviceCategories")} icon="grid-outline">
      {!entries.length ? (
        <View style={emptyStyles.row}><Text style={emptyStyles.text}>{t("vendorDetails.noServices")}</Text></View>
      ) : entries.map(([cat, vals], idx) => (
        <View key={cat} style={[catStyles.group, idx < entries.length - 1 && catStyles.groupBorder]}>
          <Text style={catStyles.groupTitle}>{t(`vendorDetails.categoryLabels.${cat}`, cat)}</Text>
          <View style={catStyles.wrap}>
            {vals.map((v, i) => (
              <View key={i} style={catStyles.chip}>
                <Text style={catStyles.chipText}>{t(`vendorDetails.serviceLabels.${v}`, v)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </SectionCard>
  );
};
const catStyles = StyleSheet.create({
  group: { paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  groupBorder: { borderBottomWidth: 1, borderBottomColor: colors.natural[150] },
  groupTitle: { fontSize: typography.fontSize.label.large, fontWeight: typography.fontWeight.semibold, color: colors.natural[700], marginBottom: spacing[8] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  chip: { backgroundColor: "#fdf3e7", borderRadius: borderRadius[20], paddingHorizontal: spacing[12], paddingVertical: spacing[4] },
  chipText: { fontSize: typography.fontSize.label.large, color: colors.primary[500], fontWeight: typography.fontWeight.medium },
});

const GallerySection = ({ roleData, t }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const items = [
    ...(roleData.businessLogo ? [{ url: getImageUrl(roleData.businessLogo), title: t("vendorDetails.businessLogo") }] : []),
    ...((Array.isArray(roleData.portfolioImages) ? roleData.portfolioImages : []).map((img, i) => ({
      url: getImageUrl(img), title: `${t("vendorDetails.portfolio")} ${i + 1}`,
    }))),
    ...((Array.isArray(roleData.pricePackages) ? roleData.pricePackages : []).map((pkg, i) => ({
      url: getImageUrl(pkg), title: `${t("vendorDetails.pricePackage")} ${i + 1}`,
    }))),
    ...(roleData.commercialRecordImage ? [{ url: getImageUrl(roleData.commercialRecordImage), title: t("vendorDetails.commercialRecord") }] : []),
    ...(roleData.nationalIdImage ? [{ url: getImageUrl(roleData.nationalIdImage), title: t("vendorDetails.nationalId") }] : []),
    ...(roleData.profileFile ? [{ url: getImageUrl(roleData.profileFile), title: t("vendorDetails.profileFile") }] : []),
  ].filter((item) => !!item.url);

  return (
    <SectionCard title={t("vendorDetails.galleryFiles")} icon="images-outline">
      {!items.length ? (
        <View style={emptyStyles.row}><Text style={emptyStyles.text}>{t("vendorDetails.noFiles")}</Text></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={gallStyles.row}>
          {items.map((item, idx) => (
            <TouchableOpacity key={idx} style={gallStyles.thumb} onPress={() => setPreviewUrl(item.url)} activeOpacity={0.8}>
              <Image source={{ uri: item.url }} style={gallStyles.thumbImg} resizeMode="cover" />
              <Text style={gallStyles.thumbTitle} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <Pressable style={gallStyles.overlay} onPress={() => setPreviewUrl(null)}>
          <View style={gallStyles.modalContent}>
            <TouchableOpacity style={gallStyles.closeBtn} onPress={() => setPreviewUrl(null)}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: previewUrl }} style={gallStyles.fullImg} resizeMode="contain" />
          </View>
        </Pressable>
      </Modal>
    </SectionCard>
  );
};
const gallStyles = StyleSheet.create({
  row: { paddingHorizontal: spacing[16], paddingVertical: spacing[12], gap: spacing[12], flexDirection: "row" },
  thumb: { width: 120, alignItems: "center" },
  thumbImg: { width: 120, height: 90, borderRadius: borderRadius[8], backgroundColor: colors.natural[100] },
  thumbTitle: { marginTop: spacing[4], fontSize: typography.fontSize.label.small, color: colors.natural[500], textAlign: "center", width: 120 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  modalContent: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  closeBtn: { position: "absolute", top: spacing[48], right: spacing[16], zIndex: 10 },
  fullImg: { width: "92%", height: "72%" },
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

const emptyStyles = StyleSheet.create({
  row: { paddingHorizontal: spacing[16], paddingVertical: spacing[20], alignItems: "center" },
  text: { fontSize: typography.fontSize.body.small, color: colors.natural[400] },
});

const VendorDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { t, currentLanguage } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const { vendorId } = route.params || {};
  const { data, isLoading, error, refetch } = useAdminVendorById(vendorId);
  const updateStatus = useUpdateVendorStatus();
  const canEdit = canEditPage(role, PAGES.VENDORS);

  useEffect(() => {
    if (error) toast.error(t("vendorDetails.loadFailed", "Failed to load vendor details"));
  }, [error, t, toast]);

  const vendor = data?.data?.vendor || data?.data || null;
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const status = vendor?.status;

  const callMutation = async (next, successKey, failKey) => {
    try {
      await updateStatus.mutateAsync({ vendorId: vendor._id || vendor.id, status: next });
      toast.success(t(successKey));
      refetch();
    } catch {
      toast.error(t(failKey));
    }
  };

  const handleApprove = () =>
    Alert.alert(t("vendorDetails.approveConfirmTitle"), t("vendorDetails.approveConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.approve"), onPress: () => callMutation("approved", "vendorDetails.approved", "vendorDetails.approveFailed") },
    ]);
  const handleSuspend = () =>
    Alert.alert(t("vendorDetails.suspendConfirmTitle"), t("vendorDetails.suspendConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.suspend"), style: "destructive", onPress: () => callMutation("suspended", "vendorDetails.suspended", "vendorDetails.suspendFailed") },
    ]);
  const handleActivate = () =>
    Alert.alert(t("vendorDetails.activateConfirmTitle"), t("vendorDetails.activateConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.activate"), onPress: () => callMutation("approved", "vendorDetails.activated", "vendorDetails.activateFailed") },
    ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("vendorDetails.title")} showBack={true} />
        {isLoading || !vendor ? (
          <View style={styles.center}>
            {isLoading ? <ActivityIndicator size="large" color={colors.primary[500]} /> : <Text style={styles.notFound}>{t("vendorDetails.notFound")}</Text>}
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <VendorHeroCard vendor={vendor} />

            <View style={styles.sections}>
              <IdentitySection vendor={vendor} roleData={roleData} t={t} currentLanguage={currentLanguage} />
              <DescriptionSection roleData={roleData} t={t} />
              <LocationSection roleData={roleData} t={t} />
              <CommercialSection roleData={roleData} t={t} />
              <SocialLinksSection roleData={roleData} t={t} />
              <CategoriesSection vendor={vendor} roleData={roleData} t={t} />
              <GallerySection roleData={roleData} t={t} />

              {canEdit && (() => {
                const isPendingOrRejected = status === "pending" || status === "rejected";
                const isSuspended = status === "suspended";
                const showSuspend = !isPendingOrRejected && !isSuspended;
                return (
                  <SectionCard title={t("vendorDetails.adminActions")} icon="shield-checkmark-outline">
                    {isPendingOrRejected && (
                      <ActionRow
                        icon="checkmark-circle-outline"
                        iconBg={colors.success[50]}
                        iconColor={colors.success[500]}
                        label={t("vendorDetails.approveVendor")}
                        sublabel={t("vendorDetails.approveSublabel")}
                        onPress={handleApprove}
                        loading={updateStatus.isPending}
                        last
                      />
                    )}
                    {isSuspended && (
                      <ActionRow
                        icon="play-circle-outline"
                        iconBg={colors.success[50]}
                        iconColor={colors.success[500]}
                        label={t("vendorDetails.activateVendor")}
                        sublabel={t("vendorDetails.activateSublabel")}
                        onPress={handleActivate}
                        loading={updateStatus.isPending}
                        last
                      />
                    )}
                    {showSuspend && (
                      <ActionRow
                        icon="pause-circle-outline"
                        iconBg={colors.warning[50]}
                        iconColor={colors.warning[500]}
                        label={t("vendorDetails.suspendVendor")}
                        sublabel={t("vendorDetails.suspendSublabel")}
                        onPress={handleSuspend}
                        loading={updateStatus.isPending}
                        last
                      />
                    )}
                  </SectionCard>
                );
              })()}
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing[32] },
  sections: { marginHorizontal: spacing[16], gap: spacing[12], marginTop: spacing[12] },
  bottomSpacer: { height: spacing[20] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { ...textStyles.bodyMedium, color: colors.natural[450] },
});

export default VendorDetailsScreen;
