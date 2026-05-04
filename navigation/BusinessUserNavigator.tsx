// navigation/BusinessUserNavigator.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

// ── Tab Screens ───────────────────────────────────────────────────────────────
import BusinessNotificationsScreen from '../screens/business_user/BusinessNotificationsScreen';
import AnalyticsScreen from '../screens/business_user/AnalyticsScreen';
import DonateScreen    from '../screens/business_user/DonateScreen';
import PickupsScreen   from '../screens/business_user/PickupsScreen';
import HistoryScreen   from '../screens/business_user/HistoryScreen';
import ProfileScreen   from '../screens/business_user/ProfileScreen';


// ── Stack-only Screens ────────────────────────────────────────────────────────
import SecurityScreen  from '../screens/business_user/SecurityScreen';
import ReportScreen    from '../screens/business_user/ReportScreen';

// ── Type Definitions ──────────────────────────────────────────────────────────
export type BusinessTabParamList = {
  Dashboard: undefined;
  Donate:    undefined;
  Pickups:   undefined;
  History:   undefined;
  Profile:   undefined;
};

export type BusinessStackParamList = {
  MainTabs:               undefined;
  BusinessSecurity:       undefined;
  BusinessReport:         undefined;
  BusinessNotifications:  undefined;
};

const Tab   = createBottomTabNavigator<BusinessTabParamList>();
const Stack = createNativeStackNavigator<BusinessStackParamList>();

// ── Tab config ────────────────────────────────────────────────────────────────
const TAB_CONFIG: {
  name: keyof BusinessTabParamList;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  { name: 'Dashboard', label: 'Dashboard', icon: 'bar-chart-2' },
  { name: 'Donate',    label: 'Donate',    icon: 'plus-circle' },
  { name: 'Pickups',   label: 'Pickups',   icon: 'truck'       },
  { name: 'History',   label: 'History',   icon: 'clock'       },
  { name: 'Profile',   label: 'Profile',   icon: 'user'        },
];

// ── Custom Tab Bar ────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={{
      position: 'absolute',
      bottom: 24, left: 16, right: 16,
      flexDirection: 'row',
      backgroundColor: '#1C3A2E',
      borderRadius: 28,
      paddingHorizontal: 8,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
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
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: 22,
              backgroundColor: isFocused ? '#2D6A4F' : 'transparent',
            }}
          >
            <Feather
              name={config.icon}
              size={20}
              color={isFocused ? '#fff' : 'rgba(255,255,255,0.38)'}
            />
            <Text style={{
              fontSize: 10,
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

// ── Tab Navigator ─────────────────────────────────────────────────────────────
function BusinessTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={AnalyticsScreen} />
      <Tab.Screen name="Donate"    component={DonateScreen}    />
      <Tab.Screen name="Pickups"   component={PickupsScreen}   />
      <Tab.Screen name="History"   component={HistoryScreen}   />
      <Tab.Screen name="Profile"   component={ProfileScreen}   />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────
export default function BusinessUserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BusinessTabs} />
      <Stack.Screen
        name="BusinessSecurity"
        component={SecurityScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BusinessReport"
        component={ReportScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen 
        name="BusinessNotifications" 
        component={BusinessNotificationsScreen} 
        options={{ animation: 'slide_from_right' }} 
      />
    </Stack.Navigator>
  );
}