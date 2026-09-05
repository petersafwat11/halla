import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../../stores/authStore";
import { canViewPage, PAGES } from "../../../utils/adminPermissions";
import { colors, backgrounds, textStyles } from "../../../styles/tokens";
import { useTranslation } from "../../../localization";
import DirectionalIonicon from "../../../components/common/DirectionalIonicon";

const MENU_ITEMS = [
  {
    key: PAGES.BUSINESSES,
    labelKey: "more.businesses",
    icon: "briefcase-outline",
    screen: "AdminBusinessesList",
  },
  {
    key: PAGES.PAYMENTS,
    labelKey: "more.payments",
    icon: "card-outline",
    screen: "AdminPayments",
  },
  {
    key: PAGES.MODERATORS,
    labelKey: "more.moderators",
    icon: "shield-outline",
    screen: "AdminModeratorsList",
  },
  {
    key: PAGES.VENDORS,
    labelKey: "more.vendors",
    icon: "storefront-outline",
    screen: "AdminVendorsList",
  },
  {
    key: PAGES.PLANS,
    labelKey: "more.plans",
    icon: "cube-outline",
    screen: "AdminPlans",
  },
  {
    key: PAGES.DISCOUNTS,
    labelKey: "more.discounts",
    icon: "pricetag-outline",
    screen: "AdminDiscounts",
  },
  {
    key: PAGES.CUSTOM_DESIGNS,
    labelKey: "more.customDesigns",
    icon: "color-palette-outline",
    screen: "AdminCustomDesigns",
  },
  {
    key: PAGES.SETTINGS,
    labelKey: "more.settings",
    icon: "settings-outline",
    screen: "AdminSettings",
  },
];

const AdminMoreScreen = ({ navigation }) => {
  const { t } = useTranslation("admin");
  const { user } = useAuthStore();
  const userRole = user?.role;

  const visibleItems = MENU_ITEMS.filter((item) =>
    canViewPage(userRole, item.key)
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("more.title")}</Text>
      </View>
      <ScrollView style={styles.container}>
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.labelKey}
            style={styles.menuItem}
            onPress={() => item.params ? navigation.navigate(item.screen, item.params) : navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={colors.primary[500]}
                />
              </View>
              <Text style={styles.menuItemLabel}>{t(item.labelKey)}</Text>
            </View>
            <DirectionalIonicon
              name="chevron-forward"
              size={20}
              color={colors.natural[350]}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgrounds.card[8],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: backgrounds.card[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.primary[500],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.natural[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemLabel: {
    ...textStyles.bodyLarge,
    color: colors.secondary[800],
    fontFamily: "Cairo_600SemiBold",
  },
});

export default AdminMoreScreen;