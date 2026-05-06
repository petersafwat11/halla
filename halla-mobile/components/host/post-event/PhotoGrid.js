import React from "react";
import { View, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 12) / 3;

const PhotoGrid = ({ photos, deletingPhotoId, onDeletePhoto }) => {
  const renderPhoto = ({ item }) => (
    <View style={styles.photoWrapper}>
      <Image source={{ uri: item.content?.url || item.url }} style={styles.photo} />
      <TouchableOpacity
        style={styles.deletePhotoBtn}
        onPress={() => onDeletePhoto(item._id)}
        disabled={deletingPhotoId === item._id}
      >
        {deletingPhotoId === item._id ? (
          <ActivityIndicator size={12} color="#FFF" />
        ) : (
          <Ionicons name="close" size={12} color="#FFF" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={photos}
      renderItem={renderPhoto}
      keyExtractor={(item) => item._id}
      numColumns={3}
      scrollEnabled={false}
      columnWrapperStyle={styles.photoRow}
    />
  );
};

export const EmptyPhotoPlaceholder = ({ onPress, disabled }) => (
  <TouchableOpacity
    style={styles.emptyPhotos}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Ionicons name="images-outline" size={36} color="#C28E5C" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  photoRow: { gap: 6, marginBottom: 6 },
  photoWrapper: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8,
    overflow: "hidden", position: "relative",
  },
  photo: { width: "100%", height: "100%", resizeMode: "cover" },
  deletePhotoBtn: {
    position: "absolute", top: 4, right: 4, width: 20, height: 20,
    borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  emptyPhotos: {
    height: 100, justifyContent: "center", alignItems: "center",
    backgroundColor: "#F9F4EF", borderRadius: 8, borderWidth: 1,
    borderColor: "#E8D4C4", borderStyle: "dashed", gap: 8,
  },
});

export default PhotoGrid;
