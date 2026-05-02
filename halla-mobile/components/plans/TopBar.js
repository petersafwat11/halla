import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const TopBar = ({
  title,
  showBack = false,
  onBack,
  rightContent = null,
  leftContent = null,
}) => {
  const navigation = useNavigation();
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderLeft = () => {
    if (showBack) {
      return (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            style={{ transform: [{ rotate: "180deg" }] }}
            name="chevron-back"
            size={24}
            color="#F9F4EF"
          />
        </TouchableOpacity>
      );
    }

    if (leftContent) {
      return <View style={styles.leftCustom}>{leftContent}</View>;
    }

    return <View style={styles.placeholder} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C28E5C" />

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {renderLeft()}
        </View>
        {rightContent ? (
          <View style={styles.rightContent}>{rightContent}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#C28E5C",
    paddingTop: StatusBar.currentHeight || 0,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    height: 57,
    width: "100%",
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 24,
    height: 24,
  },
  leftCustom: {
    minWidth: 24,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rightContent: {
    minWidth: 24,
    alignItems: "flex-end",
  },
  titleContainer: {
    // flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  reminderButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reminderText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#FFF",
  },
});

export default TopBar;
