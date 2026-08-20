import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTranslation } from "../../localization";
import DirectionalIonicon from "../common/DirectionalIonicon";

const Welcome = ({ onLogin, onSignup }) => {
  const { t } = useTranslation("welcome");
  const slides = t("slides", { returnObjects: true }) || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const totalSlides = Array.isArray(slides) ? slides.length : 0;
  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === totalSlides - 1;

  const handleNext = () => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (isLastSlide) {
      onSignup && onSignup();
    }
  };

  const handlePrevOrLogin = () => {
    if (isFirstSlide || isLastSlide) {
      onLogin && onLogin();
    } else {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  const secondaryLabel =
    isFirstSlide || isLastSlide
      ? t("buttons.login")
      : t("buttons.previous");

  const primaryLabel = isLastSlide
    ? t("buttons.newUser")
    : t("buttons.next");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{slides[currentIndex]?.title}</Text>
      <Text style={styles.description}>
        {slides[currentIndex]?.description}
      </Text>

      <View style={styles.dots}>
        {Array.from({ length: totalSlides }).map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleDotClick(index)}
            accessibilityRole="button"
            accessibilityLabel={`Slide ${index + 1}`}
            style={[
              styles.dot,
              currentIndex === index && styles.activeDot,
              { marginHorizontal: 5 },
            ]}
          />
        ))}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.prevButton}
          onPress={handlePrevOrLogin}
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
        >
          <Text style={styles.prevButtonText}>{secondaryLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
        >
          <Text style={styles.nextButtonText}>{primaryLabel}</Text>
          {!isLastSlide && (
            <DirectionalIonicon
              name="chevron-forward"
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -15,
    },
    shadowOpacity: 0.04,
    shadowRadius: 47,
    elevation: 8,
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    color: "#2c2c2c",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Cairo_700Bold",
  },
  description: {
    color: "#2c2c2c",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "Cairo_400Regular",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.3,
    backgroundColor: "#c28e5c",
  },
  activeDot: {
    opacity: 1,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  prevButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 48,
  },
  prevButtonText: {
    color: "#6b4e33",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: 0.08,
    textAlign: "center",
    fontFamily: "Cairo_600SemiBold",
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#c28e5c",
    minHeight: 48,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: 0.08,
    fontFamily: "Cairo_600SemiBold",
  },
});

export default Welcome;
