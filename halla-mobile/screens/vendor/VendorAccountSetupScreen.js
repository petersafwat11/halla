import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "../../localization/hooks/useTranslation";
import { useToast } from "../../contexts/ToastContext";
import {
  useVendorProfile,
  useUpdateVendorProfile,
  useUpdateVendorProfileWithFiles,
} from "../../hooks";
import { usersApi } from "../../hooks/users/_api";
import TopBar from "../../components/plans/TopBar";
import PersonalInfoForm from "../../components/vendor/PersonalInfoForm";
import ServiceDetailsForm from "../../components/vendor/ServiceDetailsForm";
import ImagesAndPricingForm from "../../components/vendor/ImagesAndPricingForm";
import AdditionalLinksForm from "../../components/vendor/AdditionalLinksForm";

const isFileObj = (v) => v && typeof v === "object" && v.uri;
const hasAnyFile = (obj) =>
  Object.values(obj).some((v) =>
    Array.isArray(v) ? v.some(isFileObj) : isFileObj(v)
  );

/**
 * Build a FormData from a {fieldName: value} map where values may be
 * react-native asset descriptors ({uri, mimeType, fileName}), arrays of
 * those, plain scalars, or nested objects.
 */
const toFormData = (obj) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      const hasFiles = value.some(isFileObj);
      if (hasFiles) {
        value.forEach((item, i) => {
          if (!isFileObj(item)) return;
          fd.append(key, {
            uri: item.uri,
            type: item.mimeType || "image/jpeg",
            name: item.fileName || `${key}-${i}.jpg`,
          });
        });
      } else {
        fd.append(key, JSON.stringify(value));
      }
    } else if (isFileObj(value)) {
      fd.append(key, {
        uri: value.uri,
        type: value.mimeType || "image/jpeg",
        name: value.fileName || `${key}.jpg`,
      });
    } else if (typeof value === "object") {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, String(value));
    }
  });
  return fd;
};

const VendorAccountSetupScreen = () => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: vendorData, isLoading, error, refetch } = useVendorProfile();
  const updateSectionMutation = useUpdateVendorProfile();
  const updateSectionWithFilesMutation = useUpdateVendorProfileWithFiles();

  const [refreshing, setRefreshing] = useState(false);
  const [savingMain, setSavingMain] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const refetchProfile = () => {
    queryClient.invalidateQueries({ queryKey: ["vendor", "profile"] });
    refetch();
  };

  // ---- Send a vendorData section update (JSON or multipart) ----------------
  const saveVendorSection = async (sectionData) => {
    if (!sectionData || Object.keys(sectionData).length === 0) return;
    try {
      if (hasAnyFile(sectionData)) {
        await updateSectionWithFilesMutation.mutateAsync({
          section: "vendorData",
          formData: toFormData(sectionData),
        });
      } else {
        await updateSectionMutation.mutateAsync({
          section: "vendorData",
          data: sectionData,
        });
      }
      toast.success(t("settings.saveSuccess"));
      refetchProfile();
    } catch (err) {
      toast.error(err.message || t("settings.saveError"));
    }
  };

  // ---- Send a top-level user update (name/email/avatar) ---------------------
  const saveMainProfile = async (mainData) => {
    if (!mainData || Object.keys(mainData).length === 0) return;
    setSavingMain(true);
    try {
      if (hasAnyFile(mainData)) {
        await usersApi.updateProfileWithFiles(toFormData(mainData));
      } else {
        await usersApi.updateProfile(mainData);
      }
      refetchProfile();
    } catch (err) {
      toast.error(err.message || t("settings.saveError"));
      throw err;
    } finally {
      setSavingMain(false);
    }
  };

  // ---- Adapter for PersonalInfoForm (consolidated section) -----------------
  // Splits a {main, vendor} payload across the two endpoints, since identity
  // lives in vendorData and email is a top-level user field.
  const savePersonalInfo = async ({ main, vendor }) => {
    try {
      if (main && Object.keys(main).length > 0) {
        await saveMainProfile(main);
      }
      if (vendor && Object.keys(vendor).length > 0) {
        await saveVendorSection(vendor);
      }
      toast.success(t("settings.saveSuccess"));
    } catch (_e) {
      // saveMainProfile already toasted
    }
  };

  const isSaving =
    updateSectionMutation.isPending ||
    updateSectionWithFilesMutation.isPending ||
    savingMain;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <TopBar title={t("settings.tabs.accountSetup")} showBack={true} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C28E5C" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <TopBar title={t("settings.tabs.accountSetup")} showBack={true} />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t("errors.fetchFailed")}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("settings.tabs.accountSetup")} showBack={true} />
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <PersonalInfoForm
            data={{
              ownerFullName:
                vendorData?.roleData?.ownerFullName ||
                vendorData?.name ||
                "",
              brandName: vendorData?.roleData?.brandName || "",
              email: vendorData?.email || "",
              phoneNumber:
                vendorData?.mobile || vendorData?.phoneNumber || "",
              avatar: vendorData?.roleData?.businessLogo || vendorData?.avatar,
            }}
            onSave={savePersonalInfo}
            onPhoneChanged={refetchProfile}
            onRefetch={refetchProfile}
            loading={isSaving}
          />

          <ServiceDetailsForm
            data={{
              serviceDescription: vendorData?.roleData?.serviceDescription || "",
              nationalId: vendorData?.roleData?.nationalId || "",
              nationalIdImage: vendorData?.roleData?.nationalIdImage,
              commercialRecordImage: vendorData?.roleData?.commercialRecordImage,
              serviceLocation: vendorData?.roleData?.serviceLocation || {},
              serviceCategories: vendorData?.roleData?.serviceCategories || [],
            }}
            onSave={saveVendorSection}
            onRefetch={refetchProfile}
            loading={isSaving}
          />

          <ImagesAndPricingForm
            data={{
              portfolioImages: vendorData?.roleData?.portfolioImages || [],
              pricePackages: vendorData?.roleData?.pricePackages || [],
            }}
            onSave={saveVendorSection}
            onRefetch={refetchProfile}
            loading={isSaving}
          />

          <AdditionalLinksForm
            data={{
              website: vendorData?.roleData?.socialLinks?.website || "",
              instagram: vendorData?.roleData?.socialLinks?.instagram || "",
              facebook: vendorData?.roleData?.socialLinks?.facebook || "",
              twitter: vendorData?.roleData?.socialLinks?.twitter || "",
              tiktok: vendorData?.roleData?.socialLinks?.tiktok || "",
            }}
            onSave={(data) => saveVendorSection(data)}
            loading={isSaving}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  content: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
  },
});

export default VendorAccountSetupScreen;
