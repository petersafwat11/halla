import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";

import { useTranslation } from "../../localization/hooks/useTranslation";
import { useToast } from "../../contexts/ToastContext";
import TextInput from "../commen/TextInput";
import TextAreaInput from "../commen/TextAreaInput";
import Button from "../commen/Button";
import LocationSelector from "../commen/LocationSelector";
import { mobileServiceDetailsSchema as serviceDetailsSchema } from "@halaa/shared/schemas/vendor";
import { usersApi } from "../../hooks/users/_api";
import {
  extractCategoriesArray,
  buildServiceCategoriesPayload,
  VENDOR_CATEGORY_KEYS,
} from "../../utils/vendorHelpers";
import { getImageUrl } from "../../utils/imageUtils";

/**
 * Tile that owns BOTH ends of the single-image flow for a document field:
 *
 *  - newFile present → preview the local file with a × that drops the
 *    pending pick from state.
 *  - existingUri present → preview the server image with a × that fires
 *    the shared DELETE endpoint and asks the parent to refetch.
 *  - neither → render an empty pick button.
 *
 * Tap the preview itself to replace.
 */
const DocumentTile = ({
  existingUri,
  newFile,
  onPick,
  onClearNew,
  onDeleteExisting,
  isDeleting,
  pickLabel,
  changeLabel,
}) => {
  const previewUri = newFile?.uri || existingUri;
  if (!previewUri) {
    return (
      <TouchableOpacity style={styles.imageUploadButton} onPress={onPick}>
        <Text style={styles.imageUploadText}>{pickLabel}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.docTile}>
      <TouchableOpacity onPress={onPick} activeOpacity={0.8}>
        <Image source={{ uri: previewUri }} style={styles.docImage} />
        <View style={styles.docTileOverlay}>
          <Text style={styles.docTileOverlayText}>{changeLabel}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.docRemove}
        onPress={newFile ? onClearNew : onDeleteExisting}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.docRemoveText}>✕</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const ServiceDetailsForm = ({ data, onSave, onRefetch, loading }) => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const methods = useForm({
    resolver: zodResolver(serviceDetailsSchema(t)),
    defaultValues: {
      serviceDescription: data?.serviceDescription || "",
      taglineAr: data?.taglineAr || "",
      taglineEn: data?.taglineEn || "",
      aboutAr: data?.aboutAr || "",
      aboutEn: data?.aboutEn || "",
      nationalId: data?.nationalId || "",
      serviceLocation: data?.serviceLocation || {
        regionId: undefined,
        regionNameAr: "",
        regionNameEn: "",
        cityId: undefined,
        cityNameAr: "",
        cityNameEn: "",
        districtIds: [],
        districtNames: [],
        coverageType: "region",
      },
    },
  });
  const [serviceCategories, setServiceCategories] = useState(() =>
    extractCategoriesArray(data?.serviceCategories)
  );
  const [nationalIdFile, setNationalIdFile] = useState(null);
  const [commercialRecordFile, setCommercialRecordFile] = useState(null);
  const [deletingField, setDeletingField] = useState(null);

  // Absolutize the server's relative "/uploads/…" refs for RN Image.
  const existingNationalId = getImageUrl(data?.nationalIdImage) || null;
  const existingCommercial = getImageUrl(data?.commercialRecordImage) || null;

  useEffect(() => {
    methods.reset({
      serviceDescription: data?.serviceDescription || "",
      taglineAr: data?.taglineAr || "",
      taglineEn: data?.taglineEn || "",
      aboutAr: data?.aboutAr || "",
      aboutEn: data?.aboutEn || "",
      nationalId: data?.nationalId || "",
      serviceLocation: data?.serviceLocation || {
        regionId: undefined,
        regionNameAr: "",
        regionNameEn: "",
        cityId: undefined,
        cityNameAr: "",
        cityNameEn: "",
        districtIds: [],
        districtNames: [],
        coverageType: "region",
      },
    });
    setServiceCategories(extractCategoriesArray(data?.serviceCategories));
    setNationalIdFile(null);
    setCommercialRecordFile(null);
  }, [
    data?.serviceDescription,
    data?.taglineAr,
    data?.taglineEn,
    data?.aboutAr,
    data?.aboutEn,
    data?.nationalId,
    data?.serviceCategories,
    data?.serviceLocation,
    data?.nationalIdImage,
    data?.commercialRecordImage,
    methods,
  ]);

  const categoryOptions = VENDOR_CATEGORY_KEYS.map((key) => ({
    label: t(`services.serviceTypes.${key}`, t(`serviceTypes.${key}`, key)),
    value: key,
  }));

  const pickImage = async (type) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t("settings.permissions.title"),
          t("settings.permissions.message"),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === "nationalId") setNationalIdFile(result.assets[0]);
        else if (type === "commercialRecord")
          setCommercialRecordFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("settings.imagePickError"));
    }
  };

  const deleteExisting = (field) => {
    Alert.alert(
      t("settings.serviceDetails.confirmDeleteTitle", "Delete document?"),
      t("settings.serviceDetails.confirmDeleteMsg", "This cannot be undone."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            setDeletingField(field);
            try {
              await usersApi.deleteVendorImage(field);
              toast.success(
                t("settings.imagesAndPricing.deleted", "Image deleted")
              );
              if (onRefetch) onRefetch();
            } catch (err) {
              toast.error(
                err.message ||
                  t(
                    "settings.imagesAndPricing.deleteFailed",
                    "Failed to delete image"
                  )
              );
            } finally {
              setDeletingField(null);
            }
          },
        },
      ]
    );
  };

  const onSubmit = (formValues) => {
    const submitData = {
      serviceDescription: formValues.serviceDescription,
      taglineAr: formValues.taglineAr,
      taglineEn: formValues.taglineEn,
      aboutAr: formValues.aboutAr,
      aboutEn: formValues.aboutEn,
      nationalId: formValues.nationalId,
    };
    if (Array.isArray(serviceCategories) && serviceCategories.length > 0) {
      submitData.serviceCategories =
        buildServiceCategoriesPayload(serviceCategories);
    }

    // Pass administrative location cleanly
    const loc = formValues.serviceLocation || methods.getValues("serviceLocation");
    if (loc) {
      const sanitizedLocation = {};
      const regionId = Number(loc.regionId);
      const cityId = Number(loc.cityId);
      if (Number.isFinite(regionId)) sanitizedLocation.regionId = regionId;
      if (Number.isFinite(cityId)) sanitizedLocation.cityId = cityId;
      if (typeof loc.regionNameAr === "string" && loc.regionNameAr)
        sanitizedLocation.regionNameAr = loc.regionNameAr;
      if (typeof loc.regionNameEn === "string" && loc.regionNameEn)
        sanitizedLocation.regionNameEn = loc.regionNameEn;
      if (typeof loc.cityNameAr === "string" && loc.cityNameAr)
        sanitizedLocation.cityNameAr = loc.cityNameAr;
      if (typeof loc.cityNameEn === "string" && loc.cityNameEn)
        sanitizedLocation.cityNameEn = loc.cityNameEn;
      if (Array.isArray(loc.districtIds)) {
        const ids = loc.districtIds
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n));
        if (ids.length) sanitizedLocation.districtIds = ids;
      }
      if (Array.isArray(loc.districtNames) && loc.districtNames.length) {
        sanitizedLocation.districtNames = loc.districtNames;
      }
      if (["region", "city", "districts"].includes(loc.coverageType)) {
        sanitizedLocation.coverageType = loc.coverageType;
      }
      if (Object.keys(sanitizedLocation).length) {
        submitData.serviceLocation = sanitizedLocation;
      }
    }

    if (nationalIdFile) submitData.nationalIdImage = nationalIdFile;
    if (commercialRecordFile)
      submitData.commercialRecordImage = commercialRecordFile;
    onSave(submitData);
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.serviceDetails.title")}
          </Text>
          <Text style={styles.sectionDescription}>
            {t("settings.serviceDetails.subtitle")}
          </Text>

          <View style={styles.inputGroup}>
            <TextAreaInput
              name="serviceDescription"
              label={t("settings.serviceDetails.description")}
              placeholder={t("settings.serviceDetails.descriptionPlaceholder")}
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput name="taglineAr" label={t("settings.serviceDetails.taglineAr", "النبذة القصيرة بالعربية")} maxLength={160} />
            <TextInput name="taglineEn" label={t("settings.serviceDetails.taglineEn", "Short tagline in English")} maxLength={160} autoCapitalize="sentences" />
            <TextAreaInput name="aboutAr" label={t("settings.serviceDetails.aboutAr", "نبذة تفصيلية بالعربية")} numberOfLines={5} maxLength={2000} />
            <TextAreaInput name="aboutEn" label={t("settings.serviceDetails.aboutEn", "Detailed description in English")} numberOfLines={5} maxLength={2000} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("settings.serviceDetails.categories")}
            </Text>
            <View style={styles.categoriesContainer}>
              {categoryOptions.map((opt) => {
                const selected =
                  Array.isArray(serviceCategories) &&
                  serviceCategories.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.categoryChip,
                      selected && styles.categoryChipSelected,
                    ]}
                    onPress={() => {
                      setServiceCategories((prev) => {
                        const arr = Array.isArray(prev) ? prev : [];
                        return selected
                          ? arr.filter((v) => v !== opt.value)
                          : [...arr, opt.value];
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("settings.serviceDetails.location")}
            </Text>
            <LocationSelector basePath="serviceLocation" />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="nationalId"
              label={t("settings.serviceDetails.nationalId")}
              placeholder={t("settings.serviceDetails.nationalIdPlaceholder")}
              keyboardType="numeric"
            />
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("settings.serviceDetails.nationalIdImage")}
            </Text>
            <DocumentTile
              existingUri={existingNationalId}
              newFile={nationalIdFile}
              onPick={() => pickImage("nationalId")}
              onClearNew={() => setNationalIdFile(null)}
              onDeleteExisting={() => deleteExisting("nationalIdImage")}
              isDeleting={deletingField === "nationalIdImage"}
              pickLabel={t("settings.uploadImage")}
              changeLabel={t("settings.changeImage")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("settings.serviceDetails.commercialRecord")}
            </Text>
            <DocumentTile
              existingUri={existingCommercial}
              newFile={commercialRecordFile}
              onPick={() => pickImage("commercialRecord")}
              onClearNew={() => setCommercialRecordFile(null)}
              onDeleteExisting={() => deleteExisting("commercialRecordImage")}
              isDeleting={deletingField === "commercialRecordImage"}
              pickLabel={t("settings.uploadImage")}
              changeLabel={t("settings.changeImage")}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              text={t("settings.saveChanges")}
              onPress={methods.handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#888",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  imageUploadButton: {
    borderWidth: 1.5,
    borderColor: "#c28e5c",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#fef9f5",
  },
  imageUploadText: {
    color: "#c28e5c",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  docTile: {
    position: "relative",
    alignSelf: "flex-start",
  },
  docImage: {
    width: 140,
    height: 100,
    borderRadius: 10,
  },
  docTileOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(194, 142, 92, 0.8)",
    paddingVertical: 4,
    alignItems: "center",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  docTileOverlayText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
  },
  docRemove: {
    position: "absolute",
    top: -8,
    end: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#c0392b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  docRemoveText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e0d5c9",
    backgroundColor: "#fff",
  },
  categoryChipSelected: {
    backgroundColor: "#c28e5c",
    borderColor: "#c28e5c",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#2c2c2c",
    fontFamily: "Cairo_600SemiBold",
  },
  categoryChipTextSelected: { color: "#fff" },
  buttonContainer: {
    marginTop: 16,
  },
});

export default ServiceDetailsForm;
