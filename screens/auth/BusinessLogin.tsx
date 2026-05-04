// screens/auth/BusinessLogin.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import LegalDocumentModal from '../../components/LegalDocumentModal';
import {
  registerBusiness,
  signInUser,
  biometricSignIn,
  checkBiometricAvailable,
  AuthSession,
} from '../../services/authService';

type Tab = 'signin' | 'register';

const ACCENT = '#60A5FA';
const BIZ_TYPES = ['Supermarket', 'Restaurant', 'Bakery', 'Wholesaler', 'Other'];

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
  icon, placeholder, value, onChangeText, secureTextEntry, keyboardType,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  placeholder: string;
  value?: string;
  onChangeText?: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#fff', borderRadius: 14,
      borderWidth: 1, borderColor: '#E2E8F0',
      paddingHorizontal: 14, height: 50, marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    }}>
      <Feather name={icon} size={16} color="#94A3B8" style={{ marginRight: 10 }} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !show}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShow(p => !p)}>
          <Feather name={show ? 'eye-off' : 'eye'} size={16} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function UploadCard({ icon, title, sub, required, formats }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  sub: string;
  required?: boolean;
  formats?: string[];
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const uploaded = !!fileName;

  const handlePress = async () => {
    if (uploaded) { setFileName(null); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: formats?.some(f => ['JPG', 'PNG', 'JPEG'].includes(f))
          ? ['application/pdf',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
             'image/*']
          : ['application/pdf',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        setFileName(result.assets[0].name);
      }
    } catch {
      Alert.alert('Error', 'Could not open the file picker. Please try again.');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={{
        backgroundColor: uploaded ? 'rgba(96,165,250,0.06)' : '#F8FAFC',
        borderRadius: 16, borderWidth: 1.5,
        borderColor: uploaded ? 'rgba(96,165,250,0.4)' : '#E2E8F0',
        borderStyle: uploaded ? 'solid' : 'dashed',
        paddingVertical: 18, paddingHorizontal: 16,
        marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14,
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: uploaded ? 'rgba(96,165,250,0.12)' : '#F1F5F9',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Feather name={uploaded ? 'check-circle' : icon} size={20} color={uploaded ? ACCENT : '#94A3B8'} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: uploaded ? ACCENT : '#1E293B' }} numberOfLines={1}>
            {uploaded ? fileName : title}
          </Text>
          {required && !uploaded && (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#EF4444' }}>REQUIRED</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 11, color: uploaded ? '#1D4ED8' : '#94A3B8', marginBottom: (!uploaded && formats) ? 6 : 0 }}>
          {uploaded ? 'Tap to remove' : sub}
        </Text>
        {!uploaded && formats && (
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {formats.map(f => (
              <View key={f} style={{ backgroundColor: '#E2E8F0', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 0.3 }}>{f}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {!uploaded
        ? <Feather name="upload" size={15} color="#CBD5E1" />
        : <Feather name="x-circle" size={16} color={ACCENT} />
      }
    </TouchableOpacity>
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

export default function BusinessLogin({
  onSignIn,
  onRegister,
  onBack,
}: {
  onSignIn: (session: AuthSession) => void;
  onRegister: (session: AuthSession) => void;
  onBack?: () => void;
}) {
  const [tab,         setTab]         = useState<Tab>('signin');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [bizName,     setBizName]     = useState('');
  const [bizType,     setBizType]     = useState('');
  const [phone,       setPhone]       = useState('');
  const [vatNumber,   setVatNumber]   = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [agreeTerms,  setAgreeTerms]  = useState(false);
  const [legalModal,  setLegalModal]  = useState<'privacy' | 'terms' | null>(null);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedTerms,   setAgreedTerms]   = useState(false);
  const [faceAuth,           setFaceAuth]           = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState('');

  useEffect(() => {
    checkBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    const result = await signInUser(email, password, 'business');
    setLoading(false);
    if (!result.success) { setError(result.error ?? 'Sign in failed.'); return; }
    onSignIn(result.session!);
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    const result = await registerBusiness({ bizName, bizType, email, phone, vatNumber, password, confirmPass });
    setLoading(false);
    if (!result.success) { setError(result.error ?? 'Registration failed.'); return; }
    onRegister(result.session!);
  };

  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    const result = await biometricSignIn('business');
    setLoading(false);
    if (!result.success) return; // silent fallback — user can still use email/password
    setFaceAuth(true);
    onSignIn(result.session!);
  };

  const switchTab = (t: Tab) => { setTab(t); setError(''); };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

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
              <Image source={require('../../assets/Logo.jpeg')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>
              Fresh<Text style={{ color: '#4ADE80' }}>Loop</Text>
            </Text>
          </TouchableOpacity>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: 'rgba(96,165,250,0.12)',
            borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)',
          }}>
            <Feather name="shopping-bag" size={12} color={ACCENT} />
            <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>Business</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <Text style={{ color: '#1E293B', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            {tab === 'signin' ? 'Welcome back 🏪' : 'Register your business'}
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            {tab === 'signin'
              ? 'Sign in to manage surplus food listings and track donations.'
              : 'Join FreshLoop to list surplus food and connect with local NPOs.'}
          </Text>
        </View>

        <View style={{
          flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.06)',
          borderRadius: 14, padding: 3, marginBottom: 20,
        }}>
          {(['signin', 'register'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t} onPress={() => switchTab(t)} activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                backgroundColor: tab === t ? '#fff' : 'transparent',
                elevation: tab === t ? 2 : 0,
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: tab === t ? '#1C3A2E' : '#94A3B8' }}>
                {t === 'signin' ? 'Sign In' : 'Register Business'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{
          backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 16,
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
        }}>
          {tab === 'signin' ? (
            <>
              <FieldLabel label="Business Email" />
              <InputField icon="mail" placeholder="manager@yourbusiness.co.za" value={email} onChangeText={setEmail} keyboardType="email-address" />

              <FieldLabel label="Password" />
              <InputField icon="lock" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />

              <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -6 }}>
                <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>Forgot password?</Text>
              </TouchableOpacity>

              <ErrorBanner message={error} />

              <TouchableOpacity
                onPress={loading ? undefined : handleSignIn} activeOpacity={0.85}
                style={{
                  backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 15,
                  alignItems: 'center', marginBottom: 16,
                  shadowColor: ACCENT, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                    <Text style={{ fontSize: 12, color: '#CBD5E1' }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                  </View>

                  <TouchableOpacity
                    onPress={loading ? undefined : handleBiometric} activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                      paddingVertical: 13, borderWidth: 1.5,
                      borderColor: faceAuth ? 'rgba(96,165,250,0.4)' : '#E2E8F0',
                      borderRadius: 14,
                      backgroundColor: faceAuth ? 'rgba(96,165,250,0.06)' : '#FAFAFA',
                    }}
                  >
                    <Feather name={faceAuth ? 'check-circle' : 'cpu'} size={18} color={faceAuth ? ACCENT : '#94A3B8'} />
                    <Text style={{ fontWeight: '700', fontSize: 13, color: faceAuth ? ACCENT : '#475569' }}>
                      {faceAuth ? 'Authenticated!' : 'Sign in with Face ID / Biometrics'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              <FieldLabel label="Business Name" />
              <InputField icon="briefcase" placeholder="e.g. Pick n Pay Berea" value={bizName} onChangeText={setBizName} />

              <FieldLabel label="Business Type" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
                {BIZ_TYPES.map(type => (
                  <TouchableOpacity
                    key={type} onPress={() => setBizType(type)} activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                      borderColor: bizType === type ? ACCENT : '#E2E8F0',
                      backgroundColor: bizType === type ? 'rgba(96,165,250,0.1)' : '#F8FAFC',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: bizType === type ? ACCENT : '#94A3B8' }}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FieldLabel label="Business Email" />
              <InputField icon="mail" placeholder="manager@yourbusiness.co.za" value={email} onChangeText={setEmail} keyboardType="email-address" />

              <FieldLabel label="Contact Number" />
              <InputField icon="phone" placeholder="+27 31 000 0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <FieldLabel label="VAT Number (optional)" />
              <InputField icon="hash" placeholder="e.g. 4123456789" value={vatNumber} onChangeText={setVatNumber} keyboardType="numeric" />

              <FieldLabel label="Password" />
              <InputField icon="lock" placeholder="Min. 8 characters" value={password} onChangeText={setPassword} secureTextEntry />

              <FieldLabel label="Confirm Password" />
              <InputField icon="lock" placeholder="Repeat password" value={confirmPass} onChangeText={setConfirmPass} secureTextEntry />

              {password.length > 0 && (
                <View style={{ marginBottom: 14, marginTop: -6 }}>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <View key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        backgroundColor: password.length >= i * 3
                          ? i <= 1 ? '#EF4444' : i <= 2 ? '#F97316' : i <= 3 ? '#FBBF24' : '#2D6A4F'
                          : '#E2E8F0',
                      }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                    {password.length < 4 ? 'Weak' : password.length < 7 ? 'Fair' : password.length < 10 ? 'Good' : 'Strong'} password
                  </Text>
                </View>
              )}

              <Text style={{
                fontSize: 11, fontWeight: '700', color: '#94A3B8',
                letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 2,
              }}>
                Verification Documents
              </Text>

              <UploadCard icon="file-text" title="Trading Licence" sub="Issued by your local municipality" required formats={['PDF', 'DOCX']} />
              <UploadCard icon="shield" title="Food Safety Certificate" sub="Optional — accelerates admin approval" formats={['PDF', 'DOCX']} />
              <UploadCard icon="map-pin" title="Proof of Business Address" sub="Utility bill or lease • max 10 MB" required formats={['PDF', 'DOCX', 'JPG', 'PNG']} />

              {/* Terms & Privacy read links */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setLegalModal('terms')}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 6, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: agreedTerms ? 'rgba(96,165,250,0.12)' : '#F1F5F9',
                  }}
                >
                  {agreedTerms
                    ? <Feather name="check-circle" size={14} color={ACCENT} />
                    : <Feather name="file-text" size={14} color="#64748B" />
                  }
                  <Text style={{ fontSize: 12, fontWeight: '700', color: agreedTerms ? ACCENT : '#64748B' }}>
                    Terms of Service
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLegalModal('privacy')}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 6, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: agreedPrivacy ? 'rgba(96,165,250,0.12)' : '#F1F5F9',
                  }}
                >
                  {agreedPrivacy
                    ? <Feather name="check-circle" size={14} color={ACCENT} />
                    : <Feather name="shield" size={14} color="#64748B" />
                  }
                  <Text style={{ fontSize: 12, fontWeight: '700', color: agreedPrivacy ? ACCENT : '#64748B' }}>
                    Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => agreedTerms && agreedPrivacy ? setAgreeTerms(p => !p) : Alert.alert('Read first', 'Please read and agree to both the Terms of Service and Privacy Policy above.')}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 6,
                  backgroundColor: agreeTerms ? ACCENT : '#F1F5F9',
                  alignItems: 'center', justifyContent: 'center', marginTop: 1,
                }}>
                  {agreeTerms && <Feather name="check" size={11} color="#fff" />}
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18 }}>
                  I confirm this is a legitimate registered business and I agree to the Terms of Service and Privacy Policy
                </Text>
              </TouchableOpacity>

              {/* Legal modals */}
              <LegalDocumentModal
                visible={legalModal === 'terms'}
                type="terms"
                accentColor={ACCENT}
                onClose={() => setLegalModal(null)}
                onAgree={() => { setAgreedTerms(true); if (agreedPrivacy) setAgreeTerms(true); }}
              />
              <LegalDocumentModal
                visible={legalModal === 'privacy'}
                type="privacy"
                accentColor={ACCENT}
                onClose={() => setLegalModal(null)}
                onAgree={() => { setAgreedPrivacy(true); if (agreedTerms) setAgreeTerms(true); }}
              />

              <ErrorBanner message={error} />

              <TouchableOpacity
                onPress={agreeTerms && !loading ? handleRegister : undefined} activeOpacity={0.85}
                style={{
                  backgroundColor: agreeTerms ? ACCENT : '#CBD5E1',
                  borderRadius: 14, paddingVertical: 15, alignItems: 'center',
                  shadowColor: ACCENT, shadowOpacity: agreeTerms ? 0.3 : 0,
                  shadowRadius: 10, elevation: agreeTerms ? 4 : 0,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Submit for Review</Text>
                }
              </TouchableOpacity>

              <Text style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 10, lineHeight: 17 }}>
                Applications are reviewed within 1–2 business days.{'\n'}
                You'll receive a confirmation email once approved.
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={() => switchTab(tab === 'signin' ? 'register' : 'signin')}
          activeOpacity={0.7}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            {tab === 'signin' ? "Don't have an account? " : 'Already registered? '}
            <Text style={{ color: ACCENT, fontWeight: '700' }}>
              {tab === 'signin' ? 'Register Business' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
