// screens/admin_user/AdminVerificationScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, Modal, ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  arrayUnion, collection, doc, onSnapshot, query,
  serverTimestamp, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import { db } from '../../firebase/firebaseConfig';
import { createNotification } from '../../services/inAppNotificationService';
import {
  C, fmtDate, PendingAccount, VerifiedAccount,
  AppealRequest, MOCK_APPEALS,
} from './adminTypes';

// ── Color helpers ─────────────────────────────────────────────────────────────
function getTypeStyle(type: 'business' | 'coordinator') {
  return type === 'business'
    ? { bg: '#FFF3E0', accent: '#e65100', label: 'Business' }
    : { bg: '#E3F2FD', accent: '#1565c0', label: 'NPO Coordinator' };
}

const STRIKE_LEVELS = [
  { level: 1 as const, label: 'Strike 1 — Warning',          bg: '#FFCDD2', text: '#c62828' },
  { level: 2 as const, label: 'Strike 2 — 7-day Suspension', bg: '#EF9A9A', text: '#b71c1c' },
  { level: 3 as const, label: 'Strike 3 — Permanent Ban',    bg: '#E53935', text: '#ffffff' },
];

const BUSINESS_REQUIRED_DOCS = [
  'Trading Licence',
  'Food Safety Certificate',
  'Proof of Business Address',
];
const NPO_REQUIRED_DOCS = [
  'NPO Registration Certificate',
  'Food Handling Certificate',
  'Proof of Operating Address',
];

// ── Firestore → UI mapping ────────────────────────────────────────────────────
function mapUserToPending(id: string, data: Record<string, unknown>): PendingAccount {
  const docs = Array.isArray(data.verificationDocuments)
    ? (data.verificationDocuments as Array<Record<string, unknown>>)
    : [];
  const firstDoc = docs[0];
  const downloadURL = typeof firstDoc?.downloadURL === 'string' ? firstDoc.downloadURL : '';
  const docType     = typeof firstDoc?.docType     === 'string' ? firstDoc.docType     : 'Verification Document';
  const submittedAt = typeof firstDoc?.uploadedAt  === 'string'
    ? firstDoc.uploadedAt
    : (data.verificationStatusUpdatedAt instanceof Timestamp
        ? data.verificationStatusUpdatedAt.toDate().toISOString()
        : new Date().toISOString());
  return {
    id,
    accountType:          data.role === 'npo' ? 'coordinator' : 'business',
    displayName:          typeof data.name  === 'string' ? data.name  : '',
    email:                typeof data.email === 'string' ? data.email : '',
    submittedAt,
    documentLabel:        docType,
    documentThumbnailUri: downloadURL,
    documentFullUri:      downloadURL,
    status:               'pending',
    strikeCount:          typeof data.strikeCount === 'number' ? data.strikeCount : 0,
  };
}

function mapUserToVerified(id: string, data: Record<string, unknown>): VerifiedAccount {
  return {
    id,
    accountType:  data.role === 'npo' ? 'coordinator' : 'business',
    displayName:  typeof data.name  === 'string' ? data.name  : '',
    email:        typeof data.email === 'string' ? data.email : '',
    strikeCount:  typeof data.strikeCount === 'number' ? data.strikeCount : 0,
    status:       (['active', 'suspended', 'banned'] as const).includes(data.status as 'active' | 'suspended' | 'banned')
      ? (data.status as 'active' | 'suspended' | 'banned')
      : 'active',
    strikeReasons: Array.isArray(data.strikeReasons)
      ? (data.strikeReasons as unknown[]).filter((r): r is string => typeof r === 'string')
      : undefined,
  };
}

// ── Pending modal ─────────────────────────────────────────────────────────────
function PendingModal({ visible, account, onClose, onApprove, onReject }: {
  visible: boolean;
  account: PendingAccount | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (visible) setLoading(true); }, [visible]);

  if (!account) return null;
  const ts = getTypeStyle(account.accountType);
  const requiredDocs = account.accountType === 'business' ? BUSINESS_REQUIRED_DOCS : NPO_REQUIRED_DOCS;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={m.root}>
        {/* Header */}
        <View style={[m.header, { backgroundColor: ts.accent }]}>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <Feather name="x" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={m.headerTitle}>Document Review</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={m.body} showsVerticalScrollIndicator={false}>
          {/* Info card */}
          <View style={[m.infoCard, { backgroundColor: ts.bg, borderColor: ts.accent + '40' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={[m.accentBar, { backgroundColor: ts.accent }]} />
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text style={[m.typeLabel, { color: ts.accent }]}>{ts.label}</Text>
                <Text style={m.name}>{account.displayName}</Text>
                <Text style={m.email}>{account.email}</Text>
                <Text style={m.sub}>Submitted: {fmtDate(account.submittedAt)}</Text>
                <Text style={[m.docLabel, { color: ts.accent }]}>{account.documentLabel}</Text>
              </View>
            </View>
          </View>

          {/* Primary uploaded document */}
          <Text style={m.sectionLabel}>PRIMARY DOCUMENT</Text>
          <View style={m.docWrap}>
            {loading && (
              <ActivityIndicator color={C.primary} size="large" style={StyleSheet.absoluteFill} />
            )}
            <Image
              source={{ uri: account.documentFullUri }}
              style={m.docImg}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          </View>

          {/* Required documents checklist */}
          <Text style={m.sectionLabel}>REQUIRED DOCUMENTS</Text>
          <View style={m.docList}>
            {requiredDocs.map((doc, i) => (
              <View
                key={i}
                style={[m.docRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}
              >
                <View style={[m.docIcon, { backgroundColor: i === 0 ? '#E8F5E9' : '#F8FAFC' }]}>
                  <Feather
                    name={i === 0 ? 'file-text' : 'upload-cloud'}
                    size={16}
                    color={i === 0 ? '#2D6A4F' : '#94A3B8'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={m.docRowName}>{doc}</Text>
                  <Text style={[m.docRowStatus, { color: i === 0 ? '#2D6A4F' : '#94A3B8' }]}>
                    {i === 0 ? '✓ Uploaded' : 'Awaiting upload'}
                  </Text>
                </View>
                {i !== 0 && (
                  <View style={m.placeholderChip}>
                    <Text style={m.placeholderTxt}>Pending</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={m.actions}>
          <TouchableOpacity style={[m.btn, m.rejectBtn]} onPress={() => onReject(account.id)}>
            <Text style={m.rejectTxt}>✗  Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[m.btn, m.approveBtn]} onPress={() => onApprove(account.id)}>
            <Text style={m.approveTxt}>✓  Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Strike modal ──────────────────────────────────────────────────────────────
function StrikeModal({ visible, account, onClose, onApplyStrike, onBan }: {
  visible: boolean;
  account: VerifiedAccount | null;
  onClose: () => void;
  onApplyStrike: (id: string, level: 1 | 2 | 3, reason: string) => void;
  onBan: (id: string, reason: string) => void;
}) {
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3 | null>(null);
  const [reason, setReason]               = useState('');

  useEffect(() => {
    if (visible) { setSelectedLevel(null); setReason(''); }
  }, [visible]);

  if (!account) return null;
  const ts         = getTypeStyle(account.accountType);
  const nextStrike = Math.min(account.strikeCount + 1, 3) as 1 | 2 | 3;
  const canApply   = selectedLevel !== null && reason.trim().length > 0;

  const handleApply = () => {
    if (!canApply || selectedLevel === null) return;
    if (selectedLevel === 3) {
      Alert.alert(
        'Permanent Ban',
        'This will permanently remove the account. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Ban', style: 'destructive',
            onPress: () => { onBan(account.id, reason.trim()); onClose(); },
          },
        ],
      );
    } else {
      onApplyStrike(account.id, selectedLevel, reason.trim());
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={sm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={sm.sheet}>
        {/* Handle */}
        <View style={sm.handle} />

        {/* Account info */}
        <View style={[sm.infoRow, { borderLeftColor: ts.accent }]}>
          <View style={{ flex: 1 }}>
            <Text style={[sm.typeLabel, { color: ts.accent }]}>{ts.label}</Text>
            <Text style={sm.accName}>{account.displayName}</Text>
            <Text style={sm.accEmail}>{account.email}</Text>
          </View>
          <View style={[
            sm.statusChip,
            { backgroundColor: account.status === 'active' ? '#F0FDF4' : '#FEF2F2' },
          ]}>
            <Text style={[
              sm.statusTxt,
              { color: account.status === 'active' ? '#10B981' : '#EF4444' },
            ]}>
              {account.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Strike history */}
        {account.strikeCount > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={sm.histLabel}>STRIKE HISTORY</Text>
            {(account.strikeReasons ?? []).map((r, i) => {
              const sl = STRIKE_LEVELS[i];
              return (
                <View key={i} style={[sm.histRow, { backgroundColor: sl?.bg ?? '#FFCDD2' }]}>
                  <Text style={[sm.histLevel, { color: sl?.text ?? '#c62828' }]}>
                    Strike {i + 1}
                  </Text>
                  <Text style={[sm.histReason, { color: sl?.text ?? '#c62828' }]}>{r}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Apply next strike */}
        {account.strikeCount < 3 && (
          <>
            <Text style={sm.histLabel}>APPLY STRIKE</Text>
            {STRIKE_LEVELS.filter(sl => sl.level >= nextStrike).map(sl => (
              <TouchableOpacity
                key={sl.level}
                activeOpacity={0.8}
                style={[
                  sm.strikeOption,
                  selectedLevel === sl.level && { borderColor: sl.text, borderWidth: 2 },
                ]}
                onPress={() => setSelectedLevel(prev => prev === sl.level ? null : sl.level)}
              >
                <View style={[
                  sm.checkbox,
                  { borderColor: sl.text, backgroundColor: selectedLevel === sl.level ? sl.bg : 'transparent' },
                ]}>
                  {selectedLevel === sl.level && (
                    <Feather name="check" size={12} color={sl.text} />
                  )}
                </View>
                <View style={[sm.strikeChip, { backgroundColor: sl.bg }]}>
                  <Text style={[sm.strikeLbl, { color: sl.text }]}>{sl.label}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={sm.reasonWrap}>
              <TextInput
                placeholder="Reason is required before applying a strike…"
                placeholderTextColor="#94A3B8"
                value={reason}
                onChangeText={setReason}
                multiline
                style={sm.reasonInput}
              />
            </View>

            <TouchableOpacity
              style={[sm.applyBtn, !canApply && sm.applyDisabled]}
              onPress={handleApply}
              disabled={!canApply}
              activeOpacity={0.85}
            >
              <Text style={sm.applyTxt}>Apply Strike</Text>
            </TouchableOpacity>
          </>
        )}

        {account.strikeCount >= 3 && (
          <View style={sm.maxNote}>
            <Text style={sm.maxTxt}>Maximum strikes reached.</Text>
          </View>
        )}

        <TouchableOpacity style={sm.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={sm.cancelTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function AdminVerificationScreen() {
  const [pendingList,  setPendingList]  = useState<PendingAccount[]>([]);
  const [verifiedList, setVerifiedList] = useState<VerifiedAccount[]>([]);
  const [appeals,      setAppeals]      = useState<AppealRequest[]>(MOCK_APPEALS);
  const [loadingPending,  setLoadingPending]  = useState(true);
  const [loadingVerified, setLoadingVerified] = useState(true);

  const [verifiedFilter, setVerifiedFilter] =
    useState<'all' | 'business' | 'coordinator' | 'unverified'>('all');

  const [pendingModal,     setPendingModal]     = useState(false);
  const [strikeModal,      setStrikeModal]      = useState(false);
  const [selectedPending,  setSelectedPending]  = useState<PendingAccount | null>(null);
  const [selectedVerified, setSelectedVerified] = useState<VerifiedAccount | null>(null);

  // ── Firestore subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
    const unsub = onSnapshot(
      q,
      (snap) => { setPendingList(snap.docs.map(d => mapUserToPending(d.id, d.data()))); setLoadingPending(false); },
      () => setLoadingPending(false),
    );
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('verificationStatus', '==', 'approved'));
    const unsub = onSnapshot(
      q,
      (snap) => { setVerifiedList(snap.docs.map(d => mapUserToVerified(d.id, d.data()))); setLoadingVerified(false); },
      () => setLoadingVerified(false),
    );
    return unsub;
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleApprove = (id: string) => {
    Alert.alert('Approve Account', 'Are you sure you want to approve this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setPendingModal(false);
          try {
            await updateDoc(doc(db, 'users', id), {
              verificationStatus: 'approved',
              verificationStatusUpdatedAt: serverTimestamp(),
              status: 'active',
            });
            createNotification(id, {
              type: 'system',
              title: 'Account Approved ✅',
              message: 'Your account has been verified. You can now use all FreshLoop features.',
            }).catch(() => {});
          } catch {
            Alert.alert('Error', 'Could not approve account. Please try again.');
          }
        },
      },
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert('Reject Account', 'Are you sure you want to reject this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setPendingModal(false);
          try {
            await updateDoc(doc(db, 'users', id), {
              verificationStatus: 'rejected',
              verificationStatusUpdatedAt: serverTimestamp(),
            });
            createNotification(id, {
              type: 'system',
              title: 'Verification Unsuccessful',
              message: 'Your verification documents could not be approved. Please re-submit with valid documents.',
            }).catch(() => {});
          } catch {
            Alert.alert('Error', 'Could not reject account. Please try again.');
          }
        },
      },
    ]);
  };

  const handleApplyStrike = async (id: string, level: 1 | 2 | 3, reason: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        strikeCount: level,
        status: level >= 2 ? 'suspended' : 'active',
        strikeReasons: arrayUnion(reason),
      });
      createNotification(id, {
        type: 'system',
        title: `Strike ${level} Applied`,
        message: level === 1
          ? `You have received a formal warning: ${reason}`
          : `Your account has been suspended: ${reason}`,
      }).catch(() => {});
    } catch {
      Alert.alert('Error', 'Could not apply strike. Please try again.');
    }
  };

  const handleBan = async (id: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        status: 'banned',
        strikeCount: 3,
        strikeReasons: arrayUnion(reason),
      });
      createNotification(id, {
        type: 'system',
        title: 'Account Permanently Banned',
        message: `Your account has been permanently removed from FreshLoop: ${reason}`,
      }).catch(() => {});
    } catch {
      Alert.alert('Error', 'Could not ban account. Please try again.');
    }
  };

  const handleReinstate = (id: string) => {
    Alert.alert('Reinstate Account', 'Reinstate this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reinstate', onPress: () => setAppeals(a => a.filter(ap => ap.id !== id)) },
    ]);
  };

  const filteredVerified = verifiedList.filter(a => {
    if (verifiedFilter === 'business')    return a.accountType === 'business';
    if (verifiedFilter === 'coordinator') return a.accountType === 'coordinator';
    if (verifiedFilter === 'unverified')  return a.status !== 'active';
    return true;
  });

  return (
    <View style={s.root}>
      <CustomHeader
        settingsScreen="AdminSettings"
        profileScreen="AdminProfile"
        notificationsScreen="AdminNotifications"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Pending Approvals ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>PENDING APPROVALS</Text>
          {pendingList.length > 0 && (
            <View style={s.countBubble}>
              <Text style={s.countTxt}>{pendingList.length}</Text>
            </View>
          )}
        </View>

        {loadingPending ? (
          <View style={s.emptyCard}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : pendingList.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🎉</Text>
            <Text style={s.emptyTitle}>All clear!</Text>
            <Text style={s.emptyBody}>No pending verifications.</Text>
          </View>
        ) : pendingList.map(item => {
          const ts = getTypeStyle(item.accountType);
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.82}
              onPress={() => { setSelectedPending(item); setPendingModal(true); }}
              style={[s.pendingCard, { backgroundColor: ts.bg, borderColor: ts.accent + '35' }]}
            >
              <View style={[s.accentStrip, { backgroundColor: ts.accent }]} />
              <View style={s.pendingInfo}>
                <Text style={[s.itemType, { color: ts.accent }]}>{ts.label}</Text>
                <Text style={s.itemName} numberOfLines={1}>{item.displayName}</Text>
                <Text style={s.itemEmail} numberOfLines={1}>{item.email}</Text>
                <Text style={s.itemDoc}>{item.documentLabel}</Text>
                <Text style={s.itemDate}>{fmtDate(item.submittedAt)}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={ts.accent} style={{ marginRight: 4 }} />
            </TouchableOpacity>
          );
        })}

        <View style={s.divider} />

        {/* ── Verified Accounts ── */}
        <Text style={s.sectionTitle}>VERIFIED ACCOUNTS</Text>
        <View style={s.filterRow}>
          {(['all', 'business', 'coordinator', 'unverified'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, verifiedFilter === f && s.chipActive]}
              onPress={() => setVerifiedFilter(f)}
            >
              <Text style={[s.chipTxt, verifiedFilter === f && s.chipTxtActive]}>
                {f === 'all'
                  ? 'All'
                  : f === 'business'
                  ? 'Businesses'
                  : f === 'coordinator'
                  ? 'Coordinators'
                  : 'Unverified'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loadingVerified ? (
          <View style={[s.emptyCard, { marginTop: 8 }]}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : filteredVerified.length === 0 ? (
          <Text style={s.emptyInline}>No accounts match this filter.</Text>
        ) : null}

        {filteredVerified.map(acc => {
          const ts = getTypeStyle(acc.accountType);
          return (
            <TouchableOpacity
              key={acc.id}
              activeOpacity={0.82}
              onPress={() => { setSelectedVerified(acc); setStrikeModal(true); }}
              style={[s.verifiedCard, { backgroundColor: ts.bg, borderColor: ts.accent + '35' }]}
            >
              <View style={[s.accentStrip, { backgroundColor: ts.accent }]} />
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[s.itemType, { color: ts.accent }]}>{ts.label}</Text>
                <Text style={s.itemName}>{acc.displayName}</Text>
                <Text style={s.itemEmail}>{acc.email}</Text>
                {acc.status !== 'active' && (
                  <Text style={[s.itemDoc, { color: C.danger, marginTop: 2 }]}>
                    {acc.status.toUpperCase()}
                  </Text>
                )}
                {acc.strikeCount > 0 && (
                  <View style={s.dotRow}>
                    {[1, 2, 3].map(i => (
                      <View
                        key={i}
                        style={[
                          s.dot,
                          {
                            backgroundColor: i <= acc.strikeCount
                              ? (i === 1 ? '#FFCDD2' : i === 2 ? '#EF9A9A' : '#E53935')
                              : '#E2E8F0',
                            borderColor: i <= acc.strikeCount
                              ? (i === 1 ? '#c62828' : '#b71c1c')
                              : '#CBD5E1',
                          },
                        ]}
                      />
                    ))}
                    <Text style={s.dotLabel}>
                      {acc.strikeCount} strike{acc.strikeCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
              <Feather name="chevron-right" size={16} color={ts.accent} />
            </TouchableOpacity>
          );
        })}

        <View style={s.divider} />

        {/* ── Appeal Requests ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>APPEAL REQUESTS</Text>
          {appeals.length > 0 && (
            <View style={s.countBubble}>
              <Text style={s.countTxt}>{appeals.length}</Text>
            </View>
          )}
        </View>

        {appeals.length === 0
          ? <Text style={s.emptyInline}>No active appeals.</Text>
          : appeals.map(ap => {
            const ts = getTypeStyle(ap.accountType);
            return (
              <View
                key={ap.id}
                style={[s.appealCard, { backgroundColor: ts.bg, borderColor: ts.accent + '35' }]}
              >
                <View style={[s.accentStrip, { backgroundColor: ts.accent }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={[s.itemType, { color: ts.accent }]}>{ts.label}</Text>
                  <Text style={s.itemName}>{ap.displayName}</Text>
                  <Text style={s.itemEmail}>{ap.email}</Text>
                  <Text style={s.appealReason}>"{ap.reason}"</Text>
                  <Text style={s.itemDate}>{fmtDate(ap.submittedAt)}</Text>
                  <TouchableOpacity style={s.reinstateBtn} onPress={() => handleReinstate(ap.id)}>
                    <Text style={s.reinstateTxt}>↩ Reinstate Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        }

      </ScrollView>

      <PendingModal
        visible={pendingModal}
        account={selectedPending}
        onClose={() => setPendingModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      <StrikeModal
        visible={strikeModal}
        account={selectedVerified}
        onClose={() => { setStrikeModal(false); setSelectedVerified(null); }}
        onApplyStrike={handleApplyStrike}
        onBan={handleBan}
      />
    </View>
  );
}

// ── Main screen styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.background },
  scroll:        { padding: 20, paddingBottom: 130 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8 },
  countBubble:   { backgroundColor: C.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 5 },
  countTxt:      { color: '#fff', fontSize: 10, fontWeight: '800' },
  divider:       { height: 1, backgroundColor: C.border, marginVertical: 20 },
  emptyCard:     { backgroundColor: C.surface, borderRadius: 18, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyBody:     { fontSize: 13, color: C.textSecondary },
  emptyInline:   { color: C.textMuted, fontSize: 13, marginBottom: 12 },

  pendingCard:   { borderRadius: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1 },
  accentStrip:   { width: 4, alignSelf: 'stretch' },
  pendingInfo:   { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  itemType:      { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  itemName:      { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  itemEmail:     { fontSize: 12, color: C.textSecondary, marginBottom: 2 },
  itemDoc:       { fontSize: 11, color: C.primaryLight, fontWeight: '600', marginBottom: 1 },
  itemDate:      { fontSize: 11, color: C.textMuted },

  filterRow:     { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive:    { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt:       { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  chipTxtActive: { color: '#fff' },

  verifiedCard:  { borderRadius: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1, paddingVertical: 12, paddingRight: 12 },
  dotRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  dot:           { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  dotLabel:      { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  appealCard:    { borderRadius: 14, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, paddingVertical: 12, paddingRight: 12 },
  appealReason:  { fontSize: 12, color: C.textSecondary, fontStyle: 'italic', marginVertical: 6, lineHeight: 18 },
  reinstateBtn:  { backgroundColor: '#e8f5e9', borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#a5d6a7', marginTop: 4 },
  reinstateTxt:  { color: C.primary, fontSize: 12, fontWeight: '700' },
});

// ── Pending modal styles ──────────────────────────────────────────────────────
const m = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  closeBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { color: '#fff', fontSize: 17, fontWeight: '700' },

  body:          { padding: 16, paddingBottom: 24 },
  infoCard:      { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'stretch' },
  accentBar:     { width: 4, borderRadius: 2 },
  typeLabel:     { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  name:          { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  email:         { fontSize: 13, color: C.textSecondary, marginBottom: 4 },
  sub:           { fontSize: 11, color: C.textMuted, marginBottom: 6 },
  docLabel:      { fontSize: 12, fontWeight: '700' },

  sectionLabel:  { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10 },
  docWrap:       { backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden', minHeight: 260, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  docImg:        { width: '100%', height: 340 },

  docList:       { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  docRow:        { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  docIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docRowName:    { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  docRowStatus:  { fontSize: 11, fontWeight: '600' },
  placeholderChip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  placeholderTxt:  { fontSize: 10, fontWeight: '700', color: '#94A3B8' },

  actions:       { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: Platform.OS === 'android' ? 20 : 0, paddingTop: 12, gap: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  btn:           { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  rejectBtn:     { backgroundColor: C.dangerLight, borderWidth: 1.5, borderColor: C.danger },
  approveBtn:    { backgroundColor: C.primary },
  rejectTxt:     { color: C.danger, fontSize: 15, fontWeight: '800' },
  approveTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ── Strike modal styles ───────────────────────────────────────────────────────
const sm = StyleSheet.create({
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'android' ? 28 : 36, maxHeight: '88%' },
  handle:      { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  typeLabel:   { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, borderLeftWidth: 4, marginBottom: 16, gap: 8 },
  accName:     { fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 2 },
  accEmail:    { fontSize: 12, color: C.textSecondary },
  statusChip:  { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:   { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  histLabel:   { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 8 },
  histRow:     { borderRadius: 10, padding: 10, marginBottom: 8 },
  histLevel:   { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  histReason:  { fontSize: 12, fontWeight: '500', lineHeight: 17 },

  strikeOption:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 8, backgroundColor: '#FAFAFA' },
  checkbox:      { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  strikeChip:    { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, flex: 1 },
  strikeLbl:     { fontSize: 12, fontWeight: '800' },

  reasonWrap:    { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 12, marginTop: 4, minHeight: 70 },
  reasonInput:   { fontSize: 13, color: C.textPrimary, lineHeight: 20 },

  applyBtn:      { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  applyDisabled: { backgroundColor: '#CBD5E1' },
  applyTxt:      { color: '#fff', fontSize: 14, fontWeight: '800' },

  maxNote:       { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  maxTxt:        { color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  cancelBtn:     { borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelTxt:     { color: C.textSecondary, fontSize: 14, fontWeight: '700' },
});
