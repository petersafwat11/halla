import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Alert, StyleSheet, Image, Modal, Pressable, Linking, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAdminVendorById, useUpdateVendorStatus } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../stores/authStore";
import { useTranslation } from "../../../localization";
import { formatDate, formatNumber } from "@halaa/shared/utils/locale";
import { canEditPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import DirectionalIonicon from "../../../components/common/DirectionalIonicon";
import LocalizedText from "../../../components/commen/LocalizedText";
import AdaptiveText from "../../../components/commen/AdaptiveText";
import { SectionCard, InfoRow as BaseInfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import { API_BASE_URL } from "../../../config/api";
import { resolveAdminVendor, vendorApplicationStatus, isVendorDocument } from "../../../utils/adminVendorPresentation";
import VendorHeroCard from "../../../components/admin-dashboard/vendors/VendorHeroCard";
import { colors, spacing, borderRadius, typography, backgrounds, textStyles } from "../../../styles/tokens";

const InfoRow = (props) => <BaseInfoRow {...props} multiline />;
const IMAGE_BASE = API_BASE_URL.replace(/\/api(?:\/v\d+)?\/?$/, "");
const getImageUrl = (path) => {
  if (typeof path !== "string" || !path) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) && !/^https?:\/\//i.test(path)) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

const fmtDate = (d, locale) => (d ? formatDate(d, locale) : "—");

const IdentitySection = ({ vendor, roleData, t, currentLanguage }) => (
  <SectionCard title={t("vendorDetails.identity")} icon="person-outline">
    <InfoRow icon="business-outline" label={t("vendorDetails.brandName")} value={roleData?.brandName || vendor.brandName} />
    <InfoRow icon="person-outline" label={t("vendorDetails.ownerName")} value={roleData?.ownerFullName || roleData?.ownerName || vendor.name} />
    {/* Email/phone are intrinsic tokens (blueprint §5.3): stable LTR glyph
        order; labels stay localized either way. */}
    <InfoRow icon="mail-outline" label={t("common.email")} value={vendor.email || roleData?.email} mode="ltr" />
    <InfoRow icon="call-outline" label={t("common.phone")} value={vendor.phoneNumber || roleData?.phone} mode="phone" />
    <InfoRow icon="calendar-outline" label={t("vendorDetails.registrationDate")} value={fmtDate(vendor.createdAt, currentLanguage)} mode="localized" last />
    <InfoRow icon="language-outline" label={t("vendorDetails.preferredLanguage")} value={vendor.preferredLanguage ? t(`vendorDetails.languages.${vendor.preferredLanguage}`, vendor.preferredLanguage) : "—"} mode="localized" />
  </SectionCard>
);

const DescriptionSection = ({ roleData, t }) => {
  const desc = roleData?.serviceDescription;
  const other = roleData?.otherData;
  return (
    <SectionCard title={t("vendorDetails.serviceDescription")} icon="document-text-outline">
      <View style={descStyles.block}>
        {/* Free-text vendor copy — first-strong direction. */}
        <AdaptiveText style={descStyles.text}>
          {desc || t("vendorDetails.noDescription")}
        </AdaptiveText>
      </View>
      {other ? (
        <View style={[descStyles.block, descStyles.blockBorder]}>
          <LocalizedText style={descStyles.label}>
            {t("vendorDetails.additionalInfo")}
          </LocalizedText>
          <AdaptiveText style={descStyles.text}>{other}</AdaptiveText>
        </View>
      ) : null}
      {["taglineAr", "taglineEn", "aboutAr", "aboutEn"].map((field) => (
        <View key={field} style={[descStyles.block, descStyles.blockBorder]}>
          <LocalizedText style={descStyles.label}>{t(`vendorDetails.${field}`)}</LocalizedText>
          <AdaptiveText style={[descStyles.text, { writingDirection: field.endsWith("Ar") ? "rtl" : "ltr" }]}>{roleData?.[field] || "—"}</AdaptiveText>
        </View>
      ))}
    </SectionCard>
  );
};
const descStyles = StyleSheet.create({
  block: { paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  blockBorder: { borderTopWidth: 1, borderTopColor: colors.natural[150] },
  label: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginBottom: spacing[4] },
  text: { fontSize: typography.fontSize.body.small, color: colors.natural[800], lineHeight: 20 },
});

const LocationSection = ({ roleData, t, currentLanguage }) => {
  const sl = roleData?.serviceLocation;
  const region = sl?.[currentLanguage === "ar" ? "regionNameAr" : "regionNameEn"] || sl?.regionNameAr || sl?.regionNameEn || sl?.region;
  const city = sl?.[currentLanguage === "ar" ? "cityNameAr" : "cityNameEn"] || sl?.cityNameAr || sl?.cityNameEn || sl?.city;
  // `coverageType` is an app-owned enum (region | city | districts), so its
  // label follows the UI locale through translation keys; unknown backend
  // values fall back to the raw token instead of rendering a key path.
  const coverage = sl?.coverageType;
  const coverageLabel =
    coverage && ["region", "city", "districts"].includes(coverage)
      ? t(`vendorDetails.coverage.${coverage}`)
      : coverage;
  return (
    <SectionCard title={t("vendorDetails.serviceLocation")} icon="location-outline">
      {!sl ? (
        <View style={emptyStyles.row}><LocalizedText style={emptyStyles.text}>{t("vendorDetails.noLocation")}</LocalizedText></View>
      ) : (
        <>
          <InfoRow icon="map-outline" label={t("vendorDetails.region")} value={region} />
          <InfoRow icon="business-outline" label={t("vendorDetails.city")} value={city} />
          <InfoRow icon="navigate-outline" label={t("vendorDetails.coverageType")} value={coverageLabel} mode="localized" last />
          {coverage === "districts" && <InfoRow icon="map-outline" label={t("vendorDetails.coverage.districts")} value={sl.districtNames?.map((district) => district[currentLanguage === "ar" ? "nameAr" : "nameEn"] || district.nameAr || district.nameEn).filter(Boolean).join("، ") || sl.districtIds?.join(", ")} />}
        </>
      )}
    </SectionCard>
  );
};

const CommercialSection = ({ roleData, t }) => (
  <SectionCard title={t("vendorDetails.commercialVerification")} icon="shield-checkmark-outline">
    {/* Record/ID numbers are canonical LTR tokens (blueprint §5.3). */}
    <InfoRow icon="document-text-outline" label={t("vendorDetails.commercialRecordNumber")} value={roleData?.commercialRecordNumber || roleData?.commercialRecord} mode="ltr" />
    <InfoRow icon="card-outline" label={t("vendorDetails.nationalIdNumber")} value={roleData?.nationalId} mode="ltr" last />
  </SectionCard>
);

const SocialLinksSection = ({ roleData, t }) => {
  const links = roleData?.socialLinks || {};
  const entries = [
    { key: "instagram", icon: "logo-instagram", label: "Instagram" },
    { key: "facebook", icon: "logo-facebook", label: "Facebook" },
    { key: "tiktok", icon: "musical-notes-outline", label: "TikTok" },
    { key: "twitter", icon: "logo-twitter", label: "Twitter / X" },
    { key: "linkedin", icon: "logo-linkedin", label: "LinkedIn" },
    { key: "youtube", icon: "logo-youtube", label: "YouTube" },
    { key: "whatsapp", icon: "logo-whatsapp", label: "WhatsApp" },
    { key: "website", icon: "globe-outline", label: t("vendorDetails.domain") },
  ].map((entry) => ({ ...entry, url: entry.key === "whatsapp" && /^(?:\+?966|0)?5\d{8}$/.test(links.whatsapp || "")
    ? `https://wa.me/966${links.whatsapp.replace(/^(?:\+?966|0)/, "")}` : links[entry.key] }))
    .filter((entry) => /^https?:\/\//i.test(entry.url || ""));

  return (
    <SectionCard title={t("vendorDetails.socialLinks")} icon="share-social-outline">
      {!entries.length ? (
        <View style={emptyStyles.row}><LocalizedText style={emptyStyles.text}>{t("vendorDetails.noLinks")}</LocalizedText></View>
      ) : entries.map((e, i) => (
        <TouchableOpacity key={e.key} onPress={() => Linking.openURL(e.url).catch(() => Alert.alert(t("vendorDetails.openFailed")))} activeOpacity={0.7} accessibilityRole="link" accessibilityLabel={e.label}>
          {/* Social targets are URLs — intrinsic LTR tokens. */}
          <InfoRow icon={e.icon} label={e.label} value={links[e.key]} mode="ltr" last={i === entries.length - 1} />
        </TouchableOpacity>
      ))}
    </SectionCard>
  );
};

const CategoriesSection = ({ vendor, roleData, t }) => {
  const { t: tAuth } = useTranslation("auth");
  const cats = vendor?.serviceCategories || roleData?.serviceCategories;
  const entries = cats ? Object.entries(cats).filter(([, v]) => Array.isArray(v) && v.length) : [];
  return (
    <SectionCard title={t("vendorDetails.serviceCategories")} icon="grid-outline">
      {!entries.length ? (
        <View style={emptyStyles.row}><LocalizedText style={emptyStyles.text}>{t("vendorDetails.noServices")}</LocalizedText></View>
      ) : entries.map(([cat, vals], idx) => (
        <View key={cat} style={[catStyles.group, idx < entries.length - 1 && catStyles.groupBorder]}>
          <LocalizedText style={catStyles.groupTitle}>{t(`vendorDetails.categoryLabels.${cat}`, cat)}</LocalizedText>
          <View style={catStyles.wrap}>
            {vals.map((v, i) => (
              <View key={i} style={catStyles.chip}>
                <LocalizedText style={catStyles.chipText}>{(() => {
                  const options = tAuth(`signupForm.vendor.serviceData.${cat}.options`, { returnObjects: true });
                  return (Array.isArray(options) ? options.find((option) => option.value === v)?.label : null) || t(`vendorDetails.serviceLabels.${v}`, v);
                })()}</LocalizedText>
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

const GallerySection = ({ roleData, t, currentLanguage }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  // Numbered captions are ONE composed translation (blueprint §6): an
  // i18next interpolation key owns the token order and the index is
  // locale-formatted — never JSX/string concatenation.
  const numbered = (label, n) =>
    t("vendorDetails.galleryIndexed", {
      label,
      index: formatNumber(n, currentLanguage),
    });
  const items = [
    ...(roleData.businessLogo ? [{ url: getImageUrl(roleData.businessLogo), title: t("vendorDetails.businessLogo") }] : []),
    ...((Array.isArray(roleData.portfolioImages) ? roleData.portfolioImages : []).map((img, i) => ({
      url: getImageUrl(img), title: numbered(t("vendorDetails.portfolio"), i + 1),
    }))),
    ...((Array.isArray(roleData.pricePackages) ? roleData.pricePackages : []).map((pkg, i) => ({
      url: getImageUrl(pkg), title: numbered(t("vendorDetails.pricePackage"), i + 1),
    }))),
    ...(roleData.commercialRecordImage ? [{ url: getImageUrl(roleData.commercialRecordImage), title: t("vendorDetails.commercialRecord") }] : []),
    ...(roleData.nationalIdImage ? [{ url: getImageUrl(roleData.nationalIdImage), title: t("vendorDetails.nationalId") }] : []),
    ...(roleData.profileFile ? [{ url: getImageUrl(roleData.profileFile), title: t("vendorDetails.profileFile") }] : []),
  ].filter((item) => !!item.url);

  return (
    <SectionCard title={t("vendorDetails.galleryFiles")} icon="images-outline">
      {!items.length ? (
        <View style={emptyStyles.row}><LocalizedText style={emptyStyles.text}>{t("vendorDetails.noFiles")}</LocalizedText></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={gallStyles.row}>
          {items.map((item, idx) => (
            <TouchableOpacity key={idx} style={gallStyles.thumb} onPress={() => isVendorDocument(item.url)
              ? Linking.openURL(item.url).catch(() => Alert.alert(t("vendorDetails.openFailed"))) : setPreviewUrl(item.url)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={item.title}>
              {isVendorDocument(item.url)
                ? <View style={[gallStyles.thumbImg, { alignItems: "center", justifyContent: "center" }]}><Ionicons name="document-text-outline" size={36} color={colors.primary[500]} /></View>
                : <Image source={{ uri: item.url }} style={gallStyles.thumbImg} resizeMode="cover" />}
              <LocalizedText style={gallStyles.thumbTitle}>{item.title}</LocalizedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <Pressable style={gallStyles.overlay} onPress={() => setPreviewUrl(null)}>
          <View style={gallStyles.modalContent}>
            <TouchableOpacity
              style={gallStyles.closeBtn}
              onPress={() => setPreviewUrl(null)}
              accessibilityRole="button"
              accessibilityLabel={t("common.cancel")}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: previewUrl }} style={gallStyles.fullImg} resizeMode="contain" />
            <TouchableOpacity accessibilityRole="link" onPress={() => previewUrl && Linking.openURL(previewUrl).catch(() => Alert.alert(t("vendorDetails.openFailed")))}>
              <LocalizedText style={{ color: "#fff", padding: spacing[16] }}>{t("vendorDetails.openOriginal")}</LocalizedText>
            </TouchableOpacity>
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
  closeBtn: {
    position: "absolute",
    top: spacing[48],
    // Logical end: full-screen preview close hugs the reading end edge.
    end: spacing[16],
    zIndex: 10,
  },
  fullImg: { width: "92%", height: "72%" },
});

const ActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last }) => {
  return (
  <TouchableOpacity style={[actionStyles.row, !last && actionStyles.rowBorder]} onPress={onPress} disabled={loading} activeOpacity={0.7}>
    <View style={actionStyles.rowLeft}>
      <View style={[actionStyles.iconWrap, { backgroundColor: iconBg }]}>
        {loading ? <ActivityIndicator size="small" color={iconColor} /> : <Ionicons name={icon} size={16} color={iconColor} />}
      </View>
      <View style={{ flex: 1 }}>
        {/* Action copy is app-authored — always the UI locale. */}
        <LocalizedText style={actionStyles.label}>{label}</LocalizedText>
        <LocalizedText style={actionStyles.sublabel}>{sublabel}</LocalizedText>
      </View>
    </View>
    <DirectionalIonicon name="chevron-forward" size={16} color={colors.natural[300]} />
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
  const { data, isLoading, isFetching, error, refetch } = useAdminVendorById(vendorId);
  const updateStatus = useUpdateVendorStatus();
  const canEdit = canEditPage(role, PAGES.VENDORS);

  useEffect(() => {
    if (error) toast.error(t("vendorDetails.loadFailed"));
  }, [error, t, toast]);

  const vendor = resolveAdminVendor(data);
  const roleData = vendor?.vendorData || vendor?.roleData || vendor?.profile?.vendorData || {};
  const status = vendorApplicationStatus(vendor);

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
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary[500]} />
            ) : (
              <LocalizedText style={styles.notFound}>
                {t("vendorDetails.notFound")}
              </LocalizedText>
            )}
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
            <VendorHeroCard vendor={vendor} />

            <View style={styles.sections}>
              <IdentitySection vendor={vendor} roleData={roleData} t={t} currentLanguage={currentLanguage} />
              <DescriptionSection roleData={roleData} t={t} />
              <LocationSection roleData={roleData} t={t} currentLanguage={currentLanguage} />
              <CommercialSection roleData={roleData} t={t} />
              <SocialLinksSection roleData={roleData} t={t} />
              <CategoriesSection vendor={vendor} roleData={roleData} t={t} />
              <GallerySection roleData={roleData} t={t} currentLanguage={currentLanguage} />
              <SectionCard title={t("vendorDetails.reviewTitle")} icon="clipboard-outline">
                <InfoRow icon="document-text-outline" label={t("vendorDetails.adminNotes")} value={roleData.adminNotes} />
                <InfoRow icon="alert-circle-outline" label={t("vendorDetails.rejectionReason")} value={roleData.rejectionReason} />
                <InfoRow icon="calendar-outline" label={t("vendorDetails.approvedAt")} value={fmtDate(roleData.approvedAt, currentLanguage)} mode="localized" />
                <InfoRow icon="calendar-outline" label={t("vendorDetails.rejectedAt")} value={fmtDate(roleData.rejectedAt, currentLanguage)} mode="localized" last />
              </SectionCard>

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
