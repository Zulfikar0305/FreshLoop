// screens/admin_user/AdminModerationScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import {
  collection, doc, onSnapshot, orderBy, query,
  serverTimestamp, Timestamp, updateDoc,
} from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import { db } from '../../firebase/firebaseConfig';
import { createNotification } from '../../services/inAppNotificationService';
import { C, fmtDate, getCategoryColor, TicketCategory } from './adminTypes';

// ── Firestore report shape ────────────────────────────────────────────────────
type ReportStatus = 'open' | 'resolved';

interface Report {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
  category: TicketCategory;
  description: string;
  status: ReportStatus;
  createdAt: string;
}

const VALID_CATS: TicketCategory[] = ['user', 'listing', 'system'];

function mapReport(id: string, data: Record<string, unknown>): Report {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : new Date().toISOString();
  return {
    id,
    userId:      typeof data.userId      === 'string' ? data.userId      : '',
    userName:    typeof data.userName    === 'string' ? data.userName
                 : typeof data.email     === 'string' ? data.email        : 'Unknown',
    email:       typeof data.email       === 'string' ? data.email        : '',
    role:        typeof data.role        === 'string' ? data.role         : '',
    category:    VALID_CATS.includes(data.category as TicketCategory)
                   ? (data.category as TicketCategory) : 'system',
    description: typeof data.description === 'string' ? data.description : '',
    status:      data.status === 'resolved' ? 'resolved' : 'open',
    createdAt,
  };
}

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({
  report, resolving, onResolve,
}: {
  report: Report;
  resolving: boolean;
  onResolve: (r: Report) => void;
}) {
  const cat = getCategoryColor(report.category);
  const isSystem = report.category === 'system';
  return (
    <View style={[
      s.ticketCard,
      isSystem && { borderLeftWidth: 4, borderLeftColor: C.info },
      report.status === 'resolved' && s.ticketResolved,
    ]}>
      {/* Badges row */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <View style={[s.badge, { backgroundColor: cat.bg }]}>
          <Text style={[s.badgeTxt, { color: cat.color }]}>{cat.label}</Text>
        </View>
        {report.role.length > 0 && (
          <View style={[s.badge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[s.badgeTxt, { color: '#475569' }]}>{report.role.toUpperCase()}</Text>
          </View>
        )}
        {report.status === 'resolved' && (
          <View style={[s.badge, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[s.badgeTxt, { color: '#16A34A' }]}>✓ RESOLVED</Text>
          </View>
        )}
      </View>

      {/* Reporter info */}
      <Text style={s.itemName}>{report.userName || report.email || 'Unknown reporter'}</Text>
      {report.email.length > 0 && report.email !== report.userName && (
        <Text style={s.itemEmail}>{report.email}</Text>
      )}

      {/* Description */}
      <Text style={s.description}>"{report.description}"</Text>
      <Text style={s.itemDate}>{fmtDate(report.createdAt)}</Text>

      {/* Resolve button — only for open reports */}
      {report.status === 'open' && (
        <TouchableOpacity
          style={[
            s.resolveBtn,
            isSystem && { backgroundColor: C.infoLight, borderColor: C.info },
            resolving && s.resolveBtnDisabled,
          ]}
          onPress={() => onResolve(report)}
          disabled={resolving}
          activeOpacity={0.8}
        >
          {resolving ? (
            <ActivityIndicator size="small" color={isSystem ? C.info : C.primary} />
          ) : (
            <Text style={[s.resolveTxt, isSystem && { color: C.info }]}>
              {isSystem ? '✓ Mark Fixed' : '✓ Mark Resolved'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function AdminModerationScreen() {
  const [reports,   setReports]   = useState<Report[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [filter,    setFilter]    = useState<'open' | 'resolved' | 'all'>('open');

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map(d => mapReport(d.id, d.data())));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleResolve = (report: Report) => {
    Alert.alert('Mark as Resolved', 'Mark this report as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          setResolving(report.id);
          try {
            await updateDoc(doc(db, 'reports', report.id), {
              status: 'resolved',
              resolvedAt: serverTimestamp(),
            });
            if (report.userId) {
              createNotification(report.userId, {
                type:    'report',
                title:   'Report Reviewed ✅',
                message: `Your "${report.category}" report has been reviewed and resolved by the admin team.`,
              }).catch(() => {});
            }
          } catch {
            Alert.alert('Error', 'Could not resolve this report. Please try again.');
          } finally {
            setResolving(null);
          }
        },
      },
    ]);
  };

  const open     = reports.filter(r => r.status === 'open');
  const resolved = reports.filter(r => r.status === 'resolved');

  const visible = filter === 'open' ? open : filter === 'resolved' ? resolved : reports;
  const conductVisible = visible.filter(r => r.category !== 'system');
  const systemVisible  = visible.filter(r => r.category === 'system');

  return (
    <View style={s.root}>
      <CustomHeader settingsScreen="AdminSettings" profileScreen="AdminProfile" notificationsScreen="AdminNotifications" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {loading ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <>
            {/* Filter tabs */}
            <View style={s.filterRow}>
              {(['open', 'resolved', 'all'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.chip, filter === f && s.chipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[s.chipTxt, filter === f && s.chipTxtActive]}>
                    {f === 'open'
                      ? `Open (${open.length})`
                      : f === 'resolved'
                      ? `Resolved (${resolved.length})`
                      : `All (${reports.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Conduct / Listing section ── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>CONDUCT & LISTING REPORTS</Text>
              {conductVisible.length > 0 && (
                <View style={s.countBubble}>
                  <Text style={s.countTxt}>{conductVisible.length}</Text>
                </View>
              )}
            </View>

            {conductVisible.length === 0 ? (
              <Text style={s.emptyInline}>No conduct or listing reports.</Text>
            ) : conductVisible.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                resolving={resolving === r.id}
                onResolve={handleResolve}
              />
            ))}

            <View style={s.divider} />

            {/* ── System issues section ── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>SYSTEM ISSUES</Text>
              {systemVisible.length > 0 && (
                <View style={s.countBubble}>
                  <Text style={s.countTxt}>{systemVisible.length}</Text>
                </View>
              )}
            </View>

            {systemVisible.length === 0 ? (
              <Text style={s.emptyInline}>No system issues.</Text>
            ) : systemVisible.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                resolving={resolving === r.id}
                onResolve={handleResolve}
              />
            ))}

            {/* All clear */}
            {visible.length === 0 && filter === 'open' && (
              <View style={s.allClearCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                <Text style={s.allClearTitle}>All clear!</Text>
                <Text style={s.allClearBody}>No open reports right now.</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.background },
  scroll:          { padding: 20, paddingBottom: 130 },
  loadingCard:     { backgroundColor: C.surface, borderRadius: 18, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 20 },
  filterRow:       { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive:      { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt:         { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  chipTxtActive:   { color: '#fff' },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:    { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8 },
  countBubble:     { backgroundColor: C.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 5 },
  countTxt:        { color: '#fff', fontSize: 10, fontWeight: '800' },
  divider:         { height: 1, backgroundColor: C.border, marginVertical: 20 },
  emptyInline:     { color: C.textMuted, fontSize: 13, marginBottom: 12 },
  ticketCard:      { backgroundColor: C.surface, borderRadius: 16, marginBottom: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  ticketResolved:  { opacity: 0.75 },
  badge:           { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeTxt:        { fontSize: 10, fontWeight: '700' },
  itemName:        { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  itemEmail:       { fontSize: 11, color: C.textSecondary, marginBottom: 2 },
  description:     { fontSize: 12, color: C.textSecondary, fontStyle: 'italic', marginVertical: 6, lineHeight: 18 },
  itemDate:        { fontSize: 10, color: C.textMuted, marginBottom: 8 },
  resolveBtn:      { backgroundColor: '#e8f5e9', borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#a5d6a7' },
  resolveBtnDisabled: { opacity: 0.6 },
  resolveTxt:      { color: C.primary, fontSize: 12, fontWeight: '700' },
  allClearCard:    { backgroundColor: C.surface, borderRadius: 18, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  allClearTitle:   { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  allClearBody:    { fontSize: 13, color: C.textSecondary },
});
