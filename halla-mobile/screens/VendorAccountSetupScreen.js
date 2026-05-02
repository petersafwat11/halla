import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../localization/hooks/useTranslation";
import { useToast } from "../contexts/ToastContext";
import { useVendorProfile, useUpdateVendorProfile, useUpdateVendorProfileWithFiles } from "../hooks";
import TopBar from "../components/plans/TopBar";
import PersonalInfoForm from "../components/vendor/PersonalInfoForm";
import ServiceDetailsForm from "../components/vendor/ServiceDetailsForm";
import ImagesAndPricingForm from "../components/vendor/ImagesAndPricingForm";
import AdditionalLinksForm from "../components/vendor/AdditionalLinksForm";

const VendorAccountSetupScreen = () => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const { data: vendorData, isLoading, refetch } = useVendorProfile();
  const updateMutation = useUpdateVendorProfile();
  const updateWithFilesMutation = useUpdateVendorProfileWithFiles();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSaveSection = async (section, data) => {
    try {
      const isFileObj = (v) => v && typeof v === "object" && v.uri;
      const hasFiles = Object.values(data).some((value) =>
        Array.isArray(value) ? value.some(isFileObj) : isFileObj(value),
      );

      if (hasFiles) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          if (Array.isArray(value)) {
            const hasFileItems = value.some(isFileObj);
            if (hasFileItems) {
              value.forEach((item, i) => {
                if (isFileObj(item)) {
                  formData.append(key, {
                    uri: item.uri,
                    type: item.mimeType || "image/jpeg",
                    name: item.fileName || `${key}-${i}.jpg`,
                  });
                }
              });
            } else {
              formData.append(key, JSON.stringify(value));
            }
          } else if (isFileObj(value)) {
            formData.append(key, {
              uri: value.uri,
              type: value.mimeType || "image/jpeg",
              name: value.fileName || `${key}.jpg`,
            });
          } else if (typeof value === "object") {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        });
        await updateWithFilesMutation.mutateAsync({ section, formData });
      } else {
        await updateMutation.mutateAsync({ section, data });
      }
      toast.success(t("settings.saveSuccess"));
    } catch (error) {
      toast.error(t("settings.saveError"));
    }
  };

  const isSaving = updateMutation.isPending || updateWithFilesMutation.isPending;

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
              name: vendorData?.roleData?.ownerFullName || vendorData?.name || "",
              email: vendorData?.email || "",
              avatar: vendorData?.roleData?.businessLogo || vendorData?.avatar,
            }}
            onSave={(data) => handleSaveSection("vendorData", data)}
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
            onSave={(data) => handleSaveSection("vendorData", data)}
            loading={isSaving}
          />
          <ImagesAndPricingForm
            data={{
              portfolioImages: vendorData?.roleData?.portfolioImages || [],
              pricePackages: vendorData?.roleData?.pricePackages || [],
            }}
            onSave={(data) => handleSaveSection("vendorData", data)}
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
            onSave={(data) => handleSaveSection("vendorData", data)}
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
    flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60,
  },
});

export default VendorAccountSetupScreen;
