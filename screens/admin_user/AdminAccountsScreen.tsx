// screens/admin_user/AdminAccountsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import { db } from '../../firebase/firebaseConfig';
import { C, fmtDate, AdminAccount } from './adminTypes';

export default function AdminAccountsScreen() {
  const [admins,  setAdmins]  = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    getDocs(q)
      .then(snap => {
        setAdmins(snap.docs.map(d => {
          const data = d.data();
          const lastActive =
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate().toISOString()
              : data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : new Date().toISOString();
          return {
            id:       d.id,
            fullName: typeof data.name  === 'string' ? data.name  : 'Admin',
            email:    typeof data.email === 'string' ? data.email : '',
            lastActive,
          };
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.root}>
      <CustomHeader settingsScreen="AdminSettings" profileScreen="AdminProfile" notificationsScreen="AdminNotifications" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Backend limitation banner */}
        <View style={s.banner}>
          <Text style={s.bannerTitle}>⚠️  Backend Required</Text>
          <Text style={s.bannerBody}>
            {'Admin account provisioning requires the Firebase Admin SDK (server-side only).\nCreating or revoking admin accounts cannot be performed securely from a mobile client.\nUse the Firebase Console or a secure backend service to manage admin accounts.'}
          </Text>
        </View>

        {/* Current admins — read-only display */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>CURRENT ADMINS</Text>
          <View style={s.countBubble}>
            <Text style={s.countTxt}>{admins.length}</Text>
          </View>
        </View>

        {loading && <ActivityIndicator color={C.primary} style={{ marginTop: 16 }} />}

        {admins.map(ad => (
          <View key={ad.id} style={s.adminCard}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>
                {ad.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adminName}>{ad.fullName}</Text>
              <Text style={s.adminEmail}>{ad.email}</Text>
              <Text style={s.adminDate}>Last active: {fmtDate(ad.lastActive)}</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.background },
  scroll:       { padding: 20, paddingBottom: 130 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 0 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  countBubble:  { backgroundColor: C.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 5 },
  countTxt:     { color: '#fff', fontSize: 10, fontWeight: '800' },
  banner:       { backgroundColor: '#FFF8E1', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F59E0B', borderLeftWidth: 4 },
  bannerTitle:  { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 8 },
  bannerBody:   { fontSize: 12, color: '#78350F', lineHeight: 18 },
  adminCard:    { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border },
  avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { color: '#fff', fontWeight: '800', fontSize: 14 },
  adminName:    { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  adminEmail:   { fontSize: 11, color: C.textSecondary, marginBottom: 2 },
  adminDate:    { fontSize: 10, color: C.textMuted },
});
