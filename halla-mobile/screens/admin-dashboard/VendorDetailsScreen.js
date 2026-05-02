import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAdminVendorById, useUpdateVendorStatus, useDeleteVendor } from "../../hooks";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../components/admin-dashboard/hosts/HostSectionCard";
import { ActionButton } from "../../components/admin-dashboard/common";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  backgrounds,
} from "../../styles/tokens";

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  approved: { color: colors.success[500], bg: "#e8f5ee", label: "Approved" },
  pending: { color: colors.warning[500], bg: "#fff4e0", label: "Pending" },
  rejected: { color: colors.error[500], bg: "#fdecea", label: "Rejected" },
  suspended: { color: colors.error[500], bg: "#fdecea", label: "Suspended" },
};

const CATEGORY_LABELS = {
  eventPlanning: "Event Planning",
  mediaProduction: "Media Production",
  giftsAndGiveaways: "Gifts & Giveaways",
  foodAndBeverages: "Food & Beverages",
  beautyAndFashion: "Beauty & Fashion",
  logisticsAndDelivery: "Logistics & Delivery",
  corporateServices: "Corporate Services",
  supportServices: "Support Services",
  technicalServices: "Technical Services",
  soundLightingEntertainment: "Sound, Lighting & Entertainment",
  hallsAndVenues: "Halls & Venues",
};

const SERVICE_LABELS = {
  eventCoordination: "Event Coordination",
  weddingPlanning: "Wedding Planning",
  corporateEventPlanning: "Corporate Event Planning",
  birthdayPartyPlanning: "Birthday Party Planning",
  hallAndLoungeRentals: "Hall & Lounge Rentals",
  outdoorEventSetup: "Outdoor Event Setup",
  photography: "Photography",
  videography: "Videography",
  liveStreaming: "Live Streaming",
  dronePhotography: "Drone Photography",
  photoBooths: "Photo Booths",
  videoEditing: "Video Editing",
};

const IMAGE_BASE = "https://labbe-backend-production.up.railway.app";

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

// ─── Hero Card ─────────────────────────────────────────────────────────────────
const HeroCard = ({ vendor }) => {
  const status = vendor?.status || "pending";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const displayName = roleData?.brandName || vendor?.brandName || vendor?.username || "—";
  const ownerName = roleData?.ownerFullName || roleData?.ownerName || "—";
  const email = vendor?.email || roleData?.email || "—";
  const phone = vendor?.phoneNumber || roleData?.phone || "—";
  const rating = vendor?.averageRating;

  return (
    <View style={heroStyles.card}>
      <View style={heroStyles.avatar}>
        <Ionicons name="storefront-outline" size={32} color={colors.primary[500]} />
      </View>

      <Text style={heroStyles.brandName}>{displayName}</Text>
      <Text style={heroStyles.ownerName}>{ownerName}</Text>

      <View style={heroStyles.contactRow}>
        <Ionicons name="mail-outline" size={13} color={colors.natural[400]} />
        <Text style={heroStyles.contactText}>{email}</Text>
      </View>
      {phone !== "—" && (
        <View style={heroStyles.contactRow}>
          <Ionicons name="call-outline" size={13} color={colors.natural[400]} />
          <Text style={heroStyles.contactText}>{phone}</Text>
        </View>
      )}

      <View style={heroStyles.badgeRow}>
        <View style={[heroStyles.statusChip, { backgroundColor: statusCfg.bg }]}>
          <View style={[heroStyles.statusDot, { backgroundColor: statusCfg.color }]} />
          <Text style={[heroStyles.statusLabel, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
        {rating != null && (
          <View style={heroStyles.ratingPill}>
            <Ionicons name="star" size={13} color={colors.warning[500]} />
            <Text style={heroStyles.ratingText}>{Number(rating).toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    marginHorizontal: spacing[16],
    marginTop: spacing[16],
    marginBottom: spacing[12],
    borderRadius: borderRadius[16],
    alignItems: "center",
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[16],
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fdf3e7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[12],
  },
  brandName: {
    fontSize: typography.fontSize.title.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
    marginBottom: spacing[4],
    textAlign: "center",
  },
  ownerName: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    marginBottom: spacing[12],
    textAlign: "center",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  contactText: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[500],
    marginLeft: spacing[4],
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[12],
    gap: spacing[8],
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing[4],
  },
  statusLabel: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
    backgroundColor: "#fff4e0",
    gap: spacing[4],
  },
  ratingText: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning[500],
    marginLeft: spacing[4],
  },
});

// ─── Stats Row ─────────────────────────────────────────────────────────────────
const StatsRow = ({ vendor }) => {
  const rating = vendor?.averageRating;
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const categories = vendor?.categories || roleData?.categories || [];
  const region =
    roleData?.serviceLocation?.regionNameAr ||
    roleData?.serviceLocation?.regionNameEn ||
    vendor?.location?.region ||
    vendor?.location?.city ||
    null;

  return (
    <View style={statsStyles.row}>
      <View style={[statsStyles.pill, { backgroundColor: "#fff4e0" }]}>
        <Ionicons name="star" size={14} color={colors.warning[500]} />
        <Text style={[statsStyles.pillValue, { color: colors.warning[500] }]}>
          {rating != null ? Number(rating).toFixed(1) : "—"}
        </Text>
        <Text style={statsStyles.pillLabel}>Rating</Text>
      </View>

      <View style={[statsStyles.pill, { backgroundColor: "#fdf3e7" }]}>
        <Ionicons name="grid-outline" size={14} color={colors.primary[500]} />
        <Text style={[statsStyles.pillValue, { color: colors.primary[500] }]}>
          {categories.length}
        </Text>
        <Text style={statsStyles.pillLabel}>Categories</Text>
      </View>

      {region && (
        <View style={[statsStyles.pill, { backgroundColor: "#e8f5ee" }]}>
          <Ionicons name="location-outline" size={14} color={colors.success[500]} />
          <Text
            style={[statsStyles.pillValue, { color: colors.success[500] }]}
            numberOfLines={1}
          >
            {region}
          </Text>
        </View>
      )}
    </View>
  );
};

const statsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginHorizontal: spacing[16],
    marginBottom: spacing[12],
    gap: spacing[8],
  },
  pill: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    gap: spacing[4],
  },
  pillValue: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
  },
  pillLabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
  },
});

// ─── Service Description ───────────────────────────────────────────────────────
const ServiceDescriptionSection = ({ roleData }) => {
  const desc = roleData?.serviceDescription;
  const other = roleData?.otherData;
  if (!desc && !other) return null;

  return (
    <SectionCard title="Service Description" icon="document-text-outline">
      {desc ? (
        <View style={descStyles.block}>
          <Text style={descStyles.text}>{desc}</Text>
        </View>
      ) : null}
      {other ? (
        <View style={[descStyles.block, desc && descStyles.blockBorder]}>
          <Text style={descStyles.label}>Additional Info</Text>
          <Text style={descStyles.text}>{other}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
};

const descStyles = StyleSheet.create({
  block: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  blockBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.natural[150],
  },
  label: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    marginBottom: spacing[4],
  },
  text: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[800],
    lineHeight: 20,
  },
});

// ─── Service Location ──────────────────────────────────────────────────────────
const ServiceLocationSection = ({ vendor }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const sl = roleData?.serviceLocation;
  const region = sl?.regionNameAr || sl?.regionNameEn || sl?.region || vendor?.location?.region;
  const city = sl?.cityNameAr || sl?.cityNameEn || sl?.city || vendor?.location?.city;
  const coverage = sl?.coverageType;

  if (!region && !city && !coverage) return null;

  const lastKey = coverage ? "coverage" : city ? "city" : "region";

  return (
    <SectionCard title="Service Location" icon="location-outline">
      {region ? (
        <InfoRow icon="map-outline" label="Region" value={region} last={lastKey === "region"} />
      ) : null}
      {city ? (
        <InfoRow icon="business-outline" label="City" value={city} last={lastKey === "city"} />
      ) : null}
      {coverage ? (
        <InfoRow icon="navigate-outline" label="Coverage Type" value={coverage} last />
      ) : null}
    </SectionCard>
  );
};

// ─── Service Categories ────────────────────────────────────────────────────────
const ServiceCategoriesSection = ({ vendor }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const serviceCategories = roleData?.serviceCategories;
  const simpleCategories = vendor?.categories || roleData?.categories || [];

  if (serviceCategories && Object.keys(serviceCategories).length > 0) {
    const entries = Object.entries(serviceCategories).filter(
      ([, vals]) => Array.isArray(vals) && vals.length > 0
    );
    if (!entries.length) return null;

    return (
      <SectionCard title="Service Categories" icon="grid-outline">
        {entries.map(([cat, vals], idx) => (
          <View
            key={cat}
            style={[catStyles.group, idx < entries.length - 1 && catStyles.groupBorder]}
          >
            <Text style={catStyles.groupTitle}>
              {CATEGORY_LABELS[cat] || cat}
            </Text>
            <View style={catStyles.wrap}>
              {vals.map((v, i) => (
                <View key={i} style={catStyles.chip}>
                  <Text style={catStyles.chipText}>{SERVICE_LABELS[v] || v}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </SectionCard>
    );
  }

  if (!simpleCategories.length) return null;

  return (
    <SectionCard title="Categories" icon="grid-outline">
      <View style={[catStyles.wrap, catStyles.simpleWrap]}>
        {simpleCategories.map((cat, idx) => (
          <View key={cat.key || idx} style={catStyles.chip}>
            <Text style={catStyles.chipText}>{cat.nameEn || cat.key}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
};

const catStyles = StyleSheet.create({
  group: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  groupBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  groupTitle: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[700],
    marginBottom: spacing[8],
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  simpleWrap: {
    padding: spacing[16],
  },
  chip: {
    backgroundColor: "#fdf3e7",
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

// ─── Social Links ──────────────────────────────────────────────────────────────
const SocialLinksSection = ({ vendor }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const socialLinks = roleData?.socialLinks || {};
  const { instagram, facebook, tiktok, twitter, website } = socialLinks;
  if (!instagram && !facebook && !tiktok && !twitter && !website) return null;

  const lastKey = website
    ? "website"
    : twitter
    ? "twitter"
    : tiktok
    ? "tiktok"
    : facebook
    ? "facebook"
    : "instagram";

  return (
    <SectionCard title="Social Links" icon="share-social-outline">
      {instagram ? (
        <InfoRow icon="logo-instagram" label="Instagram" value={instagram} last={lastKey === "instagram"} />
      ) : null}
      {facebook ? (
        <InfoRow icon="logo-facebook" label="Facebook" value={facebook} last={lastKey === "facebook"} />
      ) : null}
      {tiktok ? (
        <InfoRow icon="musical-notes-outline" label="TikTok" value={tiktok} last={lastKey === "tiktok"} />
      ) : null}
      {twitter ? (
        <InfoRow icon="logo-twitter" label="Twitter/X" value={twitter} last={lastKey === "twitter"} />
      ) : null}
      {website ? (
        <InfoRow icon="globe-outline" label="Website" value={website} last />
      ) : null}
    </SectionCard>
  );
};

// ─── Gallery & Files ───────────────────────────────────────────────────────────
const GallerySection = ({ vendor }) => {
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const [previewUrl, setPreviewUrl] = useState(null);

  const items = [
    ...(roleData.businessLogo
      ? [{ url: getImageUrl(roleData.businessLogo), title: "Business Logo" }]
      : []),
    ...(Array.isArray(roleData.portfolioImages) ? roleData.portfolioImages : []).map((img, i) => ({
      url: getImageUrl(img),
      title: `Portfolio ${i + 1}`,
    })),
    ...(Array.isArray(roleData.pricePackages) ? roleData.pricePackages : []).map((pkg, i) => ({
      url: getImageUrl(pkg),
      title: `Price Package ${i + 1}`,
    })),
    ...(roleData.commercialRecordImage
      ? [{ url: getImageUrl(roleData.commercialRecordImage), title: "Commercial Record" }]
      : []),
    ...(roleData.nationalIdImage
      ? [{ url: getImageUrl(roleData.nationalIdImage), title: "National ID" }]
      : []),
    ...(roleData.profileFile
      ? [{ url: getImageUrl(roleData.profileFile), title: "Profile File" }]
      : []),
  ].filter((item) => !!item.url);

  if (!items.length) return null;

  return (
    <SectionCard title="Gallery & Files" icon="images-outline">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={galleryStyles.row}
      >
        {items.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={galleryStyles.thumb}
            onPress={() => setPreviewUrl(item.url)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.url }}
              style={galleryStyles.thumbImg}
              resizeMode="cover"
            />
            <Text style={galleryStyles.thumbTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={!!previewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
      >
        <Pressable style={galleryStyles.overlay} onPress={() => setPreviewUrl(null)}>
          <View style={galleryStyles.modalContent}>
            <TouchableOpacity
              style={galleryStyles.closeBtn}
              onPress={() => setPreviewUrl(null)}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: previewUrl }}
              style={galleryStyles.fullImg}
              resizeMode="contain"
            />
          </View>
        </Pressable>
      </Modal>
    </SectionCard>
  );
};

const galleryStyles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    gap: spacing[12],
    flexDirection: "row",
  },
  thumb: {
    width: 110,
    alignItems: "center",
  },
  thumbImg: {
    width: 110,
    height: 84,
    borderRadius: borderRadius[8],
    backgroundColor: colors.natural[100],
  },
  thumbTitle: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.label.small,
    color: colors.natural[500],
    textAlign: "center",
    width: 110,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: spacing[48],
    right: spacing[16],
    zIndex: 10,
  },
  fullImg: {
    width: "92%",
    height: "72%",
  },
});

// ─── Admin Actions ─────────────────────────────────────────────────────────────
const AdminActionsSection = ({
  vendor,
  onApprove,
  onSuspend,
  onActivate,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const status = vendor?.status;
  return (
    <SectionCard title="Admin Actions" icon="shield-checkmark-outline">
      <View style={actionStyles.col}>
        {canEdit && (status === "pending" || status === "rejected") && (
          <ActionButton
            label="Approve Vendor"
            icon="checkmark-circle-outline"
            variant="success"
            onPress={onApprove}
          />
        )}
        {canEdit && status === "approved" && (
          <ActionButton
            label="Suspend Vendor"
            icon="pause-circle-outline"
            variant="warning"
            onPress={onSuspend}
          />
        )}
        {canEdit && status === "suspended" && (
          <ActionButton
            label="Activate Vendor"
            icon="play-circle-outline"
            variant="success"
            onPress={onActivate}
          />
        )}
        {canDelete && (
          <ActionButton
            label="Delete Vendor"
            icon="trash-outline"
            variant="danger"
            onPress={onDelete}
          />
        )}
      </View>
    </SectionCard>
  );
};

const actionStyles = StyleSheet.create({
  col: {
    gap: spacing[8],
    padding: spacing[8],
  },
});

// ─── Loading State ─────────────────────────────────────────────────────────────
const LoadingView = () => (
  <View style={loadingStyles.container}>
    <ActivityIndicator size="large" color={colors.primary[500]} />
  </View>
);

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: backgrounds.artboard,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const VendorDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
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

  const handleApprove = () => {
    Alert.alert("Approve Vendor", "Are you sure you want to approve this vendor?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          try {
            await updateStatusMutation.mutateAsync({
              vendorId: vendor._id || vendor.id,
              status: "approved",
            });
            toast.success("Vendor approved successfully.");
            refetch();
          } catch {
            toast.error("Failed to approve vendor. Please try again.");
          }
        },
      },
    ]);
  };

  const handleSuspend = () => {
    Alert.alert("Suspend Vendor", "Are you sure you want to suspend this vendor?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Suspend",
        style: "destructive",
        onPress: async () => {
          try {
            await updateStatusMutation.mutateAsync({
              vendorId: vendor._id || vendor.id,
              status: "suspended",
            });
            toast.success("Vendor suspended.");
            refetch();
          } catch {
            toast.error("Failed to suspend vendor. Please try again.");
          }
        },
      },
    ]);
  };

  const handleActivate = () => {
    Alert.alert("Activate Vendor", "Are you sure you want to activate this vendor?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Activate",
        onPress: async () => {
          try {
            await updateStatusMutation.mutateAsync({
              vendorId: vendor._id || vendor.id,
              status: "approved",
            });
            toast.success("Vendor activated successfully.");
            refetch();
          } catch {
            toast.error("Failed to activate vendor. Please try again.");
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Vendor",
      "This action cannot be undone. Are you sure you want to delete this vendor?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVendorMutation.mutateAsync(vendor._id || vendor.id);
              toast.success("Vendor deleted.");
              navigation.goBack();
            } catch {
              toast.error("Failed to delete vendor. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title="Vendor Details" showBack={true} />
        {isLoading ? (
          <LoadingView />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {vendor && (
              <>
                {/* Hero + stats */}
                <HeroCard vendor={vendor} />
                <StatsRow vendor={vendor} />

                <View style={styles.sections}>
                  {/* Service description */}
                  <ServiceDescriptionSection roleData={roleData} />

                  {/* Contact info */}
                  <SectionCard title="Contact Information" icon="person-outline">
                    <InfoRow
                      icon="mail-outline"
                      label="Email"
                      value={vendor.email || roleData?.email || "—"}
                    />
                    <InfoRow
                      icon="call-outline"
                      label="Phone"
                      value={vendor.phoneNumber || roleData?.phone || "—"}
                    />
                    <InfoRow
                      icon="calendar-outline"
                      label="Joined"
                      value={
                        vendor.createdAt
                          ? new Date(vendor.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "—"
                      }
                      last
                    />
                  </SectionCard>

                  {/* Business details */}
                  <SectionCard title="Business Details" icon="business-outline">
                    <InfoRow
                      icon="business-outline"
                      label="Brand Name"
                      value={roleData?.brandName || vendor.brandName || "—"}
                    />
                    <InfoRow
                      icon="person-outline"
                      label="Owner Name"
                      value={roleData?.ownerFullName || roleData?.ownerName || "—"}
                    />
                    {roleData?.commercialRecordNumber || roleData?.commercialRecord ? (
                      <InfoRow
                        icon="document-text-outline"
                        label="Commercial Record"
                        value={roleData.commercialRecordNumber || roleData.commercialRecord}
                      />
                    ) : null}
                    {roleData?.nationalId ? (
                      <InfoRow
                        icon="card-outline"
                        label="National ID"
                        value={roleData.nationalId}
                        last
                      />
                    ) : null}
                  </SectionCard>

                  {/* Service location */}
                  <ServiceLocationSection vendor={vendor} />

                  {/* Service categories */}
                  <ServiceCategoriesSection vendor={vendor} />

                  {/* Social links */}
                  <SocialLinksSection vendor={vendor} />

                  {/* Gallery */}
                  <GallerySection vendor={vendor} />

                  {/* Admin actions */}
                  {(canEdit || canDelete) && (
                    <AdminActionsSection
                      vendor={vendor}
                      onApprove={handleApprove}
                      onSuspend={handleSuspend}
                      onActivate={handleActivate}
                      onDelete={handleDelete}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  )}
                </View>

                <View style={styles.bottomSpacer} />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgrounds.card[8],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[32],
  },
  sections: {
    marginHorizontal: spacing[16],
    gap: spacing[12],
  },
  bottomSpacer: {
    height: spacing[20],
  },
});

export default VendorDetailsScreen;
