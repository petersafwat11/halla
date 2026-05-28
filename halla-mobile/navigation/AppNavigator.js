import React, { useState, useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { useAuthStore } from "../stores/authStore";
import AdminNavigator from "./AdminNavigator";
import { useTranslation } from "../localization";
import { colors, backgrounds } from "../styles/tokens";
import {
  loadOnboardingSeen,
  saveOnboardingSeen,
} from "../services/secureStorage";

// Import your screen components here
import WelcomeWrapper from "../components/welcom/WelcomeWrapper";
import HomeScreen from "../screens/host/HomeScreen";
import VendorHomeScreen from "../screens/vendor/VendorHomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import ForgetPasswordScreen from "../screens/auth/ForgetPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import PlansScreen from "../screens/host/PlansScreen";
import PlansSummaryScreen from "../screens/host/PlansSummaryScreen";
import SettingsScreen from "../screens/host/SettingsScreen";
import AccountSettingsScreen from "../screens/host/AccountSettingsScreen";
import NotificationSettingsScreen from "../screens/common/NotificationSettingsScreen";
import TicketsScreen from "../screens/common/TicketsScreen";
import Marketplace from "../screens/common/Marketplace";
import EventsScreen from "../screens/host/EventsScreen";
import CreateEventScreen from "../screens/common/CreateEventScreen";
import EventDetailsScreen from "../screens/common/EventDetailsScreen";
// Phase 4d W1-MOBILE-UPDATE: single unified update wizard for every
// role. The legacy `screens/host/UpdateEventScreen.js` is now a thin
// re-export shim for any other import paths still in flight.
import UpdateEventScreen from "../screens/common/update-event/UpdateEventScreen";
import NotificationsScreen from "../screens/common/NotificationsScreen";
import VendorServicesScreen from "../screens/vendor/VendorServicesScreen";

import VendorSettingsScreen from "../screens/vendor/VendorSettingsScreen";
import VendorAccountSetupScreen from "../screens/vendor/VendorAccountSetupScreen";
import VendorSignupScreen from "../screens/auth/VendorSignupScreen";
import WhitelabelSignupScreen from "../screens/auth/WhitelabelSignupScreen";
import PostEventScreen from "../screens/host/PostEventScreen";
import StaffPortalScreen from "../screens/common/StaffPortalScreen";
import ManagePostEventScreen from "../screens/common/ManagePostEventScreen";
import PaymentReturnScreen from "../screens/host/PaymentReturnScreen";
import PaymentsScreen from "../screens/host/PaymentsScreen";
import SetupPasswordScreen from "../screens/auth/SetupPasswordScreen";
import InvitationScreen from "../screens/guest-portal/InvitationScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const SettingsStackNav = createStackNavigator();
const VendorSettingsStackNav = createStackNavigator();

// Settings Stack (nested inside tabs to keep bottom navbar visible)
function SettingsStackNavigator() {
  return (
    <SettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStackNav.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStackNav.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <SettingsStackNav.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </SettingsStackNav.Navigator>
  );
}

// Vendor Settings Stack (nested inside tabs to keep bottom navbar visible)
function VendorSettingsStackNavigator() {
  return (
    <VendorSettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <VendorSettingsStackNav.Screen name="VendorSettingsMain" component={VendorSettingsScreen} />
      <VendorSettingsStackNav.Screen name="VendorAccountSetup" component={VendorAccountSetupScreen} />
    </VendorSettingsStackNav.Navigator>
  );
}

// Host Tab Navigator (for authenticated hosts)
function HostTabNavigator() {
  const { t } = useTranslation("common");

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
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Cairo_500Medium",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t("navigation.home") }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ tabBarLabel: t("navigation.events") }}
      />
      <Tab.Screen
        name="Marketplace"
        component={Marketplace}
        options={{ tabBarLabel: t("navigation.marketplace") }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansScreen}
        options={{ tabBarLabel: t("navigation.plans") }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ tabBarLabel: t("navigation.tickets") }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ tabBarLabel: t("navigation.settings") }}
      />
    </Tab.Navigator>
  );
}

// Vendor Tab Navigator (for authenticated vendors)
function VendorTabNavigator() {
  const { t } = useTranslation("common");

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
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Cairo_500Medium",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="VendorHome"
        component={VendorHomeScreen}
        options={{ tabBarLabel: t("navigation.home") }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ tabBarLabel: t("navigation.tickets") }}
      />
      <Tab.Screen
        name="Marketplace"
        component={Marketplace}
        options={{ tabBarLabel: t("navigation.marketplace") }}
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
              navigation.navigate("Signup");
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VendorSignup" component={VendorSignupScreen} />
      <Stack.Screen name="WhitelabelSignup" component={WhitelabelSignupScreen} />
      <Stack.Screen name="PostEvent" component={PostEventScreen} />
      <Stack.Screen name="StaffPortal" component={StaffPortalScreen} />
      {/* Phase 4 W3-WL — also reachable via halla://setup-password/<token> */}
      <Stack.Screen name="SetupPassword" component={SetupPasswordScreen} />
      {/* Whitelabel guest invitation — public, deep-linkable via
          halla://invitation/<code>. No auth required; the invitation
          code itself is the proof of identity. */}
      <Stack.Screen name="Invitation" component={InvitationScreen} />
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
      <Stack.Screen name="CreateEventScreen" component={CreateEventScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="UpdateEventScreen" component={UpdateEventScreen} />
      <Stack.Screen name="PlansSummary" component={PlansSummaryScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PostEvent" component={PostEventScreen} />
      <Stack.Screen name="ManagePostEvent" component={ManagePostEventScreen} />
      <Stack.Screen name="Invitation" component={InvitationScreen} />
      <Stack.Screen name="PaymentReturn" component={PaymentReturnScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
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
    </Stack.Navigator>
  );
}

// Admin Stack Navigator (for authenticated admins/moderators/whitelabel)
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

// Root Navigator - switches between Auth and role-based stacks based on auth status
export default function AppNavigator() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);

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

  // Show appropriate stack based on user role
  switch (role) {
    case "host":
      return <HostStack />;
    case "vendor":
      return <VendorStack />;
    case "super_admin":
    case "admin":
    case "moderator":
    case "whitelabel_admin":
    case "whitelabel_moderator":
      return <AdminStack />;
    default:
      // FLOW-05-F03: never silently route to HostStack. An unmapped role is
      // a real bug — surface it instead of pretending the user is a host.
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
