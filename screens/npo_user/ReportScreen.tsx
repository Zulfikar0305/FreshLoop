// screens/npo_user/NPOReportScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../services/inAppNotificationService';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';

type CategoryId = 'user' | 'listing' | 'system';

const CATEGORIES: {
  id: CategoryId;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
  bg: string;
  description: string;
}[] = [
  {
    id: 'user',
    label: 'Report a User',
    icon: 'user-x',
    color: '#EF4444',
    bg: '#FEE2E2',
    description: 'Conduct or behaviour complaints about another user',
  },
  {
    id: 'listing',
    label: 'Report a Listing',
    icon: 'alert-triangle',
    color: '#F59E0B',
    bg: '#FEF3C7',
    description: 'Misrepresented food, safety concerns, or inaccurate details',
  },
  {
    id: 'system',
    label: 'Report a System Issue',
    icon: 'alert-octagon',
    color: '#8B5CF6',
    bg: '#EDE9FE',
    description: 'Bugs, broken features, or anything not working correctly',
  },
];

function SuccessModal({ visible, ticketId, onClose }: {
  visible: boolean;
  ticketId: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
      }}>
        <View style={{
          backgroundColor: '#fff', borderRadius: 28,
          padding: 32, alignItems: 'center', width: '100%',
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
        }}>
          {/* Icon */}
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: '#F0FDF4',
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            borderWidth: 1.5, borderColor: '#BBF7D0',
          }}>
            <Feather name="check-circle" size={34} color="#2D6A4F" />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' }}>
            Report Submitted
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 6 }}>
            Your report has been sent to the Admin Moderation Queue. A team member will review it shortly.
          </Text>

          {/* Ticket ID */}
          <View style={{
            backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1,
            borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 8,
            marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <Feather name="hash" size={12} color="#94A3B8" />
            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>
              Ticket {ticketId ? `RPT-${ticketId.slice(0, 8).toUpperCase()}` : 'RPT-...'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#2D6A4F', borderRadius: 14,
              paddingVertical: 15, alignItems: 'center', width: '100%',
              shadowColor: '#2D6A4F', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function NPOReportScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [description,      setDescription]      = useState('');
  const [showSuccess,      setShowSuccess]      = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [docId,            setDocId]            = useState('');

  const canSubmit = !!selectedCategory && description.length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, 'reports'), {
        userId:      session?.userId   ?? 'anonymous',
        userName:    session?.name     ?? null,
        email:       session?.email    ?? null,
        role:        'npo',
        category:    selectedCategory,
        listingRef:  null,
        description: description.trim(),
        status:      'open',
        createdAt:   serverTimestamp(),
      });
      if (session?.userId) {
        createNotification(session.userId, {
          type:    'report',
          title:   'Report submitted',
          message: `Your "${selectedCategory}" report has been received and will be reviewed within 48 hours.`,
        }).catch(() => {});
      }
      setDocId(ref.id);
      setShowSuccess(true);
    } catch {
      Alert.alert(
        'Submission failed',
        'Could not submit your report. Please check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader settingsScreen="NPOSecurity" notificationsScreen="NPONotifications" />
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 130 }}
      >

        {/* ── Page title bar ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              style={{
                width: 34, height: 34, borderRadius: 10,
                backgroundColor: '#fff',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: '#E2E8F0',
              }}
            >
              <Feather name="arrow-left" size={16} color="#64748B" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 }}>
                Report
              </Text>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 1 }}>
                Submit an issue to Admin
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>

          {/* ── Category selector ── */}
          <Text style={{
            fontSize: 11, fontWeight: '700', color: '#94A3B8',
            letterSpacing: 1, marginBottom: 12,
          }}>
            SELECT ISSUE TYPE
          </Text>

          <View style={{ gap: 10, marginBottom: 24 }}>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#fff',
                    borderRadius: 20, padding: 16,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? cat.color : '#E2E8F0',
                    shadowColor: '#000', shadowOpacity: 0.04,
                    shadowRadius: 8, elevation: 2,
                  }}
                >
                  {/* Icon */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 13,
                    backgroundColor: cat.bg,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Feather name={cat.icon} size={19} color={cat.color} />
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>
                      {cat.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 17 }}>
                      {cat.description}
                    </Text>
                  </View>

                  {/* Radio */}
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 2,
                    borderColor: isSelected ? cat.color : '#CBD5E1',
                    backgroundColor: isSelected ? cat.color : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <Feather name="check" size={11} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Description ── */}
          <Text style={{
            fontSize: 11, fontWeight: '700', color: '#94A3B8',
            letterSpacing: 1, marginBottom: 10,
          }}>
            DESCRIPTION
          </Text>
          <View style={{
            backgroundColor: '#fff', borderRadius: 16,
            borderWidth: 1.5,
            borderColor: description.length > 0 && description.length < 20
              ? '#F97316' : '#E2E8F0',
          }}>
            <TextInput
              placeholder="Describe the issue in as much detail as possible..."
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              style={{
                paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 14, color: '#1E293B', minHeight: 120, lineHeight: 22,
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: description.length < 20 && description.length > 0 ? '#F97316' : '#94A3B8' }}>
              {description.length < 20 && description.length > 0
                ? `${20 - description.length} more characters needed`
                : 'Minimum 20 characters'}
            </Text>
            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
              {description.length} chars
            </Text>
          </View>

          {/* ── Photo attachment (coming soon) ── */}
          <Text style={{
            fontSize: 11, fontWeight: '700', color: '#94A3B8',
            letterSpacing: 1, marginBottom: 10,
          }}>
            PHOTO EVIDENCE (OPTIONAL)
          </Text>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 16, padding: 16, marginBottom: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderStyle: 'dashed',
              opacity: 0.6,
            }}
          >
            <View style={{
              width: 46, height: 46, borderRadius: 13,
              backgroundColor: '#F1F5F9',
              alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              <Feather name="camera" size={20} color="#94A3B8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#94A3B8' }}>
                Attach a photo
              </Text>
              <Text style={{ fontSize: 12, color: '#CBD5E1', marginTop: 2 }}>
                Coming soon
              </Text>
            </View>
          </View>

          {/* ── Info notice ── */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            backgroundColor: 'rgba(45,106,79,0.08)', borderRadius: 16,
            padding: 14, marginBottom: 24,
            borderWidth: 1, borderColor: 'rgba(45,106,79,0.15)',
          }}>
            <Feather name="info" size={15} color="#2D6A4F" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#2D6A4F', lineHeight: 19, fontWeight: '500' }}>
              All reports are sent directly to the Admin Moderation Queue. Coordinators are not penalised for legitimate issue reports.
            </Text>
          </View>

          {/* ── Submit button ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            activeOpacity={canSubmit && !submitting ? 0.85 : 1}
            style={{
              backgroundColor: canSubmit ? '#1C3A2E' : '#E2E8F0',
              borderRadius: 18, paddingVertical: 17,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              shadowColor: canSubmit ? '#1C3A2E' : 'transparent',
              shadowOpacity: 0.3, shadowRadius: 10, elevation: canSubmit ? 6 : 0,
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={canSubmit ? '#4ADE80' : '#94A3B8'} />
            ) : (
              <Feather name="send" size={16} color={canSubmit ? '#4ADE80' : '#94A3B8'} />
            )}
            <Text style={{
              fontWeight: '800', fontSize: 15,
              color: canSubmit ? '#fff' : '#94A3B8',
            }}>
              {submitting ? 'Submitting…' : 'Submit Report'}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        ticketId={docId ? `RPT-${docId.slice(0, 8).toUpperCase()}` : ''}
        onClose={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />
    </View>
  );
}