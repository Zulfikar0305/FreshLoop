// screens/auth/OnboardSecurity.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { enableBiometric } from '../../services/authService';

export default function OnboardSecurity({
  userId,
  role,
  onContinue,
  onSkip,
}: {
  userId: string;
  role?: 'home' | 'business' | 'npo';
  onContinue: () => void;
  onSkip: () => void;
}) {
  const totalSteps = (role === 'business' || role === 'npo') ? 5 : 4;
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false);
  const [faceEnabled,        setFaceEnabled]        = useState(false);
  const [hasFingerprint,     setHasFingerprint]     = useState(false);
  const [hasFace,            setHasFace]            = useState(false);

  useEffect(() => {
    (async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setHasFingerprint(types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT));
      setHasFace(types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION));
    })();
  }, []);

  const nothingEnabled = !fingerprintEnabled && !faceEnabled;

  const handleToggleFingerprint = async () => {
    if (fingerprintEnabled) { setFingerprintEnabled(false); return; }
    const result = await enableBiometric(userId, 'Place your finger on the sensor to enable fingerprint login');
    if (result.success) {
      setFingerprintEnabled(true);
    } else {
      Alert.alert('Fingerprint Unavailable', result.error ?? 'Could not enable fingerprint.');
    }
  };

  const handleToggleFace = async () => {
    if (faceEnabled) { setFaceEnabled(false); return; }
    const result = await enableBiometric(userId, 'Look at the camera to enable Face ID login');
    if (result.success) {
      setFaceEnabled(true);
    } else {
      Alert.alert('Face ID Unavailable', result.error ?? 'Could not enable Face ID.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

      {/* ── Dark header ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#1C3A2E' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
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
            backgroundColor: 'rgba(255,255,255,0.09)',
            borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' }}>
              Step 2 of {totalSteps}
            </Text>
          </View>
        </View>

        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20, borderRadius: 2, marginBottom: 16 }}>
          <View style={{ height: 3, width: `${(2 / totalSteps) * 100}%`, backgroundColor: '#4ADE80', borderRadius: 2 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Title ── */}
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <Text style={{
            color: '#1E293B', fontSize: 24,
            fontWeight: '800', letterSpacing: -0.5,
          }}>
            Secure your account 🔐
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, lineHeight: 20 }}>
            Set up faster, safer login options. You can always change these later in Security Settings.
          </Text>
        </View>

        {/* ── Fingerprint card — only shown if hardware supports it ── */}
        {hasFingerprint && (
          <TouchableOpacity
            onPress={handleToggleFingerprint}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#fff',
              borderRadius: 22,
              padding: 20,
              marginBottom: 14,
              borderWidth: fingerprintEnabled ? 1.5 : 1,
              borderColor: fingerprintEnabled ? '#2D6A4F' : '#E2E8F0',
              shadowColor: '#000',
              shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: fingerprintEnabled ? 'rgba(45,106,79,0.1)' : '#F1F5F9',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Feather name="smartphone" size={24} color={fingerprintEnabled ? '#2D6A4F' : '#94A3B8'} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '800' }}>
                  Fingerprint
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3, lineHeight: 17 }}>
                  Use your fingerprint sensor to sign in instantly.
                </Text>
              </View>

              <View style={{
                width: 26, height: 26, borderRadius: 13,
                borderWidth: 1.5,
                borderColor: fingerprintEnabled ? '#2D6A4F' : '#CBD5E1',
                backgroundColor: fingerprintEnabled ? '#2D6A4F' : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {fingerprintEnabled && <Feather name="check" size={13} color="#fff" />}
              </View>
            </View>

            {fingerprintEnabled && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                marginTop: 14, backgroundColor: 'rgba(45,106,79,0.07)',
                borderRadius: 12, padding: 10,
              }}>
                <Feather name="check-circle" size={14} color="#2D6A4F" />
                <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '600' }}>
                  Fingerprint enabled — touch the sensor on next login
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── Face ID card — only shown if hardware supports facial recognition ── */}
        {hasFace && (
          <TouchableOpacity
            onPress={handleToggleFace}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#fff',
              borderRadius: 22,
              padding: 20,
              marginBottom: 14,
              borderWidth: faceEnabled ? 1.5 : 1,
              borderColor: faceEnabled ? '#2D6A4F' : '#E2E8F0',
              shadowColor: '#000',
              shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: faceEnabled ? 'rgba(45,106,79,0.1)' : '#F1F5F9',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Feather name="smile" size={24} color={faceEnabled ? '#2D6A4F' : '#94A3B8'} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '800' }}>
                  Face ID
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3, lineHeight: 17 }}>
                  Use your front camera to sign in with facial recognition.
                </Text>
              </View>

              <View style={{
                width: 26, height: 26, borderRadius: 13,
                borderWidth: 1.5,
                borderColor: faceEnabled ? '#2D6A4F' : '#CBD5E1',
                backgroundColor: faceEnabled ? '#2D6A4F' : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {faceEnabled && <Feather name="check" size={13} color="#fff" />}
              </View>
            </View>

            {faceEnabled && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                marginTop: 14, backgroundColor: 'rgba(45,106,79,0.07)',
                borderRadius: 12, padding: 10,
              }}>
                <Feather name="check-circle" size={14} color="#2D6A4F" />
                <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '600' }}>
                  Face ID enabled — look at your camera on next login
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── No biometrics available on this device ── */}
        {!hasFingerprint && !hasFace && (
          <View style={{
            backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 14,
            borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 10,
          }}>
            <Feather name="alert-circle" size={28} color="#CBD5E1" />
            <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
              No biometrics detected on this device.{'\n'}You can enable them later in Security Settings.
            </Text>
          </View>
        )}

        {/* ── Info banner ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: 'rgba(45,106,79,0.07)',
          borderRadius: 14, borderWidth: 1,
          borderColor: 'rgba(45,106,79,0.12)',
          padding: 14, marginBottom: 28,
        }}>
          <Feather name="info" size={15} color="#2D6A4F" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, color: '#2D6A4F', fontSize: 12, lineHeight: 18, fontWeight: '500' }}>
            Biometrics are also used to confirm your identity when changing your password or deleting your account.
          </Text>
        </View>

        {/* ── Continue button ── */}
        <TouchableOpacity
          onPress={onContinue}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#2D6A4F',
            borderRadius: 14, paddingVertical: 15,
            alignItems: 'center', marginBottom: 12,
            shadowColor: '#2D6A4F',
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            {nothingEnabled ? 'Continue without biometrics' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {nothingEnabled && (
          <TouchableOpacity
            onPress={onSkip}
            activeOpacity={0.7}
            style={{ alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
              Skip for now —{' '}
              <Text style={{ color: '#2D6A4F', fontWeight: '700' }}>
                set up later in Security Settings
              </Text>
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}
