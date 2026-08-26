import React, { useState, useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View, StyleSheet, Text, Alert } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { useWizardNavigationGuardStore } from "../stores/wizardNavigationGuardStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminNavigator from "./AdminNavigator";
import { useTranslation } from "../localization";
import { colors, backgrounds } from "../styles/tokens";
import {
  loadOnboardingSeen,
  saveOnboardingSeen,
} from "../services/secureStorage";

// Import screen components
import WelcomeWrapper from "../components/welcom/WelcomeWrapper";
import HomeScreen from "../screens/host/HomeScreen";
import VendorHomeScreen from "../screens/vendor/VendorHomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import ForgetPasswordScreen from "../screens/auth/ForgetPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import PlansScreen from "../screens/host/PlansScreen";
import BusinessPlansScreen from "../screens/host/BusinessPlansScreen";
import PlansSummaryScreen from "../screens/host/PlansSummaryScreen";
import AddonsPurchaseScreen from "../screens/host/AddonsPurchaseScreen";
import SettingsScreen from "../screens/host/SettingsScreen";
import AccountSettingsScreen from "../screens/host/AccountSettingsScreen";
import NotificationSettingsScreen from "../screens/common/NotificationSettingsScreen";
import PrivacyScreen from "../screens/legal/PrivacyScreen";
import TermsScreen from "../screens/legal/TermsScreen";
import CommunityRulesScreen from "../screens/legal/CommunityRulesScreen";
import RefundScreen from "../screens/legal/RefundScreen";
import DeletionScreen from "../screens/legal/DeletionScreen";
import SupportScreen from "../screens/legal/SupportScreen";
import TicketsScreen from "../screens/common/TicketsScreen";
import Marketplace from "../screens/common/Marketplace";
import VendorPublicProfileScreen from "../screens/common/VendorPublicProfileScreen";
import EventsScreen from "../screens/host/EventsScreen";
import CreateEventScreen from "../screens/common/CreateEventScreen";
import EventDetailsScreen from "../screens/common/EventDetailsScreen";
import UpdateEventScreen from "../screens/common/update-event/UpdateEventScreen";
import NotificationsScreen from "../screens/common/NotificationsScreen";
import VendorServicesScreen from "../screens/vendor/VendorServicesScreen";

import VendorSettingsScreen from "../screens/vendor/VendorSettingsScreen";
import VendorAccountSetupScreen from "../screens/vendor/VendorAccountSetupScreen";
import VendorSignupScreen from "../screens/auth/VendorSignupScreen";
import PostEventScreen from "../screens/host/PostEventScreen";
import StaffPortalScreen from "../screens/common/StaffPortalScreen";
import ManagePostEventScreen from "../screens/common/ManagePostEventScreen";
import PaymentReturnScreen from "../screens/host/PaymentReturnScreen";
import PaymentsScreen from "../screens/host/PaymentsScreen";
import InvitationScreen from "../screens/guest-portal/InvitationScreen";
import ForcePasswordChangeScreen from "../screens/host/ForcePasswordChangeScreen";
import CompleteProfileScreen from "../screens/auth/CompleteProfileScreen";
import DirectionVisualTestScreen from "../screens/dev/DirectionVisualTestScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const SettingsStackNav = createStackNavigator();
const VendorSettingsStackNav = createStackNavigator();
const HomeStackNav = createStackNavigator();
const VendorHomeStackNav = createStackNavigator();
const MarketplaceStackNav = createStackNavigator();
const HostEventsStackNav = createStackNavigator();

// Plans tab — branches on account type.
function PlansTabScreen() {
  const isBusiness = useAuthStore((state) => state.isBusiness());
  return isBusiness ? <BusinessPlansScreen /> : <PlansScreen />;
}

// Settings Stack (nested inside tabs to keep bottom navbar visible)
function SettingsStackNavigator() {
  return (
    <SettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStackNav.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStackNav.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <SettingsStackNav.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <SettingsStackNav.Screen name="Privacy" component={PrivacyScreen} />
      <SettingsStackNav.Screen name="Terms" component={TermsScreen} />
      <SettingsStackNav.Screen name="CommunityRules" component={CommunityRulesScreen} />
      <SettingsStackNav.Screen name="Refund" component={RefundScreen} />
      <SettingsStackNav.Screen name="Deletion" component={DeletionScreen} />
      <SettingsStackNav.Screen name="Support" component={SupportScreen} />
    </SettingsStackNav.Navigator>
  );
}

// Vendor Settings Stack (nested inside tabs to keep bottom navbar visible)
function VendorSettingsStackNavigator() {
  return (
    <VendorSettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <VendorSettingsStackNav.Screen name="VendorSettingsMain" component={VendorSettingsScreen} />
      <VendorSettingsStackNav.Screen name="VendorAccountSetup" component={VendorAccountSetupScreen} />
      <VendorSettingsStackNav.Screen name="Privacy" component={PrivacyScreen} />
      <VendorSettingsStackNav.Screen name="Terms" component={TermsScreen} />
      <VendorSettingsStackNav.Screen name="CommunityRules" component={CommunityRulesScreen} />
      <VendorSettingsStackNav.Screen name="Refund" component={RefundScreen} />
      <VendorSettingsStackNav.Screen name="Deletion" component={DeletionScreen} />
      <VendorSettingsStackNav.Screen name="Support" component={SupportScreen} />
    </VendorSettingsStackNav.Navigator>
  );
}

// Home/Marketplace stacks nested inside the tabs so screens pushed from them
// keep the bottom tab bar visible.
function HostHomeStackNavigator() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStackNav.Navigator>
  );
}

function VendorHomeStackNavigator() {
  return (
    <VendorHomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <VendorHomeStackNav.Screen name="VendorHomeMain" component={VendorHomeScreen} />
      <VendorHomeStackNav.Screen name="Notifications" component={NotificationsScreen} />
    </VendorHomeStackNav.Navigator>
  );
}

function MarketplaceStackNavigator() {
  return (
    <MarketplaceStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MarketplaceStackNav.Screen name="MarketplaceMain" component={Marketplace} />
      <MarketplaceStackNav.Screen name="VendorPublicProfile" component={VendorPublicProfileScreen} />
    </MarketplaceStackNav.Navigator>
  );
}

function HostEventsStackNavigator() {
  return (
    <HostEventsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HostEventsStackNav.Screen name="EventsList" component={EventsScreen} />
      <HostEventsStackNav.Screen name="CreateEventScreen" component={CreateEventScreen} />
      <HostEventsStackNav.Screen name="EventDetails" component={EventDetailsScreen} />
      <HostEventsStackNav.Screen name="UpdateEventScreen" component={UpdateEventScreen} />
      <HostEventsStackNav.Screen name="ManagePostEvent" component={ManagePostEventScreen} />
    </HostEventsStackNav.Navigator>
  );
}

// Host Tab Navigator (for authenticated hosts)
function HostTabNavigator() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const { isDirty, discard, clearGuard } = useWizardNavigationGuardStore();

  const leaveWizard = (navigation, event, destination, nestedScreen) => {
    const navigate = () => {
      discard?.();
      clearGuard();
      if (nestedScreen) {
        navigation.navigate(destination, { screen: nestedScreen });
      } else {
        navigation.navigate(destination);
      }
    };

    if (isDirty) {
      event.preventDefault();
      Alert.alert(
        t("unsavedChanges.title", { defaultValue: "Unsaved changes" }),
        t("unsavedChanges.message", {
          defaultValue: "Discard the information you entered and leave this page?",
        }),
        [
          {
            text: t("unsavedChanges.keepEditing", { defaultValue: "Keep editing" }),
            style: "cancel",
          },
          {
            text: t("unsavedChanges.discard", { defaultValue: "Discard" }),
            style: "destructive",
            onPress: navigate,
          },
        ]
      );
      return;
    }

    if (nestedScreen) {
      event.preventDefault();
      navigation.navigate(destination, { screen: nestedScreen });
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Events") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Tickets") {
            iconName = focused ? "ticket" : "ticket-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else if (route.name === "Plans") {
            iconName = focused ? "pricetag" : "pricetag-outline";
          } else if (route.name === "Marketplace") {
            iconName = focused ? "storefront" : "storefront-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.natural[350],
        tabBarStyle: {
          backgroundColor: backgrounds.card[1],
          borderTopColor: colors.natural[200],
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Cairo_500Medium",
        },
        // Hide tabs while the keyboard is open (blueprint §7) so form space
        // is not consumed and the bar never competes with the keyboard.
        tabBarHideOnKeyboard: true,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HostHomeStackNavigator}
        options={{ tabBarLabel: t("navigation.home") }}
        listeners={({ navigation }) => ({
          tabPress: (event) => leaveWizard(navigation, event, "Home"),
        })}
      />
      <Tab.Screen
        name="Events"
        component={HostEventsStackNavigator}
        options={{ tabBarLabel: t("navigation.events") }}
        listeners={({ navigation }) => ({
          tabPress: (event) =>
            leaveWizard(navigation, event, "Events", "EventsList"),
        })}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceStackNavigator}
        options={{ tabBarLabel: t("navigation.marketplace") }}
        listeners={({ navigation }) => ({
          tabPress: (event) =>
            leaveWizard(navigation, event, "Marketplace", "MarketplaceMain"),
        })}
      />
      <Tab.Screen
        name="Plans"
        component={PlansTabScreen}
        options={{ tabBarLabel: t("navigation.plans") }}
        listeners={({ navigation }) => ({
          tabPress: (event) => leaveWizard(navigation, event, "Plans"),
        })}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ tabBarLabel: t("navigation.tickets") }}
        listeners={({ navigation }) => ({
          tabPress: (event) => leaveWizard(navigation, event, "Tickets"),
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ tabBarLabel: t("navigation.settings") }}
        listeners={({ navigation }) => ({
          tabPress: (event) => leaveWizard(navigation, event, "Settings"),
        })}
      />
    </Tab.Navigator>
  );
}

// Vendor Tab Navigator (for authenticated vendors)
function VendorTabNavigator() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "VendorHome") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Tickets") {
            iconName = focused ? "ticket" : "ticket-outline";
          } else if (route.name === "Marketplace") {
            iconName = focused ? "storefront" : "storefront-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.natural[350],
        tabBarStyle: {
          backgroundColor: backgrounds.card[1],
          borderTopColor: colors.natural[200],
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Cairo_500Medium",
        },
        // Hide tabs while the keyboard is open (blueprint §7).
        tabBarHideOnKeyboard: true,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="VendorHome"
        component={VendorHomeStackNavigator}
        options={{ tabBarLabel: t("navigation.home") }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ tabBarLabel: t("navigation.tickets") }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceStackNavigator}
        options={{ tabBarLabel: t("navigation.marketplace") }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate("Marketplace", { screen: "MarketplaceMain" });
          },
        })}
      />
      <Tab.Screen
        name="Settings"
        component={VendorSettingsStackNavigator}
        options={{ tabBarLabel: t("navigation.settings") }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator (for unauthenticated users)
function AuthStack() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [skipOnboarding, setSkipOnboarding] = useState(false);

  useEffect(() => {
    loadOnboardingSeen().then((seen) => {
      setSkipOnboarding(seen);
      setOnboardingChecked(true);
    });
  }, []);

  const handleOnboardingDone = (navigation) => {
    saveOnboardingSeen();
    navigation.navigate("Login");
  };

  if (!onboardingChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={skipOnboarding ? "Login" : "Welcome"}
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <WelcomeWrapper
            onSkip={() => handleOnboardingDone(navigation)}
            onLogin={() => handleOnboardingDone(navigation)}
            onSignup={() => {
              saveOnboardingSeen();
              navigation.reset({ index: 0, routes: [{ name: "Signup" }] });
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VendorSignup" component={VendorSignupScreen} />
      <Stack.Screen name="PostEvent" component={PostEventScreen} />
      <Stack.Screen name="StaffPortal" component={StaffPortalScreen} />
      {/* Guest invitation & marketplace — public, deep-linkable.
          No auth required for guest viewing and public contact actions. */}
      <Stack.Screen name="Invitation" component={InvitationScreen} />
      <Stack.Screen name="Marketplace" component={Marketplace} />
      <Stack.Screen name="VendorPublicProfile" component={VendorPublicProfileScreen} />
      <Stack.Screen name="DirectionVisualTest" component={DirectionVisualTestScreen} />
    </Stack.Navigator>
  );
}

// Host Stack Navigator (for authenticated hosts)
function HostStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={HostTabNavigator} />
      <Stack.Screen name="PlansSummary" component={PlansSummaryScreen} />
      <Stack.Screen name="AddonsPurchase" component={AddonsPurchaseScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PostEvent" component={PostEventScreen} />
      <Stack.Screen name="Invitation" component={InvitationScreen} />
      <Stack.Screen name="PaymentReturn" component={PaymentReturnScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="VendorPublicProfile" component={VendorPublicProfileScreen} />
    </Stack.Navigator>
  );
}

// Vendor Stack Navigator (for authenticated vendors)
function VendorStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={VendorTabNavigator} />
      <Stack.Screen name="VendorServices" component={VendorServicesScreen} />
      <Stack.Screen name="VendorSettings" component={VendorSettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Invitation" component={InvitationScreen} />
      <Stack.Screen name="VendorPublicProfile" component={VendorPublicProfileScreen} />
    </Stack.Navigator>
  );
}

// Admin Stack Navigator (for authenticated admins/moderators)
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={AdminNavigator} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Invitation" component={InvitationScreen} />
    </Stack.Navigator>
  );
}

// Forced password-change gate.
function ForcePasswordChangeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ForcePasswordChange"
        component={ForcePasswordChangeScreen}
      />
    </Stack.Navigator>
  );
}

// Profile-completion gate for host accounts after OTP
function CompleteProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CompleteProfile"
        component={CompleteProfileScreen}
      />
    </Stack.Navigator>
  );
}

// Root Navigator - switches between Auth and role-based stacks based on auth status
export default function AppNavigator() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);

  // Show loading while checking auth status
  if (status === "checking") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Show auth stack if not authenticated
  if (status !== "authenticated") {
    return <AuthStack />;
  }

  if (user?.mustChangePassword === true) {
    return <ForcePasswordChangeStack />;
  }

  if (role === "host" && user?.roleData?.profileCompleted === false) {
    return <CompleteProfileStack />;
  }

  // Show appropriate stack based on user role
  switch (role) {
    case "host":
      return <HostStack />;
    case "vendor":
      return <VendorStack />;
    case "super_admin":
    case "admin":
    case "moderator":
      return <AdminStack />;
    default:
      console.error("Unsupported account role:", role);
      return (
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.error?.[500] || "#dc2626", textAlign: "center", padding: 24 }}>
            Unsupported account type — please contact support.
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
