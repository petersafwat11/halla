import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const ImageInput = ({ name, label, placeholder, rules }) => {
  const { control } = useFormContext();

  const pickImage = async (onChange) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      onChange({
        uri: asset.uri,
        type: asset.mimeType || asset.type || null,
        fileName: asset.fileName || asset.uri?.split("/").pop() || null,
        width: asset.width,
        height: asset.height,
      });
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={styles.container}>
          {label && <Text style={styles.label}>{label}</Text>}
          <TouchableOpacity
            style={[styles.picker, error && styles.pickerError]}
            onPress={() => pickImage(onChange)}
            activeOpacity={0.7}
          >
            {value?.uri ? (
              <Image source={{ uri: value.uri }} style={styles.preview} />
            ) : (
              <View style={styles.placeholderContainer}>
                <MaterialCommunityIcons
                  name="camera-plus-outline"
                  size={32}
                  color="#C28E5C"
                />
                <Text style={styles.placeholderText}>
                  {placeholder || "اختر صورة"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error.message}</Text>}
        </View>
      )}
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
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    borderStyle: "dashed",
    backgroundColor: "#FAFAFA",
    height: 160,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerError: {
    borderColor: "#e74c3c",
  },
  preview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderContainer: {
    alignItems: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#999",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
});

export default ImageInput;
