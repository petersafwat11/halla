import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const ServiceCard = ({
  id,
  name,
  imageUri,
  categories = [],
  price,
  isAvailable = false,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const { t } = useTranslation("vendor");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.card}>
          {/* Image Section */}
          <View style={styles.imageContainer}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons
                  name="image-off"
                  size={32}
                  color="#CCC"
                />
              </View>
            )}

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={onEdit}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={16}
                color="#C28E5C"
              />
              <Text style={styles.editText}>{t("services.edit")}</Text>
            </TouchableOpacity>
          </View>

          {/* Content Section */}
          <View style={styles.content}>
            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {name}
            </Text>

            {/* Categories/Tags */}
            {categories.length > 0 && (
              <View style={styles.categoriesContainer}>
                {categories.slice(0, 4).map((category, index) => (
                  <View key={`${id}-category-${index}`} style={styles.tag}>
                    <Text style={styles.tagText}>{category}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Bottom Section with Price and Availability */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={styles.priceContainer}
                onPress={onToggle}
                activeOpacity={0.7}
              >
                <View style={[styles.availabilityToggle, isAvailable && styles.availabilityToggleActive]}>
                  <View
                    style={[
                      styles.toggleIndicator,
                      isAvailable && styles.toggleIndicatorActive,
                    ]}
                  />
                </View>
                <Text style={styles.availabilityText}>
                  {isAvailable ? t("services.available") : t("services.unavailable")}
                </Text>
              </TouchableOpacity>

              <View style={styles.priceWithCurrency}>
                <Text style={styles.price}>{price}</Text>
                <MaterialCommunityIcons
                  name="currency-rial"
                  size={24}
                  color="#2C2C2C"
                />
              </View>
            </View>

            {/* Delete Button */}
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={onDelete}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={16}
                  color="#E74C3C"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  cardTouchable: {
    borderRadius: 12,
    overflow: "hidden",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 160,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  editText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  content: {
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#333",
    lineHeight: 20,
    letterSpacing: 0.035,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 16,
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  availabilityToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EA",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  availabilityToggleActive: {
    backgroundColor: "#C28E5C",
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
  },
  toggleIndicatorActive: {
    alignSelf: "flex-end",
  },
  availabilityText: {
    fontSize: 16,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  priceWithCurrency: {
    flexDirection: "row",
    direction: "ltr",
    alignItems: "center",
    gap: 4,
  },
  price: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#333",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  deleteButton: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: 4,
  },
});

export default ServiceCard;
