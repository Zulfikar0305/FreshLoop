// screens/admin_user/AdminBroadcastsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import {
  addDoc, collection, getDocs, onSnapshot,
  orderBy, query, serverTimestamp, Timestamp, where,
} from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import { db } from '../../firebase/firebaseConfig';
import { createNotification } from '../../services/inAppNotificationService';
import { useAuth } from '../../context/AuthContext';
import { C, fmtDate, AITip, BroadcastHistory, MOCK_TIPS } from './adminTypes';

const AUDIENCES = ['All Users', 'Home Users', 'Business Users', 'Coordinators'];

const AUDIENCE_ROLE: Record<string, string | null> = {
  'All Users':      null,
  'Home Users':     'home',
  'Business Users': 'business',
  'Coordinators':   'npo',
};

function mapBroadcast(id: string, data: Record<string, unknown>): BroadcastHistory {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : new Date().toISOString();
  return {
    id,
    message:       typeof data.message       === 'string' ? data.message       : '',
    audience:      typeof data.audience      === 'string' ? data.audience      : '',
    sentAt:        createdAt,
    deliveryCount: typeof data.deliveryCount === 'number' ? data.deliveryCount : 0,
  };
}

export default function AdminBroadcastsScreen() {
  const { session }                     = useAuth();
  const [tips, setTips]                 = useState<AITip[]>(MOCK_TIPS);
  const [broadcasts, setBroadcasts]     = useState<BroadcastHistory[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [audience, setAudience]         = useState('All Users');
  const [sending, setSending]           = useState(false);
  const [loadingHist, setLoadingHist]   = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        setBroadcasts(snap.docs.map(d => mapBroadcast(d.id, d.data() as Record<string, unknown>)));
        setLoadingHist(false);
      },
      () => setLoadingHist(false),
    );
    return unsub;
  }, []);

  const handleSend = async () => {
    if (!broadcastMsg.trim()) { Alert.alert('Error', 'Please enter a message.'); return; }
    setSending(true);
    try {
      const role = AUDIENCE_ROLE[audience];
      const usersRef = collection(db, 'users');
      const usersSnap = role
        ? await getDocs(query(usersRef, where('role', '==', role)))
        : await getDocs(query(usersRef, where('role', 'in', ['home', 'business', 'npo'])));
      const userIds = usersSnap.docs.map(d => d.id);

      await Promise.all(
        userIds.map(uid =>
          createNotification(uid, {
            type:    'system',
            title:   `Broadcast — ${audience}`,
            message: broadcastMsg.trim(),
          }),
        ),
      );

      await addDoc(collection(db, 'broadcasts'), {
        message:       broadcastMsg.trim(),
        audience,
        audienceRole:  role ?? 'all',
        createdBy:     session?.userId ?? '',
        createdAt:     serverTimestamp(),
        deliveryCount: userIds.length,
      });

      await addDoc(collection(db, 'adminAuditLog'), {
        adminName: 'Platform Admin',
        action:    `Sent broadcast to ${audience}: "${broadcastMsg.trim().slice(0, 60)}${broadcastMsg.trim().length > 60 ? '\u2026' : ''}"`,
        timestamp: serverTimestamp(),
      });

      setBroadcastMsg('');
      Alert.alert('Sent', `Broadcast delivered to ${userIds.length} user${userIds.length === 1 ? '' : 's'}.`);
    } catch {
      Alert.alert('Error', 'Failed to send broadcast. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleTip = (id: string) => {
    setTips(t => t.map(tp => tp.id === id ? { ...tp, active: !tp.active } : tp));
  };

  return (
    <View style={s.root}>
      <CustomHeader settingsScreen="AdminSettings" profileScreen="AdminProfile" notificationsScreen="AdminNotifications" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Send broadcast */}
        <Text style={s.sectionTitle}>SEND BROADCAST</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Audience</Text>
          <View style={s.audienceRow}>
            {AUDIENCES.map(a => (
              <TouchableOpacity key={a} style={[s.chip, audience === a && s.chipActive]} onPress={() => setAudience(a)}>
                <Text style={[s.chipTxt, audience === a && s.chipTxtActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLabel}>Message</Text>
          <TextInput
            style={s.textArea}
            placeholder="Type your announcement…"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            value={broadcastMsg}
            onChangeText={setBroadcastMsg}
          />
          <Text style={s.charCount}>{broadcastMsg.trim().length} / 500 characters</Text>

          <TouchableOpacity style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={() => { void handleSend(); }} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.sendTxt}>📢  Send Broadcast</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.divider} />

        {/* AI Tip Library */}
        <Text style={s.sectionTitle}>AI TIP LIBRARY</Text>
        {tips.map(tip => (
          <View key={tip.id} style={s.tipCard}>
            <View style={{ flex: 1, marginRight: 10 }}>
              {tip.flagged && (
                <View style={[s.badge, { backgroundColor: C.dangerLight, marginBottom: 6 }]}>
                  <Text style={[s.badgeTxt, { color: C.danger }]}>⚑ Flagged</Text>
                </View>
              )}
              <Text style={s.tipTxt}>"{tip.tip}"</Text>
            </View>
            <TouchableOpacity
              style={[s.tipBtn, { backgroundColor: tip.active ? C.dangerLight : '#e8f5e9' }]}
              onPress={() => toggleTip(tip.id)}
            >
              <Text style={[s.tipBtnTxt, { color: tip.active ? C.danger : C.primary }]}>
                {tip.active ? 'Disable' : 'Enable'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={s.divider} />

        {/* Broadcast history */}
        <Text style={s.sectionTitle}>BROADCAST HISTORY</Text>
        {loadingHist
          ? <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          : broadcasts.length === 0
            ? <Text style={s.emptyTxt}>No broadcasts sent yet.</Text>
            : broadcasts.map(b => (
              <View key={b.id} style={s.histCard}>
                <Text style={s.histMsg} numberOfLines={2}>"{b.message}"</Text>
                <Text style={s.histMeta}>To: {b.audience} · {b.deliveryCount.toLocaleString()} delivered</Text>
                <Text style={s.histDate}>{fmtDate(b.sentAt)}</Text>
              </View>
            ))
        }

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.background },
  scroll:      { padding: 20, paddingBottom: 130 },
  sectionTitle:{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 12 },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 20 },
  card:        { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: C.border },
  fieldLabel:  { fontSize: 12, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
  chipActive:  { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt:     { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  chipTxtActive:{ color: '#fff' },
  textArea:    { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 13, color: C.textPrimary, minHeight: 100, textAlignVertical: 'top', backgroundColor: C.background, marginBottom: 4 },
  charCount:   { fontSize: 11, color: C.textMuted, marginBottom: 12 },
  sendBtn:     { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sendTxt:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  tipCard:     { backgroundColor: C.surface, borderRadius: 16, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  badge:       { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeTxt:    { fontSize: 10, fontWeight: '700' },
  tipTxt:      { fontSize: 13, color: C.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  tipBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  tipBtnTxt:   { fontSize: 11, fontWeight: '700' },
  histCard:    { backgroundColor: C.surface, borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  histMsg:     { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 4 },
  histMeta:    { fontSize: 11, color: C.primaryLight, fontWeight: '600', marginBottom: 2 },
  histDate:    { fontSize: 10, color: C.textMuted },
  emptyTxt:    { textAlign: 'center', color: C.textMuted, fontSize: 13, marginTop: 20 },
});
