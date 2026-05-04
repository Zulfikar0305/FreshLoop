// screens/admin_user/AdminHealthScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { C } from './adminTypes';

function fmtTime(d: Date) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AdminHealthScreen() {
  const { session } = useAuth();
  const adminName = session?.name ?? 'Platform Admin';
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Firestore counts ──────────────────────────────────────────────────────
  const [donationCounts, setDonationCounts] = useState(
    { available: 0, claimed: 0, completed: 0, expired: 0, total: 0 },
  );
  const [userCounts, setUserCounts] = useState({ total: 0, business: 0, npo: 0 });
  const [openReports, setOpenReports] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let pending = 3;
    const done = () => { pending -= 1; if (pending === 0) setLoadingStats(false); };

    const unsub1 = onSnapshot(query(collection(db, 'donations')), snap => {
      const all = snap.docs.map(d => d.data());
      setDonationCounts({
        total:     all.length,
        available: all.filter(d => d.status === 'available').length,
        claimed:   all.filter(d => d.status === 'claimed').length,
        completed: all.filter(d => d.status === 'completed').length,
        expired:   all.filter(d => d.status === 'expired').length,
      });
      done();
    }, () => done());

    const unsub2 = onSnapshot(query(collection(db, 'users')), snap => {
      const all = snap.docs.map(d => d.data());
      setUserCounts({
        total:    all.length,
        business: all.filter(d => d.role === 'business').length,
        npo:      all.filter(d => d.role === 'npo' || d.role === 'coordinator').length,
      });
      done();
    }, () => done());

    const unsub3 = onSnapshot(
      query(collection(db, 'reports'), where('status', '==', 'open')),
      snap => { setOpenReports(snap.size); done(); },
      () => done(),
    );

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdated(fmtTime(new Date()));
    }, 1200);
  }, []);

  const handleStatPress = (label: string) => {
    Alert.alert(label, `Showing real-time count for "${label}" donations.`, [{ text: 'OK' }]);
  };

  const handleMetricPress = (label: string, value: string) => {
    Alert.alert(label, `Current value: ${value}`, [{ text: 'OK' }]);
  };

  return (
    <View style={s.root}>
      <CustomHeader
        settingsScreen="AdminSettings"
        profileScreen="AdminProfile"
        notificationsScreen="AdminNotifications"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* Identity bar */}
        <View style={s.identityBar}>
          <View>
            <Text style={s.greeting}>FreshLoop Admin</Text>
            <Text style={s.adminName}>{adminName}</Text>
          </View>
          <View style={s.adminBadge}>
            <Text style={s.badgeTxt}>🛡  Admin</Text>
          </View>
        </View>

        {/* Live donation status */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>LIVE DONATION STATUS</Text>
          <View style={s.liveChip}>
            <Animated.View style={[s.liveDot, { opacity: pulseAnim }]} />
            <Text style={s.liveTxt}>LIVE</Text>
          </View>
        </View>

        {loadingStats
          ? <View style={s.loadingCard}><ActivityIndicator color={C.primary} /></View>
          : <View style={s.statsRow}>
              {([
                { label: 'Available', value: donationCounts.available, color: C.primary,       icon: '📦' },
                { label: 'Claimed',   value: donationCounts.claimed,   color: C.info,          icon: '🔖' },
                { label: 'Completed', value: donationCounts.completed, color: '#6a1b9a',       icon: '✅' },
                { label: 'Expired',   value: donationCounts.expired,   color: C.danger,        icon: '⚠️' },
                { label: 'Total',     value: donationCounts.total,     color: C.textSecondary, icon: '🍽️' },
              ] as const).map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={s.statCard}
                  onPress={() => handleStatPress(item.label)}
                  activeOpacity={0.7}
                >
                  <Text style={s.statIcon}>{item.icon}</Text>
                  <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
        }

        <View style={s.divider} />

        {/* Platform health */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>PLATFORM HEALTH</Text>
          <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
            <Feather name="refresh-cw" size={11} color={C.primaryLight} />
            <Text style={s.refreshTxt}>Updated {lastUpdated}</Text>
          </TouchableOpacity>
        </View>

        {loadingStats
          ? <View style={s.loadingCard}><ActivityIndicator color={C.primary} /></View>
          : <View style={s.metricsGrid}>
              {([
                { label: 'Total Users',  value: userCounts.total,         sub: 'registered',      icon: '👥' },
                { label: 'Businesses',   value: userCounts.business,      sub: 'verified',        icon: '🏪' },
                { label: 'NPO Coords',   value: userCounts.npo,           sub: 'registered',      icon: '🤝' },
                { label: 'Open Reports', value: openReports,              sub: 'awaiting review', icon: '🚨' },
                { label: 'Donations',    value: donationCounts.total,     sub: 'all time',        icon: '📦' },
                { label: 'Completed',    value: donationCounts.completed, sub: 'handed off',      icon: '✅' },
              ] as const).map(m => (
                <TouchableOpacity
                  key={m.label}
                  style={s.metricCard}
                  onPress={() => handleMetricPress(m.label, String(m.value))}
                  activeOpacity={0.75}
                >
                  <Text style={s.metricIcon}>{m.icon}</Text>
                  <Text style={s.metricValue}>{m.value}</Text>
                  <Text style={s.metricLabel}>{m.label}</Text>
                  <Text style={s.metricSub}>{m.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
        }
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.background },
  scroll:       { padding: 20, paddingBottom: 130 },
  identityBar:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  greeting:     { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  adminName:    { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  adminBadge:   { backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  badgeTxt:     { color: '#7C3AED', fontWeight: '700', fontSize: 12 },
  noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e3f2fd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, borderWidth: 1, borderColor: '#90caf9' },
  noticeTxt:    { fontSize: 11, color: '#1565c0', flex: 1, lineHeight: 16 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8 },
  liveChip:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  liveTxt:      { fontSize: 9, fontWeight: '800', color: '#22c55e', letterSpacing: 0.5 },
  refreshBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshTxt:   { fontSize: 10, color: C.primaryLight, fontWeight: '600' },
  divider:      { height: 1, backgroundColor: C.border, marginVertical: 20 },
  statsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard:     { flex: 1, minWidth: '28%', backgroundColor: C.surface, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statIcon:     { fontSize: 18, marginBottom: 4 },
  statValue:    { fontSize: 22, fontWeight: '800' },
  statLabel:    { fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  metricsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard:   { backgroundColor: C.surface, borderRadius: 16, padding: 16, width: '47%', borderWidth: 1, borderColor: C.border },
  metricIcon:   { fontSize: 26, marginBottom: 6 },
  metricValue:  { fontSize: 20, fontWeight: '800', color: C.primary },
  metricLabel:  { fontSize: 12, fontWeight: '700', color: C.textPrimary, marginTop: 2 },
  metricSub:    { fontSize: 11, color: C.textMuted, marginTop: 2 },
  loadingCard:  { backgroundColor: C.surface, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 4 },
});
