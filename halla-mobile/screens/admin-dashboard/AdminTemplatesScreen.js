import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../localization";

export default function AdminTemplatesScreen() {
  const { t } = useTranslation("admin");
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("templates.list.pageTitle")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFF",
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
});
