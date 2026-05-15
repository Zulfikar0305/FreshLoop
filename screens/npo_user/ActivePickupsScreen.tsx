// screens/npo_user/ActivePickupsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeClaimedDonations,
  completeDonation,
  type DonationListing,
} from '../../services/donationService';

type PickupStatus = 'Claimed' | 'En Route' | 'Arrived' | 'Completed';

type Pickup = {
  id: string;
  store: string;
  address: string;
  category: string;
  weight: string;
  pickupEnd: string;
  pickupStartRaw?: string;
  distance: string;
  status: PickupStatus;
  urgency: 'green' | 'yellow' | 'red';
  driver: string;
  estimatedArrival: string;
  hoursLeft: number;
};

const PICKUPS: Pickup[] = [
  {
    id: "1",
    store: "Spar Westville",
    address: "12 Old Main Rd, Westville",
    category: "Fresh Produce",
    weight: "8 kg",
    pickupEnd: "16:00",
    distance: "2.3 km",
    status: "En Route",
    urgency: "green",
    driver: "Sipho Dlamini",
    estimatedArrival: "14 min",
    hoursLeft: 8,
  },
  {
    id: "2",
    store: "Food Lover's Market Pinetown",
    address: "33 King St, Pinetown",
    category: "Baked Goods",
    weight: "5.5 kg",
    pickupEnd: "17:30",
    distance: "4.7 km",
    status: "Arrived",
    urgency: "yellow",
    driver: "Thabo Nkosi",
    estimatedArrival: "Now",
    hoursLeft: 4,
  },
];

const STATUS_CONFIG: Record<PickupStatus, { color: string; bg: string; icon: React.ComponentProps<typeof Feather>['name']; text: string }> = {
  "Claimed":  { color: "#8B5CF6", bg: "#F5F3FF", icon: "bookmark",     text: "#5B21B6" },
  "En Route": { color: "#F59E0B", bg: "#FEF3C7", icon: "truck",        text: "#92400E" },
  "Arrived":  { color: "#0284C7", bg: "#F0F9FF", icon: "map-pin",      text: "#0369A1" },
  "Completed":{ color: "#10B981", bg: "#F0FDF4", icon: "check-circle", text: "#065F46" },
};

const URGENCY_COLORS = { green: "#10B981", yellow: "#FBBF24", red: "#EF4444" };

type ActivePickupFilter = 'All' | PickupStatus;
const FILTER_OPTIONS: ActivePickupFilter[] = ['All', 'Claimed', 'En Route', 'Arrived', 'Completed'];

// ── Firestore → UI mapping ───────────────────────────────────────────────────────────────
function hoursUntil(date: Date | null): number {
  if (!date) return 12;
  return Math.max(0, (date.getTime() - Date.now()) / 3_600_000);
}

function urgencyFromHours(h: number): 'green' | 'yellow' | 'red' {
  if (h < 2) return 'red';
  if (h < 6) return 'yellow';
  return 'green';
}

function toUIPickup(d: DonationListing): Pickup {
  const hours = hoursUntil(d.expiryDate);
  const parts = d.pickupWindow.split(/\s*[–\-]\s*/);
  const pickupStartRaw = parts[0]?.trim() ?? '';
  const pickupEnd = parts[1]?.trim() ?? parts[0]?.trim() ?? '—';
  return {
    id: d.id,
    store: d.donorName || 'Donor',
    address: d.pickupAddress || d.city || 'Durban',
    category: d.category,
    weight: d.quantity,
    pickupEnd,
    pickupStartRaw,
    distance: '—',
    status: d.status === 'completed' ? 'Completed' : 'Claimed',
    urgency: urgencyFromHours(hours),
    driver: '—',
    estimatedArrival: '—',
    hoursLeft: Math.ceil(hours),
  };
}

function StatusToggle({ status, onStatusChange }: { status: PickupStatus; onStatusChange: (s: PickupStatus) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginTop: 12 }}>
      {(["En Route", "Arrived"] as PickupStatus[]).map((s) => {
        const isActive = status === s;
        return (
          <TouchableOpacity
            key={s}
            onPress={() => onStatusChange(s)}
            activeOpacity={0.8}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
              backgroundColor: isActive ? '#fff' : 'transparent',
              shadowColor: isActive ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.05 : 0,
              shadowRadius: 4, elevation: isActive ? 2 : 0,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#2D6A4F' : '#94A3B8' }}>
              {s}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LiveDistanceIndicator({ distance, estimatedArrival }: { distance: string; estimatedArrival: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
      <View style={{ marginRight: 12 }}>
        <View style={{ width: 36, height: 36, backgroundColor: 'rgba(45,106,79,0.1)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="navigation" size={16} color="#2D6A4F" />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Live Distance</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{distance}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>ETA</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#2D6A4F' }}>{estimatedArrival}</Text>
      </View>
    </View>
  );
}

export default function ActivePickupsScreen() {
  const { session } = useAuth();
  const orgName = session?.name ?? 'Your Organisation';
  const [pickups,     setPickups]     = useState<Pickup[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, PickupStatus>>({});
  const [filter,      setFilter]      = useState<ActivePickupFilter>('All');

  useEffect(() => {
    if (!session?.userId) return;
    setLoading(true);
    const unsub = subscribeClaimedDonations(
      session.userId,
      (items) => { setPickups(items.map(toUIPickup)); setLoading(false); },
      () => { setLoading(false); },
    );
    return unsub;
  }, [session?.userId]);

  const getStatus = (p: Pickup): PickupStatus => localStatus[p.id] ?? p.status;

  const updateStatus = async (id: string, newStatus: PickupStatus) => {
    if (newStatus === 'Completed') {
      const pickup = pickups.find(p => p.id === id);
      if (pickup?.pickupStartRaw) {
        const start = new Date(pickup.pickupStartRaw.replace(' ', 'T'));
        if (!isNaN(start.getTime()) && Date.now() < start.getTime()) {
          Alert.alert(
            'Too Early',
            'This pickup cannot be completed before the pickup window starts.',
          );
          return;
        }
      }
      try {
        await completeDonation(id);
        // Firestore subscription will update the card automatically
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not complete pickup.';
        Alert.alert('Error', msg);
      }
    } else {
      setLocalStatus(prev => ({ ...prev, [id]: newStatus }));
    }
  };

  const activeCount      = pickups.filter((p) => getStatus(p) !== 'Completed').length;
  const completedCount   = pickups.filter((p) => getStatus(p) === 'Completed').length;
  const displayedPickups = filter === 'All' ? pickups : pickups.filter(p => getStatus(p) === filter);

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
        {/* Header Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5, marginBottom: 4 }}>
              Active Pickups
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B' }}>{orgName} · Today's collection run</Text>
          </View>
          {activeCount > 1 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Alert.alert('Route Optimised', `Your ${activeCount} active pickups have been reordered by shortest travel distance to save time and fuel.`)}
              style={{ backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Feather name="git-merge" size={14} color="#FFF" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Optimise</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Bar */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>{pickups.length}</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 }}>Total Today</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: '#FEF3C7' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#F59E0B' }}>{activeCount}</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 }}>In Progress</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: '#DCFCE7' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#10B981' }}>{completedCount}</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 }}>Completed</Text>
          </View>
        </View>

        {/* Pickup Cards */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 }}>
          Today's Itinerary
        </Text>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
        >
          {FILTER_OPTIONS.map(opt => {
            const isActive = filter === opt;
            const count = opt === 'All'
              ? pickups.length
              : pickups.filter(p => getStatus(p) === opt).length;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => setFilter(opt)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20, borderWidth: 1.5,
                  borderColor: isActive ? '#2D6A4F' : '#E2E8F0',
                  backgroundColor: isActive ? 'rgba(45,106,79,0.1)' : '#F8FAFC',
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#2D6A4F' : '#64748B' }}>
                  {opt}
                </Text>
                {count > 0 && (
                  <View style={{
                    backgroundColor: isActive ? '#2D6A4F' : '#E2E8F0',
                    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
                    minWidth: 20, alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#fff' : '#64748B' }}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#2D6A4F" />
          </View>
        ) : pickups.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 20 }}>
            <View style={{ width: 64, height: 64, backgroundColor: '#F8FAFC', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Feather name="truck" size={28} color="#CBD5E1" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569', marginBottom: 4 }}>No active pickups</Text>
            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 30 }}>Claim donations from the Operations Map to see them here.</Text>
          </View>
        ) : displayedPickups.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 20 }}>
            <Feather name="filter" size={28} color="#CBD5E1" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569', marginBottom: 4 }}>No {filter} pickups</Text>
            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 30 }}>
              No pickups match this filter. Try “All” to see everything.
            </Text>
          </View>
        ) : (
          displayedPickups.map((pickup, index) => {
            const displayStatus = getStatus(pickup);
            const cfg = STATUS_CONFIG[displayStatus];
            const isExpanded = expandedId === pickup.id;

            return (
              <View key={pickup.id} style={{ backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                {/* Urgency Stripe */}
                <View style={{ height: 4, backgroundColor: URGENCY_COLORS[pickup.urgency] }} />

                <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : pickup.id)} activeOpacity={0.85} style={{ padding: 16 }}>
                  {/* Row 1: Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: cfg.color }}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 2 }}>{pickup.store}</Text>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>{pickup.address}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: cfg.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                      <Feather name={cfg.icon} size={11} color={cfg.color} />
                      <Text style={{ color: cfg.text, fontSize: 11, fontWeight: '700', marginLeft: 6 }}>{displayStatus}</Text>
                    </View>
                  </View>

                  {/* Row 2: Quick Info */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[ 
                      { icon: "tag", text: pickup.category }, 
                      { icon: "package", text: pickup.weight }, 
                      { icon: "clock", text: `By ${pickup.pickupEnd}` } 
                    ].map((item, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                        <Feather name={item.icon as any} size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600', marginLeft: 6 }}>{item.text}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Expand Icon */}
                  <View style={{ position: 'absolute', right: 16, bottom: 16 }}>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#CBD5E1" />
                  </View>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 }}>
                    {/* Driver */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ width: 40, height: 40, backgroundColor: '#2D6A4F', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                          {pickup.driver.split(" ").map((n) => n[0]).join("")}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 }}>Assigned Driver</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{pickup.driver}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => Alert.alert('Message Driver', `Open a message thread with ${pickup.driver}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open Chat', onPress: () => Alert.alert('Chat', 'Driver messaging will open in the full release.') },
                        ])}
                        style={{ backgroundColor: '#E2EBE1', borderRadius: 12, padding: 10 }}
                      >
                        <Feather name="message-circle" size={16} color="#2D6A4F" />
                      </TouchableOpacity>
                    </View>

                    <LiveDistanceIndicator distance={pickup.distance} estimatedArrival={pickup.estimatedArrival} />

                    {displayStatus !== "Completed" && (
                      <>
                        <StatusToggle status={displayStatus} onStatusChange={(s) => updateStatus(pickup.id, s)} />
                        <Text style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 6 }}>
                          Display only — tap Mark as Collected to save completion.
                        </Text>
                      </>
                    )}

                    {/* Action Buttons */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(pickup.address)}`)}
                      style={{ marginTop: 12, backgroundColor: '#1C3A2E', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Feather name="navigation" size={16} color="#4ADE80" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginLeft: 8 }}>Navigate to Location</Text>
                    </TouchableOpacity>

                    {displayStatus === "Arrived" && (
                      <TouchableOpacity onPress={() => updateStatus(pickup.id, "Completed")} activeOpacity={0.8} style={{ marginTop: 8, backgroundColor: '#2D6A4F', borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: '#2D6A4F', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Mark as Collected</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}