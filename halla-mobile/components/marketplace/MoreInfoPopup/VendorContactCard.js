import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";

const VendorContactCard = ({ vendor }) => {
  const { t } = useTranslation("marketplace");

  const handleCall = (phone) => Linking.openURL(`tel:${phone}`);
  const handleEmail = (email) => Linking.openURL(`mailto:${email}`);
  const handleWebsite = (url) => Linking.openURL(url);

  if (!vendor.location && !vendor.website && !vendor.email && !vendor.phone) {
    return null;
  }

  return (
    <View style={styles.contactSection}>
      <Text style={styles.contactTitle}>{t("vendor.contactInfo")}</Text>
      <View style={styles.contactList}>
        {vendor.location && (
          <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
            <Ionicons name="location-outline" size={16} color="#737373" />
            <Text style={styles.contactText}>{vendor.location}</Text>
          </TouchableOpacity>
        )}
        {vendor.website && (
          <TouchableOpacity style={styles.contactItem} onPress={() => handleWebsite(vendor.website)} activeOpacity={0.7}>
            <Ionicons name="globe-outline" size={16} color="#737373" />
            <Text style={styles.contactText}>{vendor.website}</Text>
          </TouchableOpacity>
        )}
        {vendor.email && (
          <TouchableOpacity style={styles.contactItem} onPress={() => handleEmail(vendor.email)} activeOpacity={0.7}>
            <Ionicons name="mail-outline" size={16} color="#737373" />
            <Text style={styles.contactText}>{vendor.email}</Text>
          </TouchableOpacity>
        )}
        {vendor.phone && (
          <TouchableOpacity style={styles.contactItem} onPress={() => handleCall(vendor.phone)} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={16} color="#737373" />
            <Text style={[styles.contactText, { writingDirection: "ltr" }]}>{`‪${vendor.phone}‬`}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contactSection: { gap: 8 },
  contactTitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#262626",
    lineHeight: 20,
  },
  contactList: { gap: 12 },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#656565",
    lineHeight: 16,
  },
});

export default VendorContactCard;
