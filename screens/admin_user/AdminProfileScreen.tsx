// screens/admin_user/AdminProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { useSignOut } from '../../context/SignOutContext';
import { C, fmtDate } from './adminTypes';

type StatEntry = {
  label: string;
  value: string;
  icon:  React.ComponentProps<typeof Feather>['name'];
  color: string;
  bg:    string;
};

const STAT_DEFAULTS: StatEntry[] = [
  { label: 'Verifications',  value: '\u2026', icon: 'check-square', color: '#2D6A4F', bg: 'rgba(45,106,79,0.1)'  },
  { label: 'Disputes Closed',value: '\u2026', icon: 'shield',       color: '#0284C7', bg: 'rgba(2,132,199,0.1)'  },
  { label: 'Broadcasts Sent',value: '\u2026', icon: 'radio',        color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
];

export default function AdminProfileScreen() {
  const navigation     = useNavigation<any>();
  const { session }    = useAuth();
  const signOut        = useSignOut();
  const [editing, setEditing]             = useState(false);
  const [name,    setName]                = useState(session?.name  ?? 'Platform Admin');
  const [email,   setEmail]               = useState(session?.email ?? 'admin@freshloop.co.za');
  const [activityStats, setActivityStats] = useState<StatEntry[]>(STAT_DEFAULTS);

  useEffect(() => {
    if (!session?.userId) return;
    getDoc(doc(db, 'users', session.userId)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (typeof d.name  === 'string') setName(d.name);
      if (typeof d.email === 'string') setEmail(d.email);
    }).catch(() => {});

    Promise.all([
      getDocs(query(collection(db, 'users'),   where('verificationStatus', 'in', ['approved', 'rejected']))),
      getDocs(query(collection(db, 'reports'), where('status', '==', 'resolved'))),
      getDocs(collection(db, 'broadcasts')),
    ]).then(([verifSnap, reportsSnap, broadcastsSnap]) => {
      setActivityStats(prev => [
        { ...prev[0], value: String(verifSnap.size)      },
        { ...prev[1], value: String(reportsSnap.size)    },
        { ...prev[2], value: String(broadcastsSnap.size) },
      ]);
    }).catch(() => {});
  }, []);

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const lastActive = fmtDate(new Date().toISOString());

  const handleSave = () => {
    if (session?.userId) {
      setDoc(doc(db, 'users', session.userId), { name, email }, { merge: true }).catch(() => {});
    }
    setEditing(false);
    Alert.alert('Saved', 'Profile details updated.');
  };

  return (
    <View style={s.root}>
      <CustomHeader
        settingsScreen="AdminSettings"
        profileScreen="AdminProfile"
        notificationsScreen="AdminNotifications"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Title row */}
        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Admin Profile</Text>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => editing ? handleSave() : setEditing(true)}
            activeOpacity={0.8}
          >
            <Feather name={editing ? 'check' : 'edit-2'} size={14} color="#2D6A4F" />
            <Text style={s.editTxt}>{editing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar card */}
        <View style={s.avatarCard}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.adminName}>{name}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleTxt}>🛡  Platform Administrator</Text>
            </View>
            <Text style={s.lastActive}>Last active: {lastActive}</Text>
          </View>
        </View>

        {/* Activity stats */}
        <View style={s.statsRow}>
          {activityStats.map(stat => (
            <View key={stat.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: stat.bg }]}>
                <Feather name={stat.icon} size={16} color={stat.color} />
              </View>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick links */}
        <View style={s.quickRow}>
          <TouchableOpacity
            style={s.quickCard}
            onPress={() => navigation.navigate('AdminSettings')}
            activeOpacity={0.8}
          >
            <View style={[s.quickIcon, { backgroundColor: 'rgba(28,58,46,0.1)' }]}>
              <Feather name="settings" size={16} color="#1C3A2E" />
            </View>
            <Text style={s.quickLabel}>Settings</Text>
            <Feather name="chevron-right" size={15} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickCard}
            onPress={() => navigation.navigate('AdminNotifications')}
            activeOpacity={0.8}
          >
            <View style={[s.quickIcon, { backgroundColor: 'rgba(124,58,237,0.1)' }]}>
              <Feather name="bell" size={16} color="#7C3AED" />
            </View>
            <Text style={s.quickLabel}>Notifications</Text>
            <Feather name="chevron-right" size={15} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Account details */}
        <Text style={s.sectionTitle}>ACCOUNT DETAILS</Text>
        <View style={s.detailsCard}>
          {[
            { label: 'Full Name',     value: name,   icon: 'user'   as const, editable: true,  state: name,   setter: setName  },
            { label: 'Email Address', value: email,  icon: 'mail'   as const, editable: true,  state: email,  setter: setEmail },
            { label: 'Role',          value: 'Platform Administrator', icon: 'shield' as const, editable: false, state: '', setter: () => {} },
            { label: 'Account ID',   value: session?.userId ?? 'admin-001', icon: 'hash' as const, editable: false, state: '', setter: () => {} },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[s.detailRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
            >
              <View style={s.detailIconWrap}>
                <Feather name={item.icon} size={14} color="#64748B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.detailLabel}>{item.label}</Text>
                {editing && item.editable ? (
                  <TextInput
                    style={s.detailInput}
                    value={item.state}
                    onChangeText={item.setter}
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={s.detailValue}>{item.value}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 2FA status */}
        <Text style={s.sectionTitle}>SECURITY</Text>
        <View style={s.secCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.quickIcon, { backgroundColor: 'rgba(45,106,79,0.1)' }]}>
              <Feather name="lock" size={16} color="#2D6A4F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.secLabel}>Two-Factor Authentication</Text>
              <Text style={s.secSub}>Always enforced for admin accounts</Text>
            </View>
            <View style={s.secBadge}>
              <Text style={s.secBadgeTxt}>Active</Text>
            </View>
          </View>
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
  root:         { flex: 1, backgroundColor: '#E2EBE1' },
  scroll:       { padding: 20, paddingBottom: 130 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  editBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  editTxt:      { color: '#2D6A4F', fontSize: 12, fontWeight: '700' },
  avatarCard:   { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  avatar:       { width: 64, height: 64, borderRadius: 20, backgroundColor: '#1C3A2E', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { color: '#fff', fontSize: 22, fontWeight: '800' },
  adminName:    { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  roleBadge:    { alignSelf: 'flex-start', backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', marginBottom: 6 },
  roleTxt:      { color: '#7C3AED', fontSize: 11, fontWeight: '700' },
  lastActive:   { fontSize: 11, color: '#94A3B8' },
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:     { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  statIcon:     { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue:    { fontSize: 22, fontWeight: '800' },
  statLabel:    { fontSize: 10, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
  quickRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickCard:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  quickIcon:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel:   { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10 },
  detailsCard:  { backgroundColor: '#fff', borderRadius: 18, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  detailRow:    { flexDirection: 'row', alignItems: 'center', padding: 16 },
  detailIconWrap:{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  detailLabel:  { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 3 },
  detailValue:  { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  detailInput:  { fontSize: 14, fontWeight: '700', color: '#1C3A2E', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 2 },
  secCard:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  secLabel:     { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  secSub:       { fontSize: 12, color: '#94A3B8' },
  secBadge:     { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  secBadgeTxt:  { color: '#10B981', fontSize: 11, fontWeight: '700' },
  signOutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 18, borderWidth: 1, borderColor: '#FEE2E2' },
  signOutTxt:   { color: '#EF4444', fontWeight: '800', fontSize: 15 },
});
