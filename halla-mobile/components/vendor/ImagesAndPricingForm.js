import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useTranslation } from "../../localization/hooks/useTranslation";
import { useToast } from "../../contexts/ToastContext";
import Button from "../commen/Button";
import { usersApi } from "../../hooks/users/_api";

/**
 * Extract the S3 key from a backend-signed URL.
 * Backend serves images as `https://bucket.s3.region.amazonaws.com/<key>?X-Amz-…`
 * — the path between the host and `?` is the key, which DELETE needs.
 */
const keyFromSignedUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const path = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
};

const ImageGridItem = React.memo(({ uri, onRemove, deleting }) => (
  <View style={styles.imageItem}>
    <Image source={{ uri }} style={styles.image} />
    <TouchableOpacity
      style={styles.removeButton}
      onPress={onRemove}
      disabled={deleting}
    >
      {deleting ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.removeButtonText}>{"✕"}</Text>
      )}
    </TouchableOpacity>
  </View>
));

/**
 * Images & Pricing form.
 *
 * `data.portfolioImages` and `data.pricePackages` are arrays of signed URLs
 * (server-side state). Newly-picked files live in `newPortfolioFiles` and
 * `newPriceFiles` until the user saves. Deletes hit the server directly via
 * DELETE /users/profile/vendorData/image and then ask the parent to refetch.
 */
const ImagesAndPricingForm = ({ data, onSave, onRefetch, loading }) => {
  const { t } = useTranslation("vendor");
  const toast = useToast();

  const existingPortfolio = data?.portfolioImages || [];
  const existingPricing = data?.pricePackages || [];

  const [newPortfolioFiles, setNewPortfolioFiles] = useState([]);
  const [newPriceFiles, setNewPriceFiles] = useState([]);
  const [deletingUrl, setDeletingUrl] = useState(null);

  useEffect(() => {
    setNewPortfolioFiles([]);
    setNewPriceFiles([]);
  }, [data?.portfolioImages, data?.pricePackages]);

  const pickImages = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("settings.permissions.title"),
          t("settings.permissions.message")
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        if (type === "portfolio") {
          setNewPortfolioFiles((prev) => [...prev, ...result.assets]);
        } else if (type === "pricing") {
          setNewPriceFiles((prev) => [...prev, ...result.assets]);
        }
      }
    } catch (_err) {
      Alert.alert(t("common.error"), t("settings.imagePickError"));
    }
  };

  const removeNewFile = (type, index) => {
    if (type === "portfolio") {
      setNewPortfolioFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setNewPriceFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const deleteExistingImage = async (field, url) => {
    const key = keyFromSignedUrl(url);
    if (!key) {
      toast.error(t("settings.imagesAndPricing.deleteFailed", "Failed to delete image"));
      return;
    }
    Alert.alert(
      t("settings.imagesAndPricing.confirmDeleteTitle", "Delete image?"),
      t("settings.imagesAndPricing.confirmDeleteMsg", "This cannot be undone."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            setDeletingUrl(url);
            try {
              await usersApi.deleteVendorImage(field, key);
              toast.success(t("settings.imagesAndPricing.deleted", "Image deleted"));
              onRefetch && onRefetch();
            } catch (err) {
              toast.error(
                err.message ||
                  t("settings.imagesAndPricing.deleteFailed", "Failed to delete image")
              );
            } finally {
              setDeletingUrl(null);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    const submitData = {};
    if (newPortfolioFiles.length > 0) {
      submitData.portfolioImages = newPortfolioFiles;
    }
    if (newPriceFiles.length > 0) {
      submitData.pricePackages = newPriceFiles;
    }
    if (Object.keys(submitData).length === 0) return;
    onSave(submitData);
  };

  const renderExistingRow = (images, field) => (
    <FlatList
      data={images}
      keyExtractor={(url, idx) => `${field}-existing-${idx}-${url}`}
      renderItem={({ item }) => (
        <ImageGridItem
          uri={item}
          onRemove={() => deleteExistingImage(field, item)}
          deleting={deletingUrl === item}
        />
      )}
      numColumns={3}
      columnWrapperStyle={styles.imageGrid}
      scrollEnabled={false}
    />
  );

  const renderNewRow = (assets, type) => (
    <FlatList
      data={assets}
      keyExtractor={(asset, idx) => `${type}-new-${idx}-${asset.uri}`}
      renderItem={({ item, index }) => (
        <ImageGridItem
          uri={item.uri}
          onRemove={() => removeNewFile(type, index)}
        />
      )}
      numColumns={3}
      columnWrapperStyle={styles.imageGrid}
      scrollEnabled={false}
    />
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("settings.imagesAndPricing.title")}
        </Text>
        <Text style={styles.sectionDescription}>
          {t("settings.imagesAndPricing.description")}
        </Text>

        <View style={styles.subsection}>
          <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionTitle}>
              {t("settings.imagesAndPricing.portfolioImages")}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => pickImages("portfolio")}
            >
              <Text style={styles.addButtonText}>
                + {t("settings.addImages")}
              </Text>
            </TouchableOpacity>
          </View>

          {existingPortfolio.length > 0 && renderExistingRow(existingPortfolio, "portfolioImages")}
          {newPortfolioFiles.length > 0 && renderNewRow(newPortfolioFiles, "portfolio")}
          {existingPortfolio.length === 0 && newPortfolioFiles.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyText}>
                {t("settings.imagesAndPricing.noPortfolioImages")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.subsection}>
          <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionTitle}>
              {t("settings.imagesAndPricing.pricePackages")}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => pickImages("pricing")}
            >
              <Text style={styles.addButtonText}>
                + {t("settings.addImages")}
              </Text>
            </TouchableOpacity>
          </View>

          {existingPricing.length > 0 && renderExistingRow(existingPricing, "pricePackages")}
          {newPriceFiles.length > 0 && renderNewRow(newPriceFiles, "pricing")}
          {existingPricing.length === 0 && newPriceFiles.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>
                {t("settings.imagesAndPricing.noPricePackages")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            text={t("settings.saveChanges")}
            onPress={handleSubmit}
            loading={loading}
            disabled={
              loading ||
              (newPortfolioFiles.length === 0 && newPriceFiles.length === 0)
            }
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  subsection: { marginBottom: 24 },
  subsectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
  },
  addButton: {
    borderWidth: 1.5,
    borderColor: "#c28e5c",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#fef9f5",
  },
  addButtonText: {
    color: "#c28e5c",
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
  },
  imageGrid: {
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  imageItem: {
    width: "31%",
    aspectRatio: 1,
    position: "relative",
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#f9f4ef",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f0ebe5",
    borderStyle: "dashed",
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#999",
  },
  buttonContainer: { marginTop: 16 },
});

export default ImagesAndPricingForm;
