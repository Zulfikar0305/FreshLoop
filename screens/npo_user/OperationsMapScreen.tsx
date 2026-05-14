// screens/npo_user/OperationsMapScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeAvailableDonations,
  claimDonation,
  type DonationListing,
} from '../../services/donationService';


// ── Types ─────────────────────────────────────────────────────────────────────
type Urgency = 'green' | 'yellow' | 'red';

type Donation = {
  id:          string;
  store:       string;
  category:    string;
  description: string;
  weight:      string;
  pickupStart: string;
  pickupEnd:   string;
  address:     string;
  city:        string;
  distance:    string;
  urgency:     Urgency;
  hoursLeft:   number;
  claimed:     boolean;
  latitude:    number | null;
  longitude:   number | null;
};
// ── Firestore → UI mapping helpers ────────────────────────────────────────────
function hoursUntil(date: Date | null): number {
  if (!date) return 12;
  return Math.max(0, (date.getTime() - Date.now()) / 3_600_000);
}

function urgencyFromHours(h: number): Urgency {
  if (h < 2) return 'red';
  if (h < 6) return 'yellow';
  return 'green';
}

function splitWindow(w: string): [string, string] {
  const parts = w.split(/\s*[–\-]\s*/);
  return [parts[0]?.trim() ?? '', parts[1]?.trim() ?? parts[0]?.trim() ?? ''];
}

function toUIDonation(d: DonationListing): Donation {
  const hours = hoursUntil(d.expiryDate);
  const [pickupStart, pickupEnd] = splitWindow(d.pickupWindow);
  return {
    id: d.id,
    store: d.donorName || 'Donor',
    category: d.category,
    description: [d.foodName, d.notes].filter(Boolean).join(' — '),
    weight: d.quantity,
    pickupStart,
    pickupEnd,
    address: d.pickupAddress || d.city || 'Durban',
    city: d.city || '',
    distance: '—',
    urgency: urgencyFromHours(hours),
    hoursLeft: Math.ceil(hours),
    claimed: false,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
  };
}
// ── Dummy data ────────────────────────────────────────────────────────────────
const INITIAL_DONATIONS: Donation[] = [
  {
    id: '1', store: 'Spar Westville',
    category: 'Fresh Produce',
    description: 'Approx 8kg mixed vegetables — carrots, spinach, broccoli',
    weight: '8 kg', pickupStart: '14:00', pickupEnd: '16:00',
    address: '12 Old Main Rd, Westville', city: 'Durban',
    distance: '2.3 km', urgency: 'green', hoursLeft: 8, claimed: false,
    latitude: null, longitude: null,
  },
  {
    id: '2', store: "Food Lover's Market Pinetown",
    category: 'Baked Goods',
    description: 'Assorted bread loaves and rolls — end of day batch',
    weight: '5.5 kg', pickupStart: '15:30', pickupEnd: '17:30',
    address: '33 King St, Pinetown', city: 'Durban',
    distance: '4.7 km', urgency: 'yellow', hoursLeft: 4, claimed: false,
    latitude: null, longitude: null,
  },
  {
    id: '3', store: 'Pick n Pay Pavilion',
    category: 'Dairy',
    description: 'Yoghurts and cheese portions — today\'s surplus',
    weight: '3 kg', pickupStart: '16:00', pickupEnd: '17:00',
    address: 'Pavilion Shopping Centre, Westville', city: 'Durban',
    distance: '3.1 km', urgency: 'red', hoursLeft: 1.5, claimed: false,
    latitude: null, longitude: null,
  },
  {
    id: '4', store: 'Checkers Chatsworth',
    category: 'Dry Goods',
    description: 'Canned goods and pasta nearing best-before date',
    weight: '12 kg', pickupStart: '10:00', pickupEnd: '18:00',
    address: 'Chatsworth Centre, Chatsworth', city: 'Durban',
    distance: '6.8 km', urgency: 'green', hoursLeft: 12, claimed: false,
    latitude: null, longitude: null,
  },
  {
    id: '5', store: 'Woolworths Musgrave',
    category: 'Prepared Meals',
    description: 'Ready-to-eat meals from deli section',
    weight: '4.2 kg', pickupStart: '17:00', pickupEnd: '18:00',
    address: 'Musgrave Centre, Berea', city: 'Durban',
    distance: '5.4 km', urgency: 'red', hoursLeft: 1, claimed: false,
    latitude: null, longitude: null,
  },
];

const FILTERS = ['All', 'Fresh Produce', 'Baked Goods', 'Dairy', 'Dry Goods', 'Refrigeration'];

// ── City coordinate lookup ────────────────────────────────────────────────────
const DEFAULT_REGION = { latitude: -29.8587, longitude: 31.0218 }; // Durban fallback

const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'durban':           { latitude: -29.8587, longitude: 31.0218 },
  'johannesburg':     { latitude: -26.2041, longitude: 28.0473 },
  'cape town':        { latitude: -33.9249, longitude: 18.4241 },
  'pretoria':         { latitude: -25.7461, longitude: 28.1881 },
  'port elizabeth':   { latitude: -33.9608, longitude: 25.6022 },
  'bloemfontein':     { latitude: -29.0852, longitude: 26.1596 },
  'east london':      { latitude: -33.0153, longitude: 27.9116 },
  'pietermaritzburg': { latitude: -29.6006, longitude: 30.3794 },
  'nelspruit':        { latitude: -25.4745, longitude: 30.9694 },
  'polokwane':        { latitude: -23.9045, longitude: 29.4688 },
  'westville':        { latitude: -29.8297, longitude: 30.9313 },
  'pinetown':         { latitude: -29.8169, longitude: 30.8599 },
  'chatsworth':       { latitude: -29.9167, longitude: 30.9500 },
  'berea':            { latitude: -29.8518, longitude: 31.0191 },
};

function cityToCoord(city: string): { latitude: number; longitude: number } {
  const key = city.toLowerCase().trim();
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return DEFAULT_REGION;
}

// Small deterministic offsets so markers don't stack exactly on the same spot
const MARKER_OFFSETS = [
  { lat:  0.022, lng:  0.032 },
  { lat: -0.018, lng:  0.027 },
  { lat:  0.033, lng: -0.021 },
  { lat: -0.026, lng: -0.016 },
  { lat:  0.012, lng:  0.042 },
  { lat: -0.037, lng:  0.011 },
  { lat:  0.041, lng:  0.022 },
  { lat: -0.011, lng: -0.038 },
];

function donationCoord(
  d: Donation,
  center: { latitude: number; longitude: number },
  index: number,
): { latitude: number; longitude: number } {
  if (d.latitude != null && d.longitude != null) {
    return { latitude: d.latitude, longitude: d.longitude };
  }
  // Use donation's own city if available, else center
  const base = d.city ? cityToCoord(d.city) : center;
  const offset = MARKER_OFFSETS[index % MARKER_OFFSETS.length] ?? { lat: 0, lng: 0 };
  return { latitude: base.latitude + offset.lat, longitude: base.longitude + offset.lng };
}

// ── Urgency config ────────────────────────────────────────────────────────────
const URGENCY: Record<Urgency, {
  color: string; bg: string; border: string; text: string; label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}> = {
  green:  { color: '#10B981', bg: '#F0FDF4', border: 'rgba(16,185,129,0.2)',  text: '#065F46', label: '6+ hrs',   icon: 'check-circle' },
  yellow: { color: '#FBBF24', bg: '#FFFBEB', border: 'rgba(251,191,36,0.2)',  text: '#92400E', label: '2–6 hrs',  icon: 'clock'        },
  red:    { color: '#EF4444', bg: '#FEF2F2', border: 'rgba(239,68,68,0.2)',   text: '#991B1B', label: '< 2 hrs',  icon: 'alert-circle' },
};

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  'Fresh Produce': 'feather',
  'Baked Goods':   'coffee',
  'Dairy':         'droplet',
  'Dry Goods':     'package',
  'Prepared Meals':'layers',
};

// ── Real Map Section ──────────────────────────────────────────────────────────
function MapSection({
  donations,
  center,
  showUserMarker,
  locationLabel,
  onPinPress,
}: {
  donations: Donation[];
  center: { latitude: number; longitude: number };
  showUserMarker: boolean;
  locationLabel: string;
  onPinPress: (d: Donation) => void;
}) {
  const region = {
    latitude:      center.latitude,
    longitude:     center.longitude,
    latitudeDelta:  0.18,
    longitudeDelta: 0.18,
  };

  return (
    <View style={{ height: 260, borderRadius: 20, overflow: 'hidden' }}>
      <MapView
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={showUserMarker}
        showsMyLocationButton={false}
        showsCompass
        toolbarEnabled={false}
      >
        {donations.map((d, i) => {
          const coord  = donationCoord(d, center, i);
          const cfg    = URGENCY[d.urgency];
          const pinColor = d.claimed ? '#94A3B8' : cfg.color;
          return (
            <Marker
              key={d.id}
              coordinate={coord}
              pinColor={pinColor}
              title={d.store}
              description={`${d.address} · ${d.weight} · ${d.pickupStart}–${d.pickupEnd}`}
              onPress={() => onPinPress(d)}
            />
          );
        })}
      </MapView>

      {/* Location label overlay */}
      {!!locationLabel && (
        <View style={{
          position: 'absolute', bottom: 10, left: 10,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
          borderWidth: 1, borderColor: '#E2E8F0',
          flexDirection: 'row', alignItems: 'center', gap: 4,
          maxWidth: '70%',
        }}>
          <Feather name="map-pin" size={10} color="#2D6A4F" />
          <Text style={{ fontSize: 10, color: '#2D6A4F', fontWeight: '700' }} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────
function DonationSheet({
  donation,
  onClose,
  onClaim,
  claiming,
}: {
  donation: Donation | null;
  onClose: () => void;
  onClaim: (d: Donation) => void;
  claiming: boolean;
}) {
  if (!donation) return null;
  const cfg = URGENCY[donation.urgency];

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={{
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
      }}>
        {/* Handle */}
        <View style={{
          width: 40, height: 4, backgroundColor: '#E2E8F0',
          borderRadius: 2, alignSelf: 'center', marginBottom: 20,
        }} />

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 16,
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 3 }}>
              {donation.store}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Feather name="map-pin" size={12} color="#94A3B8" />
              <Text style={{ fontSize: 12, color: '#64748B' }}>{donation.address}</Text>
            </View>
          </View>
          <View style={{
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 20, backgroundColor: cfg.bg,
            borderWidth: 1, borderColor: cfg.border,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.text }}>
              {donation.hoursLeft}h left
            </Text>
          </View>
        </View>

        {/* Details grid */}
        <View style={{
          backgroundColor: '#F8FAFC', borderRadius: 18,
          padding: 16, marginBottom: 16,
          borderWidth: 1, borderColor: '#F1F5F9',
        }}>
          <View style={{ flexDirection: 'row', marginBottom: 14 }}>
            {[
              { label: 'Category', value: donation.category,  icon: 'tag'     as const },
              { label: 'Weight',   value: donation.weight,    icon: 'package' as const },
            ].map(d => (
              <View key={d.label} style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 10, color: '#94A3B8', fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5,
                }}>
                  {d.label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Feather name={d.icon} size={12} color="#2D6A4F" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                    {d.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 14 }}>
            {[
              { label: 'Pickup Window', value: `${donation.pickupStart} – ${donation.pickupEnd}`, icon: 'clock'    as const },
              { label: 'Distance',      value: donation.distance,                                  icon: 'navigation' as const },
            ].map(d => (
              <View key={d.label} style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 10, color: '#94A3B8', fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5,
                }}>
                  {d.label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Feather name={d.icon} size={12} color="#2D6A4F" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                    {d.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={{
            fontSize: 10, color: '#94A3B8', fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5,
          }}>
            Description
          </Text>
          <Text style={{ fontSize: 13, color: '#475569', lineHeight: 19 }}>
            {donation.description}
          </Text>
        </View>

        {/* Claim button */}
        <TouchableOpacity
          onPress={() => onClaim(donation)}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#2D6A4F',
            borderRadius: 16, paddingVertical: 16,
            alignItems: 'center', flexDirection: 'row',
            justifyContent: 'center', gap: 10,
            shadowColor: '#2D6A4F', shadowOpacity: 0.35,
            shadowRadius: 12, elevation: 5,
          }}
        >
          <Feather name="check-circle" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
            {claiming ? 'Claiming…' : 'Claim This Donation'}
          </Text>
        </TouchableOpacity>

        <Text style={{
          textAlign: 'center', fontSize: 11,
          color: '#94A3B8', marginTop: 10,
        }}>
          You have 30 minutes to cancel after claiming
        </Text>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OperationsMapScreen() {
  const { session } = useAuth();
  const [donations,        setDonations]        = useState<Donation[]>([]);
  const [activeFilter,     setActiveFilter]     = useState('All');
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [claiming,         setClaiming]         = useState(false);

  // ── Location ──
  const [mapCenter,       setMapCenter]       = useState(DEFAULT_REGION);
  const [showUserMarker,  setShowUserMarker]  = useState(false);
  const [locationLabel,   setLocationLabel]   = useState('');

  const npoCity = (session?.city ?? '').trim();

  useEffect(() => {
    let cancelled = false;
    const cityFallback = (session?.city ?? '').trim();

    (async () => {
      let granted = false;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        granted = status === 'granted';
      } catch { /* permissions API unavailable in this environment */ }

      if (cancelled) return;

      if (granted) {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled) {
            setMapCenter({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setShowUserMarker(true);
            setLocationLabel('Your current location');
          }
        } catch {
          // GPS timeout / unavailable — fall back to city
          const fallback = cityFallback ? cityToCoord(cityFallback) : DEFAULT_REGION;
          if (!cancelled) {
            setMapCenter(fallback);
            setLocationLabel(cityFallback ? `Profile area · ${cityFallback}` : 'Default area');
          }
        }
      } else {
        const fallback = cityFallback ? cityToCoord(cityFallback) : DEFAULT_REGION;
        if (!cancelled) {
          setMapCenter(fallback);
          setLocationLabel(
            cityFallback
              ? `Using profile area · ${cityFallback}`
              : 'Set your city in Profile for better matching',
          );
        }
      }
    })();

    return () => { cancelled = true; };
  }, []); // run once on mount

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAvailableDonations(
      (items) => { setDonations(items.map(toUIDonation)); setLoading(false); },
      () => { setLoading(false); },
    );
    return unsub;
  }, []);

  const filtered = donations.filter(d =>
    activeFilter === 'All' ||
    d.category === activeFilter ||
    (activeFilter === 'Refrigeration' && d.category === 'Dairy')
  );

  const npcLower = npoCity.toLowerCase();
  const cityFiltered = npoCity
    ? filtered.filter(d => {
        if (d.city) return d.city.toLowerCase() === npcLower;
        return d.address.toLowerCase().includes(npcLower);
      })
    : filtered;

  const handleClaim = async (donation: Donation) => {
    if (!session?.userId) {
      Alert.alert('Not signed in', 'Please sign in to claim a donation.');
      return;
    }
    setClaiming(true);
    try {
      await claimDonation(donation.id, session.userId, session.name);
      setSelectedDonation(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not claim donation.';
      Alert.alert('Error', msg);
    } finally {
      setClaiming(false);
    }
  };

  const urgencyCounts = {
    green:  donations.filter(d => d.urgency === 'green').length,
    yellow: donations.filter(d => d.urgency === 'yellow').length,
    red:    donations.filter(d => d.urgency === 'red').length,
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
        {/* ── Title ── */}
        <Text style={{
          color: '#1E293B', fontSize: 22, fontWeight: '800',
          letterSpacing: -0.5, marginBottom: 4,
        }}>
          Operations Map
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
          {npoCity ? `${npoCity} area` : 'All areas'} · 25 km radius
        </Text>

        {!npoCity && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12,
            borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', marginBottom: 16,
          }}>
            <Feather name="info" size={14} color="#D97706" />
            <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 }}>
              Showing all donations — set your city in Profile for better matching.
            </Text>
          </View>
        )}

        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="large" color="#2D6A4F" />
          </View>
        )}

        {/* ── Urgency legend ── */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['green', 'yellow', 'red'] as Urgency[]).map(key => {
            const cfg = URGENCY[key];
            const labels = { green: '6+ hrs', yellow: '2–6 hrs', red: '< 2 hrs' };
            return (
              <View key={key} style={{
                flex: 1, flexDirection: 'row', alignItems: 'center',
                justifyContent: 'center', paddingVertical: 10,
                borderRadius: 14, backgroundColor: cfg.bg,
                borderWidth: 1, borderColor: cfg.border, gap: 6,
              }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: cfg.color,
                }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.text }}>
                  {urgencyCounts[key]} · {labels[key]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Map ── */}
        <View style={{ marginBottom: 16 }}>
          <MapSection
            donations={cityFiltered}
            center={mapCenter}
            showUserMarker={showUserMarker}
            locationLabel={locationLabel}
            onPinPress={setSelectedDonation}
          />
        </View>

        {/* ── Filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          style={{ marginBottom: 20 }}
        >
          {FILTERS.map(f => {
            const isActive = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20, borderWidth: 1.5,
                  borderColor: isActive ? '#2D6A4F' : '#E2E8F0',
                  backgroundColor: isActive ? 'rgba(45,106,79,0.1)' : '#fff',
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: isActive ? '#2D6A4F' : '#94A3B8',
                }}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Section label ── */}
        <Text style={{
          color: '#94A3B8', fontSize: 11, fontWeight: '700',
          letterSpacing: 1, textTransform: 'uppercase',
          marginBottom: 12, paddingLeft: 2,
        }}>
          Available Donations ({cityFiltered.length})
        </Text>

        {/* ── Empty state ── */}
        {!loading && cityFiltered.length === 0 && (
          <View style={{
            alignItems: 'center', paddingVertical: 40,
            backgroundColor: '#fff', borderRadius: 20,
            borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12,
          }}>
            <View style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: '#F1F5F9',
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Feather name="map-pin" size={26} color="#CBD5E1" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 6 }}>
              No donations available in your area
            </Text>
            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 24 }}>
              Try adjusting your service area in Profile
            </Text>
          </View>
        )}

        {/* ── Donation cards ── */}
        {cityFiltered.map(donation => {
          const cfg = URGENCY[donation.urgency];
          return (
            <TouchableOpacity
              key={donation.id}
              onPress={() => setSelectedDonation(donation)}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#fff',
                borderRadius: 20, marginBottom: 12,
                overflow: 'hidden',
                shadowColor: '#000', shadowOpacity: 0.04,
                shadowRadius: 8, elevation: 2,
                borderWidth: 1, borderColor: '#F1F5F9',
              }}
            >
              {/* Urgency stripe */}
              <View style={{
                height: 4,
                backgroundColor: donation.claimed ? '#CBD5E1' : cfg.color,
              }} />

              <View style={{ padding: 16 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'flex-start',
                  justifyContent: 'space-between', marginBottom: 10,
                }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{
                      fontSize: 15, fontWeight: '700',
                      color: '#1E293B', marginBottom: 3,
                    }}>
                      {donation.store}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="map-pin" size={11} color="#94A3B8" />
                      <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                        {donation.distance === '—' ? '—' : `${donation.distance} away`}
                      </Text>
                    </View>
                  </View>

                  {donation.claimed ? (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderRadius: 20, backgroundColor: '#F0FDF4',
                      borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                    }}>
                      <Feather name="check-circle" size={11} color="#10B981" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>
                        Claimed
                      </Text>
                    </View>
                  ) : (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderRadius: 20, backgroundColor: cfg.bg,
                      borderWidth: 1, borderColor: cfg.border,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.text }}>
                        {donation.hoursLeft}h left
                      </Text>
                    </View>
                  )}
                </View>

                {/* Category + weight chips */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <View style={{
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderRadius: 10, backgroundColor: 'rgba(45,106,79,0.08)',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2D6A4F' }}>
                      {donation.category}
                    </Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderRadius: 10, backgroundColor: '#F1F5F9',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                      {donation.weight}
                    </Text>
                  </View>
                </View>

                <Text style={{
                  fontSize: 13, color: '#475569',
                  lineHeight: 19, marginBottom: 12,
                }} numberOfLines={2}>
                  {donation.description}
                </Text>

                {/* Footer */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather name="clock" size={12} color="#94A3B8" />
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      {donation.pickupStart} – {donation.pickupEnd}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather name="navigation" size={12} color="#94A3B8" />
                    <Text style={{
                      fontSize: 11, color: '#94A3B8', maxWidth: 160,
                    }} numberOfLines={1}>
                      {donation.address}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <DonationSheet
        donation={selectedDonation}
        onClose={() => setSelectedDonation(null)}
        onClaim={handleClaim}
        claiming={claiming}
      />
    </View>
  );
}