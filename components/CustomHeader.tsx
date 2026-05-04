// components/CustomHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSignOut } from '../context/SignOutContext';

type Props = {
  settingsScreen?:      string;
  profileScreen?:       string;
  profileTab?:          string;   // use instead of profileScreen when profile is a bottom tab
  notificationsScreen?: string;
};

export default function CustomHeader({
  settingsScreen      = 'SecuritySettings',
  profileScreen       = 'Profile',
  profileTab,
  notificationsScreen = 'Notifications',
}: Props) {
  const navigation = useNavigation<any>();
  const signOut    = useSignOut();

  return (
    <SafeAreaView edges={['top']} style={styles.headerArea}>
      <View style={styles.headerContent}>

        {/* Logo */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })}
          activeOpacity={0.7}
        >
          <View style={styles.logoBox}>
            <Image source={require('../assets/Logo.jpeg')} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.headerTitle}>
            Fresh<Text style={styles.headerTitleHighlight}>Loop</Text>
          </Text>
        </TouchableOpacity>

        {/* Icons */}
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate(settingsScreen)}
          >
            <Feather name="settings" size={15} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              profileTab
                ? navigation.navigate('MainTabs', { screen: profileTab })
                : navigation.navigate(profileScreen)
            }
          >
            <Feather name="user" size={15} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate(notificationsScreen)}
          >
            <Feather name="bell" size={15} color="rgba(255,255,255,0.8)" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={signOut}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={15} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

      </View>
      <View style={styles.headerDivider} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerArea:             { backgroundColor: '#1C3A2E' },
  headerContent:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  logoRow:                { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  logoBox:                { width: 40, height: 40, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(134,239,172,0.3)' },
  logoImage:              { width: '100%', height: '100%' },
  headerTitle:            { color: '#fff', fontSize: 21, fontWeight: '800', letterSpacing: -0.6 },
  headerTitleHighlight:   { color: '#4ADE80' },
  headerIcons:            { flexDirection: 'row', gap: 6 },
  iconBtn:                { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  notificationDot:        { position: 'absolute', top: 7, right: 7, width: 7, height: 7, backgroundColor: '#F97316', borderRadius: 4, borderWidth: 1.5, borderColor: '#1C3A2E' },
  headerDivider:          { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
});