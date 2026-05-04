// screens/general_user/SecuritySettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Share,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import LegalDocumentModal from '../../components/LegalDocumentModal';

// ── Reusable card divider ─────────────────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SecuritySettingsScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  const [is2FAEnabled,          setIs2FAEnabled]          = useState(false);
  const [isBiometricsEnabled,   setIsBiometricsEnabled]   = useState(false);
  const [bioAvailable,          setBioAvailable]          = useState(true);
  const [bioLoading,            setBioLoading]            = useState(false);
  const [isAnalyticsEnabled,    setIsAnalyticsEnabled]    = useState(true);
  const [isLocationEnabled,     setIsLocationEnabled]     = useState(true);
  const [isMarketingEnabled,    setIsMarketingEnabled]    = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [showChangePwd,         setShowChangePwd]         = useState(false);
  const [currentPwd,            setCurrentPwd]            = useState('');
  const [newPwd,                setNewPwd]                = useState('');
  const [confirmPwd,            setConfirmPwd]            = useState('');
  const [showCurrent,           setShowCurrent]           = useState(false);
  const [showNew,               setShowNew]               = useState(false);
  const [showConfirm,           setShowConfirm]           = useState(false);
  const [pwdLoading,            setPwdLoading]            = useState(false);

  // ── On mount: read persisted biometric flag + check hardware ─────────────
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

  // ── Real password change via Firebase Auth ────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPwd) { Alert.alert('Required', 'Please enter your current password.'); return; }
    if (newPwd.length < 8) { Alert.alert('Too Short', 'New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }

    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert('Error', 'You must be signed in to change your password.');
      return;
    }

    setPwdLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      setPwdLoading(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => { setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); setShowChangePwd(false); } },
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

  // ── Biometrics toggle ─────────────────────────────────────────────────────
  const handleBiometricToggle = async (value: boolean) => {
    if (!bioAvailable) return;
    setBioLoading(true);
    if (value) {
      // enableBiometric handles LocalAuthentication prompt + Firestore + AsyncStorage
      const result = await enableBiometric(session?.userId ?? '');
      setBioLoading(false);
      if (result.success) {
        setIsBiometricsEnabled(true);
      } else {
        Alert.alert('Biometrics', result.error ?? 'Could not enable biometric login.');
      }
    } else {
      // Disable: clear AsyncStorage flag + Firestore
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

  // ── Shared style tokens ────────────────────────────────────────────────────
  const card = {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000' as const,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  };

  const iconBox = (bg = '#F1F5F9') => ({
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  });

  const listRow = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 15,
  };

  const listLeft = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>

      <CustomHeader />

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
          fontWeight: '800', letterSpacing: -0.5,
          marginBottom: 6,
        }}>
          Security & Privacy
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
          Manage your account security and data preferences.
        </Text>

        {/* ── Section: Login & Security ── */}
        <Text style={{
          color: '#94A3B8', fontSize: 11,
          fontWeight: '700', letterSpacing: 1,
          marginBottom: 10, paddingLeft: 2,
        }}>
          LOGIN & SECURITY
        </Text>

        <View style={card}>

          {/* Change Password */}
          <TouchableOpacity style={listRow} activeOpacity={0.7} onPress={() => setShowChangePwd(p => !p)}>
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="lock" size={17} color="#475569" />
              </View>
              <View>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  Change Password
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Last changed 3 months ago
                </Text>
              </View>
            </View>
            <Feather name={showChangePwd ? 'chevron-up' : 'chevron-right'} size={18} color="#CBD5E1" />
          </TouchableOpacity>
          {showChangePwd && (
            <View style={{ paddingBottom: 14, gap: 10 }}>
              {([
                { label: 'Current Password', val: currentPwd, set: setCurrentPwd, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
                { label: 'New Password', val: newPwd, set: setNewPwd, show: showNew, toggle: () => setShowNew(p => !p) },
                { label: 'Confirm New Password', val: confirmPwd, set: setConfirmPwd, show: showConfirm, toggle: () => setShowConfirm(p => !p) },
              ] as { label: string; val: string; set: (v: string) => void; show: boolean; toggle: () => void }[]).map(f => (
                <View key={f.label}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#F8FAFC' }}>
                    <TextInput value={f.val} onChangeText={f.set} secureTextEntry={!f.show} placeholder="••••••••" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', paddingVertical: 12 }} />
                    <TouchableOpacity onPress={f.toggle}><Feather name={f.show ? 'eye-off' : 'eye'} size={15} color="#94A3B8" /></TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={pwdLoading}
                onPress={handleChangePassword}
                style={{ backgroundColor: pwdLoading ? '#94A3B8' : '#2D6A4F', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}
              >
                {pwdLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Update Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <Divider />

          {/* 2FA */}
          <View style={listRow}>
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="smartphone" size={17} color="#475569" />
              </View>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  Two-Factor Auth (2FA)
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Demo only — not enforced in this version
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: '#E2E8F0' }}
              thumbColor="#fff"
              ios_backgroundColor="#E2E8F0"
              onValueChange={() => {}}
              value={false}
              disabled
            />
          </View>

          <Divider />

          {/* Biometrics */}
          <View style={listRow}>
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="smile" size={17} color="#475569" />
              </View>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  Biometric Login
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  {bioAvailable
                    ? 'Use fingerprint or face scan'
                    : 'Not available — no biometrics enrolled on this device'}
                </Text>
              </View>
            </View>
            {bioLoading
              ? <ActivityIndicator size="small" color="#2D6A4F" style={{ marginRight: 4 }} />
              : <Switch
                  trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }}
                  thumbColor="#fff"
                  ios_backgroundColor="#E2E8F0"
                  disabled={!bioAvailable}
                  onValueChange={handleBiometricToggle}
                  value={isBiometricsEnabled}
                />
            }
          </View>

          <Divider />

          {/* Active session */}
          <View style={listRow}>
            <View style={listLeft}>
              <View style={iconBox('rgba(74,222,128,0.12)')}>
                <Feather name="check-circle" size={17} color="#16A34A" />
              </View>
              <View>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  HONOR WDY-LX2
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Current device · Durban, ZA
                </Text>
              </View>
            </View>
            <View style={{
              backgroundColor: 'rgba(74,222,128,0.12)',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
            }}>
              <Text style={{ color: '#16A34A', fontSize: 10, fontWeight: '700' }}>
                ACTIVE
              </Text>
            </View>
          </View>

          <Divider />

          {/* Log out all */}
          <TouchableOpacity style={{ ...listRow, justifyContent: 'center' }} activeOpacity={0.7}>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>
              Log out of all other devices
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Section: Privacy & Data (POPIA) ── */}
        <Text style={{
          color: '#94A3B8', fontSize: 11,
          fontWeight: '700', letterSpacing: 1,
          marginBottom: 10, paddingLeft: 2,
        }}>
          PRIVACY & DATA (POPIA)
        </Text>

        {/* POPIA info banner */}
        <View style={{
          backgroundColor: '#2D6A4F',
          borderRadius: 14,
          flexDirection: 'row', alignItems: 'flex-start',
          padding: 14, marginBottom: 14, gap: 10,
        }}>
          <Feather name="shield" size={16} color="#fff" style={{ marginTop: 1 }} />
          <Text style={{ color: '#fff', fontSize: 12, lineHeight: 18, flex: 1, fontWeight: '500' }}>
            FreshLoop complies with POPIA. You control your data — toggle sharing preferences below or download a copy anytime.
          </Text>
        </View>

        <View style={card}>

          {/* Share Analytics */}
          <View style={listRow}>
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="pie-chart" size={17} color="#475569" />
              </View>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  Share Analytics
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Anonymous usage data to improve the app
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }}
              thumbColor="#fff"
              ios_backgroundColor="#E2E8F0"
              onValueChange={setIsAnalyticsEnabled}
              value={isAnalyticsEnabled}
            />
          </View>

          <Divider />

          {/* Location */}
          <View style={listRow}>
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="map-pin" size={17} color="#475569" />
              </View>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  Location Access
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Used to find nearby donation points
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }}
              thumbColor="#fff"
              ios_backgroundColor="#E2E8F0"
              onValueChange={setIsLocationEnabled}
              value={isLocationEnabled}
            />
          </View>

          <Divider />

          {/* Marketing */}
          <View style={listRow}>
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="mail" size={17} color="#475569" />
              </View>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  Marketing Emails
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Tips, news and product updates
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }}
              thumbColor="#fff"
              ios_backgroundColor="#E2E8F0"
              onValueChange={setIsMarketingEnabled}
              value={isMarketingEnabled}
            />
          </View>

          <Divider />

          {/* Download Data */}
          <TouchableOpacity
            style={listRow}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                'Download My Data',
                'Your data export will include profile info, pantry history, and activity logs.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Export', onPress: () => Share.share({ message: 'FreshLoop Data Export\n\nProfile: Home User\nPantry items: 12\nDonations requested: 5\nAccount created: January 2025\n\nThis is your personal data export in compliance with POPIA.', title: 'My FreshLoop Data' }) },
                ]
              );
            }}
          >
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="download-cloud" size={17} color="#475569" />
              </View>
              <View>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                  Download My Data
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Request a copy of your information
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <Divider />

          {/* Delete Account */}
          <TouchableOpacity
            style={listRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert(
              'Delete Account',
              'This will permanently delete your account and all associated data. This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Request Submitted', 'Your account deletion request has been submitted. You will receive a confirmation email within 48 hours.') },
              ]
            )}
          >
            <View style={listLeft}>
              <View style={iconBox('rgba(239,68,68,0.1)')}>
                <Feather name="trash-2" size={17} color="#EF4444" />
              </View>
              <View>
                <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>
                  Delete Account
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                  Permanently remove your data
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* ── Section: About & Legal ── */}
        <Text style={{
          color: '#94A3B8', fontSize: 11,
          fontWeight: '700', letterSpacing: 1,
          marginBottom: 10, paddingLeft: 2,
        }}>
          ABOUT & LEGAL
        </Text>

        <View style={card}>

          <TouchableOpacity
            style={listRow}
            activeOpacity={0.7}
            onPress={() => setLegalModal('privacy')}
          >
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="file-text" size={17} color="#475569" />
              </View>
              <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                Privacy Policy
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            style={listRow}
            activeOpacity={0.7}
            onPress={() => setLegalModal('terms')}
          >
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="book-open" size={17} color="#475569" />
              </View>
              <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                Terms of Service
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <LegalDocumentModal
            visible={legalModal === 'privacy'}
            type="privacy"
            onClose={() => setLegalModal(null)}
            requireScroll={false}
          />
          <LegalDocumentModal
            visible={legalModal === 'terms'}
            type="terms"
            onClose={() => setLegalModal(null)}
            requireScroll={false}
          />

          <Divider />

          <View style={{ ...listRow, justifyContent: 'space-between' }}>
            <View style={listLeft}>
              <View style={iconBox()}>
                <Feather name="info" size={17} color="#475569" />
              </View>
              <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>
                App Version
              </Text>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>
              v1.0.0
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}