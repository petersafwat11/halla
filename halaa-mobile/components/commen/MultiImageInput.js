import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const MultiImageInput = ({
  name,
  label,
  placeholder,
  multiple = true,
  rules,
}) => {
  const { control } = useFormContext();

  const pickImages = async (onChange, currentValues) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: multiple,
      allowsEditing: !multiple,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      if (multiple) {
        const newAssets = result.assets;
        const merged = [...(currentValues || []), ...newAssets];
        onChange(merged);
      } else {
        onChange([result.assets[0]]);
      }
    }
  };

  const removeImage = (onChange, currentValues, index) => {
    const newValues = currentValues.filter((_, i) => i !== index);
    onChange(newValues.length > 0 ? newValues : []);
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const images = value || [];

        return (
          <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            {/* Image Previews */}
            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.previewList}
              >
                {images.map((img, index) => (
                  <View key={index} style={styles.previewWrapper}>
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.preview}
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(onChange, images, index)}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {multiple && (
                  <TouchableOpacity
                    style={styles.addMore}
                    onPress={() => pickImages(onChange, images)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={28}
                      color="#C28E5C"
                    />
                    <Text style={styles.addMoreText}>إضافة</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* Initial Upload Button (when no images) */}
            {images.length === 0 && (
              <TouchableOpacity
                style={[styles.picker, error && styles.pickerError]}
                onPress={() => pickImages(onChange, images)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="camera-plus-outline"
                  size={36}
                  color="#C28E5C"
                />
                <Text style={styles.placeholderText}>
                  {placeholder || (multiple ? "اختر صور" : "اختر صورة")}
                </Text>
                {multiple && (
                  <Text style={styles.subText}>يمكن اختيار أكثر من صورة</Text>
                )}
              </TouchableOpacity>
            )}

            {error && (
              <Text style={styles.errorText}>{error.message}</Text>
            )}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    borderStyle: "dashed",
    backgroundColor: "#FAFAFA",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pickerError: {
    borderColor: "#e74c3c",
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#777",
  },
  subText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#aaa",
  },
  previewList: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  previewWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  preview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  addMore: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    borderStyle: "dashed",
    backgroundColor: "#FBF5EF",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addMoreText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#C28E5C",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
});

export default MultiImageInput;
