import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TILE_SIZE = (SCREEN_WIDTH - 48 - 12) / 3;

/**
 * Unified media uploader. Picks photos OR videos in a single sheet,
 * builds FormData with the `files` field name (matching the backend
 * `multer.array("files", 20)` middleware), and renders a 3-column grid
 * of uploaded items with per-tile delete affordances.
 */
const MediaUploader = ({
  media = [],
  uploading,
  deletingMediaId,
  onPickFiles,
  onDeleteMedia,
  t,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePickByType = async (mediaTypes) => {
    setPickerOpen(false);
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("host.media.permissionRequired"),
        t("host.media.permissionMessage")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20,
    });
    if (result.canceled || !result.assets?.length) return;
    const formData = new FormData();
    result.assets.forEach((asset, index) => {
      const isVideo =
        asset.type === "video" || /video/i.test(asset.mimeType || "");
      formData.append("files", {
        uri: asset.uri,
        name:
          asset.fileName ||
          (isVideo ? `video_${index}.mp4` : `photo_${index}.jpg`),
        type:
          asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
      });
    });
    onPickFiles(formData);
  };

  const renderTile = ({ item }) => {
    const isVideo = item.type === "video";
    const uri = item.thumbnailUrl || item.url;
    return (
      <View style={styles.tileWrapper}>
        {isVideo ? (
          <View style={styles.videoTile}>
            <Ionicons name="videocam" size={28} color="#c28e5c" />
          </View>
        ) : (
          <Image source={{ uri }} style={styles.tile} />
        )}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDeleteMedia(item._id)}
          disabled={deletingMediaId === item._id}
        >
          {deletingMediaId === item._id ? (
            <ActivityIndicator size={12} color="#FFF" />
          ) : (
            <Ionicons name="close" size={12} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {pickerOpen ? (
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{t("host.media.uploadHint")}</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => handlePickByType(["images"])}
              activeOpacity={0.7}
            >
              <Ionicons name="image" size={22} color="#FFF" />
              <Text style={styles.pickerOptionText}>{t("host.media.pickPhotos")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => handlePickByType(["videos"])}
              activeOpacity={0.7}
            >
              <Ionicons name="videocam" size={22} color="#FFF" />
              <Text style={styles.pickerOptionText}>{t("host.media.pickVideos")}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setPickerOpen(false)}>
            <Text style={styles.pickerCancel}>{t("host.media.cancel")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setPickerOpen(true)}
          disabled={uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <ActivityIndicator size={14} color="#FFF" />
          ) : (
            <Ionicons name="add" size={14} color="#FFF" />
          )}
          <Text style={styles.addButtonText}>
            {uploading ? t("host.media.uploading") : t("host.media.add")}
          </Text>
        </TouchableOpacity>
      )}

      {media.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyTile}
          onPress={() => setPickerOpen(true)}
          disabled={uploading}
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={36} color="#C28E5C" />
          <Text style={styles.emptyText}>{t("host.media.empty")}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={media}
          renderItem={renderTile}
          keyExtractor={(item) => item._id}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={styles.tileRow}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#C28E5C",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  pickerSheet: {
    padding: 12,
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
    gap: 12,
  },
  pickerTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  pickerRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C28E5C",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pickerOptionText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  pickerCancel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#888",
    textAlign: "center",
    paddingVertical: 4,
  },
  tileRow: { gap: 6, marginBottom: 6 },
  tileWrapper: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  tile: { width: "100%", height: "100%", resizeMode: "cover" },
  videoTile: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5ece4",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTile: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    borderStyle: "dashed",
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#999",
  },
});

export default MediaUploader;
