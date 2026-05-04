// navigation/AdminUserNavigator.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import AdminHealthScreen         from '../screens/admin_user/AdminHealthScreen';
import AdminVerificationScreen   from '../screens/admin_user/AdminVerificationScreen';
import AdminModerationScreen     from '../screens/admin_user/AdminModerationScreen';
import AdminBroadcastsScreen     from '../screens/admin_user/AdminBroadcastsScreen';
import AdminSecurityScreen       from '../screens/admin_user/AdminSecurityScreen';
import AdminAccountsScreen       from '../screens/admin_user/AdminAccountsScreen';
import AdminNotificationsScreen  from '../screens/admin_user/AdminNotificationsScreen';
import AdminProfileScreen        from '../screens/admin_user/AdminProfileScreen';
import AdminSettingsScreen       from '../screens/admin_user/AdminSettingsScreen';

// ── Types ─────────────────────────────────────────────────────────────────────
export type AdminTabParamList = {
  Health:       undefined;
  Verify:       undefined;
  Moderate:     undefined;
  Broadcast:    undefined;
  Security:     undefined;
  Admins:       undefined;
};

export type AdminStackParamList = {
  MainTabs:           undefined;
  AdminSettings:      undefined;
  AdminProfile:       undefined;
  AdminNotifications: undefined;
};

const Tab   = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

// ── Tab config ────────────────────────────────────────────────────────────────
const TAB_CONFIG: {
  name:  keyof AdminTabParamList;
  label: string;
  icon:  React.ComponentProps<typeof Feather>['name'];
}[] = [
  { name: 'Health',    label: 'Health',    icon: 'activity'     },
  { name: 'Verify',    label: 'Verify',    icon: 'check-square' },
  { name: 'Moderate',  label: 'Moderate',  icon: 'alert-octagon'},
  { name: 'Broadcast', label: 'Broadcast', icon: 'radio'        },
  { name: 'Security',  label: 'Security',  icon: 'lock'         },
  { name: 'Admins',    label: 'Admins',    icon: 'users'        },
];

// ── Custom scrollable tab bar ─────────────────────────────────────────────────
function AdminTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={{
      position: 'absolute', bottom: 24, left: 16, right: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: '#1C3A2E', borderRadius: 28 }}
        contentContainerStyle={{
          paddingHorizontal: 8, paddingVertical: 8, gap: 4, flexDirection: 'row',
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config    = TAB_CONFIG[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress', target: route.key, canPreventDefault: true,
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
                alignItems: 'center', justifyContent: 'center',
                paddingVertical: 8, paddingHorizontal: 14,
                borderRadius: 22, minWidth: 68,
                backgroundColor: isFocused ? '#A78BFA' : 'transparent',
              }}
            >
              <Feather
                name={config.icon}
                size={19}
                color={isFocused ? '#fff' : 'rgba(255,255,255,0.38)'}
              />
              <Text style={{
                fontSize: 10, fontWeight: '600', marginTop: 3,
                color: isFocused ? '#fff' : 'rgba(255,255,255,0.38)',
              }}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}


// ── Tab navigator ─────────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Health"    component={AdminHealthScreen}       />
      <Tab.Screen name="Verify"    component={AdminVerificationScreen} />
      <Tab.Screen name="Moderate"  component={AdminModerationScreen}   />
      <Tab.Screen name="Broadcast" component={AdminBroadcastsScreen}   />
      <Tab.Screen name="Security"  component={AdminSecurityScreen}     />
      <Tab.Screen name="Admins"    component={AdminAccountsScreen}     />
    </Tab.Navigator>
  );
}

// ── Root stack ────────────────────────────────────────────────────────────────
export default function AdminUserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"           component={AdminTabs} />
      <Stack.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AdminNotifications"
        component={AdminNotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
