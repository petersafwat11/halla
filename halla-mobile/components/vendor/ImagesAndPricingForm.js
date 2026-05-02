import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
} from "react-native";
import { useTranslation } from "../../localization/hooks/useTranslation";
import Button from "../commen/Button";
import * as ImagePicker from "expo-image-picker";

const ImagesAndPricingForm = ({ data, onSave, loading }) => {
  const { t } = useTranslation("vendor");
  const [portfolioImages, setPortfolioImages] = useState(
    data?.portfolioImages || [],
  );
  const [pricePackages, setPricePackages] = useState(data?.pricePackages || []);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState([]);
  const [newPriceFiles, setNewPriceFiles] = useState([]);

  const pickImages = async (type) => {
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
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        if (type === "portfolio") {
          const newImages = result.assets.map((asset) => asset.uri);
          setPortfolioImages((prev) => [...prev, ...newImages]);
          setNewPortfolioFiles((prev) => [...prev, ...result.assets]);
        } else if (type === "pricing") {
          const newImages = result.assets.map((asset) => asset.uri);
          setPricePackages((prev) => [...prev, ...newImages]);
          setNewPriceFiles((prev) => [...prev, ...result.assets]);
        }
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert(t("common.error"), t("settings.imagePickError"));
    }
  };

  const existingPortfolioCount = data?.portfolioImages?.length || 0;
  const existingPriceCount = data?.pricePackages?.length || 0;

  const removeImage = (type, index) => {
    if (type === "portfolio") {
      setPortfolioImages((prev) => prev.filter((_, i) => i !== index));
      const newFileIndex = index - existingPortfolioCount;
      if (newFileIndex >= 0) {
        setNewPortfolioFiles((prev) => prev.filter((_, i) => i !== newFileIndex));
      }
    } else if (type === "pricing") {
      setPricePackages((prev) => prev.filter((_, i) => i !== index));
      const newFileIndex = index - existingPriceCount;
      if (newFileIndex >= 0) {
        setNewPriceFiles((prev) => prev.filter((_, i) => i !== newFileIndex));
      }
    }
  };

  const handleSubmit = () => {
    const submitData = {};

    if (newPortfolioFiles.length > 0) {
      submitData.portfolioImages = newPortfolioFiles;
    }

    if (newPriceFiles.length > 0) {
      submitData.pricePackages = newPriceFiles;
    }

    onSave(submitData);
  };

  const renderImageItem =
    (type) =>
    ({ item, index }) => (
      <View style={styles.imageItem}>
        <Image source={{ uri: item }} style={styles.image} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeImage(type, index)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
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

        {/* Portfolio Images */}
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

          {portfolioImages.length > 0 ? (
            <FlatList
              data={portfolioImages}
              renderItem={renderImageItem("portfolio")}
              keyExtractor={(item, index) => `portfolio-${index}`}
              numColumns={3}
              columnWrapperStyle={styles.imageGrid}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyText}>
                {t("settings.imagesAndPricing.noPortfolioImages")}
              </Text>
            </View>
          )}
        </View>

        {/* Price Packages */}
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

          {pricePackages.length > 0 ? (
            <FlatList
              data={pricePackages}
              renderItem={renderImageItem("pricing")}
              keyExtractor={(item, index) => `pricing-${index}`}
              numColumns={3}
              columnWrapperStyle={styles.imageGrid}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>
                {t("settings.imagesAndPricing.noPricePackages")}
              </Text>
            </View>
          )}
        </View>

        {/* Save Button */}
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
  subsection: {
    marginBottom: 24,
  },
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
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#999",
  },
  buttonContainer: {
    marginTop: 16,
  },
});

export default ImagesAndPricingForm;
