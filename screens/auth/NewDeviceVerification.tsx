// screens/auth/NewDeviceVerification.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StatusBar,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { auth } from '../../firebase/firebaseConfig';
import { sendOtpCode, verifyOtpCode } from '../../services/authService';

const RESEND_SECONDS = 30;

export default function NewDeviceVerification({
  email,
  onContinue,
  onBack,
}: {
  email: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [sending,     setSending]     = useState(false);
  const [verifying,   setVerifying]   = useState(false);
  const [entered,     setEntered]     = useState('');
  const [verified,    setVerified]    = useState(false);
  const [error,       setError]       = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + '*'.repeat(Math.min(b.length, 5)) + c,
  );

  useEffect(() => {
    sendCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendCode = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setError('Session expired. Please sign in again.'); return; }
    setSending(true);
    setEntered('');
    setError('');
    setResendTimer(RESEND_SECONDS);
    const result = await sendOtpCode(uid, email);
    setSending(false);
    if (!result.success) setError(result.error ?? 'Could not send code.');
  };

  const handleVerify = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setError('Session expired. Please sign in again.'); return; }
    setVerifying(true);
    const result = await verifyOtpCode(uid, entered);
    setVerifying(false);
    if (result.success) {
      setVerified(true);
      setError('');
    } else {
      setError(result.error ?? 'Incorrect code — please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#1C3A2E' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
          justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 38, height: 38, borderRadius: 11, overflow: 'hidden',
              borderWidth: 1.5, borderColor: 'rgba(134,239,172,0.3)', marginRight: 10,
            }}>
              <Image
                source={require('../../assets/Logo.jpeg')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>
              Fresh<Text style={{ color: '#4ADE80' }}>Loop</Text>
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10,
            paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' }}>
              New Device
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, alignSelf: 'flex-start' }}
        >
          <Feather name="arrow-left" size={16} color="#2D6A4F" />
          <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 14 }}>Back to Login</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#1E293B', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            New device detected 🔒
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, lineHeight: 20 }}>
            A verification code was sent to{' '}
            <Text style={{ fontWeight: '700', color: '#1E293B' }}>{maskedEmail}</Text>
            . Enter it below to continue.
          </Text>
        </View>

        {/* Success */}
        {verified && (
          <View style={{
            backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, marginBottom: 20,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: '#A7F3D0',
          }}>
            <Feather name="check-circle" size={20} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 14, marginBottom: 2 }}>
                Identity verified!
              </Text>
              <Text style={{ color: '#047857', fontSize: 12 }}>
                {trustDevice
                  ? 'This device has been added to your trusted list.'
                  : 'Tap Continue to proceed.'}
              </Text>
            </View>
          </View>
        )}

        {/* Code entry */}
        {!verified && (
          <>
            <Text style={{
              fontSize: 10, fontWeight: '700', color: '#94A3B8',
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
            }}>
              Verification code
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#fff', borderRadius: 14,
              borderWidth: error ? 2 : 1,
              borderColor: error ? '#EF4444' : '#E2E8F0',
              paddingHorizontal: 16, height: 56, marginBottom: 8,
              gap: 10,
            }}>
              <Feather name="hash" size={16} color="#94A3B8" />
              <TextInput
                placeholder="6-digit code"
                placeholderTextColor="#CBD5E1"
                value={entered}
                onChangeText={t => { setEntered(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                style={{ flex: 1, fontSize: 20, color: '#1E293B', fontWeight: '700', letterSpacing: 6 }}
              />
              {entered.length === 6 && <Feather name="check" size={16} color="#2D6A4F" />}
            </View>

            {error ? (
              <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
                {error}
              </Text>
            ) : (
              <View style={{ marginBottom: 12 }} />
            )}

            <TouchableOpacity
              onPress={handleVerify}
              activeOpacity={0.85}
              disabled={entered.length !== 6 || verifying}
              style={{
                backgroundColor: entered.length === 6 ? '#2D6A4F' : '#CBD5E1',
                borderRadius: 14, paddingVertical: 14,
                alignItems: 'center', marginBottom: 16,
              }}
            >
              {verifying
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Verify Code</Text>}
            </TouchableOpacity>

            {/* Resend timer */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              {resendTimer > 0 ? (
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                  Resend code in{' '}
                  <Text style={{ fontWeight: '700', color: '#64748B' }}>{resendTimer}s</Text>
                </Text>
              ) : sending ? (
                <ActivityIndicator size="small" color="#2D6A4F" />
              ) : (
                <TouchableOpacity onPress={sendCode} activeOpacity={0.7}>
                  <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 13 }}>
                    Resend code
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Trust device toggle */}
        <TouchableOpacity
          onPress={() => setTrustDevice(p => !p)}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            backgroundColor: '#fff', borderRadius: 14, padding: 16,
            borderWidth: 1.5,
            borderColor: trustDevice ? '#2D6A4F' : '#E2E8F0',
            marginBottom: 28,
          }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 7,
            borderWidth: 2,
            borderColor: trustDevice ? '#2D6A4F' : '#CBD5E1',
            backgroundColor: trustDevice ? '#2D6A4F' : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {trustDevice && <Feather name="check" size={13} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 14 }}>
              This is my device
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
              Skip 2FA next time I sign in from this device
            </Text>
          </View>
        </TouchableOpacity>

        {/* Continue button — only shown after verified */}
        {verified && (
          <TouchableOpacity
            onPress={onContinue}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#2D6A4F', borderRadius: 14, paddingVertical: 15,
              alignItems: 'center',
              shadowColor: '#2D6A4F', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              Continue →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
