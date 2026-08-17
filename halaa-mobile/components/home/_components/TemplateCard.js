import React from "react";
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";

const CARD_WIDTH = 123;

export default function TemplateCard({
  template,
  index,
  scrollX,
  cardSpacing,
  isSelected,
  onPress,
}) {
  const inputRange = [
    (index - 1) * (CARD_WIDTH + cardSpacing),
    index * (CARD_WIDTH + cardSpacing),
    (index + 1) * (CARD_WIDTH + cardSpacing),
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.9, 1, 0.9],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.7, 1, 0.7],
    extrapolate: "clamp",
  });

  // Prefer the full rendered preview (with the invitation text baked in) over
  // the bare thumbnail/background — this is what web shows.
  const imgUri = template.imageUrl || template.thumbnailUrl;
  const imgSource = template.src || (imgUri ? { uri: imgUri } : null);

  return (
    <TouchableOpacity onPress={() => onPress(template)} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale }], opacity },
          isSelected && styles.cardSelected,
        ]}
      >
        <View style={styles.background}>
          {imgSource ? (
            <Image
              source={imgSource}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <View style={styles.checkmarkContainer}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 164,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: "#C28E5C",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  background: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#FFFAEA",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: "#F2ECD8",
  },
  selectedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(194, 142, 92, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
});
