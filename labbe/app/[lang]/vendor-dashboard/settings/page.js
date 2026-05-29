"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import styles from "./page.module.css";
import Button from "@/ui/commen/button/Button";
import SettingsTabs from "./_components/SettingsTabs/SettingsTabs";
import PersonalInfoSection from "./_components/PersonalInfoSection/PersonalInfoSection";
import BasicAccountInfo from "./_components/BasicAccountInfo/BasicAccountInfo";
import ServiceDetailsSection from "./_components/ServiceDetailsSection/ServiceDetailsSection";
import ImagesAndPricingSection from "./_components/ImagesAndPricingSection/ImagesAndPricingSection";
import AdditionalLinksSection from "./_components/AdditionalLinksSection/AdditionalLinksSection";
import NotificationPreferences from "@/ui/settings/notificationsPrefrences/NotificationPreferences";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import ErrorFallback from "@/ui/common/error/ErrorFallback";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

import {
  useMyProfile,
  useNotificationPreferences,
  useUserMutation,
} from "@/hooks/users";
import { getImageUrl, extractCategoriesArray } from "@/utils/vendorHelpers";
import { USER_ROLES } from "@/utils/schemas/notificationPreferencesSchemas";

const buildFormData = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value) && value[0] instanceof File) {
      value.forEach((file) => formData.append(key, file));
    } else if (value instanceof File) {
      formData.append(key, value);
    } else if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

const hasAnyFile = (data) =>
  Object.values(data).some(
    (v) => v instanceof File || (Array.isArray(v) && v[0] instanceof File)
  );

const VendorSettings = () => {
  const { t } = useTranslation("vendorSettings");
  const [activeTab, setActiveTab] = useState("accountSetup");

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useMyProfile();
  const { data: notificationPrefsData, isLoading: notifLoading } =
    useNotificationPreferences();
  const updateSectionMutation = useUserMutation("updateProfileSection");
  const updateProfileMutation = useUserMutation("updateProfile");
  const updatePasswordMutation = useUserMutation("updatePassword");

  const vendorData = profileData?.data?.user;

  // ---------------------------------------------------------------------------
  // Save handlers — every section funnels through one of these.
  //
  // `saveVendorSection`: writes vendorData section (most sections).
  // `savePersonalInfo`:  writes top-level user fields + optional avatar via
  //                       /users/profile, plus optional password change via
  //                       /users/password.
  // `saveBasicAccountInfo`: writes ownerFullName / brandName to vendorData
  //                       section; phone changes are handled inside the
  //                       BasicAccountInfo OTP modal directly.
  // ---------------------------------------------------------------------------

  const saveVendorSection = async (data) => {
    try {
      const payload = hasAnyFile(data) ? buildFormData(data) : data;
      await updateSectionMutation.mutateAsync({
        section: "vendorData",
        data: payload,
      });
      toast.success(t("messages.saveSuccess", "Changes saved successfully"));
      refetchProfile();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("messages.saveError", "Failed to save changes")
      );
    }
  };

  const savePersonalInfo = async (data) => {
    const {
      businessLogo,
      newPassword,
      currentPassword,
      passwordConfirm,
      ...profileFields
    } = data;
    try {
      // Top-level fields (name, email) + optional avatar/businessLogo.
      const hasLogo = businessLogo instanceof File;
      const profilePayload = hasLogo
        ? buildFormData({ ...profileFields, businessLogo })
        : profileFields;
      await updateProfileMutation.mutateAsync(profilePayload);

      // Optional password change — current password is collected by the
      // PersonalInfo form schema; never falls back to a browser prompt.
      if (newPassword && currentPassword) {
        await updatePasswordMutation.mutateAsync({
          currentPassword,
          newPassword,
          passwordConfirm: passwordConfirm || newPassword,
        });
      }

      toast.success(t("messages.saveSuccess", "Changes saved successfully"));
      refetchProfile();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("messages.saveError", "Failed to save changes")
      );
    }
  };

  const saveBasicAccountInfo = async (data) => {
    // Phone handled separately by the OTP modal inside BasicAccountInfo.
    const { ownerFullName, brandName, email } = data;
    try {
      const vendorPayload = {};
      if (ownerFullName !== undefined) vendorPayload.ownerFullName = ownerFullName;
      if (brandName !== undefined) vendorPayload.brandName = brandName;
      if (Object.keys(vendorPayload).length > 0) {
        await updateSectionMutation.mutateAsync({
          section: "vendorData",
          data: vendorPayload,
        });
      }
      if (email && email.toLowerCase() !== (vendorData?.email || "").toLowerCase()) {
        await updateProfileMutation.mutateAsync({ email });
      }
      toast.success(t("messages.saveSuccess", "Changes saved successfully"));
      refetchProfile();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("messages.saveError", "Failed to save changes")
      );
    }
  };

  if (profileLoading || (activeTab === "notifications" && notifLoading)) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>{t("pageTitle")}</h1>
        </div>
        <SimpleLoading />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>{t("pageTitle")}</h1>
        </div>
        <ErrorFallback
          message={t("errors.loadFailed", "Failed to load settings")}
          onRetry={refetchProfile}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage={t("errors.boundary", "Failed to load settings")}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>{t("pageTitle")}</h1>
        </div>

        <div className={styles.content}>
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "accountSetup" && (
            <div className={styles.sectionsContainer}>
              <PersonalInfoSection
                data={{
                  name:
                    vendorData?.roleData?.ownerFullName ||
                    vendorData?.name ||
                    "",
                  email: vendorData?.email || "",
                  avatar: getImageUrl(vendorData?.roleData?.businessLogo),
                }}
                onSave={savePersonalInfo}
              />

              <div className={styles.dataSection}>
                <BasicAccountInfo
                  data={{
                    ownerFullName: vendorData?.roleData?.ownerFullName || "",
                    brandName: vendorData?.roleData?.brandName || "",
                    email: vendorData?.email || "",
                    phoneNumber:
                      vendorData?.mobile ||
                      vendorData?.phoneNumber ||
                      "",
                  }}
                  onSave={saveBasicAccountInfo}
                  onPhoneVerified={refetchProfile}
                />

                <ServiceDetailsSection
                  data={{
                    serviceDescription:
                      vendorData?.roleData?.serviceDescription || "",
                    nationalId: vendorData?.roleData?.nationalId || "",
                    nationalIdImage: getImageUrl(
                      vendorData?.roleData?.nationalIdImage
                    ),
                    commercialRecordImage: getImageUrl(
                      vendorData?.roleData?.commercialRecordImage
                    ),
                    serviceLocation:
                      vendorData?.roleData?.serviceLocation || {},
                    serviceCategories: extractCategoriesArray(
                      vendorData?.roleData?.serviceCategories
                    ),
                  }}
                  onSave={saveVendorSection}
                />
              </div>

              <ImagesAndPricingSection
                data={{
                  portfolioImages: (
                    vendorData?.roleData?.portfolioImages || []
                  ).filter(Boolean),
                  pricePackages: (
                    vendorData?.roleData?.pricePackages || []
                  ).filter(Boolean),
                }}
                onSave={saveVendorSection}
                onRefetch={refetchProfile}
              />

              <AdditionalLinksSection
                data={{
                  website: vendorData?.roleData?.socialLinks?.website || "",
                  instagram:
                    vendorData?.roleData?.socialLinks?.instagram || "",
                  facebook: vendorData?.roleData?.socialLinks?.facebook || "",
                  twitter: vendorData?.roleData?.socialLinks?.twitter || "",
                  tiktok: vendorData?.roleData?.socialLinks?.tiktok || "",
                }}
                onSave={saveVendorSection}
              />

              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  title={t("buttons.cancel")}
                  onClick={refetchProfile}
                  disabled={
                    updateSectionMutation.isPending ||
                    updateProfileMutation.isPending ||
                    updatePasswordMutation.isPending
                  }
                  className={styles.cancelButton}
                />
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className={styles.notificationsContainer}>
              <NotificationPreferences
                initialData={notificationPrefsData?.data?.preferences}
                userRole={USER_ROLES.VENDOR}
                emailVerified={vendorData?.emailVerified || false}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default VendorSettings;
