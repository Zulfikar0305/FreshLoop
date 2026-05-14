// screens/business_user/DonateScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import DatePickerField from '../../components/DatePickerField';
import MapPreview from '../../components/MapPreview';
import { useAuth } from '../../context/AuthContext';
import { createDonationListing } from '../../services/donationService';
import { createNotification } from '../../services/inAppNotificationService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';



const { width } = Dimensions.get('window');

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Bakery', 'Dairy', 'Fresh Produce',
  'Dry Goods', 'Prepared Meals', 'Beverages', 'Other',
];

type Method = null | 'snap' | 'voice' | 'csv';

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  icon, placeholder, value, onChangeText,
  multiline, keyboardType,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  placeholder: string;
  value?: string;
  onChangeText?: (v: string) => void;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={{
      flexDirection: multiline ? 'column' : 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      backgroundColor: '#fff',
      borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
      paddingHorizontal: 14,
      paddingVertical: multiline ? 12 : 0,
      minHeight: multiline ? 90 : 50,
      marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    }}>
      {!multiline && (
        <Feather name={icon} size={16} color="#94A3B8" style={{ marginRight: 10 }} />
      )}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          flex: 1, fontSize: 14, color: '#1E293B',
          minHeight: multiline ? 70 : undefined,
        }}
      />
    </View>
  );
}

type FormData = {
  foodName: string;
  category: string;
  qty: string;
  expiry: string;
  desc: string;
  pickupStartDate: string;
  pickupEndDate: string;
  pickupFrom: string;
  pickupTo: string;
  pickupAddress: string;
};

// ── Form (shared across snap + voice methods) ─────────────────────────────────
function DonationForm({ data, onChange, profileCity, onCoordChange, initialCoord }: {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  profileCity?: string;
  onCoordChange?: (c: { latitude: number; longitude: number }) => void;
  initialCoord?: { latitude: number; longitude: number };
}) {
  const [timeError,    setTimeError]    = React.useState('');
  const [mapCoord,     setMapCoordLocal] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const geocodeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSetInitial = React.useRef(false);

  React.useEffect(() => {
    if (!hasSetInitial.current && initialCoord) {
      setMapCoordLocal(initialCoord);
      hasSetInitial.current = true;
    }
  }, [initialCoord]);

  React.useEffect(() => {
    if (mapCoord) onCoordChange?.(mapCoord);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapCoord]);

  const geocodeAddress = React.useCallback((address: string) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (!address.trim()) return;
    geocodeTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'FreshLoop/1.0' } });
        const json = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (json[0]) {
          setMapCoordLocal({ latitude: parseFloat(json[0].lat), longitude: parseFloat(json[0].lon) });
        }
      } catch { /* geocoding failure is non-fatal */ }
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatTimeInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    if (digits.length === 3) return `${digits[0]}${digits[1]}:${digits[2]}`;
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }

  function validatePickupWindow(startDate: string, startTime: string, endDate: string, endTime: string): string {
    const re = /^\d{2}:\d{2}$/;
    if (startTime && !re.test(startTime)) return 'Start time must be HH:mm (e.g. 16:00)';
    if (endTime && !re.test(endTime)) return 'End time must be HH:mm (e.g. 18:00)';
    if (startDate && startTime && endDate && endTime) {
      const start = new Date(`${startDate}T${startTime}`);
      const end   = new Date(`${endDate}T${endTime}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
        return 'End date/time must be after start';
      }
    }
    return '';
  }
  const card = {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16, shadowColor: '#000' as const,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  };

  return (
    <>
      {/* ── Donation Details ── */}
      <Text style={{
        color: '#94A3B8', fontSize: 11, fontWeight: '700',
        letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
      }}>
        DONATION DETAILS
      </Text>

      <View style={card}>
        <FieldLabel label="Food Name" />
        <InputField
          icon="tag"
          placeholder="e.g. Mixed Bread Loaves"
          value={data.foodName}
          onChangeText={(v) => onChange('foodName', v)}
        />

        {/* Category chips */}
        <FieldLabel label="Food Category" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 14 }}
        >
          {CATEGORIES.map(c => {
            const isActive = data.category === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => onChange('category', c)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20, borderWidth: 1.5,
                  borderColor: isActive ? '#2D6A4F' : '#E2E8F0',
                  backgroundColor: isActive ? 'rgba(45,106,79,0.1)' : '#F8FAFC',
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: '600',
                  color: isActive ? '#2D6A4F' : '#64748B',
                }}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <FieldLabel label="Quantity" />
        <InputField
          icon="package"
          placeholder="e.g. 45 kg or 120 loaves"
          value={data.qty} onChangeText={(v) => onChange('qty', v)}
        />

        <FieldLabel label="Best Before / Expiry Date" />
        <DatePickerField
          value={data.expiry}
          onChange={(v) => onChange('expiry', v)}
          format="YYYY-MM-DD"
          accentColor="#2D6A4F"
          containerStyle={{ marginBottom: 14 }}
        />

        <FieldLabel label="Description & Handling Instructions" />
        <InputField
          icon="file-text"
          placeholder="e.g. Day-old sourdough loaves, best toasted. Kept refrigerated."
          value={data.desc} onChangeText={(v) => onChange('desc', v)}
          multiline
        />

        <FieldLabel label="Pickup Window" />

        {/* Pickup starts */}
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, paddingTop: 14, paddingHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2D6A4F', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Pickup starts
          </Text>
          <DatePickerField
            value={data.pickupStartDate}
            onChange={(v) => {
              onChange('pickupStartDate', v);
              setTimeError(validatePickupWindow(v, data.pickupFrom, data.pickupEndDate, data.pickupTo));
            }}
            format="YYYY-MM-DD"
            accentColor="#2D6A4F"
            containerStyle={{ marginBottom: 10 }}
          />
          <InputField
            icon="clock"
            placeholder="Start time — 16:00"
            value={data.pickupFrom}
            onChangeText={(v) => {
              const fmt = formatTimeInput(v);
              onChange('pickupFrom', fmt);
              setTimeError(validatePickupWindow(data.pickupStartDate, fmt, data.pickupEndDate, data.pickupTo));
            }}
          />
        </View>

        {/* Pickup ends */}
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, paddingTop: 14, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Pickup ends
          </Text>
          <DatePickerField
            value={data.pickupEndDate}
            onChange={(v) => {
              onChange('pickupEndDate', v);
              setTimeError(validatePickupWindow(data.pickupStartDate, data.pickupFrom, v, data.pickupTo));
            }}
            format="YYYY-MM-DD"
            accentColor="#2D6A4F"
            containerStyle={{ marginBottom: 10 }}
          />
          <InputField
            icon="clock"
            placeholder="End time — 18:00"
            value={data.pickupTo}
            onChangeText={(v) => {
              const fmt = formatTimeInput(v);
              onChange('pickupTo', fmt);
              setTimeError(validatePickupWindow(data.pickupStartDate, data.pickupFrom, data.pickupEndDate, fmt));
            }}
          />
        </View>

        {!!timeError && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -8, marginBottom: 14 }}>
            <Feather name="alert-circle" size={13} color="#EF4444" />
            <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>{timeError}</Text>
          </View>
        )}
      </View>

      {/* ── Pickup Location ── */}
      <Text style={{
        color: '#94A3B8', fontSize: 11, fontWeight: '700',
        letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
      }}>
        PICKUP LOCATION
      </Text>

      <View style={card}>
        <FieldLabel label="Pickup Address" />
        <InputField
          icon="map-pin"
          placeholder="e.g. 45 Berea Road, Durban"
          value={data.pickupAddress}
          onChangeText={(v) => {
            onChange('pickupAddress', v);
            geocodeAddress(v);
          }}
        />
        {/* Map preview — live geocoding + tap-to-pin */}
        <MapPreview
          profileCity={profileCity || 'Durban'}
          latitude={mapCoord?.latitude}
          longitude={mapCoord?.longitude}
          usePhoneLocation={!mapCoord}
          useRegion
          height={160}
          markerTitle={data.pickupAddress || 'Pickup area'}
          markerDescription={data.pickupAddress || undefined}
          markerVariant="pickup"
          draggable
          onMapPress={(c) => setMapCoordLocal(c)}
          onMarkerDragEnd={(c) => setMapCoordLocal(c)}
        />
        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, marginBottom: 2, textAlign: 'center' }}>
          Tap the map to fine-tune the pin position
        </Text>
      </View>
    </>
  );
}

// ── Success State ─────────────────────────────────────────────────────────────
function SuccessState({ onReset, donationId, category, qty, pickupWindow }: {
  onReset: () => void;
  donationId?: string;
  category?: string;
  qty?: string;
  pickupWindow?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader 
        settingsScreen="BusinessSecurity" 
        profileTab="Profile" 
        notificationsScreen="BusinessNotifications" 
      />
      <View style={{
        flex: 1, paddingHorizontal: 24,
        alignItems: 'center', justifyContent: 'center',
      }}>

        {/* Tick */}
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(45,106,79,0.1)',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          borderWidth: 2, borderColor: '#2D6A4F',
        }}>
          <Feather name="check" size={36} color="#2D6A4F" />
        </View>

        <Text style={{
          fontSize: 22, fontWeight: '800',
          color: '#1E293B', letterSpacing: -0.5,
        }}>
          Listing Published!
        </Text>
        <Text style={{
          fontSize: 13, color: '#64748B',
          marginTop: 6, textAlign: 'center', lineHeight: 20,
        }}>
          NPOs in your area have been notified.{'\n'}
          You'll receive a claim notification shortly.
        </Text>

        {/* Listing summary card */}
        <View style={{
          marginTop: 24, width: '100%',
          backgroundColor: '#fff', borderRadius: 20,
          padding: 20,
          shadowColor: '#000', shadowOpacity: 0.05,
          shadowRadius: 10, elevation: 3,
          borderWidth: 1.5, borderColor: 'rgba(45,106,79,0.2)',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            gap: 8, marginBottom: 12,
          }}>
            <View style={{
              backgroundColor: 'rgba(45,106,79,0.1)',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{
                color: '#2D6A4F', fontSize: 10, fontWeight: '800',
              }}>
                ACTIVE LISTING
              </Text>
            </View>
          </View>

          <Text style={{
            color: '#94A3B8', fontSize: 11,
            fontWeight: '700', marginBottom: 2,
          }}>
            LISTING ID
          </Text>
          <Text style={{
            color: '#1E293B', fontSize: 15,
            fontWeight: '800', marginBottom: 14,
          }}>
            {donationId ? `FL-${donationId.slice(0, 8).toUpperCase()}` : 'FL-...'}
          </Text>

          {[
            { icon: 'tag' as const,     label: 'Category',      value: category    || '—' },
            { icon: 'package' as const, label: 'Quantity',      value: qty         || '—' },
            { icon: 'clock' as const,   label: 'Pickup window', value: pickupWindow || '—' },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 8, gap: 10,
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Feather name={row.icon} size={14} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '700' }}>
                    {row.label.toUpperCase()}
                  </Text>
                  <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '600', marginTop: 1 }}>
                    {row.value}
                  </Text>
                </View>
              </View>
              {i < arr.length - 1 && (
                <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
              )}
            </View>
          ))}
        </View>

        {/* Create another button */}
        <TouchableOpacity
          onPress={onReset}
          activeOpacity={0.85}
          style={{
            marginTop: 20, width: '100%',
            backgroundColor: '#2D6A4F',
            borderRadius: 14, paddingVertical: 15,
            alignItems: 'center', flexDirection: 'row',
            justifyContent: 'center', gap: 8,
            shadowColor: '#2D6A4F',
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
          }}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            Create Another Listing
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DonateScreen() {
  const { session } = useAuth();
  const [method,      setMethod]      = useState<Method>(null);
  const [submitted,   setSubmitted]   = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [donationId,  setDonationId]  = useState('');
  const [mapCoord,    setMapCoord]    = useState<{ latitude: number; longitude: number } | null>(null);
  const [dockCoord,   setDockCoord]   = useState<{ latitude: number; longitude: number } | null>(null);
  const [form, setForm] = useState<FormData>({
    foodName: '', category: '', qty: '', expiry: '',
    desc: '', pickupStartDate: '', pickupEndDate: '', pickupFrom: '', pickupTo: '', pickupAddress: '',
  });

  const handleChange = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setForm({ foodName: '', category: '', qty: '', expiry: '', desc: '', pickupStartDate: '', pickupEndDate: '', pickupFrom: '', pickupTo: '', pickupAddress: '' });
    setMethod(null);
    setVoiceActive(false);
    setDonationId('');
    setMapCoord(null);
    setSubmitted(false);
  };

  useEffect(() => {
    if (!session?.userId) return;
    getDoc(doc(db, 'users', session.userId)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const addr      = typeof d.loadingDockAddress   === 'string' ? d.loadingDockAddress   : '';
      const lat       = typeof d.loadingDockLatitude  === 'number' ? d.loadingDockLatitude  : null;
      const lng       = typeof d.loadingDockLongitude === 'number' ? d.loadingDockLongitude : null;
      const openTime  = typeof d.operatingHours?.weekdayOpen  === 'string' ? (d.operatingHours.weekdayOpen  as string) : '';
      const closeTime = typeof d.operatingHours?.weekdayClose === 'string' ? (d.operatingHours.weekdayClose as string) : '';
      setForm(prev => ({
        ...prev,
        pickupAddress: prev.pickupAddress || addr,
        pickupFrom:    prev.pickupFrom    || openTime,
        pickupTo:      prev.pickupTo      || closeTime,
      }));
      if (lat !== null && lng !== null) {
        const coord = { latitude: lat, longitude: lng };
        setMapCoord(coord);
        setDockCoord(coord);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId]);

  const handlePublish = async () => {
    if (!session?.userId) {
      Alert.alert('Not signed in', 'Please sign in to publish a donation listing.');
      return;
    }
    if (!form.foodName.trim()) {
      Alert.alert('Missing info', 'Please enter a food name.');
      return;
    }
    if (!form.category) {
      Alert.alert('Missing info', 'Please select a food category.');
      return;
    }
    if (!form.qty.trim()) {
      Alert.alert('Missing info', 'Please enter a quantity.');
      return;
    }
    if (!form.pickupAddress.trim()) {
      Alert.alert('Missing info', 'Please enter a pickup address.');
      return;
    }
    if (!form.pickupStartDate.trim()) {
      Alert.alert('Missing info', 'Please enter a pickup start date.');
      return;
    }
    if (!form.pickupEndDate.trim()) {
      Alert.alert('Missing info', 'Please enter a pickup end date.');
      return;
    }
    if (!form.pickupFrom.trim()) {
      Alert.alert('Missing info', 'Please enter a start time (e.g. 16:00).');
      return;
    }
    if (!form.pickupTo.trim()) {
      Alert.alert('Missing info', 'Please enter an end time (e.g. 18:00).');
      return;
    }
    const timeRe = /^\d{2}:\d{2}$/;
    if (!timeRe.test(form.pickupFrom)) {
      Alert.alert('Invalid time', 'Start time must be in HH:mm format (e.g. 16:00).');
      return;
    }
    if (!timeRe.test(form.pickupTo)) {
      Alert.alert('Invalid time', 'End time must be in HH:mm format (e.g. 18:00).');
      return;
    }
    const pickupStart = new Date(`${form.pickupStartDate}T${form.pickupFrom}`);
    const pickupEnd   = new Date(`${form.pickupEndDate}T${form.pickupTo}`);
    if (!isNaN(pickupStart.getTime()) && !isNaN(pickupEnd.getTime()) && pickupEnd <= pickupStart) {
      Alert.alert('Invalid pickup window', 'End date/time must be after start date/time.');
      return;
    }
    const donorName = session?.name || session?.email?.split('@')[0] || 'Business Donor';
    setLoading(true);
    try {
      const pickupWindow = `${form.pickupStartDate} ${form.pickupFrom} – ${form.pickupEndDate} ${form.pickupTo}`;
      const id = await createDonationListing({
        donorId: session.userId,
        donorRole: session.role as 'home' | 'business',
        donorName,
        foodName: form.foodName,
        quantity: form.qty,
        unit: '',
        category: form.category,
        storageInstructions: form.desc,
        expiryDate: form.expiry,
        pickupAddress: form.pickupAddress,
        pickupWindow,
        city: session?.city || 'Durban',
        latitude: mapCoord?.latitude,
        longitude: mapCoord?.longitude,
        notes: '',
      });
      setDonationId(id);
      createNotification(session.userId, {
        type:    'donation',
        title:   'Listing published ✅',
        message: `Your ${form.category || form.foodName} listing is now live. Nearby NPOs can claim it.`,
      }).catch(() => {});
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not publish listing.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const pickupWindow = `${form.pickupStartDate} ${form.pickupFrom} – ${form.pickupEndDate} ${form.pickupTo}`.trim();
    return (
      <SuccessState
        donationId={donationId}
        category={form.category}
        qty={form.qty}
        pickupWindow={pickupWindow}
        onReset={resetForm}
      />
    );
  }

  const card = {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16, shadowColor: '#000' as const,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader 
        settingsScreen="BusinessSecurity" 
        profileTab="Profile" 
        notificationsScreen="BusinessNotifications" 
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Page title ── */}
        <Text style={{
          color: '#1E293B', fontSize: 22,
          fontWeight: '800', letterSpacing: -0.5,
          marginBottom: 4,
        }}>
          New Donation
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
          List surplus food for nearby NPOs to claim.
        </Text>

        <DonationForm data={form} onChange={handleChange} profileCity={session?.city || 'Durban'} onCoordChange={setMapCoord} initialCoord={dockCoord ?? undefined} />

        <TouchableOpacity
          onPress={handlePublish}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#2D6A4F', borderRadius: 14,
            paddingVertical: 15, alignItems: 'center',
            flexDirection: 'row', justifyContent: 'center',
            gap: 8, marginTop: 4,
            shadowColor: '#2D6A4F',
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Feather name="send" size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Publish Listing</Text></>
          }
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}