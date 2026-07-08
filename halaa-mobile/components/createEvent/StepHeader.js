import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Svg, Circle, G, Path, Defs, ClipPath, Rect } from "react-native-svg";

const StepProgressIndicator = ({ currentStep, totalSteps }) => {
  const progress = (currentStep / totalSteps) * 100;
  const rotation = (progress / 100) * 360;

  return (
    <View style={styles.indicatorContainer}>
      <Svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <G clipPath="url(#clip0)">
          <Path
            d="M0 22C0 9.84974 9.84974 0 22 0C34.1503 0 44 9.84974 44 22C44 34.1503 34.1503 44 22 44C9.84974 44 0 34.1503 0 22ZM40.04 22C40.04 12.0368 31.9632 3.96 22 3.96C12.0368 3.96 3.96 12.0368 3.96 22C3.96 31.9632 12.0368 40.04 22 40.04C31.9632 40.04 40.04 31.9632 40.04 22Z"
            fill="#F5ECE4"
          />
          <Path
            d="M22 1.98C22 0.886478 22.8883 -0.00924683 23.9774 0.0890388C26.1886 0.288593 28.3608 0.822098 30.419 1.67465C33.0882 2.78025 35.5135 4.40076 37.5564 6.44365C39.5992 8.48654 41.2197 10.9118 42.3254 13.581C43.1779 15.6392 43.7114 17.8114 43.911 20.0226C44.0092 21.1117 43.1135 22 42.02 22C40.9265 22 40.0512 21.1109 39.9314 20.024C39.7451 18.3332 39.3203 16.674 38.6668 15.0964C37.7602 12.9077 36.4314 10.919 34.7562 9.24379C33.081 7.56863 31.0923 6.23981 28.9036 5.33321C27.326 4.67975 25.6668 4.25487 23.976 4.06855C22.8891 3.94877 22 3.07352 22 1.98Z"
            fill="#C28E5C"
            transform={`rotate(${rotation} 22 22)`}
          />
        </G>
        <Defs>
          <ClipPath id="clip0">
            <Rect
              width="44"
              height="44"
              fill="white"
              transform="matrix(-1 0 0 -1 44 44)"
            />
          </ClipPath>
        </Defs>
      </Svg>
      <Text style={styles.indicatorText}>
        {currentStep}/{totalSteps}
      </Text>
    </View>
  );
};

const StepHeader = ({ currentStep, totalSteps, title, description }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <StepProgressIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  textContainer: {
    // flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
    // alignItems: "flex-start",
  },
  title: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.024,
  },
  description: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
  },
  indicatorContainer: {
    width: 45,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  indicatorText: {
    position: "absolute",
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
    lineHeight: 20,
    letterSpacing: 0.014,
  },
});

export default StepHeader;
