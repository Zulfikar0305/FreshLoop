// screens/general_user/DonationHubScreen.tsx
// ~300 lines — bloat removed, report button added at bottom of both tabs.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import MapPreview, { reverseGeocode, cityToCoord } from '../../components/MapPreview';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import DatePickerField from '../../components/DatePickerField';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getUserInventory, updateItemQuantity, updateItemStatus, type InventoryItem } from '../../services/inventoryService';
import { createDonationListing, subscribeAvailableDonations, claimDonation, type DonationListing } from '../../services/donationService';
import { createNotification } from '../../services/inAppNotificationService';

// ── Types ───────────────────────────────────────────────────────────────────
type DonationPin  = 'green' | 'yellow' | 'red';
type FilterChip   = 'All' | 'Vegetables' | 'Cooked Meals' | 'Dairy' | 'Bakery';
type Listing = {
  id: string; icon: string; title: string;
  category: FilterChip; store: string; distance: string;
  quantity: string; weight: string;
  pickupStart: string; pickupEnd: string;
  hoursLeft: number; handling?: string; pin: DonationPin;
};

// ── Constants ───────────────────────────────────────────────────────────────
const PIN_COLORS: Record<DonationPin, string> = {
  green: '#22C55E', yellow: '#F59E0B', red: '#EF4444',
};
const PIN_LABELS: Record<DonationPin, string> = {
  green: '6h+ remaining', yellow: '2–6h remaining', red: 'Under 2h',
};
const FILTER_CHIPS: FilterChip[] = ['All', 'Vegetables', 'Cooked Meals', 'Dairy', 'Bakery'];

// Deterministic offsets so markers don't stack when lat/lng is missing
const FIND_MAP_OFFSETS = [
  { lat:  0.022, lng:  0.032 },
  { lat: -0.018, lng:  0.027 },
  { lat:  0.033, lng: -0.021 },
  { lat: -0.026, lng: -0.016 },
  { lat:  0.012, lng:  0.042 },
  { lat: -0.037, lng:  0.011 },
  { lat:  0.041, lng:  0.022 },
];

// ── Report footer button ────────────────────────────────────────────────────
const ReportButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={s.reportBtn} onPress={onPress} activeOpacity={0.8}>
    <Feather name="flag" size={15} color="#fff" />
    <Text style={s.reportBtnText}>Report an Issue</Text>
    <Feather name="chevron-right" size={14} color="#fff" />
  </TouchableOpacity>
);

// ── Convert a Firestore DonationListing to the local Listing display shape ──
function mapDonationToListing(d: DonationListing): Listing {
  const parts = d.pickupWindow.split(/\s*[–\-]\s*/);
  const pickupStart = parts[0]?.trim() ?? '';
  const pickupEnd   = parts[1]?.trim() ?? '';

  let hoursLeft = 8;
  if (d.expiryDate) {
    const diff = (d.expiryDate.getTime() - Date.now()) / 3_600_000;
    hoursLeft = Math.max(0, Math.round(diff));
  }
  const pin: DonationPin = hoursLeft > 6 ? 'green' : hoursLeft >= 2 ? 'yellow' : 'red';

  const catMap: Record<string, FilterChip> = {
    Vegetables: 'Vegetables', Dairy: 'Dairy', Bakery: 'Bakery',
    'Cooked Meals': 'Cooked Meals', Cooked: 'Cooked Meals',
    Protein: 'All', 'Dry Goods': 'All', Fruit: 'All', Other: 'All',
  };
  const category: FilterChip = catMap[d.category] ?? 'All';

  const iconMap: Record<string, string> = {
    Vegetables: '🥦', Dairy: '🥛', Bakery: '🍞',
    'Cooked Meals': '🍲', Cooked: '🍲', Protein: '🍖', Fruit: '🍎',
  };
  const icon = iconMap[d.category] ?? '📦';

  const handling = (d.storageInstructions || d.notes) || undefined;

  return {
    id: d.id, icon, title: d.foodName, category,
    store: d.donorName || 'Anonymous donor',
    distance: '—',
    quantity: `${d.quantity} ${d.unit}`.trim(),
    weight:   `${d.quantity} ${d.unit}`.trim(),
    pickupStart, pickupEnd, hoursLeft, handling, pin,
  };
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function DonationHubScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab]           = useState<'find' | 'give'>('find');
  const [activeFilter, setActiveFilter]     = useState<FilterChip>('All');
  const [listView, setListView]             = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [requested, setRequested]           = useState<string[]>([]);
  const [claiming, setClaiming]             = useState<string | null>(null);

  // Give-tab form
  const { session } = useAuth();
  const [pantryItems,   setPantryItems]   = useState<InventoryItem[]>([]);
  const [pantryLoading, setPantryLoading] = useState(false);
  const [selectedItem,  setSelectedItem]  = useState<InventoryItem | null>(null);
  const [donateQty,     setDonateQty]     = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupStart,   setPickupStart]   = useState('');
  const [pickupEnd,     setPickupEnd]     = useState('');
  const [pickupDate,    setPickupDate]    = useState('');
  const [mapCoord,      setMapCoord]      = useState<{ latitude: number; longitude: number } | null>(null);
  const [notes,         setNotes]         = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [successId,     setSuccessId]     = useState<string | null>(null);

  // Find tab — real-time donations from Firestore
  const [liveDonations,    setLiveDonations]    = useState<DonationListing[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);

  // Give tab — additional form fields
  const [donationVisibleUntil, setDonationVisibleUntil] = useState('');
  const [locLoading,           setLocLoading]            = useState(false);
  const [findMapCenter,        setFindMapCenter]         = useState<{ latitude: number; longitude: number }>(() => cityToCoord(session?.city ?? 'Durban'));
  const geocodeTimerHub = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real donations for list view; fake LISTINGS kept for decorative map pins
  const liveAsListings = liveDonations.map(mapDonationToListing);
  const filteredLive = activeFilter === 'All'
    ? liveAsListings
    : liveAsListings.filter(l => l.category === activeFilter);

  const goToReport = () => navigation.navigate('Report' as never);

  const handleClaim = async (listingId: string) => {
    if (!session?.userId) return;
    setClaiming(listingId);
    try {
      await claimDonation(listingId, session.userId, session.name);
      createNotification(session.userId, {
        type:    'claim',
        title:   'Donation requested ✅',
        message: `You have requested listing ${listingId.slice(0, 8).toUpperCase()}. The donor has been notified.`,
      }).catch(() => {});
      setRequested((r) => [...r, listingId]);
      setSelectedListing(null);
    } catch {
      Alert.alert('Error', 'Could not claim this donation. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  useEffect(() => {
    const uid = session?.userId;
    if (activeTab !== 'give' || !uid) return;
    setPantryLoading(true);
    getUserInventory(uid)
      .then(items => {
        const available = items.filter(
          it => (it.status === 'active' || it.status === 'available') && it.quantity > 0,
        );
        setPantryItems(available);
      })
      .catch(() => {})
      .finally(() => setPantryLoading(false));
  }, [activeTab, session?.userId]);

  // Subscribe to real available donations when on Find tab
  useEffect(() => {
    if (activeTab !== 'find') return;
    setDonationsLoading(true);
    const unsub = subscribeAvailableDonations(
      (items) => { setLiveDonations(items); setDonationsLoading(false); },
      (_err)   => { setDonationsLoading(false); },
    );
    // Center the find map on the user's GPS position if permission is granted
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setFindMapCenter({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch { /* keep city fallback */ }
    })();
    return unsub;
  }, [activeTab]);

  const geocodePickupAddress = React.useCallback((address: string) => {
    if (geocodeTimerHub.current) clearTimeout(geocodeTimerHub.current);
    if (!address.trim()) return;
    geocodeTimerHub.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'FreshLoop/1.0' } });
        const json = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (json[0]) {
          setMapCoord({ latitude: parseFloat(json[0].lat), longitude: parseFloat(json[0].lon) });
        }
      } catch { /* geocoding failure is non-fatal */ }
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGiveCurrentLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable location permission to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setMapCoord(coord);
      const label = await reverseGeocode(coord.latitude, coord.longitude);
      setPickupAddress(label);
    } catch {
      Alert.alert('Location error', 'Could not get your current location.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleGiveMapCoord = async (coord: { latitude: number; longitude: number }) => {
    setMapCoord(coord);
    const label = await reverseGeocode(coord.latitude, coord.longitude);
    setPickupAddress(label);
  };

  const handleDonate = async () => {
    if (!session) return;
    if (!selectedItem) return;
    const donatingItem = selectedItem; // capture before async ops
    const qty = parseFloat(donateQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a positive donation quantity.');
      return;
    }
    if (qty > selectedItem.quantity) {
      Alert.alert(
        'Over limit',
        `You only have ${selectedItem.quantity} ${selectedItem.unit} available.`,
      );
      return;
    }
    if (!pickupAddress.trim()) {
      Alert.alert('Missing info', 'Please enter a pickup address.');
      return;
    }
    setSubmitting(true);
    try {
      const pickupWindow = pickupDate
        ? `${pickupDate} ${pickupStart} – ${pickupDate} ${pickupEnd}`.trim()
        : [pickupStart, pickupEnd].filter(Boolean).join(' – ');
      const id = await createDonationListing({
        donorId: session.userId,
        donorRole: 'home',
        donorName: session.name,
        foodName: selectedItem.name,
        quantity: String(qty),
        unit: selectedItem.unit,
        category: selectedItem.category ?? 'Other',
        storageInstructions: selectedItem.storageLocation ?? '',
        expiryDate: selectedItem.expiryDate
          ? selectedItem.expiryDate.toISOString().split('T')[0]
          : '',
        pickupAddress: pickupAddress.trim(),
        pickupWindow,
        city: 'Durban',
        latitude: mapCoord?.latitude,
        longitude: mapCoord?.longitude,
        notes: notes.trim(),
        visibleUntil: donationVisibleUntil.trim(),
      });
      const remaining = selectedItem.quantity - qty;
      if (remaining <= 0) {
        await updateItemStatus(selectedItem.id, 'used');
      } else {
        await updateItemQuantity(selectedItem.id, remaining);
      }
      setSuccessId(id);
      createNotification(session.userId, {
        type:    'donation',
        title:   'Donation listed! 🎁',
        message: `${donatingItem.name} is now visible to NPOs in your area.`,
      }).catch(() => {});
      // Refresh pantry list so donated item reflects new qty
      const uid = session.userId;
      const updated = await getUserInventory(uid);
      const available = updated.filter(
        it => (it.status === 'active' || it.status === 'available') && it.quantity > 0,
      );
      setPantryItems(available);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not post donation.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CustomHeader />
      <View style={s.divider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickyHeaderIndices={[0]}
      >
        {/* ── Sticky header ── */}
        <View style={s.stickyTop}>
          <Text style={s.title}>Donation Hub 🎁</Text>
          <Text style={s.subtitle}>Give food · Find food · Reduce waste</Text>
          <View style={s.tabBar}>
            {(['find', 'give'] as const).map(tab => (
              <TouchableOpacity
                key={tab} onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={[s.tab, activeTab === tab && s.tabActive]}
              >
                <Feather name={tab === 'find' ? 'map-pin' : 'gift'} size={13}
                  color={activeTab === tab ? '#fff' : '#94A3B8'} style={{ marginRight: 5 }} />
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                  {tab === 'find' ? 'Find Food' : 'Give Food'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ═══════════ FIND TAB ═══════════ */}
        {activeTab === 'find' && (
          <>
            {/* Map / List toggle row */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>
                {donationsLoading ? 'Loading…' : `${filteredLive.length} donations near you`}
              </Text>
              <View style={s.toggle}>
                {(['map', 'list'] as const).map(v => (
                  <TouchableOpacity
                    key={v} activeOpacity={0.8}
                    onPress={() => setListView(v === 'list')}
                    style={[s.toggleBtn, (v === 'list') === listView && s.toggleBtnActive]}
                  >
                    <Feather name={v as any} size={13}
                      color={(v === 'list') === listView ? '#fff' : '#64748B'} />
                    <Text style={[s.toggleBtnText, (v === 'list') === listView && { color: '#fff' }]}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsRow}>
              {FILTER_CHIPS.map(chip => (
                <TouchableOpacity key={chip} onPress={() => setActiveFilter(chip)}
                  activeOpacity={0.8}
                  style={[s.chip, activeFilter === chip && s.chipActive]}>
                  <Text style={[s.chipText, activeFilter === chip && s.chipTextActive]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Map view */}
            {!listView && (
              <View style={[s.mapCard, { padding: 0, overflow: 'hidden' }]}>
                <MapView
                  style={{ height: 220 }}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                  initialRegion={{
                    latitude:      findMapCenter.latitude,
                    longitude:     findMapCenter.longitude,
                    latitudeDelta:  0.18,
                    longitudeDelta: 0.18,
                  }}
                  scrollEnabled
                  zoomEnabled
                  zoomControlEnabled
                  rotateEnabled={false}
                  pitchEnabled={false}
                  showsUserLocation
                >
                  {filteredLive.map((l, i) => {
                    const live = liveDonations.find(d => d.id === l.id);
                    const off  = FIND_MAP_OFFSETS[i % FIND_MAP_OFFSETS.length];
                    const coord = live?.latitude != null && live?.longitude != null
                      ? { latitude: live.latitude, longitude: live.longitude }
                      : {
                          latitude:  findMapCenter.latitude  + (off?.lat ?? 0),
                          longitude: findMapCenter.longitude + (off?.lng ?? 0),
                        };
                    return (
                      <Marker
                        key={l.id}
                        coordinate={coord}
                        pinColor={requested.includes(l.id) ? '#94A3B8' : PIN_COLORS[l.pin]}
                        title={l.title}
                        description={l.store}
                        onPress={() => setSelectedListing(l)}
                      />
                    );
                  })}
                </MapView>
              </View>
            )}

            {/* Listing cards */}
            <View style={s.listPad}>
              {donationsLoading ? (
                <ActivityIndicator color="#2D6A4F" style={{ marginVertical: 32 }} />
              ) : filteredLive.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                    No donations available
                  </Text>
                  <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                    Check back soon — or use Give Food to be the first to donate!
                  </Text>
                </View>
              ) : (
                filteredLive.map(l => {
                  const done = requested.includes(l.id);
                  return (
                    <TouchableOpacity key={l.id} onPress={() => setSelectedListing(l)}
                      activeOpacity={0.75}
                      style={[s.card, done && { opacity: 0.5 }]}>
                      <View style={[s.cardIcon, { backgroundColor: PIN_COLORS[l.pin] + '22' }]}>
                        <Text style={{ fontSize: 24 }}>{l.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{l.title}</Text>
                        <Text style={s.cardMeta}><Feather name="map-pin" size={11} color="#94A3B8" /> {l.store}{l.distance !== '—' ? ` · ${l.distance}` : ''}</Text>
                        <Text style={s.cardMeta}><Feather name="clock" size={11} color="#94A3B8" /> {l.pickupStart} – {l.pickupEnd}</Text>
                        <View style={s.badgeRow}>
                          <View style={[s.badge, { backgroundColor: PIN_COLORS[l.pin] }]}>
                            <View style={[s.badgeDot, { backgroundColor: '#fff' }]} />
                            <Text style={[s.badgeText, { color: '#fff' }]}>{PIN_LABELS[l.pin]}</Text>
                          </View>
                          <Text style={s.qty}>{l.quantity}</Text>
                        </View>
                      </View>
                      {done
                        ? <View style={s.reqBadge}><Text style={s.reqBadgeText}>Requested</Text></View>
                        : <Feather name="chevron-right" size={16} color="#CBD5E1" />
                      }
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <ReportButton onPress={goToReport} />
          </>
        )}

        {/* ═══════════ GIVE TAB ═══════════ */}
        {activeTab === 'give' && (
          <View style={s.givePad}>
            {/* Info banner */}
            <View style={s.banner}>
              <View style={s.bannerIcon}><Text style={{ fontSize: 18 }}>💡</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>Donate before it's too late</Text>
                <Text style={s.bannerSub}>
                  Select an item from your pantry. NPOs in your area will be notified instantly.
                </Text>
              </View>
            </View>

            {successId ? (
              /* ── Success state ── */
              <View style={[s.formCard, { alignItems: 'center', paddingVertical: 32 }]}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(45,106,79,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#2D6A4F' }}>
                  <Feather name="check" size={28} color="#2D6A4F" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 6 }}>Listing Published!</Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
                  {'NPOs in your area have been notified.\nYou\u2019ll receive a claim notification shortly.'}
                </Text>
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '700', marginBottom: 2 }}>LISTING ID</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>{`FL-${successId.slice(0, 8).toUpperCase()}`}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSuccessId(null);
                    setSelectedItem(null);
                    setDonateQty('');
                    setPickupAddress('');
                    setPickupStart('');
                    setPickupEnd('');
                    setNotes('');
                    setDonationVisibleUntil('');
                    setPickupDate('');
                    setMapCoord(null);
                  }}
                  activeOpacity={0.85}
                  style={[s.submitBtn, { width: '100%', marginTop: 0 }]}
                >
                  <Feather name="plus" size={16} color="#4ADE80" />
                  <Text style={s.submitText}>Donate another item</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Donation form ── */
              <View style={s.formCard}>
                <Text style={s.formTitle}>Select a pantry item</Text>

                {pantryLoading ? (
                  <ActivityIndicator size="small" color="#2D6A4F" style={{ marginVertical: 20 }} />
                ) : pantryItems.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Feather name="package" size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#94A3B8' }}>No pantry items available</Text>
                    <Text style={{ fontSize: 12, color: '#CBD5E1', textAlign: 'center', marginTop: 4 }}>Add items to your Smart Pantry first.</Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingBottom: 4, marginBottom: 16 }}
                  >
                    {pantryItems.map(item => {
                      const isSel = selectedItem?.id === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => { setSelectedItem(item); setDonateQty(''); }}
                          activeOpacity={0.8}
                          style={{
                            width: 110, backgroundColor: isSel ? 'rgba(45,106,79,0.08)' : '#F8FAFC',
                            borderRadius: 16, padding: 12, alignItems: 'center',
                            borderWidth: 2, borderColor: isSel ? '#2D6A4F' : '#E2E8F0',
                          }}
                        >
                          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isSel ? 'rgba(45,106,79,0.15)' : '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <Feather name="package" size={18} color={isSel ? '#2D6A4F' : '#94A3B8'} />
                          </View>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#2D6A4F' : '#1E293B', textAlign: 'center', marginBottom: 2 }} numberOfLines={2}>{item.name}</Text>
                          <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{item.quantity} {item.unit}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {selectedItem && (
                  <>
                    {/* Selected item summary strip */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 14, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(45,106,79,0.15)' }}>
                      <Feather name="check-circle" size={16} color="#2D6A4F" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{selectedItem.name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          {`Available: ${selectedItem.quantity} ${selectedItem.unit}${selectedItem.category ? ` · ${selectedItem.category}` : ''}`}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedItem(null)} style={{ padding: 4 }}>
                        <Feather name="x" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    <Text style={s.fieldLabel}>DONATE QUANTITY ({selectedItem.unit})</Text>
                    <TextInput
                      style={s.input}
                      placeholder={`Max ${selectedItem.quantity} ${selectedItem.unit}`}
                      placeholderTextColor="#CBD5E1"
                      value={donateQty}
                      onChangeText={setDonateQty}
                      keyboardType="numeric"
                    />

                    <Text style={s.fieldLabel}>PICKUP ADDRESS</Text>
                    <TextInput
                      style={s.input}
                      placeholder="e.g. 45 Berea Road, Durban"
                      placeholderTextColor="#CBD5E1"
                      value={pickupAddress}
                      onChangeText={(v) => { setPickupAddress(v); geocodePickupAddress(v); }}
                    />
                    <TouchableOpacity
                      onPress={handleGiveCurrentLocation}
                      disabled={locLoading}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: 6, paddingVertical: 9,
                        backgroundColor: 'rgba(45,106,79,0.08)', borderRadius: 10,
                        borderWidth: 1, borderColor: 'rgba(45,106,79,0.2)',
                        marginBottom: 10, opacity: locLoading ? 0.6 : 1,
                      }}
                    >
                      {locLoading
                        ? <ActivityIndicator size="small" color="#2D6A4F" />
                        : <Feather name="navigation" size={14} color="#2D6A4F" />
                      }
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#2D6A4F' }}>
                        Use current location
                      </Text>
                    </TouchableOpacity>

                    <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 6 }}>
                      <MapPreview
                        latitude={mapCoord?.latitude}
                        longitude={mapCoord?.longitude}
                        profileCity={session?.city || 'Durban'}
                        height={180}
                        markerTitle="Pickup location"
                        markerVariant="pickup"
                        draggable
                        useRegion
                        usePhoneLocation={false}
                        onMarkerDragEnd={handleGiveMapCoord}
                        onMapPress={handleGiveMapCoord}
                      />
                    </View>
                    <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 14 }}>
                      Type address · use location · or tap map to pin
                    </Text>

                    <Text style={s.fieldLabel}>PICKUP DATE</Text>
                    <DatePickerField
                      value={pickupDate}
                      onChange={setPickupDate}
                      placeholder="Select pickup date"
                      containerStyle={{ marginBottom: 14 }}
                    />

                    <Text style={s.fieldLabel}>PICKUP WINDOW (time only)</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.subLabel}>From (HH:MM)</Text>
                        <TextInput style={s.input} placeholder="16:00"
                          placeholderTextColor="#CBD5E1" value={pickupStart} onChangeText={setPickupStart} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.subLabel}>Until (HH:MM)</Text>
                        <TextInput style={s.input} placeholder="18:00"
                          placeholderTextColor="#CBD5E1" value={pickupEnd} onChangeText={setPickupEnd} />
                      </View>
                    </View>

                    <Text style={s.fieldLabel}>DONATION VISIBLE UNTIL</Text>
                    <TextInput
                      style={s.input}
                      placeholder="e.g. 2026-05-10  (leave blank to keep open)"
                      placeholderTextColor="#CBD5E1"
                      value={donationVisibleUntil}
                      onChangeText={setDonationVisibleUntil}
                    />

                    <Text style={s.fieldLabel}>HANDLING NOTES</Text>
                    <TextInput
                      style={[s.input, { minHeight: 80 }]}
                      placeholder="Any special instructions for the collector…"
                      placeholderTextColor="#CBD5E1"
                      multiline
                      textAlignVertical="top"
                      value={notes}
                      onChangeText={setNotes}
                    />

                    <TouchableOpacity
                      style={[s.submitBtn, (submitting || !donateQty.trim() || !pickupAddress.trim()) && { opacity: 0.45 }]}
                      activeOpacity={0.85}
                      disabled={submitting || !donateQty.trim() || !pickupAddress.trim()}
                      onPress={handleDonate}
                    >
                      {submitting
                        ? <ActivityIndicator size="small" color="#4ADE80" />
                        : <><Feather name="send" size={16} color="#4ADE80" /><Text style={s.submitText}>Post donation listing</Text></>
                      }
                    </TouchableOpacity>

                    <Text style={s.submitHint}>
                      Your listing will be visible to all verified coordinators in your area.
                    </Text>
                  </>
                )}
              </View>
            )}

            <ReportButton onPress={goToReport} />
          </View>
        )}
      </ScrollView>

      {/* ── Listing detail modal ── */}
      <Modal visible={!!selectedListing} transparent animationType="slide"
        onRequestClose={() => setSelectedListing(null)}>
        {selectedListing && (
          <>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
              activeOpacity={1} onPress={() => setSelectedListing(null)} />
            <View style={s.sheet}>
              <View style={s.handle} />
              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

                {/* Header */}
                <View style={s.modalHeader}>
                  <View style={[s.modalIcon, { backgroundColor: PIN_COLORS[selectedListing.pin] + '22' }]}>
                    <Text style={{ fontSize: 28 }}>{selectedListing.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>{selectedListing.title}</Text>
                    <View style={[s.badge, { alignSelf: 'flex-start', marginTop: 5, backgroundColor: PIN_COLORS[selectedListing.pin] }]}>
                      <View style={[s.badgeDot, { backgroundColor: '#fff' }]} />
                      <Text style={[s.badgeText, { color: '#fff' }]}>{PIN_LABELS[selectedListing.pin]}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedListing(null)} style={s.closeBtn}>
                    <Feather name="x" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Detail rows */}
                <View style={s.detailGrid}>
                  {[
                    { icon: 'package',    label: 'Quantity',      value: selectedListing.quantity },
                    { icon: 'bar-chart',  label: 'Weight est.',   value: selectedListing.weight },
                    { icon: 'map-pin',    label: 'Store',         value: selectedListing.store },
                    { icon: 'navigation', label: 'Distance',      value: selectedListing.distance },
                    { icon: 'clock',      label: 'Pickup window', value: `${selectedListing.pickupStart} – ${selectedListing.pickupEnd}` },
                    { icon: 'tag',        label: 'Category',      value: selectedListing.category },
                  ].map(row => (
                    <View key={row.label} style={s.detailRow}>
                      <View style={s.detailIconBox}><Feather name={row.icon as any} size={13} color="#2D6A4F" /></View>
                      <Text style={s.detailLabel}>{row.label}</Text>
                      <Text style={s.detailValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Handling */}
                {selectedListing.handling && (
                  <View style={s.handlingBox}>
                    <Feather name="alert-circle" size={13} color="#fff" />
                    <Text style={s.handlingText}>{selectedListing.handling}</Text>
                  </View>
                )}

                {/* Mini-map */}
                <Text style={s.modalSection}>Pickup location</Text>
                <View style={{ marginBottom: 16 }}>
                  <MapPreview
                    profileCity={session?.city || 'Durban'}
                    usePhoneLocation={false}
                    height={110}
                    markerTitle={selectedListing.store}
                    markerDescription={selectedListing.store}
                    markerVariant="pickup"
                  />
                </View>

                {/* Request button */}
                {requested.includes(selectedListing.id) ? (
                  <View style={s.reqFullBtn}>
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={s.reqFullBtnText}>Request sent — donor notified</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.reqBtn, claiming === selectedListing.id && { opacity: 0.6 }]}
                    activeOpacity={0.85}
                    disabled={claiming === selectedListing.id}
                    onPress={() => handleClaim(selectedListing.id)}
                  >
                    {claiming === selectedListing.id
                      ? <ActivityIndicator size="small" color="#4ADE80" />
                      : <Feather name="send" size={16} color="#4ADE80" />
                    }
                    <Text style={s.reqBtnText}>Request this donation</Text>
                  </TouchableOpacity>
                )}

                <View style={s.threadNote}>
                  <Feather name="message-circle" size={13} color="#fff" />
                  <Text style={s.threadNoteText}>
                    After requesting, a message thread opens between you and the donor to coordinate pickup.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </>
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const G = '#2D6A4F';
const DARK = '#1C3A2E';

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#E2EBE1' },
  divider:      { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  // Sticky top
  stickyTop:    { backgroundColor: '#E2EBE1', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  title:        { fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5, marginBottom: 2 },
  subtitle:     { fontSize: 12, color: '#94A3B8', marginBottom: 16 },

  // Tab bar
  tabBar:       { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  tab:          { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabActive:    { backgroundColor: DARK },
  tabText:      { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  tabTextActive:{ color: '#fff' },

  // Map / list toggle
  toggleRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  toggleLabel:  { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  toggle:       { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 3 },
  toggleBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: DARK },
  toggleBtnText:{ fontSize: 12, fontWeight: '700', color: '#64748B' },

  // Chips
  chipsRow:     { paddingHorizontal: 20, gap: 8, marginBottom: 14 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff' },
  chipActive:   { backgroundColor: DARK },
  chipText:     { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive:{ color: '#fff' },

  // Map
  mapCard:      { marginHorizontal: 20, height: 220, backgroundColor: '#EEF2F7', borderRadius: 22, marginBottom: 16, overflow: 'hidden', position: 'relative' },
  mapBadge:     { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  mapBadgeText: { fontSize: 11, fontWeight: '700', color: G },
  gridLine:     { position: 'absolute', backgroundColor: '#E2E8F0' },
  gridH:        { left: 0, right: 0, height: 1 },
  gridV:        { top: 0, bottom: 0, width: 1 },
  pin:          { position: 'absolute', alignItems: 'center' },
  pinDot:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  pinTail:      { width: 3, height: 8, borderRadius: 2, marginTop: -2 },
  legend:       { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#fff', borderRadius: 12, padding: 10, gap: 6 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendText:   { fontSize: 10, fontWeight: '600', color: '#64748B' },

  // Listing cards
  listPad:      { paddingHorizontal: 20, gap: 12 },
  card:         { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardIcon:     { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTitle:    { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  cardMeta:     { fontSize: 12, color: '#64748B', marginBottom: 2 },
  badgeRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDot:     { width: 6, height: 6, borderRadius: 3 },
  badgeText:    { fontSize: 10, fontWeight: '700' },
  qty:          { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  reqBadge:     { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  reqBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Report button
  reportBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 20, paddingVertical: 14, borderRadius: 16, backgroundColor: '#EF4444' },
  reportBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },

  // Give tab
  givePad:      { paddingHorizontal: 20, gap: 16, marginTop: 4 },
  banner:       { backgroundColor: '#EAB308', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bannerIcon:   { width: 38, height: 38, backgroundColor: '#FDE68A', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bannerTitle:  { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 3 },
  bannerSub:    { fontSize: 12, color: '#fff', lineHeight: 18 },

  formCard:     { backgroundColor: '#fff', borderRadius: 22, padding: 20, gap: 0 },
  formTitle:    { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  photoBox:     { height: 90, backgroundColor: '#F8FAFC', borderRadius: 16, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 4 },
  photoLabel:   { fontSize: 14, fontWeight: '700', color: G },
  photoSub:     { fontSize: 11, color: '#94A3B8' },
  fieldLabel:   { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  subLabel:     { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 6 },
  input:        { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1E293B' },

  // Location
  locCard:      { backgroundColor: '#F8FAFC', borderRadius: 16, overflow: 'hidden' },
  miniMap:      { backgroundColor: '#EEF2F7', position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  locInfo:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  locTitle:     { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  locSub:       { fontSize: 11, color: '#94A3B8' },
  adjustBtn:    { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  adjustText:   { fontSize: 12, fontWeight: '700', color: '#fff' },

  submitBtn:    { backgroundColor: DARK, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  submitText:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  submitHint:   { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 17, marginTop: 10 },

  // Modal
  sheet:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12 },
  modalHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  modalIcon:    { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3, flex: 1 },
  closeBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  detailGrid:   { gap: 10, marginBottom: 16 },
  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },
  detailIconBox:{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  detailLabel:  { fontSize: 12, color: '#94A3B8', fontWeight: '600', width: 90 },
  detailValue:  { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  handlingBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F97316', borderRadius: 14, padding: 12, marginBottom: 16 },
  handlingText: { flex: 1, fontSize: 13, color: '#fff', lineHeight: 19 },
  modalSection: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  mapStoreBadge:{ position: 'absolute', bottom: 8, left: 12, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  mapStoreBadgeText: { fontSize: 11, fontWeight: '700', color: '#1E293B' },
  reqBtn:       { backgroundColor: DARK, borderRadius: 18, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  reqBtnText:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  reqFullBtn:   { backgroundColor: '#10B981', borderRadius: 18, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  reqFullBtnText:{ fontSize: 15, fontWeight: '800', color: '#fff' },
  threadNote:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0D9488', borderRadius: 14, padding: 12 },
  threadNoteText:{ flex: 1, fontSize: 12, color: '#fff', lineHeight: 18 },
});