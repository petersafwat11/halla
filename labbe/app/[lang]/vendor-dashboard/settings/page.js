"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

// UI Components
import Button from "@/ui/commen/button/Button";
import SettingsTabs from "./_components/SettingsTabs/SettingsTabs";
import PersonalInfoSection from "./_components/PersonalInfoSection/PersonalInfoSection";
import BasicAccountInfo from "./_components/BasicAccountInfo/BasicAccountInfo";
import ServiceDetailsSection from "./_components/ServiceDetailsSection/ServiceDetailsSection";
import ImagesAndPricingSection from "./_components/ImagesAndPricingSection/ImagesAndPricingSection";
import AdditionalLinksSection from "./_components/AdditionalLinksSection/AdditionalLinksSection";
import NotificationPreferences from "@/ui/settings/notificationsPrefrences/NotificationPreferences";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

// Hooks
import { useMyProfile, useNotificationPreferences, useUserMutation } from "@/hooks/reactQueryHooks/useUsers";

// Utils
import { getImageUrl, extractCategoriesArray } from "@/utils/vendorHelpers";

// Constants
import { USER_ROLES } from "@/utils/schemas/notificationPreferencesSchemas";

const VendorSettings = () => {
  const { t } = useTranslation("vendorSettings");
  const [activeTab, setActiveTab] = useState("accountSetup");

  // React Query hooks
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useMyProfile();
  const { data: notificationPrefsData, isLoading: notifLoading } = useNotificationPreferences();
  const updateSectionMutation = useUserMutation("updateProfileSection");
  const updateProfileMutation = useUserMutation("updateProfile");

  const vendorData = profileData?.data?.user;

  // Handle vendor data save with file support
  const handleSaveVendorData = async (data) => {
    try {
      // Check if data contains File objects that need FormData
      const hasFiles = Object.values(data).some(
        (v) => v instanceof File || (Array.isArray(v) && v[0] instanceof File)
      );

      let payload = data;
      if (hasFiles) {
        payload = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value[0] instanceof File) {
            value.forEach((file) => payload.append(key, file));
          } else if (value instanceof File) {
            payload.append(key, value);
          } else if (value !== undefined && value !== null) {
            payload.append(key, typeof value === "object" ? JSON.stringify(value) : value);
          }
        });
      }

      await updateSectionMutation.mutateAsync({ section: "vendorData", data: payload });
      toast.success(t("messages.saveSuccess", "Changes saved successfully"));
      refetchProfile();
    } catch (error) {
      console.error("Error saving section:", error);
      const errorMessage = error?.response?.data?.message || t("messages.saveError", "Failed to save changes");
      toast.error(errorMessage);
    }
  };

  // Handle personal info save - updates top-level user fields (name, email) + vendor businessLogo
  const handleSavePersonalInfo = async (data) => {
    try {
      const { businessLogo, ...profileFields } = data;
      // Update top-level user fields (name, email, password)
      await updateProfileMutation.mutateAsync(profileFields);
      // If businessLogo was uploaded, update vendorData separately
      if (businessLogo) {
        const formData = new FormData();
        formData.append("businessLogo", businessLogo);
        await updateSectionMutation.mutateAsync({ section: "vendorData", data: formData });
      }
      toast.success(t("messages.saveSuccess", "Changes saved successfully"));
      refetchProfile();
    } catch (error) {
      console.error("Error saving personal info:", error);
      const errorMessage = error?.response?.data?.message || t("messages.saveError", "Failed to save changes");
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    refetchProfile();
  };

  // Loading state
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
                    vendorData?.profile.vendorData?.ownerFullName ||
                    vendorData?.name ||
                    "",
                  email: vendorData?.email || "",
                  avatar: getImageUrl(vendorData?.profile.vendorData?.businessLogo),
                }}
                onSave={handleSavePersonalInfo}
              />

              <div className={styles.dataSection}>
                <BasicAccountInfo
                  data={{
                    ownerFullName: vendorData?.profile.vendorData?.ownerFullName || "",
                    brandName: vendorData?.profile.vendorData?.brandName || "",
                    email: vendorData?.email || "",
                    phoneNumber: vendorData?.phoneNumber || "",
                  }}
                  onSave={async (data) => {
                    const { email, phoneNumber, ...vendorFields } = data;
                    try {
                      // Update vendor-specific fields (phoneNumber goes here as vendor data)
                      const vendorDataToUpdate = { ...vendorFields };
                      if (phoneNumber) {
                        vendorDataToUpdate.phoneNumber = phoneNumber;
                      }
                      if (Object.keys(vendorDataToUpdate).length > 0) {
                        await updateSectionMutation.mutateAsync({ section: "vendorData", data: vendorDataToUpdate });
                      }
                      // Update top-level user fields (email only — phone requires OTP flow)
                      if (email) {
                        await updateProfileMutation.mutateAsync({ email });
                      }
                      toast.success(t("messages.saveSuccess", "Changes saved successfully"));
                      refetchProfile();
                    } catch (error) {
                      console.error("Error saving:", error);
                      toast.error(error?.response?.data?.message || t("messages.saveError", "Failed to save changes"));
                    }
                  }}
                />

                <ServiceDetailsSection
                  data={{
                    serviceDescription:
                      vendorData?.profile.vendorData?.serviceDescription || "",
                    nationalId: vendorData?.profile.vendorData?.nationalId || "",
                    nationalIdImage: getImageUrl(
                      vendorData?.profile.vendorData?.nationalIdImage
                    ),
                    commercialRecordImage: getImageUrl(
                      vendorData?.profile.vendorData?.commercialRecordImage
                    ),
                    serviceLocation:
                      vendorData?.profile.vendorData?.serviceLocation || {},
                    serviceCategories: extractCategoriesArray(
                      vendorData?.profile.vendorData?.serviceCategories
                    ),
                  }}
                  onSave={handleSaveVendorData}
                />
              </div>

              <ImagesAndPricingSection
                data={{
                  portfolioImages: (
                    vendorData?.profile.vendorData?.portfolioImages || []
                  )
                    .map((img) => getImageUrl(img))
                    .filter(Boolean),
                  pricePackages: (vendorData?.profile.vendorData?.pricePackages || [])
                    .map((img) => getImageUrl(img))
                    .filter(Boolean),
                }}
                onSave={handleSaveVendorData}
              />

              <AdditionalLinksSection
                data={{
                  website: vendorData?.profile.vendorData?.socialLinks?.website || "",
                  instagram:
                    vendorData?.profile.vendorData?.socialLinks?.instagram || "",
                  facebook: vendorData?.profile.vendorData?.socialLinks?.facebook || "",
                  twitter: vendorData?.profile.vendorData?.socialLinks?.twitter || "",
                  tiktok: vendorData?.profile.vendorData?.socialLinks?.tiktok || "",
                }}
                onSave={handleSaveVendorData}
              />

              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  title={t("buttons.cancel")}
                  onClick={handleCancel}
                  disabled={updateSectionMutation.isPending || updateProfileMutation.isPending}
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
