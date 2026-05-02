import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";

import AddFoodScreen from "../screens/AddFoodScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import CreateDonationScreen from "../screens/CreateDonationScreen";
import DonationsListScreen from "../screens/DonationsListScreen";
import FreshBotScreen from "../screens/FreshBotScreen";
import HomeDashboardScreen from "../screens/HomeDashboardScreen";
import InventoryScreen from "../screens/InventoryScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ReportScreen from "../screens/ReportScreen";
import RoleSetupScreen from "../screens/RoleSetupScreen";
import SetupProfileScreen from "../screens/SetupProfileScreen";
import SuggestionsScreen from "../screens/SuggestionsScreen";
import { requestNotificationPermission } from "../services/notificationService";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  useEffect(() => {
    requestNotificationPermission().catch(console.warn);
  }, []);

  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="HomeDashboard" component={HomeDashboardScreen} />
      <Stack.Screen name="AddFood" component={AddFoodScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Suggestions" component={SuggestionsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="CreateDonation" component={CreateDonationScreen} />
      <Stack.Screen name="DonationsList" component={DonationsListScreen} />
      <Stack.Screen name="FreshBot" component={FreshBotScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      <Stack.Screen name="RoleSetup" component={RoleSetupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SetupProfile" component={SetupProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}