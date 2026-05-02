import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import { useTranslation } from "../../localization";

const { width, height } = Dimensions.get("window");

const Welcome = ({ onLogin, onSignup }) => {
  const { t, isRTL } = useTranslation("welcome");
  const slides = t("slides", { returnObjects: true });

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (currentIndex === slides.length - 1) {
      // Last slide, trigger signup
      onSignup && onSignup();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (currentIndex === 0) {
      // First slide, can go back or login
      onLogin && onLogin();
    }
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{slides[currentIndex]?.title}</Text>
      <Text style={styles.description}>
        {slides[currentIndex]?.description}
      </Text>

      <View style={styles.dots}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleDotClick(index)}
            style={[
              styles.dot,
              currentIndex === index && styles.activeDot,
              { marginHorizontal: 5 },
            ]}
          />
        ))}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.prevButton} onPress={handlePrev}>
          <Text style={styles.prevButtonText}>
            {currentIndex !== slides.length - 1
              ? t("buttons.previous")
              : t("buttons.login")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          {currentIndex !== slides.length - 1 ? (
            // <Text style={styles.nextButtonText}>←</Text>
            <View style={styles.arrowLeft}>
              <Image
                source={require("../../assets/home/arrow-left.png")}
                style={styles.arrowLeftIcon}
              />
            </View>
          ) : (
            <Text style={styles.nextButtonText}>{t("buttons.newUser")}</Text>
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
    elevation: 8, // for Android shadow
    position: "relative",
    zIndex: 1,
    width: "88%",
  },
  title: {
    color: "#2c2c2c",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 24,
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
  nextButton: {
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#c28e5c",
    minWidth: 56,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    padding: 10,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: 0.08,
    fontFamily: "Cairo_600SemiBold",
  },
  prevButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#fff",
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
  arrowLeft: {
    width: 56,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#c28e5c",
  },
  arrowLeftIcon: {
    width: 24,
    height: 24,
  },
});

export default Welcome;
