// screens/business_user/SecurityScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
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
import CustomHeader from '../../components/CustomHeader';
import { useNavigation } from '@react-navigation/native';



function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      color: '#94A3B8', fontSize: 11, fontWeight: '700',
      letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 10, marginTop: 4, paddingLeft: 2,
    }}>
      {text}
    </Text>
  );
}

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

export default function SecurityScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [bioAvailable,        setBioAvailable]        = useState(true);
  const [bioLoading,          setBioLoading]          = useState(false);
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
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16,
    shadowColor: '#000' as const,
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  };

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
          <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 14 }}>
            Back to Profile
          </Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={{
          color: '#1E293B', fontSize: 22, fontWeight: '800',
          letterSpacing: -0.5, marginBottom: 4,
        }}>
          Security Settings
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
          Manage authentication, sessions and your password.
        </Text>

        {/* ── Authentication ── */}
        <SectionLabel text="Authentication" />
        <View style={card}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', paddingVertical: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: isBiometricsEnabled
                  ? 'rgba(45,106,79,0.1)' : '#F1F5F9',
                alignItems: 'center', justifyContent: 'center',
              }}>
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
              <View>
                <Text style={{ fontWeight: '700', fontSize: 14, color: '#1E293B' }}>
                  Biometric Login
                </Text>
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
                  {bioAvailable ? 'Fingerprint / Face ID' : 'Not available on this device'}
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!bioAvailable || bioLoading}
              trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── 2FA ── */}
        <SectionLabel text="Two-Factor Authentication" />
        <View style={{
          ...card,
          backgroundColor: '#2D6A4F',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Feather name="shield" size={15} color="#fff" />
                <Text style={{ fontWeight: '700', fontSize: 14, color: '#fff' }}>
                  2FA is Mandatory
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                Required for all business accounts
              </Text>
            </View>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4,
              borderRadius: 20, backgroundColor: '#10B981',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Active</Text>
            </View>
          </View>
        </View>

        {/* ── Active sessions ── */}
        <SectionLabel text="Active Sessions" />
        <View style={{
          ...card,
          backgroundColor: '#FFFBEB',
          borderWidth: 1,
          borderColor: 'rgba(251,191,36,0.3)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Feather name="info" size={18} color="#D97706" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 }}>
              Session management requires server-side support and is not available in this release. To revoke access from another device, change your password.
            </Text>
          </View>
        </View>

        {/* ── Change password ── */}
        <SectionLabel text="Change Password" />
        <View style={card}>
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
              backgroundColor: '#2D6A4F', borderRadius: 12,
              paddingVertical: 13, alignItems: 'center',
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