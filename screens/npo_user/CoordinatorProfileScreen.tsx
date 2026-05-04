// screens/npo_user/CoordinatorProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import CustomHeader from "../../components/CustomHeader";
import { useAuth } from "../../context/AuthContext";
import { db } from '../../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type Driver = { id: string; name: string; phone: string; active: boolean };
type VerificationDoc = { fileName: string; docType: string; uploadedAt: string };

const FOOD_TYPES = ["Fresh Produce", "Baked Goods", "Dairy", "Dry Goods", "Prepared Meals", "Cooked Meals"];

export default function CoordinatorProfileScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [radius, setRadius] = useState(25);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState(["Fresh Produce", "Baked Goods", "Dairy"]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [verificationStatus,    setVerificationStatus]    = useState('');
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDoc[]>([]);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [city, setCity] = useState('');
  const [pickupAreaNotes, setPickupAreaNotes] = useState('');
  const [npoHwOpen,   setNpoHwOpen]   = useState('08:00');
  const [npoHwClose,  setNpoHwClose]  = useState('17:00');
  const [npoHweOpen,  setNpoHweOpen]  = useState('09:00');
  const [npoHweClose, setNpoHweClose] = useState('15:00');
  const [npoHhOpen,   setNpoHhOpen]   = useState('');
  const [npoHhClose,  setNpoHhClose]  = useState('');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!session?.userId) return;
    getDoc(doc(db, 'users', session.userId)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (typeof d.city === 'string')                setCity(d.city);
      if (typeof d.serviceRadius === 'number')       setRadius(d.serviceRadius);
      if (typeof d.pickupAreaNotes === 'string')     setPickupAreaNotes(d.pickupAreaNotes);
      if (Array.isArray(d.selectedFoodTypes))        setSelectedFoodTypes(d.selectedFoodTypes as string[]);
      if (d.operatingHours) {
        if (d.operatingHours.weekdayOpen)  setNpoHwOpen(d.operatingHours.weekdayOpen);
        if (d.operatingHours.weekdayClose) setNpoHwClose(d.operatingHours.weekdayClose);
        if (d.operatingHours.weekendOpen)  setNpoHweOpen(d.operatingHours.weekendOpen);
        if (d.operatingHours.weekendClose) setNpoHweClose(d.operatingHours.weekendClose);
        if (d.operatingHours.holidayOpen)  setNpoHhOpen(d.operatingHours.holidayOpen);
        if (d.operatingHours.holidayClose) setNpoHhClose(d.operatingHours.holidayClose);
      }
      if (typeof d.verificationStatus === 'string')  setVerificationStatus(d.verificationStatus);
      if (Array.isArray(d.driverRoster))             setDrivers(d.driverRoster as Driver[]);
      if (Array.isArray(d.verificationDocuments)) {
        setVerificationDocuments(
          (d.verificationDocuments as any[]).map(v => ({
            fileName:  typeof v.fileName  === 'string' ? v.fileName  : '',
            docType:   typeof v.docType   === 'string' ? v.docType   : '',
            uploadedAt: typeof v.uploadedAt === 'string' ? v.uploadedAt : '',
          }))
        );
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    if (!session?.userId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', session.userId), {
        city,
        serviceRadius: radius,
        pickupAreaNotes,
        selectedFoodTypes,
        operatingHours: {
          weekdayOpen:  npoHwOpen,
          weekdayClose: npoHwClose,
          weekendOpen:  npoHweOpen,
          weekendClose: npoHweClose,
          holidayOpen:  npoHhOpen,
          holidayClose: npoHhClose,
        },
      }, { merge: true });
      Alert.alert('Saved', 'Your coordinator profile has been saved.');
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    }
    setSaving(false);
  };

  const toggleFoodType = (type: string) => {
    setSelectedFoodTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader
        settingsScreen="NPOSecurity"
        profileScreen="Profile"
        notificationsScreen="NPONotifications"
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
      >
        {/* Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 }}>
            Coordinator Profile
          </Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Edit Profile', 'Contact support at support@freshloop.app to update your NPO registration details.')}
            style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}
          >
            <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '700' }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Top Profile Card */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(45,106,79,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Feather name="briefcase" size={28} color="#2D6A4F" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginRight: 8 }}>
                  {session?.name ?? 'Organisation Name'}
                </Text>
              </View>
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor:
                  verificationStatus === 'approved' ? '#10B981' :
                  verificationStatus === 'pending'  ? '#F59E0B' :
                  verificationStatus === 'rejected' ? '#EF4444' : '#94A3B8',
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginBottom: 6,
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {verificationStatus === 'approved' ? '✓ Verified' :
                   verificationStatus === 'pending'  ? '⏳ Pending Verification' :
                   verificationStatus === 'rejected' ? '✗ Verification Failed' : 'Unverified'}
                </Text>
              </View>
              <Text style={{ color: '#64748B', fontSize: 13 }}>
                {session?.regNumber ? `Reg: ${session.regNumber}` : 'Registration pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("SecuritySettings")}
            activeOpacity={0.8}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(45,106,79,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="shield" size={16} color="#2D6A4F" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1 }}>Security</Text>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("NPOReport")}
            activeOpacity={0.8}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="flag" size={16} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1 }}>Report</Text>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Org Details */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 }}>
          Details
        </Text>
        <View style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {[
            { label: "NPO Name",          value: session?.name      ?? '—',                    icon: "home"      },
            { label: "Registration No.",  value: session?.regNumber ?? 'Pending verification', icon: "file-text" },
            { label: "Contact Email",     value: session?.email     ?? '—',                    icon: "mail"      },
          ].map((item, i, arr) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Feather name={item.icon as any} size={14} color="#64748B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 2 }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Operating Area */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 }}>
          Operating Area
        </Text>
        <View style={cardStyle}>
          {/* City */}
          <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>City</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 16 }}>
            <Feather name="map-pin" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Durban"
              placeholderTextColor="#CBD5E1"
              style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
            />
          </View>
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 }} />
          {/* Service Radius */}
          <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Service Radius</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '600' }}>Operations Map radius</Text>
            <View style={{ backgroundColor: 'rgba(45,106,79,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ color: '#2D6A4F', fontWeight: '800', fontSize: 14 }}>{radius} km</Text>
            </View>
          </View>

          {/* Slider Visual */}
          <View style={{ height: 24, justifyContent: 'center', marginBottom: 12 }}>
            <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, width: '100%' }} />
            <View style={{ position: 'absolute', left: 0, height: 6, backgroundColor: '#2D6A4F', borderRadius: 3, width: `${((radius - 5) / 45) * 100}%` }} />
            <View style={{ 
              position: 'absolute', width: 24, height: 24, backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#2D6A4F', 
              left: `${((radius - 5) / 45) * 100}%`, marginLeft: -12, shadowColor: '#2D6A4F', shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 
            }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>5 km</Text>
            {[15, 25, 35].map((v) => (
              <TouchableOpacity key={v} onPress={() => setRadius(v)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: radius === v ? '#2D6A4F' : '#CBD5E1' }}>{v}</Text>
              </TouchableOpacity>
            ))}
            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>50 km</Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 }} />
          {/* Preferred Pickup Areas / Notes */}
          <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Preferred Pickup Areas / Notes</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Feather name="navigation" size={14} color="#94A3B8" style={{ marginRight: 8, marginTop: 2 }} />
            <TextInput
              value={pickupAreaNotes}
              onChangeText={setPickupAreaNotes}
              placeholder="e.g. Berea, Musgrave, Umbilo — near main roads preferred"
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={3}
              style={{ flex: 1, fontSize: 13, color: '#1E293B', minHeight: 60 }}
            />
          </View>
        </View>

        {/* Operating Hours */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 }}>
          Operating Hours
        </Text>
        <View style={cardStyle}>
          {/* Weekdays */}
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Weekdays</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={npoHwOpen} onChangeText={setNpoHwOpen} placeholder="08:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>to</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={npoHwClose} onChangeText={setNpoHwClose} placeholder="17:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
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
                <TextInput value={npoHweOpen} onChangeText={setNpoHweOpen} placeholder="09:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>to</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={npoHweClose} onChangeText={setNpoHweClose} placeholder="15:00" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
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
                <TextInput value={npoHhOpen} onChangeText={setNpoHhOpen} placeholder="Closed" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>to</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
                <Feather name="clock" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput value={npoHhClose} onChangeText={setNpoHhClose} placeholder="Closed" placeholderTextColor="#CBD5E1" style={{ flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' }} />
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Leave blank if closed on public holidays.</Text>
          </View>
        </View>

        {/* Preferred Food Types */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 }}>
          Preferred Food Types
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {FOOD_TYPES.map((type) => {
            const selected = selectedFoodTypes.includes(type);
            return (
              <TouchableOpacity
                key={type}
                onPress={() => toggleFoodType(type)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                  backgroundColor: selected ? '#2D6A4F' : '#fff',
                  shadowColor: '#000', shadowOpacity: selected ? 0.2 : 0.02, shadowRadius: 4, elevation: selected ? 2 : 1,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: selected ? '#fff' : '#64748B' }}>
                  {selected && "✓ "}{type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Driver Roster */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4, paddingRight: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
            Driver Roster
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddDriver(p => !p)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Feather name={showAddDriver ? 'x' : 'plus-circle'} size={14} color="#2D6A4F" />
            <Text style={{ color: '#2D6A4F', fontWeight: '800', fontSize: 12 }}>{showAddDriver ? 'Cancel' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Add driver inline form */}
        {showAddDriver && (
          <View style={{ ...cardStyle, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>New Driver</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 10 }}>
              <Feather name="user" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                value={newDriverName}
                onChangeText={setNewDriverName}
                placeholder="Full name"
                placeholderTextColor="#CBD5E1"
                style={{ flex: 1, fontSize: 13, color: '#1E293B' }}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 14 }}>
              <Feather name="phone" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                value={newDriverPhone}
                onChangeText={setNewDriverPhone}
                placeholder="+27 XX XXX XXXX"
                placeholderTextColor="#CBD5E1"
                keyboardType="phone-pad"
                style={{ flex: 1, fontSize: 13, color: '#1E293B' }}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                if (!newDriverName.trim()) { Alert.alert('Required', 'Please enter the driver\'s name.'); return; }
                if (!newDriverPhone.trim()) { Alert.alert('Required', 'Please enter the driver\'s phone number.'); return; }
                const newDriver: Driver = { id: String(Date.now()), name: newDriverName.trim(), phone: newDriverPhone.trim(), active: false };
                const updated = [...drivers, newDriver];
                setDrivers(updated);
                setNewDriverName('');
                setNewDriverPhone('');
                setShowAddDriver(false);
                if (session?.userId) {
                  try {
                    await setDoc(doc(db, 'users', session.userId), { driverRoster: updated }, { merge: true });
                  } catch {}
                }
                Alert.alert('Driver Added', `${newDriver.name} has been added to your roster.`);
              }}
              style={{ backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Add Driver</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {drivers.map((driver, i, arr) => (
            <View key={driver.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' }}>
              <View style={{ width: 40, height: 40, backgroundColor: '#2D6A4F', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {driver.name.split(" ").map((n: string) => n[0]).join("")}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>{driver.name}</Text>
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>{driver.phone}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: driver.active ? '#10B981' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: driver.active ? '#fff' : '#94A3B8' }}>
                    {driver.active ? "Active" : "Offline"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Remove Driver', `Remove ${driver.name} from the roster?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: async () => {
                      const updated = drivers.filter(d => d.id !== driver.id);
                      setDrivers(updated);
                      if (session?.userId) {
                        try {
                          await setDoc(doc(db, 'users', session.userId), { driverRoster: updated }, { merge: true });
                        } catch {}
                      }
                    }},
                  ])}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="trash-2" size={14} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Documents */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4, paddingRight: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
            Documents
          </Text>
        </View>

        {/* Documents — loaded from Firestore verificationDocuments */}
        {verificationDocuments.length === 0 ? (
          <View style={{ ...cardStyle, alignItems: 'center', padding: 24, marginBottom: 10 }}>
            <Feather name="file" size={28} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600', textAlign: 'center' }}>
              No documents uploaded yet.
            </Text>
          </View>
        ) : (
          <View style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 10 }}>
            {verificationDocuments.map((docItem, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 16,
                  borderBottomWidth: i < verificationDocuments.length - 1 ? 1 : 0,
                  borderBottomColor: '#F1F5F9',
                }}
              >
                <View style={{ width: 44, height: 44, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Feather name="file-text" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 }} numberOfLines={1}>
                    {docItem.fileName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {docItem.docType}{docItem.uploadedAt ? ` · ${new Date(docItem.uploadedAt).toLocaleDateString()}` : ''}
                  </Text>
                </View>
                <Feather name="check-circle" size={20} color="#10B981" />
              </View>
            ))}
          </View>
        )}

        {/* Document upload — coming soon */}
        <View
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 16,
            paddingVertical: 18, paddingHorizontal: 16,
            marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14,
            opacity: 0.6,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="upload" size={20} color="#94A3B8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B', marginBottom: 2 }}>
              Upload Additional Documents
            </Text>
            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
              Coming soon
            </Text>
          </View>
        </View>

        {/* Save Profile */}
        <TouchableOpacity
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 14, backgroundColor: '#2D6A4F', borderRadius: 16,
            marginBottom: 12, opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="save" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}