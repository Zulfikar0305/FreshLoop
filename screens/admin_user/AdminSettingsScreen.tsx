// screens/admin_user/AdminSettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useSignOut } from '../../context/SignOutContext';
import { useAuth } from '../../context/AuthContext';
import { C } from './adminTypes';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

type SettingRowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
};

function SettingRow({ icon, iconColor, iconBg, label, sub, onPress, rightElement, isLast }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[s.row, !isLast && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
    >
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <Feather name="chevron-right" size={16} color="#CBD5E1" /> : null)}
    </TouchableOpacity>
  );
}

export default function AdminSettingsScreen() {
  const navigation   = useNavigation<any>();
  const signOut      = useSignOut();
  const { session }  = useAuth();

  const [notifVerify,    setNotifVerify]    = useState(true);
  const [notifModerate,  setNotifModerate]  = useState(true);
  const [notifSecurity,  setNotifSecurity]  = useState(true);
  const [notifSystem,    setNotifSystem]    = useState(false);
  const [darkMode,       setDarkMode]       = useState(false);
  const [compactView,    setCompactView]    = useState(false);

  useEffect(() => {
    if (!session?.userId) return;
    getDoc(doc(db, 'adminSettings', session.userId)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (typeof d.notifVerify   === 'boolean') setNotifVerify(d.notifVerify);
      if (typeof d.notifModerate === 'boolean') setNotifModerate(d.notifModerate);
      if (typeof d.notifSecurity === 'boolean') setNotifSecurity(d.notifSecurity);
      if (typeof d.notifSystem   === 'boolean') setNotifSystem(d.notifSystem);
      if (typeof d.compactView   === 'boolean') setCompactView(d.compactView);
    }).catch(() => {});
  }, [session?.userId]);

  const toggle = (val: boolean, setter: (v: boolean) => void, key: string) => {
    if (!session?.userId) return;
    const next = !val;
    setter(next);
    setDoc(doc(db, 'adminSettings', session.userId), { [key]: next }, { merge: true }).catch(() => {});
  };

  return (
    <View style={s.root}>
      <CustomHeader
        settingsScreen="AdminSettings"
        profileScreen="AdminProfile"
        notificationsScreen="AdminNotifications"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Settings</Text>

        {/* Notification preferences */}
        <Text style={s.sectionTitle}>NOTIFICATION PREFERENCES</Text>
        <View style={s.card}>
          <SettingRow
            icon="check-square" iconColor="#2D6A4F" iconBg="rgba(45,106,79,0.1)"
            label="Verification alerts"
            sub="New business / NPO submissions"
            rightElement={<Switch value={notifVerify}   onValueChange={() => toggle(notifVerify,   setNotifVerify,   'notifVerify')}   trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }} thumbColor="#fff" />}
          />
          <SettingRow
            icon="alert-octagon" iconColor="#EF4444" iconBg="rgba(239,68,68,0.1)"
            label="Moderation alerts"
            sub="Disputes and reported content"
            rightElement={<Switch value={notifModerate} onValueChange={() => toggle(notifModerate, setNotifModerate, 'notifModerate')} trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }} thumbColor="#fff" />}
          />
          <SettingRow
            icon="lock" iconColor="#7C3AED" iconBg="rgba(124,58,237,0.1)"
            label="Security events"
            sub="New sessions and admin changes"
            rightElement={<Switch value={notifSecurity} onValueChange={() => toggle(notifSecurity, setNotifSecurity, 'notifSecurity')} trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }} thumbColor="#fff" />}
          />
          <SettingRow
            icon="cpu" iconColor="#F59E0B" iconBg="rgba(245,158,11,0.1)"
            label="System notifications"
            sub="App crashes and system issues"
            isLast
            rightElement={<Switch value={notifSystem}   onValueChange={() => toggle(notifSystem,   setNotifSystem,   'notifSystem')}   trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }} thumbColor="#fff" />}
          />
        </View>

        {/* Display */}
        <Text style={s.sectionTitle}>DISPLAY</Text>
        <View style={s.card}>
          <SettingRow
            icon="moon" iconColor="#475569" iconBg="rgba(71,85,105,0.1)"
            label="Dark mode"
            sub="Coming soon"
            rightElement={<Switch value={darkMode}     onValueChange={() => toggle(darkMode,     setDarkMode,     'darkMode')}     trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }} thumbColor="#fff" disabled />}
          />
          <SettingRow
            icon="list" iconColor="#0284C7" iconBg="rgba(2,132,199,0.1)"
            label="Compact view"
            sub="Show more items per screen"
            isLast
            rightElement={<Switch value={compactView}  onValueChange={() => toggle(compactView,  setCompactView,  'compactView')}  trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }} thumbColor="#fff" />}
          />
        </View>

        {/* Admin account */}
        <Text style={s.sectionTitle}>ADMIN ACCOUNT</Text>
        <View style={s.card}>
          <SettingRow
            icon="user" iconColor="#1C3A2E" iconBg="rgba(28,58,46,0.1)"
            label="View Profile"
            onPress={() => navigation.navigate('AdminProfile')}
          />
          <SettingRow
            icon="lock" iconColor="#7C3AED" iconBg="rgba(124,58,237,0.1)"
            label="Security & 2FA"
            onPress={() => Alert.alert('Security', 'Navigate to the Security tab in the admin dashboard to manage sessions and passwords.')}
          />
          <SettingRow
            icon="users" iconColor="#2D6A4F" iconBg="rgba(45,106,79,0.1)"
            label="Manage Admin Accounts"
            onPress={() => Alert.alert('Admin Accounts', 'Navigate to the Admins tab in the dashboard to create or revoke admin accounts.')}
            isLast
          />
        </View>

        {/* Data & privacy */}
        <Text style={s.sectionTitle}>DATA & PRIVACY</Text>
        <View style={s.card}>
          <SettingRow
            icon="download" iconColor="#0284C7" iconBg="rgba(2,132,199,0.1)"
            label="Export audit log"
            sub="Download platform activity as CSV"
            onPress={() => Alert.alert('Export', 'Audit log export will be emailed to your admin address.')}
          />
          <SettingRow
            icon="trash-2" iconColor="#EF4444" iconBg="rgba(239,68,68,0.1)"
            label="Clear notification history"
            onPress={() => Alert.alert('Clear', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Done', 'Notification history cleared.') },
            ])}
            isLast
          />
        </View>

        {/* About */}
        <Text style={s.sectionTitle}>ABOUT</Text>
        <View style={s.card}>
          <SettingRow
            icon="info" iconColor="#64748B" iconBg="rgba(100,116,139,0.1)"
            label="App version"
            sub="FreshLoop Admin v1.0.0"
            rightElement={<Text style={{ fontSize: 12, color: '#94A3B8' }}>1.0.0</Text>}
          />
          <SettingRow
            icon="file-text" iconColor="#64748B" iconBg="rgba(100,116,139,0.1)"
            label="Terms & Conditions"
            onPress={() => Alert.alert('Terms', 'Terms and conditions apply.')}
          />
          <SettingRow
            icon="shield" iconColor="#64748B" iconBg="rgba(100,116,139,0.1)"
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy', 'Privacy policy applies.')}
            isLast
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={s.signOutBtn}
          onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
          ])}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={16} color="#EF4444" />
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#E2EBE1' },
  scroll:      { padding: 20, paddingBottom: 130 },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5, marginBottom: 20 },
  sectionTitle:{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10 },
  card:        { backgroundColor: '#fff', borderRadius: 18, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  row:         { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowIcon:     { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowLabel:    { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  rowSub:      { fontSize: 11, color: '#94A3B8' },
  signOutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 18, borderWidth: 1, borderColor: '#FEE2E2' },
  signOutTxt:  { color: '#EF4444', fontWeight: '800', fontSize: 15 },
});
