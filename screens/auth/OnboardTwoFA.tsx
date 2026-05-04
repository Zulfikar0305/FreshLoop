// screens/auth/OnboardTwoFA.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StatusBar,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type Method = 'sms' | 'email' | null;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function OnboardTwoFA({
  role,
  email,
  onContinue,
  onSkip,
}: {
  role: 'home' | 'business' | 'npo';
  email: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const [method,    setMethod]    = useState<Method>(null);
  const [codeSent,  setCodeSent]  = useState(false);
  const [genCode,   setGenCode]   = useState('');
  const [entered,   setEntered]   = useState('');
  const [verified,  setVerified]  = useState(false);
  const [error,     setError]     = useState('');

  const isMandatory = role === 'business' || role === 'npo';
  const totalSteps  = isMandatory ? 5 : 4;
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c);

  const handleSendCode = () => {
    if (!method) return;
    const code = generateCode();
    setGenCode(code);
    setCodeSent(true);
    setEntered('');
    setError('');
    Alert.alert(
      '📱 Demo Mode — OTP Sent',
      `Your ${method === 'sms' ? 'SMS' : 'email'} verification code is:\n\n${code}\n\n(In production this would arrive via ${method === 'sms' ? 'SMS to your registered number' : `email to ${maskedEmail}`}.)`,
      [{ text: 'Got it', style: 'default' }],
    );
  };

  const handleVerify = () => {
    if (entered.trim() === genCode) {
      setVerified(true);
      setError('');
    } else {
      setError('Incorrect code — check and try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

      {/* Header */}
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
            backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10,
            paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' }}>
              Step 4 of {totalSteps}
            </Text>
          </View>
        </View>
        {/* Progress bar — full */}
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20, borderRadius: 2, marginBottom: 16 }}>
          <View style={{ height: 3, width: `${(4 / totalSteps) * 100}%`, backgroundColor: '#4ADE80', borderRadius: 2 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <Text style={{ color: '#1E293B', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            Two-step verification 🔑
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, lineHeight: 20 }}>
            Adds a one-time code to your login. When you sign in on a new device, we confirm it's really you before granting access.
            {isMandatory ? ' Required for your account type.' : ' Recommended but optional for Home accounts.'}
          </Text>
        </View>

        {/* Mandatory notice for business/npo */}
        {isMandatory && (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            backgroundColor: '#FFF7ED', borderRadius: 14, borderWidth: 1,
            borderColor: '#FED7AA', padding: 14, marginBottom: 20,
          }}>
            <Feather name="shield" size={15} color="#EA580C" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, color: '#9A3412', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>
              2FA is mandatory for {role === 'business' ? 'Business' : 'Coordinator'} accounts and cannot be disabled.
            </Text>
          </View>
        )}

        {/* Verified success state */}
        {verified && (
          <View style={{
            backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, marginBottom: 20,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: '#A7F3D0',
          }}>
            <Feather name="check-circle" size={20} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 14, marginBottom: 2 }}>
                2FA verified successfully!
              </Text>
              <Text style={{ color: '#047857', fontSize: 12 }}>
                You're all set. Your account is now protected.
              </Text>
            </View>
          </View>
        )}

        {/* Method selection */}
        {!verified && (
          <>
            <Text style={{
              fontSize: 10, fontWeight: '700', color: '#94A3B8',
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
            }}>
              Choose verification method
            </Text>

            {(['email', 'sms'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMethod(m); setCodeSent(false); setEntered(''); setError(''); setGenCode(''); }}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 18, padding: 18, marginBottom: 12,
                  borderWidth: method === m ? 2 : 1,
                  borderColor: method === m ? '#2D6A4F' : '#E2E8F0',
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
                }}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: method === m ? 'rgba(45,106,79,0.1)' : '#F1F5F9',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Feather
                    name={m === 'email' ? 'mail' : 'smartphone'}
                    size={22}
                    color={method === m ? '#2D6A4F' : '#94A3B8'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '800' }}>
                    {m === 'email' ? 'Email OTP' : 'SMS OTP'}
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3, lineHeight: 17 }}>
                    {m === 'email'
                      ? `Code sent to ${maskedEmail}`
                      : 'Code sent to your registered phone number'}
                  </Text>
                </View>
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  borderWidth: 2,
                  borderColor: method === m ? '#2D6A4F' : '#CBD5E1',
                  backgroundColor: method === m ? '#2D6A4F' : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {method === m && <Feather name="check" size={12} color="#fff" />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Send code button */}
            <TouchableOpacity
              onPress={handleSendCode}
              activeOpacity={0.85}
              disabled={!method}
              style={{
                backgroundColor: method ? '#2D6A4F' : '#CBD5E1',
                borderRadius: 14, paddingVertical: 14,
                alignItems: 'center', marginBottom: 20,
                shadowColor: '#2D6A4F',
                shadowOpacity: method ? 0.3 : 0, shadowRadius: 10, elevation: method ? 4 : 0,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                {codeSent ? 'Resend Code' : 'Send Test Code'}
              </Text>
            </TouchableOpacity>

            {/* Code entry */}
            {codeSent && (
              <>
                <Text style={{
                  fontSize: 10, fontWeight: '700', color: '#94A3B8',
                  letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
                }}>
                  Enter verification code
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: '#fff', borderRadius: 14,
                  borderWidth: error ? 2 : 1,
                  borderColor: error ? '#EF4444' : '#E2E8F0',
                  paddingHorizontal: 16, height: 52, marginBottom: 8,
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
                    style={{ flex: 1, fontSize: 18, color: '#1E293B', fontWeight: '700', letterSpacing: 4 }}
                  />
                  {entered.length === 6 && (
                    <Feather name="check" size={16} color="#2D6A4F" />
                  )}
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
                  disabled={entered.length !== 6}
                  style={{
                    backgroundColor: entered.length === 6 ? '#2D6A4F' : '#CBD5E1',
                    borderRadius: 14, paddingVertical: 14,
                    alignItems: 'center', marginBottom: 20,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    Verify Code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* Info banner */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: 'rgba(45,106,79,0.07)', borderRadius: 14,
          borderWidth: 1, borderColor: 'rgba(45,106,79,0.12)',
          padding: 14, marginBottom: 28,
        }}>
          <Feather name="info" size={15} color="#2D6A4F" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, color: '#2D6A4F', fontSize: 12, lineHeight: 18, fontWeight: '500' }}>
            You'll only need this code when signing in from a new device. Trusted devices skip this step automatically.
          </Text>
        </View>

        {/* Continue / skip */}
        {verified ? (
          <TouchableOpacity
            onPress={onContinue}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#2D6A4F', borderRadius: 14, paddingVertical: 15,
              alignItems: 'center', marginBottom: 12,
              shadowColor: '#2D6A4F', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              Finish Setup →
            </Text>
          </TouchableOpacity>
        ) : !isMandatory ? (
          <TouchableOpacity
            onPress={onSkip}
            activeOpacity={0.7}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
              Skip for now —{' '}
              <Text style={{ color: '#2D6A4F', fontWeight: '700' }}>
                enable later in Security Settings
              </Text>
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}
