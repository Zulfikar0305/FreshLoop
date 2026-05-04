// screens/npo_user/NPOSecurityScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import {
  enableBiometric,
  setBiometricFlag,
  getBiometricFlag,
  checkBiometricSupport,
} from '../../services/authService';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';

// ── Data ──────────────────────────────────────────────────────────────────────
const ACTIVE_SESSIONS = [
  { id: '1', device: 'Samsung Galaxy S24', location: 'Durban, ZA',   lastActive: 'Now',       current: true  },
  { id: '2', device: 'iPhone 15 Pro',      location: 'Pinetown, ZA', lastActive: '2 hrs ago', current: false },
  { id: '3', device: 'Lenovo Tab',         location: 'Westville, ZA',lastActive: 'Yesterday', current: false },
];

// ── Password field helper ────────────────────────────────────────────────────
function PasswordField({
  label, placeholder, value, onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{
        fontSize: 11, fontWeight: '700', color: '#94A3B8',
        letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7,
      }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8FAFC', borderRadius: 14,
        borderWidth: 1, borderColor: '#E2E8F0',
        paddingHorizontal: 14, height: 50,
      }}>
        <Feather name="lock" size={15} color="#94A3B8" style={{ marginRight: 10 }} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
          secureTextEntry={!show}
          value={value}
          onChangeText={onChangeText}
          style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
        />
        <TouchableOpacity onPress={() => setShow(p => !p)}>
          <Feather name={show ? 'eye-off' : 'eye'} size={15} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      color: '#94A3B8', fontSize: 11, fontWeight: '700',
      letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
    }}>
      {text}
    </Text>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function NPOSecurityScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  // ── Biometric state ──
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [bioAvailable,        setBioAvailable]        = useState(true);
  const [bioLoading,          setBioLoading]          = useState(false);

  // ── Password state ──
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supported = await checkBiometricSupport();
      setBioAvailable(supported);
      if (supported) {
        const flag = await getBiometricFlag();
        setIsBiometricsEnabled(flag);
      }
    })();
  }, []);

  const handleChangePassword = async () => {
    if (!currentPwd) { Alert.alert('Required', 'Please enter your current password.'); return; }
    if (newPwd.length < 8) { Alert.alert('Too Short', 'New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
    const user = auth.currentUser;
    if (!user || !user.email) { Alert.alert('Error', 'You must be signed in to change your password.'); return; }
    setPwdLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      setPwdLoading(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => { setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); } },
      ]);
    } catch (e: any) {
      setPwdLoading(false);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        Alert.alert('Wrong Password', 'The current password you entered is incorrect.');
      } else if (e.code === 'auth/too-many-requests') {
        Alert.alert('Too Many Attempts', 'Too many failed attempts. Please wait and try again.');
      } else if (e.code === 'auth/requires-recent-login') {
        Alert.alert('Session Expired', 'Please sign out and sign back in before changing your password.');
      } else {
        Alert.alert('Error', 'Could not update password. Please try again.');
      }
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!bioAvailable) return;
    setBioLoading(true);
    if (value) {
      const result = await enableBiometric(session?.userId ?? '');
      setBioLoading(false);
      if (result.success) {
        setIsBiometricsEnabled(true);
      } else {
        Alert.alert('Biometrics', result.error ?? 'Could not enable biometric login.');
      }
    } else {
      await setBiometricFlag(false);
      if (session?.userId) {
        try {
          await setDoc(doc(db, 'users', session.userId), { biometricEnabled: false }, { merge: true });
        } catch {}
      }
      setBioLoading(false);
      setIsBiometricsEnabled(false);
    }
  };

  const card = {
    backgroundColor: '#fff', borderRadius: 20,
    marginBottom: 16, shadowColor: '#000' as const,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden' as const,
  };

  const iconBox = (bg: string) => ({
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  });

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader settingsScreen="NPOSecurity" notificationsScreen="NPONotifications" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 130,
        }}
      >

        {/* ── Page title ── */}
        <Text style={{
          color: '#1E293B', fontSize: 22,
          fontWeight: '800', letterSpacing: -0.5, marginBottom: 4,
        }}>
          Security Settings
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
          Coordinator account
        </Text>

        {/* ── 2FA mandatory banner ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: 'rgba(45,106,79,0.08)',
          borderRadius: 16, borderWidth: 1,
          borderColor: 'rgba(45,106,79,0.15)',
          padding: 14, marginBottom: 20,
        }}>
          <Feather name="shield" size={16} color="#2D6A4F" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 13, fontWeight: '800',
              color: '#2D6A4F', marginBottom: 3,
            }}>
              Two-Step Verification is Mandatory
            </Text>
            <Text style={{
              fontSize: 12, color: '#475569',
              lineHeight: 18,
            }}>
              As a Coordinator account, 2FA cannot be disabled. It is required on every new device login to protect donation chain of custody.
            </Text>
          </View>
        </View>

        {/* ── Login Methods ── */}
        <SectionLabel text="LOGIN METHODS" />
        <View style={card}>
          {/* Biometrics */}
          <View style={rowStyle}>
            <View style={iconBox(
              isBiometricsEnabled ? 'rgba(45,106,79,0.1)' : '#F1F5F9',
            )}>
              {bioLoading ? (
                <ActivityIndicator size="small" color="#2D6A4F" />
              ) : (
                <Feather
                  name="smartphone"
                  size={17}
                  color={isBiometricsEnabled ? '#2D6A4F' : '#94A3B8'}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                Biometric Login
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                {bioAvailable ? 'Fingerprint / Face ID' : 'Not available on this device'}
              </Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!bioAvailable || bioLoading}
              trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }}
              thumbColor="#fff"
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </View>

        {/* ── Two-Step Verification ── */}
        <SectionLabel text="TWO-STEP VERIFICATION" />
        <View style={card}>
          {/* SMS OTP */}
          <View style={rowStyle}>
            <View style={iconBox('rgba(34,197,94,0.1)')}>
              <Feather name="phone" size={17} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                SMS OTP
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                +27 *** *** 7890 · Active
              </Text>
            </View>
            <View style={{
              backgroundColor: 'rgba(22,163,74,0.1)',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ color: '#16A34A', fontSize: 10, fontWeight: '800' }}>
                ON
              </Text>
            </View>
          </View>

          <Divider />

          {/* Email OTP */}
          <View style={rowStyle}>
            <View style={iconBox('#F1F5F9')}>
              <Feather name="mail" size={17} color="#94A3B8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                Email OTP
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                Fallback option · Not configured
              </Text>
            </View>
            <View style={{
              backgroundColor: '#F1F5F9',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800' }}>
                OFF
              </Text>
            </View>
          </View>
        </View>

        {/* ── Active Sessions ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 10,
        }}>
          <Text style={{
            color: '#94A3B8', fontSize: 11,
            fontWeight: '700', letterSpacing: 1, paddingLeft: 2,
          }}>
            ACTIVE SESSIONS
          </Text>
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Sign Out All Other Devices',
              'Remote session management will be available in the full release. To secure your account now, change your password.',
              [{ text: 'OK' }],
            )}
          >
            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>
              Sign Out All Others
            </Text>
          </TouchableOpacity>
        </View>

        <View style={card}>
          {ACTIVE_SESSIONS.map((session, i) => (
            <View key={session.id}>
              <View style={{
                ...rowStyle,
                paddingVertical: 12,
              }}>
                <View style={iconBox('#F1F5F9')}>
                  <Feather
                    name={
                      session.device.includes('Tab')
                        ? 'tablet'
                        : 'smartphone'
                    }
                    size={17}
                    color="#64748B"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{
                      color: '#1E293B', fontSize: 13, fontWeight: '700',
                    }}>
                      {session.device}
                    </Text>
                    {session.current && (
                      <View style={{
                        backgroundColor: 'rgba(45,106,79,0.1)',
                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                      }}>
                        <Text style={{
                          color: '#2D6A4F', fontSize: 9, fontWeight: '800',
                        }}>
                          THIS DEVICE
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                    {session.location} · {session.lastActive}
                  </Text>
                </View>
                {!session.current && (
                  <TouchableOpacity
                    onPress={() => Alert.alert(
                      'Sign Out Device',
                      'Remote device sign-out will be available in the full release. To revoke access now, change your password.',
                      [{ text: 'OK' }],
                    )}
                    style={{
                      backgroundColor: '#F1F5F9',
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                    }}
                  >
                    <Text style={{
                      fontSize: 11, fontWeight: '700', color: '#64748B',
                    }}>
                      Sign out
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {i < ACTIVE_SESSIONS.length - 1 && <Divider />}
            </View>
          ))}
        </View>

        {/* ── Change Password ── */}
        <SectionLabel text="PASSWORD" />
        <View style={{ ...card, padding: 16 }}>
          <PasswordField
            label="Current Password"
            placeholder="••••••••"
            value={currentPwd}
            onChangeText={setCurrentPwd}
          />
          <PasswordField
            label="New Password"
            placeholder="Min. 8 characters"
            value={newPwd}
            onChangeText={setNewPwd}
          />
          <PasswordField
            label="Confirm New Password"
            placeholder="Repeat new password"
            value={confirmPwd}
            onChangeText={setConfirmPwd}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleChangePassword}
            disabled={pwdLoading}
            style={{
              backgroundColor: '#2D6A4F', borderRadius: 14,
              paddingVertical: 14, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              shadowColor: '#2D6A4F', shadowOpacity: 0.3,
              shadowRadius: 8, elevation: 3,
            }}
          >
            {pwdLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="check" size={16} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
              {pwdLoading ? 'Updating…' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}