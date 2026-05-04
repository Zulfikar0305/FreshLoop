// screens/business_user/ReportScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../services/inAppNotificationService';
import CustomHeader from '../../components/CustomHeader';
import { useNavigation } from '@react-navigation/native';



const CATEGORIES = [
  { id: 'user',    label: 'Report a User',          icon: 'user'       as const, color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
  { id: 'listing', label: 'Report a Listing',        icon: 'package'    as const, color: '#F97316', bg: 'rgba(249,115,22,0.08)'  },
  { id: 'system',  label: 'Report a System Issue',   icon: 'settings'   as const, color: '#60A5FA', bg: 'rgba(96,165,250,0.08)'  },
];

export default function ReportScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [category,   setCategory]   = useState('');
  const [desc,       setDesc]       = useState('');
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docId,      setDocId]      = useState('');

  const canSubmit = category.length > 0 && desc.trim().length > 10;

  const reset = () => { setSubmitted(false); setCategory(''); setDesc(''); setDocId(''); };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, 'reports'), {
        userId:      session?.userId ?? 'anonymous',
        userName:    session?.name   ?? null,
        email:       session?.email  ?? null,
        role:        'business',
        category,
        listingRef:  null,
        description: desc.trim(),
        status:      'open',
        createdAt:   serverTimestamp(),
      });
      if (session?.userId) {
        createNotification(session.userId, {
          type:    'report',
          title:   'Report submitted',
          message: `Your "${category}" report has been received and will be reviewed within 48 hours.`,
        }).catch(() => {});
      }
      setDocId(ref.id);
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

  // ── Success state ──
  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
        <CustomHeader 
        settingsScreen="BusinessSecurity" 
        profileTab="Profile" 
        notificationsScreen="BusinessNotifications" 
      />
        <View style={{
          flex: 1, paddingHorizontal: 24,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: 'rgba(45,106,79,0.1)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 2, borderColor: '#2D6A4F',
          }}>
            <Feather name="check" size={36} color="#2D6A4F" />
          </View>

          <Text style={{
            fontSize: 22, fontWeight: '800',
            color: '#1E293B', letterSpacing: -0.5, marginBottom: 8,
          }}>
            Report Submitted
          </Text>
          <Text style={{
            fontSize: 13, color: '#64748B',
            textAlign: 'center', lineHeight: 20, marginBottom: 20,
          }}>
            Your ticket has been sent to the Admin queue.{'\n'}
            You'll receive a response within 24–48 hours.
          </Text>

          <View style={{
            backgroundColor: '#fff', borderRadius: 16,
            paddingHorizontal: 20, paddingVertical: 12,
            borderWidth: 1, borderColor: '#F1F5F9',
            marginBottom: 24,
          }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textAlign: 'center', marginBottom: 2 }}>
              TICKET ID
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', textAlign: 'center', letterSpacing: 1 }}>
              {docId ? `RPT-${docId.slice(0, 8).toUpperCase()}` : 'RPT-...'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={reset}
            activeOpacity={0.85}
            style={{
              width: '100%', borderWidth: 1.5,
              borderColor: '#2D6A4F', borderRadius: 14,
              paddingVertical: 14, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
            }}
          >
            <Feather name="plus" size={16} color="#2D6A4F" />
            <Text style={{ color: '#2D6A4F', fontWeight: '800', fontSize: 14 }}>
              Submit Another
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Form ──
  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader 
        settingsScreen="BusinessSecurity" 
        profileTab="Profile" 
        notificationsScreen="BusinessNotifications" 
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}
        >
          <Feather name="arrow-left" size={16} color="#2D6A4F" />
          <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 14 }}>Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={{
          color: '#1E293B', fontSize: 22, fontWeight: '800',
          letterSpacing: -0.5, marginBottom: 4,
        }}>
          Report an Issue
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 24, lineHeight: 19 }}>
          Help us keep FreshLoop safe and reliable.{'\n'}All reports are reviewed within 48 hours.
        </Text>

        {/* Category */}
        <Text style={{
          color: '#94A3B8', fontSize: 11, fontWeight: '700',
          letterSpacing: 1, textTransform: 'uppercase',
          marginBottom: 10, paddingLeft: 2,
        }}>
          Issue Category
        </Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {CATEGORIES.map(cat => {
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 18, padding: 16,
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  borderWidth: isSelected ? 1.5 : 1,
                  borderColor: isSelected ? cat.color : '#E2E8F0',
                  shadowColor: '#000', shadowOpacity: 0.04,
                  shadowRadius: 8, elevation: 2,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 13,
                  backgroundColor: isSelected ? cat.bg : '#F1F5F9',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Feather
                    name={cat.icon}
                    size={19}
                    color={isSelected ? cat.color : '#94A3B8'}
                  />
                </View>
                <Text style={{
                  flex: 1, fontWeight: '700', fontSize: 14,
                  color: isSelected ? '#1E293B' : '#64748B',
                }}>
                  {cat.label}
                </Text>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 1.5,
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

        {/* Description */}
        <Text style={{
          color: '#94A3B8', fontSize: 11, fontWeight: '700',
          letterSpacing: 1, textTransform: 'uppercase',
          marginBottom: 10, paddingLeft: 2,
        }}>
          Description
        </Text>
        <View style={{
          backgroundColor: '#fff', borderRadius: 18,
          borderWidth: 1, borderColor: '#E2E8F0',
          padding: 14, marginBottom: 20,
          shadowColor: '#000', shadowOpacity: 0.03,
          shadowRadius: 6, elevation: 1,
        }}>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe the issue in as much detail as possible. Include any relevant dates, names, or listing IDs."
            placeholderTextColor="#CBD5E1"
            multiline
            textAlignVertical="top"
            style={{
              fontSize: 14, color: '#1E293B',
              minHeight: 120, lineHeight: 21,
            }}
          />
        </View>

        {/* Attachment */}
        <Text style={{
          color: '#94A3B8', fontSize: 11, fontWeight: '700',
          letterSpacing: 1, textTransform: 'uppercase',
          marginBottom: 10, paddingLeft: 2,
        }}>
          Attachments (Optional)
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            backgroundColor: '#fff',
            borderRadius: 18, borderWidth: 1.5,
            borderColor: '#E2E8F0', borderStyle: 'dashed',
            padding: 20, flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, marginBottom: 28,
          }}
        >
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: '#F1F5F9',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Feather name="paperclip" size={18} color="#94A3B8" />
          </View>
          <Text style={{ fontWeight: '700', fontSize: 14, color: '#94A3B8' }}>
            Attach screenshot or photo
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={canSubmit && !submitting ? 0.85 : 1}
          disabled={!canSubmit || submitting}
          style={{
            backgroundColor: canSubmit ? '#2D6A4F' : '#CBD5E1',
            borderRadius: 14, paddingVertical: 15,
            alignItems: 'center', flexDirection: 'row',
            justifyContent: 'center', gap: 8,
            shadowColor: '#2D6A4F',
            shadowOpacity: canSubmit ? 0.3 : 0,
            shadowRadius: 10, elevation: canSubmit ? 4 : 0,
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={16} color="#fff" />
          )}
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            {submitting ? 'Submitting…' : 'Submit Report'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}