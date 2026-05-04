import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import HomeDashboardScreen    from '../screens/general_user/HomeDashboardScreen';
import SmartPantryScreen      from '../screens/general_user/SmartPantryScreen';
import AIRecipeScreen         from '../screens/general_user/AIRecipeScreen';
import MealPlannerScreen      from '../screens/general_user/MealPlannerScreen';
import FreshBotScreen         from '../screens/general_user/FreshBotScreen';
import DonationHubScreen      from '../screens/general_user/DonationHubScreen';
import NotificationsScreen    from '../screens/general_user/NotificationsScreen';
import ProfileScreen          from '../screens/general_user/ProfileScreen';
import SecuritySettingsScreen from '../screens/general_user/SecuritySettingsScreen';
import ReportScreen           from '../screens/general_user/ReportScreen';
import QuickAddScreen         from '../screens/general_user/QuickAddScreen';
import WasteAnalyticsScreen from '../screens/general_user/WasteAnalyticsScreen';
import ShoppingListScreen   from '../screens/general_user/ShoppingListScreen';

export type HomeTabParamList = {
  Dashboard: undefined;
  Pantry:    undefined;
  Recipes:   undefined;
  MealPlan:  undefined;
  FreshBot:  undefined;
  Donate:    undefined;  // replaces Analytics
};

export type HomeStackParamList = {
  MainTabs:         undefined;
  Notifications:    undefined;
  DonationHub:      undefined;
  Profile:          undefined;
  SecuritySettings: undefined;
  Report:           undefined;
  QuickAdd:         undefined;
  WasteAnalytics: undefined;
  ShoppingList: undefined;
};

const Tab   = createBottomTabNavigator<HomeTabParamList>();
const Stack = createNativeStackNavigator<HomeStackParamList>();

const TAB_CONFIG: {
  name:  keyof HomeTabParamList;
  label: string;
  icon:  React.ComponentProps<typeof Feather>['name'];
}[] = [
  { name: 'Dashboard', label: 'Home',     icon: 'home'           },
  { name: 'Pantry',    label: 'Pantry',   icon: 'box'            },
  { name: 'Recipes',   label: 'Recipes',  icon: 'book-open'      },
  { name: 'MealPlan',  label: 'Plan',     icon: 'calendar'       },
  { name: 'FreshBot',  label: 'FreshBot', icon: 'message-circle' },
  { name: 'Donate',    label: 'Donate',   icon: 'heart'          },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={{
      position: 'absolute',
      bottom: 20,
      left: 12,
      right: 12,
      flexDirection: 'row',
      backgroundColor: '#1C3A2E',
      borderRadius: 26,
      paddingVertical: 6,
      paddingHorizontal: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 14,
    }}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config    = TAB_CONFIG[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.75}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 7,
              borderRadius: 22,
              marginHorizontal: 2,
              backgroundColor: isFocused ? '#2D6A4F' : 'transparent',
            }}
          >
            <Feather
              name={config.icon}
              size={19}
              color={isFocused ? '#fff' : 'rgba(255,255,255,0.38)'}
            />
            <Text style={{
              fontSize: 9,
              fontWeight: '600',
              marginTop: 3,
              color: isFocused ? '#fff' : 'rgba(255,255,255,0.38)',
            }}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={HomeDashboardScreen} />
      <Tab.Screen name="Pantry"    component={SmartPantryScreen}   />
      <Tab.Screen name="Recipes"   component={AIRecipeScreen}       />
      <Tab.Screen name="MealPlan"  component={MealPlannerScreen}    />
      <Tab.Screen name="FreshBot"  component={FreshBotScreen}       />
      <Tab.Screen name="Donate"    component={DonationHubScreen}    />
    </Tab.Navigator>
  );
}

export default function HomeUserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"         component={HomeTabs}               />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}  />
      <Stack.Screen name="DonationHub"      component={DonationHubScreen}
        options={{ animation: 'slide_from_right' }}  />
      <Stack.Screen name="Profile"          component={ProfileScreen}
        options={{ animation: 'slide_from_right' }}  />
      <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen}
        options={{ animation: 'slide_from_right' }}  />
      <Stack.Screen name="Report"           component={ReportScreen}
        options={{ animation: 'slide_from_right' }}  />
      <Stack.Screen name="QuickAdd"         component={QuickAddScreen}
        options={{ animation: 'slide_from_bottom' }} />

      <Stack.Screen name="WasteAnalytics" component={WasteAnalyticsScreen}
  options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen}
        options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}