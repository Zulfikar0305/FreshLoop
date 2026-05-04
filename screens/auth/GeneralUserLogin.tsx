// screens/auth/GeneralUserLogin.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import LegalDocumentModal from '../../components/LegalDocumentModal';
import {
  registerHomeUser,
  signInUser,
  biometricSignIn,
  checkBiometricAvailable,
  googleSignInHome,
  AuthSession,
} from '../../services/authService';

WebBrowser.maybeCompleteAuthSession();

type Tab = 'signin' | 'register';

function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: '#94A3B8',
      letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7,
    }}>
      {label}
    </Text>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  placeholder: string;
  value?: string;
  onChangeText?: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
      paddingHorizontal: 14, height: 50, marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    }}>
      <Feather name={icon} size={16} color="#94A3B8" style={{ marginRight: 10 }} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !showPassword}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
          <Feather
            name={showPassword ? 'eye-off' : 'eye'}
            size={16} color="#94A3B8"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#FEF2F2', borderRadius: 10,
      borderWidth: 1, borderColor: '#FECACA',
      padding: 10, marginBottom: 12,
    }}>
      <Feather name="alert-circle" size={14} color="#EF4444" />
      <Text style={{ flex: 1, color: '#EF4444', fontSize: 12, fontWeight: '500' }}>
        {message}
      </Text>
    </View>
  );
}

// Isolated component so useAuthRequest is never called when Google is unavailable
function GoogleAuthButton({
  onSignIn,
  onError,
  disabled,
}: {
  onSignIn: (session: AuthSession) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [, googleResponse, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (!googleResponse || googleResponse.type !== 'success') return;
    const idToken = googleResponse.authentication?.idToken;
    if (!idToken) {
      onError('Google did not return an ID token. Please try again.');
      return;
    }
    setGoogleLoading(true);
    googleSignInHome(idToken)
      .then(result => {
        setGoogleLoading(false);
        if (!result.success) { onError(result.error ?? 'Google sign-in failed.'); return; }
        onSignIn(result.session!);
      })
      .catch(() => {
        setGoogleLoading(false);
        onError('Google sign-in failed. Please try again.');
      });
  }, [googleResponse]);

  return (
    <TouchableOpacity
      onPress={googleLoading || disabled ? undefined : () => promptAsync()}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 10,
        paddingVertical: 13,
        borderWidth: 1.5, borderColor: '#E2E8F0',
        borderRadius: 14, backgroundColor: '#FAFAFA',
        opacity: googleLoading ? 0.7 : 1,
      }}
    >
      {googleLoading
        ? <ActivityIndicator size="small" color="#94A3B8" />
        : (
          <>
            <AntDesign name="google" size={17} color="#DB4437" />
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569' }}>
              Continue with Google
            </Text>
          </>
        )
      }
    </TouchableOpacity>
  );
}

export default function GeneralUserLogin({
  onSignIn,
  onRegister,
  onBack,
}: {
  onSignIn: (session: AuthSession) => void;
  onRegister: (session: AuthSession) => void;
  onBack?: () => void;
}) {
  const [tab,           setTab]          = useState<Tab>('signin');
  const [email,         setEmail]        = useState('');
  const [password,      setPassword]     = useState('');
  const [fullName,      setFullName]     = useState('');
  const [confirmPass,   setConfirmPass]  = useState('');
  const [faceAuth,           setFaceAuth]           = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [agreeTerms,         setAgreeTerms]         = useState(false);

  useEffect(() => {
    checkBiometricAvailable().then(setBiometricAvailable);
  }, []);
  const [loading,       setLoading]      = useState(false);
  const [error,         setError]        = useState('');
  const [legalModal,    setLegalModal]   = useState<'privacy' | 'terms' | null>(null);
  const [agreedPrivacy, setAgreedPrivacy]= useState(false);
  const [agreedTermsDoc,setAgreedTermsDoc]=useState(false);
  // On Android, never mount GoogleAuthButton — the hook must not run at all.
  // On other platforms, also skip if no web client ID is configured.
  const googleUnavailable =
    Platform.OS === 'android' ||
    !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    const result = await signInUser(email, password, 'home');
    setLoading(false);
    if (!result.success) { setError(result.error ?? 'Sign in failed.'); return; }
    onSignIn(result.session!);
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    const result = await registerHomeUser({ fullName, email, password, confirmPass });
    setLoading(false);
    if (!result.success) { setError(result.error ?? 'Registration failed.'); return; }
    onRegister(result.session!);
  };

  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    const result = await biometricSignIn('home');
    setLoading(false);
    if (!result.success) return; // silent fallback — user can still use email/password
    setFaceAuth(true);
    onSignIn(result.session!);
  };

  const switchTab = (t: Tab) => { setTab(t); setError(''); };

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
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={onBack}
            activeOpacity={0.7}
          >
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
          </TouchableOpacity>

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: 'rgba(74,222,128,0.12)',
            borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)',
          }}>
            <Feather name="home" size={12} color="#4ADE80" />
            <Text style={{ color: '#4ADE80', fontSize: 11, fontWeight: '700' }}>
              Home User
            </Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Welcome text ── */}
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <Text style={{
            color: '#1E293B', fontSize: 24,
            fontWeight: '800', letterSpacing: -0.5,
          }}>
            {tab === 'signin' ? 'Welcome back 👋' : 'Create account'}
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            {tab === 'signin'
              ? 'Sign in to continue managing your pantry.'
              : 'Join FreshLoop and start reducing food waste today.'}
          </Text>
        </View>

        {/* ── Tab switcher ── */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(0,0,0,0.06)',
          borderRadius: 14, padding: 3,
          marginBottom: 20,
        }}>
          {(['signin', 'register'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => switchTab(t)}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12,
                alignItems: 'center',
                backgroundColor: tab === t ? '#fff' : 'transparent',
                shadowColor: tab === t ? '#000' : 'transparent',
                shadowOpacity: tab === t ? 0.06 : 0,
                shadowRadius: 4,
                elevation: tab === t ? 2 : 0,
              }}
            >
              <Text style={{
                fontWeight: '700', fontSize: 13,
                color: tab === t ? '#1C3A2E' : '#94A3B8',
              }}>
                {t === 'signin' ? 'Sign In' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Form card ── */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 22,
          padding: 20, marginBottom: 16,
          shadowColor: '#000', shadowOpacity: 0.05,
          shadowRadius: 10, elevation: 2,
        }}>

          {tab === 'signin' ? (
            <>
              <FieldLabel label="Email" />
              <InputField
                icon="mail" placeholder="you@example.com"
                value={email} onChangeText={setEmail}
                keyboardType="email-address"
              />

              <FieldLabel label="Password" />
              <InputField
                icon="lock" placeholder="••••••••"
                value={password} onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -6 }}
              >
                <Text style={{ fontSize: 12, color: '#2D6A4F', fontWeight: '600' }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>

              <ErrorBanner message={error} />

              <TouchableOpacity
                onPress={loading ? undefined : handleSignIn}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#2D6A4F',
                  borderRadius: 14, paddingVertical: 15,
                  alignItems: 'center', marginBottom: 16,
                  shadowColor: '#2D6A4F',
                  shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Sign In</Text>
                }
              </TouchableOpacity>

              {biometricAvailable && (
                <>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    marginBottom: 16, gap: 10,
                  }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                    <Text style={{ fontSize: 12, color: '#CBD5E1' }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                  </View>

                  <TouchableOpacity
                    onPress={loading ? undefined : handleBiometric}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: 10,
                      paddingVertical: 13,
                      borderWidth: 1.5,
                      borderColor: faceAuth ? 'rgba(45,106,79,0.4)' : '#E2E8F0',
                      borderRadius: 14,
                      backgroundColor: faceAuth ? 'rgba(45,106,79,0.06)' : '#FAFAFA',
                    }}
                  >
                    <Feather
                      name={faceAuth ? 'check-circle' : 'cpu'}
                      size={18}
                      color={faceAuth ? '#2D6A4F' : '#94A3B8'}
                    />
                    <Text style={{
                      fontWeight: '700', fontSize: 13,
                      color: faceAuth ? '#2D6A4F' : '#475569',
                    }}>
                      {faceAuth ? 'Authenticated!' : 'Sign in with Face ID / Biometrics'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── Google sign-in ── */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                marginTop: 14, marginBottom: 14, gap: 10,
              }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                <Text style={{ fontSize: 12, color: '#CBD5E1' }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
              </View>

              {googleUnavailable ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  paddingVertical: 13,
                  borderWidth: 1.5, borderColor: '#E2E8F0',
                  borderRadius: 14, backgroundColor: '#FAFAFA',
                  opacity: 0.5,
                }}>
                  <AntDesign name="google" size={17} color="#CBD5E1" />
                  <Text style={{ fontWeight: '700', fontSize: 13, color: '#CBD5E1' }}>
                    {Platform.OS === 'android'
                      ? 'Google login unavailable on Android in this build'
                      : 'Google sign-in is not configured'}
                  </Text>
                </View>
              ) : (
                <GoogleAuthButton onSignIn={onSignIn} onError={setError} disabled={loading} />
              )}
            </>
          ) : (
            <>
              <FieldLabel label="Full Name" />
              <InputField
                icon="user" placeholder="e.g. Junior Luhanga"
                value={fullName} onChangeText={setFullName}
              />

              <FieldLabel label="Email" />
              <InputField
                icon="mail" placeholder="you@example.com"
                value={email} onChangeText={setEmail}
                keyboardType="email-address"
              />

              <FieldLabel label="Password" />
              <InputField
                icon="lock" placeholder="Min. 8 characters"
                value={password} onChangeText={setPassword}
                secureTextEntry
              />

              <FieldLabel label="Confirm Password" />
              <InputField
                icon="lock" placeholder="Repeat password"
                value={confirmPass} onChangeText={setConfirmPass}
                secureTextEntry
              />

              {password.length > 0 && (
                <View style={{ marginBottom: 14, marginTop: -6 }}>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <View key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        backgroundColor:
                          password.length >= i * 3
                            ? i <= 1 ? '#EF4444'
                            : i <= 2 ? '#F97316'
                            : i <= 3 ? '#FBBF24'
                            : '#2D6A4F'
                            : '#E2E8F0',
                      }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                    {password.length < 4 ? 'Weak' : password.length < 7 ? 'Fair' : password.length < 10 ? 'Good' : 'Strong'} password
                  </Text>
                </View>
              )}

              {/* Legal read buttons */}
              <View style={{ gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => setLegalModal('terms')}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: agreedTermsDoc ? 'rgba(45,106,79,0.08)' : '#F8FAFC',
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  }}
                >
                  <View style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: agreedTermsDoc ? '#2D6A4F' : '#E2E8F0',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Feather name={agreedTermsDoc ? 'check' : 'file-text'} size={13} color={agreedTermsDoc ? '#fff' : '#94A3B8'} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: agreedTermsDoc ? '#2D6A4F' : '#475569' }}>
                    Read Terms of Service
                  </Text>
                  {agreedTermsDoc
                    ? <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>✓ Read</Text>
                    : <Feather name="chevron-right" size={14} color="#CBD5E1" />}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setLegalModal('privacy')}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: agreedPrivacy ? 'rgba(45,106,79,0.08)' : '#F8FAFC',
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  }}
                >
                  <View style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: agreedPrivacy ? '#2D6A4F' : '#E2E8F0',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Feather name={agreedPrivacy ? 'check' : 'shield'} size={13} color={agreedPrivacy ? '#fff' : '#94A3B8'} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: agreedPrivacy ? '#2D6A4F' : '#475569' }}>
                    Read Privacy Policy
                  </Text>
                  {agreedPrivacy
                    ? <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>✓ Read</Text>
                    : <Feather name="chevron-right" size={14} color="#CBD5E1" />}
                </TouchableOpacity>
              </View>

              {/* Agree checkbox */}
              <TouchableOpacity
                onPress={() => {
                  if (!agreedTermsDoc || !agreedPrivacy) {
                    Alert.alert('Please Read First', 'You must read and agree to both the Terms of Service and Privacy Policy before continuing.');
                    return;
                  }
                  setAgreeTerms(p => !p);
                }}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 6,
                  backgroundColor: agreeTerms ? '#2D6A4F' : '#F1F5F9',
                  alignItems: 'center', justifyContent: 'center', marginTop: 1,
                }}>
                  {agreeTerms && <Feather name="check" size={11} color="#fff" />}
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18 }}>
                  I have read and agree to the{' '}
                  <Text style={{ color: '#2D6A4F', fontWeight: '700' }}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={{ color: '#2D6A4F', fontWeight: '700' }}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <ErrorBanner message={error} />

              <TouchableOpacity
                onPress={agreeTerms && !loading ? handleRegister : undefined}
                activeOpacity={0.85}
                style={{
                  backgroundColor: agreeTerms ? '#2D6A4F' : '#CBD5E1',
                  borderRadius: 14, paddingVertical: 15,
                  alignItems: 'center',
                  shadowColor: '#2D6A4F',
                  shadowOpacity: agreeTerms ? 0.3 : 0,
                  shadowRadius: 10, elevation: agreeTerms ? 4 : 0,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Create Account</Text>
                }
              </TouchableOpacity>

              {/* ── Google register ── */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                marginTop: 14, marginBottom: 14, gap: 10,
              }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                <Text style={{ fontSize: 12, color: '#CBD5E1' }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
              </View>

              {googleUnavailable ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  paddingVertical: 13,
                  borderWidth: 1.5, borderColor: '#E2E8F0',
                  borderRadius: 14, backgroundColor: '#FAFAFA',
                  opacity: 0.5,
                }}>
                  <AntDesign name="google" size={17} color="#CBD5E1" />
                  <Text style={{ fontWeight: '700', fontSize: 13, color: '#CBD5E1' }}>
                    {Platform.OS === 'android'
                      ? 'Google login unavailable on Android in this build'
                      : 'Google sign-in is not configured'}
                  </Text>
                </View>
              ) : (
                <GoogleAuthButton onSignIn={onRegister} onError={setError} disabled={loading} />
              )}
            </>
          )}
        </View>

        {/* ── Switch hint ── */}
        <TouchableOpacity
          onPress={() => switchTab(tab === 'signin' ? 'register' : 'signin')}
          activeOpacity={0.7}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: '#2D6A4F', fontWeight: '700' }}>
              {tab === 'signin' ? 'Register' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>

      <LegalDocumentModal
        visible={legalModal === 'terms'}
        type="terms"
        accentColor="#2D6A4F"
        onClose={() => setLegalModal(null)}
        onAgree={() => { setAgreedTermsDoc(true); setLegalModal(null); if (agreedPrivacy) setAgreeTerms(true); }}
      />
      <LegalDocumentModal
        visible={legalModal === 'privacy'}
        type="privacy"
        accentColor="#2D6A4F"
        onClose={() => setLegalModal(null)}
        onAgree={() => { setAgreedPrivacy(true); setLegalModal(null); if (agreedTermsDoc) setAgreeTerms(true); }}
      />
    </View>
  );
}
