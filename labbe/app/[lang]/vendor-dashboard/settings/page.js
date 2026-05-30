"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import styles from "./page.module.css";
import Button from "@/ui/commen/button/Button";
import PersonalInfoSection from "./_components/PersonalInfoSection/PersonalInfoSection";
import ServiceDetailsSection from "./_components/ServiceDetailsSection/ServiceDetailsSection";
import ImagesAndPricingSection from "./_components/ImagesAndPricingSection/ImagesAndPricingSection";
import AdditionalLinksSection from "./_components/AdditionalLinksSection/AdditionalLinksSection";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import ErrorFallback from "@/ui/common/error/ErrorFallback";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

import { useMyProfile, useUserMutation } from "@/hooks/users";
import { getImageUrl, extractCategoriesArray } from "@/utils/vendorHelpers";

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

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useMyProfile();
  const updateSectionMutation = useUserMutation("updateProfileSection");
  const updateProfileMutation = useUserMutation("updateProfile");
  const updatePasswordMutation = useUserMutation("updatePassword");

  const vendorData = profileData?.data?.user;

  // ---------------------------------------------------------------------------
  // Save handlers
  //
  // `saveVendorSection`: writes the vendorData section (used by most sections).
  // `savePersonalInfo`:  fans out across three endpoints — vendorData section
  //                      for ownerFullName/brandName/businessLogo, top-level
  //                      /users/profile for the email change, and the
  //                      dedicated /users/password endpoint for the optional
  //                      password change. The phone field is OTP-gated and
  //                      handled by `PhoneChangeOtpModal`, not by this handler.
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
      ownerFullName,
      brandName,
      email,
      businessLogo,
      currentPassword,
      newPassword,
      passwordConfirm,
    } = data;

    try {
      // 1) Identity + logo go to the vendorData section. ownerFullName is the
      //    field that drives display (see the `roleData.ownerFullName ||
      //    user.name` fallback below), so it MUST be written via the section
      //    endpoint, not as top-level user.name.
      const vendorPayload = {};
      if (ownerFullName !== undefined) vendorPayload.ownerFullName = ownerFullName;
      if (brandName !== undefined) vendorPayload.brandName = brandName;
      if (businessLogo instanceof File) vendorPayload.businessLogo = businessLogo;
      if (Object.keys(vendorPayload).length > 0) {
        const payload = hasAnyFile(vendorPayload)
          ? buildFormData(vendorPayload)
          : vendorPayload;
        await updateSectionMutation.mutateAsync({
          section: "vendorData",
          data: payload,
        });
      }

      // 2) Email is a top-level user field. Only PATCH if it actually changed
      //    so we don't reset `emailVerified` on every save.
      if (
        email &&
        email.toLowerCase() !== (vendorData?.email || "").toLowerCase()
      ) {
        await updateProfileMutation.mutateAsync({ email });
      }

      // 3) Optional password change — dedicated endpoint.
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

  if (profileLoading) {
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
          <div className={styles.sectionsContainer}>
            <PersonalInfoSection
              data={{
                ownerFullName:
                  vendorData?.roleData?.ownerFullName ||
                  vendorData?.name ||
                  "",
                brandName: vendorData?.roleData?.brandName || "",
                email: vendorData?.email || "",
                phoneNumber:
                  vendorData?.mobile || vendorData?.phoneNumber || "",
                avatar: getImageUrl(vendorData?.roleData?.businessLogo),
              }}
              onSave={savePersonalInfo}
              onPhoneVerified={refetchProfile}
              onRefetch={refetchProfile}
            />

            <div className={styles.dataSection}>
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
                onRefetch={refetchProfile}
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
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default VendorSettings;
