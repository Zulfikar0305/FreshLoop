// screens/general_user/ReportIssueScreen.tsx
// Reachable from: DonationHub (both tabs) + Dashboard Quick Access link.

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../services/inAppNotificationService';
import CustomHeader from '../../components/CustomHeader';

// ── Types ────────────────────────────────────────────────────────────────────
type IssueCategory =
  | 'Incorrect listing info'
  | 'Food already gone'
  | 'Safety concern'
  | 'No-show donor'
  | 'App bug / error'
  | 'Other';

const CATEGORIES: IssueCategory[] = [
  'Incorrect listing info',
  'Food already gone',
  'Safety concern',
  'No-show donor',
  'App bug / error',
  'Other',
];

const CATEGORY_ICONS: Record<IssueCategory, string> = {
  'Incorrect listing info': 'info',
  'Food already gone':      'package',
  'Safety concern':         'alert-triangle',
  'No-show donor':          'user-x',
  'App bug / error':        'cpu',
  'Other':                  'more-horizontal',
};

// ── Screen ───────────────────────────────────────────────────────────────────
export default function ReportIssueScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [category, setCategory]   = useState<IssueCategory | null>(null);
  const [listingId, setListingId] = useState('');
  const [details, setDetails]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!category && details.trim().length > 10;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        userId:      session?.userId ?? 'anonymous',
        userName:    session?.name   ?? null,
        email:       session?.email  ?? null,
        category,
        listingRef:  listingId.trim() || null,
        description: details.trim(),
        status:      'open',
        createdAt:   serverTimestamp(),
      });
      if (session?.userId) {
        createNotification(session.userId, {
          type:    'report',
          title:   'Report submitted',
          message: `Your "${category}" report has been received and will be reviewed within 24 hours.`,
        }).catch(() => {});
      }
      setSubmitted(true);
    } catch {
      Alert.alert(
        'Submission failed',
        'Could not submit your report. Please check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={s.root}>
        <CustomHeader />
        <View style={s.successWrap}>
          <View style={s.successIcon}><Text style={{ fontSize: 36 }}>✅</Text></View>
          <Text style={s.successTitle}>Report submitted</Text>
          <Text style={s.successSub}>
            Our team will review your report and follow up within 24 hours if action is needed.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={s.doneBtnText}>Back to Donation Hub</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CustomHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {/* Info banner */}
        <View style={s.infoBanner}>
          <Feather name="shield" size={14} color="#1D4ED8" />
          <Text style={s.infoBannerText}>
            Reports are anonymous and reviewed by our safety team within 24 hours. Urgent safety concerns are escalated immediately.
          </Text>
        </View>

        {/* Category picker */}
        <Text style={s.sectionTitle}>WHAT'S THE ISSUE?</Text>
        <View style={s.categoryGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              activeOpacity={0.8}
              style={[s.categoryCard, category === cat && s.categoryCardActive]}
            >
              <View style={[s.categoryIconBox, category === cat && s.categoryIconBoxActive]}>
                <Feather name={CATEGORY_ICONS[cat] as any} size={16}
                  color={category === cat ? '#fff' : '#64748B'} />
              </View>
              <Text style={[s.categoryText, category === cat && s.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Listing ID (optional) */}
        <Text style={s.fieldLabel}>LISTING REFERENCE (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="Paste the listing ID or store name if you know it"
          placeholderTextColor="#CBD5E1"
          value={listingId}
          onChangeText={setListingId}
        />
        <Text style={s.fieldHint}>You can find the listing ID in the detail sheet.</Text>

        {/* Details */}
        <Text style={s.fieldLabel}>DESCRIBE THE ISSUE *</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Tell us what happened in as much detail as possible…"
          placeholderTextColor="#CBD5E1"
          multiline
          textAlignVertical="top"
          value={details}
          onChangeText={setDetails}
        />
        <Text style={s.fieldHint}>{details.trim().length} / 500 characters</Text>

        {/* Severity note for safety concerns */}
        {category === 'Safety concern' && (
          <View style={s.urgentBanner}>
            <Feather name="alert-triangle" size={14} color="#B91C1C" />
            <Text style={s.urgentText}>
              If there is immediate danger, contact emergency services first before submitting this form.
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (!canSubmit || submitting) && { opacity: 0.45 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="flag" size={16} color="#fff" />
          }
          <Text style={s.submitText}>{submitting ? 'Submitting…' : 'Submit report'}</Text>
        </TouchableOpacity>

        <Text style={s.submitHint}>
          All reports are confidential. False reports may result in account suspension.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#E2EBE1' },
  divider:            { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  navRow:             { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  backBtn:            { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  screenTitle:        { fontSize: 20, fontWeight: '800', color: '#1E293B', letterSpacing: -0.4 },
  screenSub:          { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  infoBanner:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 24 },
  infoBannerText:     { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 18 },

  sectionTitle:       { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 12 },

  categoryGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  categoryCard:       { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  categoryCardActive: { backgroundColor: '#1C3A2E', borderColor: '#1C3A2E' },
  categoryIconBox:    { width: 32, height: 32, borderRadius: 9, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  categoryIconBoxActive:{ backgroundColor: 'rgba(255,255,255,0.2)' },
  categoryText:       { flex: 1, fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 },
  categoryTextActive: { color: '#fff' },

  fieldLabel:         { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  fieldHint:          { fontSize: 11, color: '#94A3B8', marginTop: 4, marginBottom: 12 },
  input:              { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1E293B' },
  textArea:           { minHeight: 120, textAlignVertical: 'top', paddingTop: 13 },

  urgentBanner:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FECACA', marginTop: 12 },
  urgentText:         { flex: 1, fontSize: 12, color: '#B91C1C', lineHeight: 18 },

  submitBtn:          { backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  submitText:         { fontSize: 15, fontWeight: '800', color: '#fff' },
  submitHint:         { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 17, marginTop: 10, marginBottom: 20 },

  // Success state
  successWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  successIcon:        { width: 80, height: 80, borderRadius: 24, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  successTitle:       { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  successSub:         { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  doneBtn:            { backgroundColor: '#1C3A2E', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, marginTop: 8 },
  doneBtnText:        { fontSize: 15, fontWeight: '800', color: '#fff' },
});