// screens/business_user/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import MapPreview from '../../components/MapPreview';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BusinessStackParamList } from '../../navigation/BusinessUserNavigator';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';



type VerificationDoc = {
  fileName: string;
  storagePath: string;
  downloadURL: string;
  uploadedAt: string;
  docType: string;
};

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

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BusinessStackParamList>>();
  const { session } = useAuth();
  const [staffList,          setStaffList]          = useState<string[]>([]);
  const [docs,               setDocs]               = useState<VerificationDoc[]>([]);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [newEmail,           setNewEmail]           = useState('');
  const [hwOpen,   setHwOpen]   = useState('08:00');
  const [hwClose,  setHwClose]  = useState('17:00');
  const [hweOpen,  setHweOpen]  = useState('09:00');
  const [hweClose, setHweClose] = useState('15:00');
  const [hhOpen,   setHhOpen]   = useState('');
  const [hhClose,  setHhClose]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [dockAddress, setDockAddress] = useState('');
  const [dockLat,     setDockLat]     = useState<number | null>(null);
  const [dockLng,     setDockLng]     = useState<number | null>(null);
  const [savingDock,  setSavingDock]  = useState(false);
  const dockGeocodeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.userId) return;
    getDoc(doc(db, 'users', session.userId)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.operatingHours) {
        if (d.operatingHours.weekdayOpen)  setHwOpen(d.operatingHours.weekdayOpen);
        if (d.operatingHours.weekdayClose) setHwClose(d.operatingHours.weekdayClose);
        if (d.operatingHours.weekendOpen)  setHweOpen(d.operatingHours.weekendOpen);
        if (d.operatingHours.weekendClose) setHweClose(d.operatingHours.weekendClose);
        if (d.operatingHours.holidayOpen)  setHhOpen(d.operatingHours.holidayOpen);
        if (d.operatingHours.holidayClose) setHhClose(d.operatingHours.holidayClose);
      }
      if (Array.isArray(d.staffEmails)) setStaffList(d.staffEmails);
      if (Array.isArray(d.verificationDocuments)) setDocs(d.verificationDocuments as VerificationDoc[]);
      if (d.verificationStatus) setVerificationStatus(d.verificationStatus as string);
      if (typeof d.loadingDockAddress   === 'string') setDockAddress(d.loadingDockAddress);
      if (typeof d.loadingDockLatitude  === 'number') setDockLat(d.loadingDockLatitude);
      if (typeof d.loadingDockLongitude === 'number') setDockLng(d.loadingDockLongitude);
    }).catch(() => {});
  }, []);

  const saveHours = async () => {
    if (!session?.userId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', session.userId), {
        operatingHours: {
          weekdayOpen:  hwOpen,
          weekdayClose: hwClose,
          weekendOpen:  hweOpen,
          weekendClose: hweClose,
          holidayOpen:  hhOpen,
          holidayClose: hhClose,
        },
      }, { merge: true });
      Alert.alert('Saved', 'Operating hours have been saved.');
    } catch {
      Alert.alert('Error', 'Could not save hours. Please try again.');
    }
    setSaving(false);
  };

  const geocodeDock = React.useCallback((address: string) => {
    if (dockGeocodeTimer.current) clearTimeout(dockGeocodeTimer.current);
    if (!address.trim()) return;
    dockGeocodeTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'FreshLoop/1.0' } });
        const json = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (json[0]) {
          setDockLat(parseFloat(json[0].lat));
          setDockLng(parseFloat(json[0].lon));
        }
      } catch { /* non-fatal */ }
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDock = async () => {
    if (!session?.userId) return;
    setSavingDock(true);
    try {
      await setDoc(doc(db, 'users', session.userId), {
        loadingDockAddress: dockAddress.trim(),
        ...(dockLat  !== null ? { loadingDockLatitude:  dockLat  } : {}),
        ...(dockLng !== null ? { loadingDockLongitude: dockLng } : {}),
      }, { merge: true });
      Alert.alert('Saved', 'Loading dock location has been saved.');
    } catch {
      Alert.alert('Error', 'Could not save loading dock. Please try again.');
    }
    setSavingDock(false);
  };

  const storeDetails = [
    { label: 'Business Type',  value: session?.bizType ?? '—',            icon: 'shopping-bag' as const },
    { label: 'Email',          value: session?.email   ?? '—',            icon: 'mail'         as const },
    { label: 'Contact',        value: session?.phone   ?? '—',            icon: 'phone'        as const },
    { label: 'Address',        value: 'Not set — edit to add address',    icon: 'map-pin'      as const },
  ];

  const addStaff = async () => {
    const email = newEmail.trim();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (staffList.includes(email)) {
      Alert.alert('Already Added', 'This staff member is already in the list.');
      return;
    }
    if (!session?.userId) return;
    try {
      await updateDoc(doc(db, 'users', session.userId), { staffEmails: arrayUnion(email) });
      setStaffList(p => [...p, email]);
      setNewEmail('');
      Alert.alert('Staff Added', `${email} has been added.`);
    } catch {
      Alert.alert('Error', 'Could not save staff member. Please try again.');
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
        contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page title ── */}
        <Text style={{
          color: '#1E293B', fontSize: 22, fontWeight: '800',
          letterSpacing: -0.5, marginBottom: 4,
        }}>
          Business Profile
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
          Manage your store details, documents and staff.
        </Text>

        {/* ── Business hero card ── */}
        <View style={{
          ...card,
          alignItems: 'center', padding: 24,
        }}>
          <View style={{
            width: 68, height: 68, borderRadius: 20,
            backgroundColor: 'rgba(45,106,79,0.1)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <Feather name="shopping-bag" size={30} color="#2D6A4F" />
          </View>
          <Text style={{
            fontWeight: '800', fontSize: 18, color: '#1E293B', marginBottom: 4,
          }}>
            {session?.name ?? 'Business Name'}
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
            {session?.bizType ?? 'Business'} · {session?.email ?? ''}
          </Text>
          {verificationStatus === 'approved' ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#10B981', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 5,
            }}>
              <Feather name="check-circle" size={12} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Verified</Text>
            </View>
          ) : verificationStatus === 'rejected' ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#EF4444', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 5,
            }}>
              <Feather name="x-circle" size={12} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Verification Failed</Text>
            </View>
          ) : verificationStatus === 'pending' ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#F59E0B', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 5,
            }}>
              <Feather name="clock" size={12} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Pending Verification</Text>
            </View>
          ) : (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#94A3B8', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 5,
            }}>
              <Feather name="shield" size={12} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Unverified</Text>
            </View>
          )}
        </View>

        {/* ── Store details ── */}
        <SectionLabel text="Store Details" />
        <View style={card}>
          {storeDetails.map((d, i) => (
            <View key={d.label}>
              <View style={{
                flexDirection: 'row', alignItems: 'flex-start',
                gap: 12, paddingVertical: 12,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Feather name={d.icon} size={15} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 10, color: '#94A3B8',
                    fontWeight: '700', textTransform: 'uppercase',
                    letterSpacing: 0.5, marginBottom: 3,
                  }}>
                    {d.label}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '500' }}>
                    {d.value}
                  </Text>
                </View>
              </View>
              {i < storeDetails.length - 1 && (
                <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
              )}
            </View>
          ))}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Alert.alert('Edit Details', 'Contact support at support@freshloop.app to update your registered business details.')}
            style={{
              marginTop: 14,
              borderRadius: 12, paddingVertical: 11,
              alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: 6,
              backgroundColor: '#F1F5F9',
            }}
          >
            <Feather name="edit-2" size={13} color="#2D6A4F" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2D6A4F' }}>
              Edit Details
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Operating Hours ── */}
        <SectionLabel text="Operating Hours" />
        <View style={card}>
          {/* Weekdays */}
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Weekdays</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={hwOpen} onChangeText={setHwOpen} placeholder="08:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>to</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={hwClose} onChangeText={setHwClose} placeholder="17:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
          {/* Weekends */}
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Weekends</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={hweOpen} onChangeText={setHweOpen} placeholder="09:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>to</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={hweClose} onChangeText={setHweClose} placeholder="15:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
          {/* Public Holidays */}
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Public Holidays</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={hhOpen} onChangeText={setHhOpen} placeholder="Closed" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>to</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={hhClose} onChangeText={setHhClose} placeholder="Closed" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Leave blank if closed on public holidays.</Text>
          </View>
        </View>

        {/* Save Operating Hours */}
        <TouchableOpacity
          onPress={saveHours}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 14, backgroundColor: '#2D6A4F', borderRadius: 16,
            marginBottom: 16, opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="save" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Save Operating Hours</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Loading dock ── */}
        <SectionLabel text="Loading Dock Location" />
        <View style={card}>
          <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Loading Dock Address
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 12 }}>
            <Feather name="map-pin" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="e.g. 45 Berea Road, Durban"
              placeholderTextColor="#CBD5E1"
              value={dockAddress}
              onChangeText={(v) => { setDockAddress(v); geocodeDock(v); }}
              style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
            />
          </View>
          <MapPreview
            profileCity={session?.city || 'Durban'}
            latitude={dockLat ?? undefined}
            longitude={dockLng ?? undefined}
            usePhoneLocation={dockLat === null && dockLng === null}
            useRegion
            height={160}
            markerTitle={dockAddress || 'Loading dock'}
            markerDescription={dockAddress || undefined}
            markerVariant="pickup"
            draggable
            onMapPress={(c) => { setDockLat(c.latitude); setDockLng(c.longitude); }}
            onMarkerDragEnd={(c) => { setDockLat(c.latitude); setDockLng(c.longitude); }}
          />
          <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, marginBottom: 14, textAlign: 'center' }}>
            Tap the map to fine-tune the pin position
          </Text>
          <TouchableOpacity
            onPress={saveDock}
            disabled={savingDock}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingVertical: 12, backgroundColor: '#2D6A4F', borderRadius: 12,
              opacity: savingDock ? 0.7 : 1,
            }}
          >
            {savingDock ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="save" size={15} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Save Loading Dock</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Verification docs ── */}
        <SectionLabel text="Verification Documents" />
        <View style={card}>
          {docs.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Feather name="file" size={24} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                No documents uploaded yet.
              </Text>
            </View>
          ) : docs.map((d, i) => {
            const isApproved = verificationStatus === 'approved';
            const isRejected = verificationStatus === 'rejected';
            const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Review';
            const statusColor = isApproved ? '#10B981' : isRejected ? '#EF4444' : '#FBBF24';
            return (
              <View key={d.storagePath ?? String(i)}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', paddingVertical: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: isApproved
                        ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Feather
                        name={isApproved ? 'file-text' : 'clock'}
                        size={17}
                        color={isApproved ? '#10B981' : '#FBBF24'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B', marginBottom: 2 }} numberOfLines={1}>
                        {d.docType ?? d.fileName}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
                {i < docs.length - 1 && (
                  <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
                )}
              </View>
            );
          })}
        </View>

        {/* ── Staff accounts ── */}
        <SectionLabel text="Staff Accounts — Inventory Only" />
        <View style={card}>
          {staffList.map((email, i) => (
            <View key={email} style={{
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: 'rgba(45,106,79,0.1)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Feather name="user" size={15} color="#2D6A4F" />
                </View>
                <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '500' }}>
                  {email}
                </Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (!session?.userId) return;
                  try {
                    await updateDoc(doc(db, 'users', session.userId), { staffEmails: arrayRemove(email) });
                    setStaffList(p => p.filter((_, idx) => idx !== i));
                  } catch {
                    Alert.alert('Error', 'Could not remove staff member. Please try again.');
                  }
                }}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: '#EF4444',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add staff row */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#F8FAFC', borderRadius: 12,
              paddingHorizontal: 12, height: 44,
            }}>
              <Feather name="mail" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="staff@business.com"
                placeholderTextColor="#CBD5E1"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, fontSize: 13, color: '#1E293B' }}
              />
            </View>
            <TouchableOpacity
              onPress={addStaff}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#2D6A4F', borderRadius: 12,
                paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Feather name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Navigation buttons ── */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('BusinessSecurity')}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 16,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 11,
              backgroundColor: 'rgba(45,106,79,0.1)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Feather name="lock" size={16} color="#2D6A4F" />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
              Security Settings
            </Text>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('BusinessReport')}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 16,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 11,
              backgroundColor: 'rgba(239,68,68,0.08)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Feather name="flag" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
              Report an Issue
            </Text>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>
          
        </View>

      </ScrollView>
    </View>
  );
}