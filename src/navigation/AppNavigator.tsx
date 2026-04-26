import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeDashboardScreen from "../screens/HomeDashboardScreen";
import AddFoodScreen from "../screens/AddFoodScreen";
import InventoryScreen from "../screens/InventoryScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import SuggestionsScreen from "../screens/SuggestionsScreen";
import { requestNotificationPermission } from "../services/notificationService";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="HomeDashboard" component={HomeDashboardScreen} />
      <Stack.Screen name="AddFood" component={AddFoodScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Suggestions" component={SuggestionsScreen} />
    </Stack.Navigator>
  );
}