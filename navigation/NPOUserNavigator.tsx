// navigation/NPOUserNavigator.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

// ── Tab Screens ───────────────────────────────────────────────────────────────
import ActivePickupsScreen      from '../screens/npo_user/ActivePickupsScreen';
import OperationsMapScreen      from '../screens/npo_user/OperationsMapScreen';
import DistributionLedgerScreen from '../screens/npo_user/DistributionLedgerScreen';
import HandoffScannerScreen     from '../screens/npo_user/HandoffScannerScreen';
import CoordinatorProfileScreen from '../screens/npo_user/CoordinatorProfileScreen';

// ── Stack-only Screens ────────────────────────────────────────────────────────
import SecuritySettingsScreen   from '../screens/npo_user/SecuritySettingsScreen';
import ReportScreen             from '../screens/npo_user/ReportScreen';
import NPONotificationsScreen   from '../screens/npo_user/NPONotificationsScreen';

// ── Type Definitions ──────────────────────────────────────────────────────────
export type NPOTabParamList = {
  Pickups: undefined;
  Map:     undefined;
  Ledger:  undefined;
  Scanner: undefined;
  Profile: undefined;
};

export type NPOStackParamList = {
  MainTabs:         undefined;
  NPOSecurity:      undefined;
  NPOReport:        undefined;
  NPONotifications: undefined;
  Profile:          undefined;
};

const Tab   = createBottomTabNavigator<NPOTabParamList>();
const Stack = createNativeStackNavigator<NPOStackParamList>();

// ── Tab config ────────────────────────────────────────────────────────────────
const TAB_CONFIG: {
  name:  keyof NPOTabParamList;
  label: string;
  icon:  React.ComponentProps<typeof Feather>['name'];
}[] = [
  { name: 'Pickups', label: 'Pickups', icon: 'truck'     },
  { name: 'Map',     label: 'Map',     icon: 'map-pin'   },
  { name: 'Ledger',  label: 'Ledger',  icon: 'file-text' },
  { name: 'Scanner', label: 'Scanner', icon: 'zap'       },
  { name: 'Profile', label: 'Profile', icon: 'user'      },
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
              backgroundColor: isFocused ? '#FB923C' : 'transparent',
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
function NPOTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Pickups" component={ActivePickupsScreen}      />
      <Tab.Screen name="Map"     component={OperationsMapScreen}      />
      <Tab.Screen name="Ledger"  component={DistributionLedgerScreen} />
      <Tab.Screen name="Scanner" component={HandoffScannerScreen}     />
      <Tab.Screen name="Profile" component={CoordinatorProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────
export default function NPOUserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"    component={NPOTabs}                />
      <Stack.Screen
        name="NPOSecurity"
        component={SecuritySettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="NPOReport"
        component={ReportScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="NPONotifications"
        component={NPONotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Profile"
        component={CoordinatorProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
