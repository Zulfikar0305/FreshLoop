// screens/auth/AdminLogin.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { signInUser } from '../../services/authService';
import { AuthSession } from '../../services/authService';

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12,
      padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    }}>
      <Feather name="alert-circle" size={14} color="#EF4444" />
      <Text style={{ flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 18 }}>{message}</Text>
    </View>
  );
}

type Props = {
  onSignIn: (session: AuthSession) => void;
  onBack?: () => void;
};

export default function AdminLogin({ onSignIn, onBack }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    const result = await signInUser(email, password, 'admin');
    setLoading(false);
    if (result.success && result.session) {
      onSignIn(result.session);
    } else {
      setError(result.error ?? 'Sign in failed. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1C3A2E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(134,239,172,0.3)' }}>
              <Image source={require('../../assets/Logo.jpeg')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <Text style={{ color: '#fff', fontSize: 21, fontWeight: '800', letterSpacing: -0.6 }}>
              Fresh<Text style={{ color: '#4ADE80' }}>Loop</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(167,139,250,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="shield" size={20} color="#A78BFA" />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>Admin Portal</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Restricted access · Staff only</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Form */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          flex: 1, backgroundColor: '#E2EBE1', borderTopLeftRadius: 28,
          borderTopRightRadius: 28, padding: 24, paddingTop: 28,
        }}>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(167,139,250,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', marginBottom: 24 }}>
            <Feather name="lock" size={13} color="#7C3AED" />
            <Text style={{ flex: 1, fontSize: 12, color: '#7C3AED', lineHeight: 17 }}>
              This portal is restricted to authorised FreshLoop administrators. Unauthorised access is prohibited.
            </Text>
          </View>

          <ErrorBanner message={error} />

          {/* Email */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 6 }}>EMAIL ADDRESS</Text>
          <TextInput
            style={{
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
              borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
              fontSize: 14, color: '#1E293B', marginBottom: 14,
            }}
            placeholder="admin@freshloop.co.za"
            placeholderTextColor="#CBD5E1"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 6 }}>PASSWORD</Text>
          <View style={{ position: 'relative', marginBottom: 28 }}>
            <TextInput
              style={{
                backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                paddingRight: 48, fontSize: 14, color: '#1E293B',
              }}
              placeholder="Enter your password"
              placeholderTextColor="#CBD5E1"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPass(v => !v)}
              style={{ position: 'absolute', right: 14, top: 14 }}
            >
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={loading}
            style={{
              backgroundColor: '#1C3A2E', borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
              gap: 10, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color="#4ADE80" />
              : <>
                  <Feather name="shield" size={17} color="#4ADE80" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Sign In as Admin</Text>
                </>
            }
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}
