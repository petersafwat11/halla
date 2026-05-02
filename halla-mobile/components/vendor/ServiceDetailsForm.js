import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { useTranslation } from "../../localization/hooks/useTranslation";
import TextInput from "../commen/TextInput";
import TextAreaInput from "../commen/TextAreaInput";
import DropdownInput from "../commen/DropdownInput";
import Button from "../commen/Button";
import MapPicker from "../commen/MapPicker";
import * as ImagePicker from "expo-image-picker";

const ServiceDetailsForm = ({ data, onSave, loading }) => {
  const { t } = useTranslation("vendor");
  const methods = useForm({
    defaultValues: {
      serviceDescription: data?.serviceDescription || "",
      nationalId: data?.nationalId || "",
      serviceCategories: data?.serviceCategories || [],
      serviceLocation: data?.serviceLocation || { address: "", coordinates: null },
    },
  });
  const [nationalIdImage, setNationalIdImage] = useState(data?.nationalIdImage || null);
  const [commercialRecordImage, setCommercialRecordImage] = useState(data?.commercialRecordImage || null);
  const [nationalIdFile, setNationalIdFile] = useState(null);
  const [commercialRecordFile, setCommercialRecordFile] = useState(null);

  useEffect(() => {
    methods.reset({
      serviceDescription: data?.serviceDescription || "",
      nationalId: data?.nationalId || "",
      serviceCategories: data?.serviceCategories || [],
      serviceLocation: data?.serviceLocation || { address: "", coordinates: null },
    });
    setNationalIdImage(data?.nationalIdImage || null);
    setCommercialRecordImage(data?.commercialRecordImage || null);
    setNationalIdFile(null);
    setCommercialRecordFile(null);
  }, [data?.serviceDescription, data?.nationalId]);

  const categoryOptions = [
    { label: t("categories.photography"), value: "photography" },
    { label: t("categories.catering"), value: "catering" },
    { label: t("categories.decoration"), value: "decoration" },
    { label: t("categories.entertainment"), value: "entertainment" },
    { label: t("categories.venue"), value: "venue" },
    { label: t("categories.planning"), value: "planning" },
  ];

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === "nationalId") {
          setNationalIdImage(result.assets[0].uri);
          setNationalIdFile(result.assets[0]);
        } else if (type === "commercialRecord") {
          setCommercialRecordImage(result.assets[0].uri);
          setCommercialRecordFile(result.assets[0]);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("common.error"), t("settings.imagePickError"));
    }
  };

  const onSubmit = (formValues) => {
    const submitData = { ...formValues };
    if (nationalIdFile) submitData.nationalIdImage = nationalIdFile;
    if (commercialRecordFile) submitData.commercialRecordImage = commercialRecordFile;
    onSave(submitData);
  };

  return (
    <FormProvider {...methods}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
            <DropdownInput
              name="serviceCategories"
              label={t("settings.serviceDetails.categories")}
              options={categoryOptions}
              placeholder={t("settings.serviceDetails.categoriesPlaceholder")}
              multiple
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("settings.serviceDetails.location")}
            </Text>
            <MapPicker name="serviceLocation" />
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
            <TouchableOpacity
              style={styles.imageUploadButton}
              onPress={() => pickImage("nationalId")}
            >
              <Text style={styles.imageUploadText}>
                {nationalIdImage
                  ? t("settings.changeImage")
                  : t("settings.uploadImage")}
              </Text>
            </TouchableOpacity>
            {nationalIdImage && (
              <Text style={styles.imageSelectedText}>
                ✓ {t("settings.imageSelected")}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("settings.serviceDetails.commercialRecord")}
            </Text>
            <TouchableOpacity
              style={styles.imageUploadButton}
              onPress={() => pickImage("commercialRecord")}
            >
              <Text style={styles.imageUploadText}>
                {commercialRecordImage
                  ? t("settings.changeImage")
                  : t("settings.uploadImage")}
              </Text>
            </TouchableOpacity>
            {commercialRecordImage && (
              <Text style={styles.imageSelectedText}>
                ✓ {t("settings.imageSelected")}
              </Text>
            )}
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
      </ScrollView>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  imageSelectedText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#4CAF50",
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 16,
  },
});

export default ServiceDetailsForm;
