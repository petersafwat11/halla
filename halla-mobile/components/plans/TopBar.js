import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, typography } from "../../styles/tokens";

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
          hitSlop={{ top: spacing[8], bottom: spacing[8], left: spacing[8], right: spacing[8] }}
        >
          <Ionicons
            name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
            size={24}
            color={colors.primary[50]}
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[500]} />

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
    backgroundColor: colors.primary[500],
    paddingTop: StatusBar.currentHeight || 0,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[8],
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
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[10],
  },
  title: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
  },
});

export default TopBar;
