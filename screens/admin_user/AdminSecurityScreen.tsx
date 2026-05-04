// screens/admin_user/AdminSecurityScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import {
  collection, onSnapshot, orderBy, query, Timestamp,
} from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import { db } from '../../firebase/firebaseConfig';
import { C, fmtDate, AuditEntry } from './adminTypes';

export default function AdminSecurityScreen() {
  const [auditLog,     setAuditLog]     = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'adminAuditLog'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        setAuditLog(
          snap.docs.map(d => {
            const data = d.data() as Record<string, unknown>;
            return {
              id:        d.id,
              adminName: typeof data.adminName === 'string' ? data.adminName : 'Admin',
              action:    typeof data.action    === 'string' ? data.action    : '',
              timestamp: data.timestamp instanceof Timestamp
                ? data.timestamp.toDate().toISOString()
                : new Date().toISOString(),
            };
          }),
        );
        setLoadingAudit(false);
      },
      () => setLoadingAudit(false),
    );
    return unsub;
  }, []);

  return (
    <View style={s.root}>
      <CustomHeader settingsScreen="AdminSettings" profileScreen="AdminProfile" notificationsScreen="AdminNotifications" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* 2FA */}
        <Text style={s.sectionTitle}>SECURITY SETTINGS</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.cardLabel}>🔐 2FA Status</Text>
            <View style={[s.badge, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[s.badgeTxt, { color: C.primary }]}>Always Active</Text>
            </View>
          </View>
          <Text style={s.cardSub}>
            2FA is permanently enforced for all admin accounts and cannot be disabled.
          </Text>
        </View>

        <View style={s.divider} />

        {/* Active sessions */}
        <Text style={s.sectionTitle}>ACTIVE SESSIONS</Text>
        <View style={s.limitCard}>
          <Text style={s.limitTitle}>⚠️  Not available in demo</Text>
          <Text style={s.limitSub}>
            Real-time session tracking requires a server-side API (e.g. Firebase Admin SDK).
            This feature is not available from the mobile client.
          </Text>
        </View>

        <View style={s.divider} />

        {/* Audit log */}
        <Text style={s.sectionTitle}>AUDIT LOG</Text>
        {loadingAudit
          ? <ActivityIndicator color={C.primary} style={{ marginTop: 16 }} />
          : auditLog.length === 0
            ? <View style={s.limitCard}>
                <Text style={s.limitSub}>No audit entries yet. Admin actions (such as broadcasts) will appear here.</Text>
              </View>
            : auditLog.map(entry => (
              <View key={entry.id} style={s.auditRow}>
                <Text style={s.auditAction}>{entry.action}</Text>
                <Text style={s.auditMeta}>{entry.adminName} · {fmtDate(entry.timestamp)}</Text>
              </View>
            ))
        }

        <View style={s.divider} />

        {/* Password change */}
        <Text style={s.sectionTitle}>CHANGE PASSWORD</Text>
        <View style={s.limitCard}>
          <Text style={s.limitTitle}>⚠️  Not available for demo admin</Text>
          <Text style={s.limitSub}>
            The admin credential is provisioned at deployment via the Firebase Admin SDK.
            Password changes for this account are not supported from the mobile app.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.background },
  scroll:       { padding: 20, paddingBottom: 130 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 12 },
  divider:      { height: 1, backgroundColor: C.border, marginVertical: 20 },
  card:         { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: C.border },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardLabel:    { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  cardSub:      { fontSize: 12, color: C.textMuted, lineHeight: 18 },
  badge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:     { fontSize: 11, fontWeight: '700' },
  limitCard:    { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: C.border },
  limitTitle:   { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 6 },
  limitSub:     { fontSize: 12, color: C.textMuted, lineHeight: 18 },
  auditRow:     { backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  auditAction:  { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },
  auditMeta:    { fontSize: 11, color: C.textMuted },
});
