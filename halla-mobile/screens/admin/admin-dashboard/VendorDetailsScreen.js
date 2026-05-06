import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, StyleSheet, Image, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAdminVendorById, useUpdateVendorStatus, useDeleteVendor } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../stores/authStore";
import { useTranslation } from "../../../localization";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import { ActionButton } from "../../../components/admin-dashboard/common";
import { VendorHeroCard, VendorStatsRow } from "../../../components/admin-dashboard/vendors";
import { colors, spacing, borderRadius, typography, backgrounds } from "../../../styles/tokens";

const IMAGE_BASE = "https://labbe-backend-production.up.railway.app";
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

const ServiceDescriptionSection = ({ roleData, t }) => {
  const desc = roleData?.serviceDescription;
  const other = roleData?.otherData;
  if (!desc && !other) return null;
  return (
    <SectionCard title={t("vendorDetails.serviceDescription")} icon="document-text-outline">
      {desc && <View style={descStyles.block}><Text style={descStyles.text}>{desc}</Text></View>}
      {other && <View style={[descStyles.block, desc && descStyles.blockBorder]}><Text style={descStyles.label}>{t("vendorDetails.additionalInfo")}</Text><Text style={descStyles.text}>{other}</Text></View>}
    </SectionCard>
  );
};
const descStyles = StyleSheet.create({ block: { paddingHorizontal: spacing[16], paddingVertical: spacing[12] }, blockBorder: { borderTopWidth: 1, borderTopColor: colors.natural[150] }, label: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginBottom: spacing[4] }, text: { fontSize: typography.fontSize.body.small, color: colors.natural[800], lineHeight: 20 } });

const ServiceLocationSection = ({ vendor, t }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const sl = roleData?.serviceLocation;
  const region = sl?.regionNameAr || sl?.regionNameEn || sl?.region || vendor?.location?.region;
  const city = sl?.cityNameAr || sl?.cityNameEn || sl?.city || vendor?.location?.city;
  const coverage = sl?.coverageType;
  if (!region && !city && !coverage) return null;
  const lastKey = coverage ? "coverage" : city ? "city" : "region";
  return (
    <SectionCard title={t("vendorDetails.serviceLocation")} icon="location-outline">
      {region && <InfoRow icon="map-outline" label={t("vendorDetails.region")} value={region} last={lastKey === "region"} />}
      {city && <InfoRow icon="business-outline" label={t("vendorDetails.city")} value={city} last={lastKey === "city"} />}
      {coverage && <InfoRow icon="navigate-outline" label={t("vendorDetails.coverageType")} value={coverage} last />}
    </SectionCard>
  );
};

const ServiceCategoriesSection = ({ vendor, t }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const serviceCategories = vendor?.serviceCategories || roleData?.serviceCategories;
  if (serviceCategories && Object.keys(serviceCategories).length > 0) {
    const entries = Object.entries(serviceCategories).filter(([, vals]) => Array.isArray(vals) && vals.length > 0);
    if (!entries.length) return null;
    return (
      <SectionCard title={t("vendorDetails.serviceCategories")} icon="grid-outline">
        {entries.map(([cat, vals], idx) => (
          <View key={cat} style={[catStyles.group, idx < entries.length - 1 && catStyles.groupBorder]}>
            <Text style={catStyles.groupTitle}>{t(`vendorDetails.categoryLabels.${cat}`, cat)}</Text>
            <View style={catStyles.wrap}>{vals.map((v, i) => (<View key={i} style={catStyles.chip}><Text style={catStyles.chipText}>{t(`vendorDetails.serviceLabels.${v}`, v)}</Text></View>))}</View>
          </View>
        ))}
      </SectionCard>
    );
  }
  return null;
};
const catStyles = StyleSheet.create({ group: { paddingHorizontal: spacing[16], paddingVertical: spacing[12] }, groupBorder: { borderBottomWidth: 1, borderBottomColor: colors.natural[150] }, groupTitle: { fontSize: typography.fontSize.label.large, fontWeight: typography.fontWeight.semibold, color: colors.natural[700], marginBottom: spacing[8] }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] }, chip: { backgroundColor: "#fdf3e7", borderRadius: borderRadius[20], paddingHorizontal: spacing[12], paddingVertical: spacing[4] }, chipText: { fontSize: typography.fontSize.label.large, color: colors.primary[500], fontWeight: typography.fontWeight.medium } });

const SocialLinksSection = ({ vendor, t }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const { instagram, facebook, tiktok, twitter, website } = roleData?.socialLinks || {};
  if (!instagram && !facebook && !tiktok && !twitter && !website) return null;
  const lastKey = website ? "website" : twitter ? "twitter" : tiktok ? "tiktok" : facebook ? "facebook" : "instagram";
  return (
    <SectionCard title={t("vendorDetails.socialLinks")} icon="share-social-outline">
      {instagram && <InfoRow icon="logo-instagram" label="Instagram" value={instagram} last={lastKey === "instagram"} />}
      {facebook && <InfoRow icon="logo-facebook" label="Facebook" value={facebook} last={lastKey === "facebook"} />}
      {tiktok && <InfoRow icon="musical-notes-outline" label="TikTok" value={tiktok} last={lastKey === "tiktok"} />}
      {twitter && <InfoRow icon="logo-twitter" label="Twitter/X" value={twitter} last={lastKey === "twitter"} />}
      {website && <InfoRow icon="globe-outline" label={t("vendorDetails.domain")} value={website} last />}
    </SectionCard>
  );
};

const GallerySection = ({ vendor, t }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const [previewUrl, setPreviewUrl] = useState(null);
  const items = [
    ...(roleData.businessLogo ? [{ url: getImageUrl(roleData.businessLogo), title: t("vendorDetails.businessLogo") }] : []),
    ...(Array.isArray(roleData.portfolioImages) ? roleData.portfolioImages : []).map((img, i) => ({ url: getImageUrl(img), title: `${t("vendorDetails.portfolio")} ${i + 1}` })),
    ...(Array.isArray(roleData.pricePackages) ? roleData.pricePackages : []).map((pkg, i) => ({ url: getImageUrl(pkg), title: `${t("vendorDetails.pricePackage")} ${i + 1}` })),
    ...(roleData.commercialRecordImage ? [{ url: getImageUrl(roleData.commercialRecordImage), title: t("vendorDetails.commercialRecord") }] : []),
    ...(roleData.nationalIdImage ? [{ url: getImageUrl(roleData.nationalIdImage), title: t("vendorDetails.nationalId") }] : []),
    ...(roleData.profileFile ? [{ url: getImageUrl(roleData.profileFile), title: t("vendorDetails.profileFile") }] : []),
  ].filter((item) => !!item.url);
  if (!items.length) return null;
  return (
    <SectionCard title={t("vendorDetails.galleryFiles")} icon="images-outline">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={galleryStyles.row}>
        {items.map((item, idx) => (<TouchableOpacity key={idx} style={galleryStyles.thumb} onPress={() => setPreviewUrl(item.url)} activeOpacity={0.8}><Image source={{ uri: item.url }} style={galleryStyles.thumbImg} resizeMode="cover" /><Text style={galleryStyles.thumbTitle} numberOfLines={1}>{item.title}</Text></TouchableOpacity>))}
      </ScrollView>
      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <Pressable style={galleryStyles.overlay} onPress={() => setPreviewUrl(null)}>
          <View style={galleryStyles.modalContent}>
            <TouchableOpacity style={galleryStyles.closeBtn} onPress={() => setPreviewUrl(null)}><Ionicons name="close-circle" size={32} color="#fff" /></TouchableOpacity>
            <Image source={{ uri: previewUrl }} style={galleryStyles.fullImg} resizeMode="contain" />
          </View>
        </Pressable>
      </Modal>
    </SectionCard>
  );
};
const galleryStyles = StyleSheet.create({ row: { paddingHorizontal: spacing[16], paddingVertical: spacing[12], gap: spacing[12], flexDirection: "row" }, thumb: { width: 110, alignItems: "center" }, thumbImg: { width: 110, height: 84, borderRadius: borderRadius[8], backgroundColor: colors.natural[100] }, thumbTitle: { marginTop: spacing[4], fontSize: typography.fontSize.label.small, color: colors.natural[500], textAlign: "center", width: 110 }, overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }, modalContent: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }, closeBtn: { position: "absolute", top: spacing[48], right: spacing[16], zIndex: 10 }, fullImg: { width: "92%", height: "72%" } });

const AdminActionsSection = ({ vendor, onApprove, onSuspend, onActivate, onDelete, canEdit, canDelete, t }) => {
  const status = vendor?.status;
  return (
    <SectionCard title={t("vendorDetails.adminActions")} icon="shield-checkmark-outline">
      <View style={actionStyles.col}>
        {canEdit && (status === "pending" || status === "rejected") && <ActionButton label={t("vendorDetails.approveVendor")} icon="checkmark-circle-outline" variant="success" onPress={onApprove} />}
        {canEdit && status === "approved" && <ActionButton label={t("vendorDetails.suspendVendor")} icon="pause-circle-outline" variant="warning" onPress={onSuspend} />}
        {canEdit && status === "suspended" && <ActionButton label={t("vendorDetails.activateVendor")} icon="play-circle-outline" variant="success" onPress={onActivate} />}
        {canDelete && <ActionButton label={t("vendorDetails.deleteVendor")} icon="trash-outline" variant="danger" onPress={onDelete} />}
      </View>
    </SectionCard>
  );
};
const actionStyles = StyleSheet.create({ col: { gap: spacing[8], padding: spacing[8] } });

const LoadingView = () => (<View style={loadingStyles.container}><ActivityIndicator size="large" color={colors.primary[500]} /></View>);
const loadingStyles = StyleSheet.create({ container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: backgrounds.artboard } });

const VendorDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const { vendorId } = route.params || {};
  const { data, isLoading, refetch } = useAdminVendorById(vendorId);
  const updateStatusMutation = useUpdateVendorStatus();
  const deleteVendorMutation = useDeleteVendor();
  const vendor = data?.data?.vendor || data?.data || null;
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const canEdit = canEditPage(role, PAGES.VENDORS);
  const canDelete = canDeleteOnPage(role, PAGES.VENDORS);

  const handleApprove = () => Alert.alert(t("vendorDetails.approveConfirmTitle"), t("vendorDetails.approveConfirmMessage"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.approve"), onPress: async () => { try { await updateStatusMutation.mutateAsync({ vendorId: vendor._id || vendor.id, status: "approved" }); toast.success(t("vendorDetails.approved")); refetch(); } catch { toast.error(t("vendorDetails.approveFailed")); } } }]);
  const handleSuspend = () => Alert.alert(t("vendorDetails.suspendConfirmTitle"), t("vendorDetails.suspendConfirmMessage"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.suspend"), style: "destructive", onPress: async () => { try { await updateStatusMutation.mutateAsync({ vendorId: vendor._id || vendor.id, status: "suspended" }); toast.success(t("vendorDetails.suspended")); refetch(); } catch { toast.error(t("vendorDetails.suspendFailed")); } } }]);
  const handleActivate = () => Alert.alert(t("vendorDetails.activateConfirmTitle"), t("vendorDetails.activateConfirmMessage"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.activate"), onPress: async () => { try { await updateStatusMutation.mutateAsync({ vendorId: vendor._id || vendor.id, status: "approved" }); toast.success(t("vendorDetails.activated")); refetch(); } catch { toast.error(t("vendorDetails.activateFailed")); } } }]);
  const handleDelete = () => Alert.alert(t("vendorDetails.deleteConfirmTitle"), t("vendorDetails.deleteConfirmMessage"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.delete"), style: "destructive", onPress: async () => { try { await deleteVendorMutation.mutateAsync(vendor._id || vendor.id); toast.success(t("vendorDetails.deleted")); navigation.goBack(); } catch { toast.error(t("vendorDetails.deleteFailed")); } } }]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("vendorDetails.title")} showBack={true} />
        {isLoading ? (<LoadingView />) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {vendor && (<>
              <VendorHeroCard vendor={vendor} />
              <VendorStatsRow vendor={vendor} />
              <View style={styles.sections}>
                <ServiceDescriptionSection roleData={roleData} t={t} />
                <SectionCard title={t("vendorDetails.contactInformation")} icon="person-outline">
                  <InfoRow icon="mail-outline" label={t("common.email")} value={vendor.email || roleData?.email || "—"} />
                  <InfoRow icon="call-outline" label={t("common.phone")} value={vendor.phoneNumber || roleData?.phone || "—"} />
                  <InfoRow icon="calendar-outline" label={t("vendorDetails.joined")} value={vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"} last />
                </SectionCard>
                <SectionCard title={t("vendorDetails.businessDetails")} icon="business-outline">
                  <InfoRow icon="business-outline" label={t("vendorDetails.brandName")} value={roleData?.brandName || vendor.brandName || "—"} />
                  <InfoRow icon="person-outline" label={t("vendorDetails.ownerName")} value={roleData?.ownerFullName || roleData?.ownerName || "—"} />
                  {(roleData?.commercialRecordNumber || roleData?.commercialRecord) && <InfoRow icon="document-text-outline" label={t("vendorDetails.commercialRecordNumber")} value={roleData.commercialRecordNumber || roleData.commercialRecord} />}
                  {roleData?.nationalId && <InfoRow icon="card-outline" label={t("vendorDetails.nationalIdNumber")} value={roleData.nationalId} last />}
                </SectionCard>
                <ServiceLocationSection vendor={vendor} t={t} />
                <ServiceCategoriesSection vendor={vendor} t={t} />
                <SocialLinksSection vendor={vendor} t={t} />
                <GallerySection vendor={vendor} t={t} />
                {(canEdit || canDelete) && <AdminActionsSection vendor={vendor} onApprove={handleApprove} onSuspend={handleSuspend} onActivate={handleActivate} onDelete={handleDelete} canEdit={canEdit} canDelete={canDelete} t={t} />}
              </View>
              <View style={styles.bottomSpacer} />
            </>)}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: backgrounds.card[8] }, container: { flex: 1, backgroundColor: backgrounds.artboard }, scroll: { flex: 1 }, scrollContent: { paddingBottom: spacing[32] }, sections: { marginHorizontal: spacing[16], gap: spacing[12] }, bottomSpacer: { height: spacing[20] } });

export default VendorDetailsScreen;
