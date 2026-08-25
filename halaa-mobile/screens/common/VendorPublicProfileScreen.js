import React, { useMemo, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMarketplaceVendor, useTrackMarketplaceAnalytics } from "../../hooks/marketplace";
import { buildVendorContactMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from "@halaa/shared/utils/marketplace";
import { countToken, priceToken } from "@halaa/shared/utils/displayTokens";
import { formatNumber } from "@halaa/shared/utils/locale";
import { isolateLtr, isolateAuto } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../localization";
import { WEB_BASE_URL, ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { getImageUrl } from "../../utils/imageUtils";
import { backgrounds, borderRadius, colors, spacing } from "../../styles/tokens";
import DirectionalIonicon from "../../components/common/DirectionalIonicon";
import LocalizedText from "../../components/commen/LocalizedText";
import AdaptiveText from "../../components/commen/AdaptiveText";

const SOCIAL_ICONS = { instagram: "logo-instagram", facebook: "logo-facebook", tiktok: "logo-tiktok", twitter: "logo-twitter" };

const displayHost = (value) => { try { return new URL(value).hostname; } catch { return value; } };
const displayHandle = (value) => {
  try { const url = new URL(value); const seg = url.pathname.split("/").filter(Boolean).pop(); return seg ? `@${seg}` : url.hostname; } catch { return value; }
};

// Intrinsically LTR tokens (phone/email/host/@handle): stable LTR base
// direction plus an isolate so they cannot reorder inside Arabic copy.
const LtrToken = ({ children, style }) => (
  <LocalizedText style={[styles.ltrToken, style]}>{isolateLtr(children)}</LocalizedText>
);

const Action = ({ icon, label, onPress, secondary = false }) => (
  <TouchableOpacity style={[styles.action, secondary && styles.actionSecondary]} onPress={onPress} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={label}>
    <Ionicons name={icon} size={18} color={colors.natural[50]} />
    <LocalizedText style={styles.actionText}>{label}</LocalizedText>
  </TouchableOpacity>
);

export default function VendorPublicProfileScreen({ route, navigation }) {
  const { vendorId } = route.params || {};
  const { t, i18n, currentLanguage } = useTranslation("marketplace");
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useMarketplaceVendor(vendorId, i18n.language);
  const vendor = data?.data?.vendor;
  const isAr = i18n.language === "ar";
  const trackMutation = useTrackMarketplaceAnalytics();

  useEffect(() => {
    if (vendor?.id) {
      trackMutation.mutate({
        eventType: "vendor_view",
        targetType: "vendor",
        targetId: String(vendor.id),
      });
    }
  }, [vendor?.id]);

  const trackContact = useCallback(
    (contactMethod, serviceId = null) => {
      if (!vendor?.id) return;
      trackMutation.mutate({
        eventType: "contact_click",
        targetType: serviceId ? "service" : "vendor",
        targetId: String(serviceId || vendor.id),
        contactMethod,
        metadata: { vendorId: String(vendor.id), serviceId },
      });
    },
    [vendor?.id, trackMutation]
  );

  const location = useMemo(() => {
    const value = vendor?.location || vendor?.serviceLocation;
    return [isAr ? value?.cityNameAr : value?.cityNameEn, isAr ? value?.regionNameAr : value?.regionNameEn].filter(Boolean).join(isAr ? "، " : ", ");
  }, [vendor, isAr]);

  if (isLoading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /><LocalizedText style={styles.loadingText}>{t("loading")}</LocalizedText></SafeAreaView>;
  }
  if (isError || !vendor) {
    return <SafeAreaView style={styles.center}><Ionicons name="storefront-outline" size={42} color={colors.primary[500]} /><LocalizedText center style={styles.errorTitle}>{t("errors.profileLoadFailed")}</LocalizedText><TouchableOpacity style={styles.retry} onPress={refetch} accessibilityRole="button"><LocalizedText style={styles.retryText}>{t("errors.retry")}</LocalizedText></TouchableOpacity></SafeAreaView>;
  }

  const contact = vendor.contact || {};
  const whatsappNumber = normalizeWhatsAppNumber(contact.whatsapp);
  const call = () => {
    trackContact("phone");
    return contact.phone && Linking.openURL(`tel:${contact.phone}`);
  };
  const vendorUrl = `${WEB_BASE_URL}/${isAr ? "ar" : "en"}/market-place/vendors/${vendor.id}`;
  const openWhatsApp = async (message, serviceId = null) => {
    trackContact(serviceId ? "service_request" : "whatsapp", serviceId);
    if (!whatsappNumber) {
      if (contact.phone) return call();
      if (contact.email) return Linking.openURL(`mailto:${contact.email}`);
      if (vendor.socialLinks?.website) return Linking.openURL(vendor.socialLinks.website);
      return;
    }
    const deepLink = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(deepLink).catch(() => false);
    return Linking.openURL(canOpen ? deepLink : buildWhatsAppUrl(whatsappNumber, message));
  };
  const whatsapp = () => openWhatsApp(buildVendorContactMessage({ language: isAr ? "ar" : "en", vendorName: vendor.brandName, vendorUrl }));
  const share = () => Share.share({ message: `${vendor.brandName}\n${vendorUrl}` });

  // Report this vendor profile (§6). Authenticated app user → /moderation/report.
  const reportVendor = async (reason) => {
    try {
      const res = await apiFetch(ENDPOINTS.MODERATION.REPORT, {
        method: "POST",
        body: {
          targetType: "vendor_profile",
          targetId: vendor.id,
          reportedActorType: "user",
          reportedActorId: vendor.id,
          reason,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          Alert.alert(t("vendor.report"), t("vendor.signInToReport"));
          return;
        }
        throw new Error("report_failed");
      }
      Alert.alert(
        t("vendor.reported"),
        t("vendor.reportedMsg")
      );
    } catch {
      Alert.alert(t("errors.generic"));
    }
  };
  const handleReport = () => {
    Alert.alert(t("vendor.reportVendor"), t("vendor.reportReason"), [
      { text: t("vendor.rSpam"), onPress: () => reportVendor("spam") },
      { text: t("vendor.rImpersonation"), onPress: () => reportVendor("impersonation") },
      { text: t("vendor.rIllegal"), onPress: () => reportVendor("illegal") },
      { text: t("vendor.rOther"), onPress: () => reportVendor("other") },
      { text: t("cancel"), style: "cancel" },
    ]);
  };
  const blockVendor = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.MODERATION.BLOCK, {
        method: "POST",
        body: { blockedActorType: "user", blockedActorId: vendor.id },
      });
      if (!res.ok) {
        if (res.status === 401) {
          Alert.alert(t("vendor.block"), t("vendor.signInToBlock"));
          return;
        }
        throw new Error("block_failed");
      }
      Alert.alert(
        t("vendor.blocked"),
        t("vendor.blockedMsg"),
        [{ text: t("ok"), onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert(t("errors.generic"));
    }
  };
  const handleBlock = () => {
    Alert.alert(
      t("vendor.blockVendor"),
      t("vendor.blockConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("vendor.block"), style: "destructive", onPress: blockVendor },
      ]
    );
  };
  const categories = (vendor.categories || []).map((key) => t(`sections.${key}`, key));
  // Backend image refs are relative "/uploads/…" paths — absolutize for RN.
  const coverImage = getImageUrl(vendor.coverImage);
  const logo = getImageUrl(vendor.logo);
  const services = (vendor.services || []).map((s) => ({
    ...s,
    image: getImageUrl(s.image),
  }));
  const portfolio = (vendor.portfolio || [])
    .map((uri) => getImageUrl(uri))
    .filter(Boolean);
  const socialEntries = Object.entries(vendor.socialLinks || {}).filter(([key, value]) => key !== "website" && value);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {coverImage ? <Image source={{ uri: coverImage }} style={styles.cover} /> : <View style={styles.coverFallback}><Text style={styles.coverInitial}>{vendor.brandName?.charAt(0)}</Text></View>}
          <View style={styles.heroShade} />
          {/* Full-width symmetric action strip: the physical left/right
              anchors are intentional artwork geometry with equal hit slop,
              not semantic start/end positioning (documented exception,
              blueprint §2). */}
          <View style={styles.heroButtons}>
            {/* Back navigation glyph resolves with the layout direction. */}
            <TouchableOpacity style={styles.roundButton} onPress={() => navigation.goBack()} accessibilityLabel={t("vendor.backToMarketplace")}><DirectionalIonicon name="arrow-back" size={22} color={colors.natural[50]} /></TouchableOpacity>
            <TouchableOpacity style={styles.roundButton} onPress={share} accessibilityLabel={t("vendor.share")}><Ionicons name="share-outline" size={22} color={colors.natural[50]} /></TouchableOpacity>
            <TouchableOpacity style={styles.roundButton} onPress={handleReport} accessibilityLabel={t("vendor.reportVendor")}><Ionicons name="flag-outline" size={20} color={colors.natural[50]} /></TouchableOpacity>
            <TouchableOpacity style={styles.roundButton} onPress={handleBlock} accessibilityLabel={t("vendor.blockVendor")}><Ionicons name="ban-outline" size={20} color={colors.natural[50]} /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.identity}>
          <View style={styles.logo}>{logo ? <Image source={{ uri: logo }} style={styles.logoImage} /> : <Text style={styles.logoInitial}>{vendor.brandName?.charAt(0)}</Text>}</View>
          <AdaptiveText center numberOfLines={2} style={styles.brand}>{vendor.brandName}</AdaptiveText>
          <View style={styles.metaRow}>
          {vendor.tagline ? <AdaptiveText center style={styles.tagline}>{vendor.tagline}</AdaptiveText> : null}
          {vendor.rating ? <View style={styles.metaItem}><Ionicons name="star" size={14} color={colors.warning[400]} /><LocalizedText style={styles.metaText}>{isolateLtr(formatNumber(vendor.rating, currentLanguage, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))}</LocalizedText></View> : null}
            {location ? <View style={styles.metaItem}><Ionicons name="location-outline" size={15} color={colors.primary[700]} /><AdaptiveText style={styles.metaText}>{location}</AdaptiveText></View> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map((item) => <View key={item} style={styles.chip}><LocalizedText style={styles.chipText}>{item}</LocalizedText></View>)}</ScrollView>
        </View>

        {vendor.about ? <View style={styles.section}><LocalizedText role="caption" style={styles.eyebrow}>{t("vendor.aboutVendor")}</LocalizedText><LocalizedText style={styles.sectionTitle}>{t("vendor.meetVendor", { name: isolateAuto(vendor.brandName || "") })}</LocalizedText><AdaptiveText style={styles.body}>{vendor.about}</AdaptiveText></View> : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}><View><LocalizedText role="caption" style={styles.eyebrow}>{t("vendor.ourServices")}</LocalizedText><LocalizedText style={styles.sectionTitle}>{t("vendor.servicesHeadline")}</LocalizedText></View><View style={styles.count}><LocalizedText style={styles.countText}>{countToken(services.length, currentLanguage)}</LocalizedText></View></View>
          {services.length ? services.map((service) => {
            const name = isAr && service.nameAr ? service.nameAr : service.name;
            const description = isAr && service.descriptionAr ? service.descriptionAr : service.description;
            return <View key={service.id} style={styles.serviceCard}>
              {service.image ? <Image source={{ uri: service.image }} style={styles.serviceImage} /> : <View style={styles.serviceImageFallback}><Text style={styles.serviceInitial}>{name?.charAt(0)}</Text></View>}              <View style={styles.serviceBody}>
                <LocalizedText role="caption" style={styles.serviceCategory}>{t(`sections.${service.category}`, service.category)}</LocalizedText>
                <AdaptiveText numberOfLines={2} style={styles.serviceName}>{name}</AdaptiveText>
                {description ? <AdaptiveText numberOfLines={2} style={styles.serviceDescription}>{description}</AdaptiveText> : null}
                {service.tags?.length ? <View style={styles.serviceTags}>{service.tags.slice(0, 3).map((tag) => <View key={tag} style={styles.serviceTag}><AdaptiveText style={styles.serviceTagText}>{tag}</AdaptiveText></View>)}</View> : null}
                <View style={styles.serviceFooter}>{service.price != null ? <View style={styles.priceBlock}><LocalizedText style={styles.priceLabel}>{t("vendor.startsFrom")}</LocalizedText><LocalizedText style={styles.price}>{priceToken(service.price, service.currency || t("vendor.sar"), { locale: currentLanguage })}</LocalizedText></View> : <View />}{(whatsappNumber || contact.phone || contact.email) ? <TouchableOpacity style={styles.serviceContact} onPress={() => openWhatsApp(buildVendorContactMessage({ language: isAr ? "ar" : "en", vendorName: vendor.brandName, serviceName: name, price: service.price, currency: service.currency, vendorUrl }), service.id)} accessibilityRole="button"><Ionicons name="logo-whatsapp" size={16} color={colors.natural[50]} /><LocalizedText style={styles.serviceContactText}>{t("vendor.requestService")}</LocalizedText></TouchableOpacity> : null}</View>
              </View>
            </View>;
          }) : <LocalizedText style={styles.body}>{t("vendor.noServices")}</LocalizedText>}
        </View>

        {portfolio.length ? <View style={styles.section}><LocalizedText role="caption" style={styles.eyebrow}>{t("vendor.portfolio")}</LocalizedText><LocalizedText style={styles.sectionTitle}>{t("vendor.portfolioHeadline")}</LocalizedText><View style={styles.gallery}>{portfolio.map((uri, index) => <TouchableOpacity key={`${index}-${uri}`} style={styles.galleryItem} onPress={() => Linking.openURL(uri)}><Image source={{ uri }} style={styles.galleryImage} /></TouchableOpacity>)}</View></View> : null}

        <View style={styles.section}>
          <LocalizedText role="caption" style={styles.eyebrow}>{t("vendor.contactInfo")}</LocalizedText><LocalizedText style={styles.sectionTitle}>{t("vendor.contactHeadline")}</LocalizedText><LocalizedText style={styles.body}>{t("vendor.contactDescription")}</LocalizedText>
          <View style={styles.contactLinks}>
            {contact.phone ? <TouchableOpacity style={styles.contactRow} onPress={call} accessibilityRole="button"><Ionicons name="call-outline" size={19} color={colors.primary[700]} /><LtrToken style={styles.contactText}>{contact.phone}</LtrToken></TouchableOpacity> : null}
            {contact.email ? <TouchableOpacity style={styles.contactRow} onPress={() => { trackContact("email"); Linking.openURL(`mailto:${contact.email}`); }} accessibilityRole="button"><Ionicons name="mail-outline" size={19} color={colors.primary[700]} /><LtrToken style={styles.contactText}>{contact.email}</LtrToken></TouchableOpacity> : null}
            {vendor.socialLinks?.website ? <TouchableOpacity style={styles.contactRow} onPress={() => { trackContact("website"); Linking.openURL(vendor.socialLinks.website); }} accessibilityRole="button"><Ionicons name="globe-outline" size={19} color={colors.primary[700]} /><LtrToken style={styles.contactText}>{displayHost(vendor.socialLinks.website)}</LtrToken></TouchableOpacity> : null}
            {socialEntries.map(([key, url]) => <TouchableOpacity key={key} style={styles.contactRow} onPress={() => { trackContact("social"); Linking.openURL(url); }} accessibilityRole="button"><Ionicons name={SOCIAL_ICONS[key] || "link-outline"} size={19} color={colors.primary[700]} /><LtrToken style={styles.contactText}>{displayHandle(url)}</LtrToken></TouchableOpacity>)}
            {location ? <View style={styles.contactRow}><Ionicons name="location-outline" size={19} color={colors.primary[700]} /><AdaptiveText style={styles.contactText}>{location}</AdaptiveText></View> : null}
          </View>
        </View>
      </ScrollView>

      {/* Full-width sticky footer overlay: symmetric physical anchors are
          intentional full-width-overlay geometry (documented exception). */}
      {(whatsappNumber || contact.phone || contact.email) ? <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, spacing[12]) }]}><Action icon={whatsappNumber ? "logo-whatsapp" : contact.phone ? "call-outline" : "mail-outline"} label={whatsappNumber ? t("vendor.whatsapp") : contact.phone ? t("vendor.callNow") : t("vendor.email")} onPress={whatsappNumber ? whatsapp : contact.phone ? call : () => Linking.openURL(`mailto:${contact.email}`)} secondary={Boolean(whatsappNumber)} />{contact.phone && whatsappNumber ? <Action icon="call-outline" label={t("vendor.callNow")} onPress={call} /> : null}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: backgrounds.artboard },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[12], backgroundColor: backgrounds.artboard, padding: spacing[24] },
  ltrToken: {},
  loadingText: { fontFamily: "Cairo_500Medium", color: colors.natural[450] },
  errorTitle: { fontFamily: "Cairo_700Bold", fontSize: 18, color: colors.natural[900], textAlign: "center" },
  retry: { paddingHorizontal: spacing[20], paddingVertical: spacing[10] || 10, borderRadius: borderRadius[12], backgroundColor: colors.primary[500], minHeight: 44, justifyContent: "center" },
  retryText: { color: colors.natural[50], fontFamily: "Cairo_600SemiBold" },
  content: { paddingBottom: spacing[80] },
  hero: { height: 310, margin: spacing[16], marginBottom: 0, borderRadius: borderRadius[20], overflow: "hidden", backgroundColor: colors.primary[700] },
  cover: { width: "100%", height: "100%" },
  coverFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[600] },
  coverInitial: { fontFamily: "Cairo_700Bold", fontSize: 100, color: colors.natural[50] },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(34,29,24,.24)" },
  heroButtons: { position: "absolute", top: spacing[16], left: spacing[16], right: spacing[16], flexDirection: "row", justifyContent: "space-between" },
  // 44×44 minimum touch target for icon-only actions (blueprint §7).
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(34,29,24,.58)" },
  identity: { marginHorizontal: spacing[24], marginTop: -48, alignItems: "center" },
  logo: { width: 96, height: 96, borderRadius: 28, borderWidth: 5, borderColor: colors.natural[50], overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[500], elevation: 7 },
  logoImage: { width: "100%", height: "100%", backgroundColor: colors.natural[50] },
  logoInitial: { fontFamily: "Cairo_700Bold", fontSize: 36, color: colors.natural[50] },
  brand: { marginTop: spacing[12], fontFamily: "Cairo_700Bold", fontSize: 27, color: colors.natural[900], textAlign: "center" },
  tagline: { marginTop: spacing[6] || 6, paddingHorizontal: spacing[16], fontFamily: "Cairo_400Regular", fontSize: 14, lineHeight: 22, color: colors.natural[450], textAlign: "center" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing[12], marginTop: spacing[8] },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Cairo_500Medium", fontSize: 12, color: colors.natural[450] },
  chips: { gap: spacing[8], paddingVertical: spacing[16] },
  chip: { paddingHorizontal: spacing[12], paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primary[100] },
  chipText: { fontFamily: "Cairo_600SemiBold", fontSize: 11, color: colors.primary[800] },
  section: { marginHorizontal: spacing[16], marginTop: spacing[16], padding: spacing[20], borderRadius: borderRadius[20], borderWidth: 1, borderColor: colors.natural[200], backgroundColor: colors.natural[50] },
  eyebrow: { fontFamily: "Cairo_700Bold", color: colors.primary[700] },
  sectionTitle: { marginTop: 3, marginBottom: spacing[12], fontFamily: "Cairo_700Bold", fontSize: 20, color: colors.natural[900] },
  body: { fontFamily: "Cairo_400Regular", fontSize: 14, lineHeight: 25, color: colors.natural[450] },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  count: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[50] },
  countText: { fontFamily: "Cairo_700Bold", color: colors.primary[800] },
  serviceCard: { marginTop: spacing[12], overflow: "hidden", borderRadius: borderRadius[16], borderWidth: 1, borderColor: colors.natural[200] },
  serviceImage: { width: "100%", height: 185 },
  serviceImageFallback: { height: 150, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[100] },
  serviceInitial: { fontFamily: "Cairo_700Bold", fontSize: 48, color: colors.primary[700] },
  serviceBody: { padding: spacing[16], gap: spacing[8] },
  serviceCategory: { fontFamily: "Cairo_700Bold", color: colors.primary[700] },
  serviceName: { fontFamily: "Cairo_700Bold", fontSize: 17, color: colors.natural[900] },
  serviceDescription: { fontFamily: "Cairo_400Regular", fontSize: 13, lineHeight: 21, color: colors.natural[450] },
  serviceTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  serviceTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primary[50] },
  serviceTagText: { fontFamily: "Cairo_600SemiBold", fontSize: 11, color: colors.primary[800] },
  serviceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[12], marginTop: spacing[4] || 4, paddingTop: spacing[12], borderTopWidth: 1, borderTopColor: colors.natural[200] },
  priceBlock: { flexShrink: 1 },
  priceLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 11, color: colors.natural[350] },
  price: { fontFamily: "Cairo_700Bold", fontSize: 16, color: colors.natural[900] },
  serviceContact: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: spacing[14] || 14, borderRadius: borderRadius[12], backgroundColor: colors.primary[500] },
  serviceContactText: { fontFamily: "Cairo_700Bold", fontSize: 11, color: colors.natural[50] },
  gallery: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  galleryItem: { width: "48.5%", height: 140, borderRadius: borderRadius[16], overflow: "hidden" },
  galleryImage: { width: "100%", height: "100%" },
  contactLinks: { marginTop: spacing[16], borderTopWidth: 1, borderTopColor: colors.natural[200] },
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing[10] || 10, paddingVertical: spacing[12], borderBottomWidth: 1, borderBottomColor: colors.natural[200] },
  contactText: { flex: 1, fontFamily: "Cairo_500Medium", fontSize: 13, color: colors.natural[500] },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: spacing[8], paddingHorizontal: spacing[14] || 14, paddingTop: spacing[12], borderTopWidth: 1, borderTopColor: colors.natural[200], backgroundColor: colors.natural[50] },
  action: { flex: 1, minHeight: 49, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[8], borderRadius: borderRadius[12], backgroundColor: colors.primary[500] },
  actionSecondary: { backgroundColor: colors.success[500] },
  actionText: { fontFamily: "Cairo_700Bold", fontSize: 14, color: colors.natural[50] },
});
