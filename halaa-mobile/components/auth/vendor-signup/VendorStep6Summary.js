import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext } from "react-hook-form";
import SectionCard from "../../commen/SectionCard";
import LocalizedText from "../../commen/LocalizedText";
import AdaptiveText from "../../commen/AdaptiveText";
import { useTranslation } from "../../../localization";

/**
 * Vendor signup — application summary.
 */
const SummaryRow = ({ label, value }) => {
  const displayValue = typeof value === "object" ? JSON.stringify(value) : value;
  if (displayValue === undefined || displayValue === null || displayValue === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;
  return (
    <View style={summaryStyles.row}>
      <LocalizedText style={summaryStyles.label}>{label}</LocalizedText>
      <AdaptiveText numberOfLines={2} style={summaryStyles.value}>
        {displayValue}
      </AdaptiveText>
    </View>
  );
};

const CATEGORY_KEYS = [
  "eventPlanning",
  "mediaProduction",
  "giftsAndGiveaways",
  "foodAndBeverages",
  "beautyAndFashion",
  "logisticsAndDelivery",
  "corporateServices",
  "supportServices",
  "technicalServices",
  "soundLightingEntertainment",
  "hallsAndVenues",
];

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  label: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#888", flex: 1 },
  value: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#2c2c2c", flex: 1.5 },
});

const VendorStep6Summary = ({ onEditStep }) => {
  const { t, i18n } = useTranslation("auth");
  const isAr = i18n?.language?.startsWith("ar") ?? true;
  const { watch } = useFormContext();
  const values = watch();

  const identity = values.identity || {};
  const serviceData = values.serviceData || {};
  const samples = values.samplesAndPackages || {};
  const commercial = values.commercialVerification || {};
  const social = values.socialLinks || {};

  const renderEditButton = (stepNum) => {
    if (!onEditStep) return null;
    return (
      <TouchableOpacity
        onPress={() => onEditStep(stepNum)}
        style={styles.editBtn}
        accessibilityRole="button"
        accessibilityLabel={t("signupForm.buttons.edit")}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="create-outline" size={14} color="#c28e5c" />
        <LocalizedText style={styles.editText}>
          {t("signupForm.buttons.edit")}
        </LocalizedText>
      </TouchableOpacity>
    );
  };

  // Collect selected category names
  const selectedCategories = [];
  CATEGORY_KEYS.forEach((key) => {
    const selected = serviceData[key];
    if (selected && selected.length > 0) {
      const catTitle = t(`signupForm.vendor.serviceData.${key}.title`, { defaultValue: key });
      const options = t(`signupForm.vendor.serviceData.${key}.options`, { returnObjects: true });
      const selectedLabels = (selected || []).map((value) => {
        if (Array.isArray(options)) {
          const option = options.find((o) => o.value === value);
          return option ? option.label : value;
        }
        return value;
      });
      selectedCategories.push({ title: catTitle, items: selectedLabels.join(", ") });
    }
  });

  const loc = serviceData.serviceLocation || {};
  const regionName = isAr ? (loc.regionNameAr || loc.regionNameEn) : (loc.regionNameEn || loc.regionNameAr);
  const cityName = isAr ? (loc.cityNameAr || loc.cityNameEn) : (loc.cityNameEn || loc.cityNameAr);
  const districtNames = (loc.districtNames || [])
    .map((district) => isAr ? (district.nameAr || district.nameEn) : (district.nameEn || district.nameAr))
    .filter(Boolean)
    .join(", ");
  const coverageLabel = loc.coverageType
    ? t(`signupForm.vendor.summary.coverage.${loc.coverageType}`)
    : "";

  const formatFileDisplay = (file) => {
    if (!file) return null;
    if (typeof file === "string") return file.split("/").pop();
    return file.fileName || file.name || t("common.attached");
  };

  return (
    <View style={styles.container}>
      <LocalizedText center style={styles.stepTitle}>
        {t("signupForm.vendor.summary.title")}
      </LocalizedText>
      <LocalizedText role="hint" center style={styles.stepDesc}>
        {t("signupForm.vendor.summary.description")}
      </LocalizedText>

      {/* Step 1: Account Information */}
      <SectionCard
        title={t("signupForm.vendor.summary.sections.identity")}
        icon="person-outline"
        rightAction={renderEditButton(1)}
      >
        <SummaryRow label={t("signupForm.vendor.identity.brandName.label")} value={identity.brandName} />
        <SummaryRow label={t("signupForm.vendor.identity.ownerFullName.label")} value={identity.ownerFullName} />
        <SummaryRow label={t("signupForm.vendor.identity.email.label")} value={identity.email} />
        <SummaryRow label={t("signupForm.vendor.identity.phone")} value={identity.phoneNumber} />
      </SectionCard>

      {/* Step 2: Service Data & Categories */}
      <SectionCard
        title={t("signupForm.vendor.summary.sections.serviceData")}
        icon="briefcase-outline"
        rightAction={renderEditButton(2)}
      >
        <SummaryRow label={t("signupForm.vendor.serviceData.serviceDescription.label")} value={serviceData.serviceDescription} />
        <SummaryRow label={t("signupForm.vendor.serviceData.taglineAr")} value={serviceData.taglineAr} />
        <SummaryRow label={t("signupForm.vendor.serviceData.taglineEn")} value={serviceData.taglineEn} />
        <SummaryRow label={t("signupForm.vendor.serviceData.aboutAr")} value={serviceData.aboutAr} />
        <SummaryRow label={t("signupForm.vendor.serviceData.aboutEn")} value={serviceData.aboutEn} />
        {selectedCategories.map((cat, idx) => (
          <SummaryRow key={idx} label={cat.title} value={cat.items} />
        ))}
        {regionName ? (
          <SummaryRow
            label={t("signupForm.vendor.serviceData.location.region")}
            value={regionName}
          />
        ) : null}
        {cityName ? (
          <SummaryRow
            label={t("signupForm.vendor.serviceData.location.city")}
            value={cityName}
          />
        ) : null}
        <SummaryRow label={t("signupForm.vendor.summary.coverage.label")} value={coverageLabel} />
        <SummaryRow label={t("signupForm.vendor.serviceData.location.districts")} value={districtNames} />
        <SummaryRow label={t("signupForm.vendor.serviceData.otherData.label")} value={serviceData.otherData} />
      </SectionCard>

      {/* Step 3: Samples & Packages */}
      <SectionCard
        title={t("signupForm.vendor.samplesAndPackages.title")}
        icon="images-outline"
        rightAction={renderEditButton(3)}
      >
        {samples.businessLogo && (
          <SummaryRow
            label={t("signupForm.vendor.samplesAndPackages.logoLabel")}
            value={formatFileDisplay(samples.businessLogo)}
          />
        )}
        {Array.isArray(samples.portfolioImages) && samples.portfolioImages.length > 0 && (
          <SummaryRow
            label={t("signupForm.vendor.samplesAndPackages.portfolioLabel")}
            value={samples.portfolioImages.map(formatFileDisplay).filter(Boolean).join(", ")}
          />
        )}
        {Array.isArray(samples.pricePackages) && samples.pricePackages.length > 0 && (
          <SummaryRow
            label={t("signupForm.vendor.samplesAndPackages.packagesLabel")}
            value={samples.pricePackages.map(formatFileDisplay).filter(Boolean).join(", ")}
          />
        )}
        {samples.profileFile && (
          <SummaryRow
            label={t("signupForm.vendor.samplesAndPackages.profileFileLabel")}
            value={formatFileDisplay(samples.profileFile)}
          />
        )}
      </SectionCard>

      {/* Step 4: Commercial Verification */}
      <SectionCard
        title={t("signupForm.vendor.summary.sections.commercialVerification")}
        icon="shield-checkmark-outline"
        rightAction={renderEditButton(4)}
      >
        <SummaryRow label={t("signupForm.vendor.commercialVerification.commercialRecordNumber")} value={commercial.commercialRecordNumber} />
        {commercial.commercialRecordImage && (
          <SummaryRow
            label={t("signupForm.vendor.commercialVerification.commercialRecordImage")}
            value={formatFileDisplay(commercial.commercialRecordImage)}
          />
        )}
        <SummaryRow label={t("signupForm.vendor.commercialVerification.nationalId.label")} value={commercial.nationalId} />
        {commercial.nationalIdImage && (
          <SummaryRow
            label={t("signupForm.vendor.commercialVerification.nationalIdImage")}
            value={formatFileDisplay(commercial.nationalIdImage)}
          />
        )}
      </SectionCard>

      {/* Step 5: Social Links */}
      <SectionCard
        title={t("signupForm.vendor.summary.sections.socialLinks")}
        icon="share-social-outline"
        rightAction={renderEditButton(5)}
      >
        <SummaryRow label={t("signupForm.vendor.socialLinks.whatsapp")} value={social.whatsapp} />
        <SummaryRow label={t("signupForm.vendor.socialLinks.instagram")} value={social.instagram} />
        <SummaryRow label={t("signupForm.vendor.socialLinks.twitter")} value={social.twitter} />
        <SummaryRow label={t("signupForm.vendor.socialLinks.facebook")} value={social.facebook} />
        <SummaryRow label={t("signupForm.vendor.socialLinks.tiktok")} value={social.tiktok} />
        <SummaryRow label={t("signupForm.vendor.socialLinks.linkedin", { defaultValue: "LinkedIn" })} value={social.linkedin} />
        <SummaryRow label={t("signupForm.vendor.socialLinks.youtube", { defaultValue: "YouTube" })} value={social.youtube} />
        <SummaryRow label={t("signupForm.vendor.socialLinks.website")} value={social.website} />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%" },
  stepTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: "#2c2c2c", marginBottom: 6, lineHeight: 28 },
  stepDesc: { fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 20 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FBF5EF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EAD7C3",
  },
  editText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
});

export default VendorStep6Summary;
