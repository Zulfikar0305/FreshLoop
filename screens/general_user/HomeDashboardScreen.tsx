// screens/general_user/HomeDashboardScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { getUserInventory, InventoryItem } from '../../services/inventoryService';
import { scheduleExpiryNotifications } from '../../services/notificationService';
import { getUserWasteLogs, WasteLog } from '../../services/wasteService';

const { width } = Dimensions.get('window');
type Nav = any;

const AI_TIPS = [
  { tip: 'Use wilting spinach in a smoothie — frozen works too.',    icon: '💡' },
  { tip: 'Stale bread makes the best French toast or breadcrumbs.', icon: '🍞' },
  { tip: 'Overripe bananas? Freeze them for baking later.',          icon: '🍌' },
  { tip: 'Store herbs in a glass of water to double their life.',    icon: '🌿' },
  { tip: 'Egg nearing expiry? Hard boil it — buys 1 extra week.',   icon: '🥚' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysLeft(expiryDate: Date | null): number {
  if (!expiryDate) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatus(daysLeft: number): 'Fresh' | 'Soon' | 'Expired' {
  if (daysLeft < 0)  return 'Expired';
  if (daysLeft <= 3) return 'Soon';
  return 'Fresh';
}

function formatExpiry(expiryDate: Date | null): string {
  if (!expiryDate) return 'No expiry';
  return expiryDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

// emoji fallback by name — simple keyword match
function getEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('milk'))    return '🥛';
  if (n.includes('egg'))     return '🥚';
  if (n.includes('bread'))   return '🍞';
  if (n.includes('spinach') || n.includes('lettuce')) return '🥬';
  if (n.includes('tomato'))  return '🍅';
  if (n.includes('apple'))   return '🍎';
  if (n.includes('banana'))  return '🍌';
  if (n.includes('chicken') || n.includes('meat') || n.includes('beef')) return '🍖';
  if (n.includes('fish'))    return '🐟';
  if (n.includes('cheese'))  return '🧀';
  if (n.includes('yogurt') || n.includes('yoghurt')) return '🥛';
  if (n.includes('rice') || n.includes('pasta')) return '🍚';
  return '🥘';
}

function urgencyColors(daysLeft: number) {
  if (daysLeft <= 1) return { bg: '#FEF2F2', border: '#FECACA', text: '#EF4444', badge: '#FEE2E2' };
  if (daysLeft <= 3) return { bg: '#FFF7ED', border: '#FED7AA', text: '#F97316', badge: '#FFEDD5' };
  return                    { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', badge: '#DCFCE7' };
}

function statusColor(status: string) {
  if (status === 'Fresh')   return '#16A34A';
  if (status === 'Soon')    return '#F97316';
  if (status === 'Expired') return '#EF4444';
  return '#94A3B8';
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Consecutive calendar days ending today with no `wasted` log (matches wasteLogs from Firestore). */
function computeZeroWasteStreak(logs: WasteLog[]): number {
  const wastedDays = new Set<number>();
  for (const log of logs) {
    if (log.status !== 'wasted') continue;
    wastedDays.add(startOfDay(log.wastedAt).getTime());
  }
  let streak = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 366; i++) {
    const check = new Date(today);
    check.setDate(today.getDate() - i);
    if (wastedDays.has(startOfDay(check).getTime())) break;
    streak++;
  }
  return streak;
}

function monthlyWastedCounts(logs: WasteLog[], monthCount: number): { month: string; items: number }[] {
  const now = new Date();
  const rows: { month: string; items: number; y: number; m: number }[] = [];
  for (let offset = monthCount - 1; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    rows.push({
      month: d.toLocaleDateString('en-ZA', { month: 'short' }),
      items: 0,
      y: d.getFullYear(),
      m: d.getMonth(),
    });
  }
  for (const log of logs) {
    if (log.status !== 'wasted') continue;
    const dt = log.wastedAt;
    const r = rows.find((row) => row.y === dt.getFullYear() && row.m === dt.getMonth());
    if (r) r.items += 1;
  }
  return rows.map(({ month, items }) => ({ month, items }));
}

function trendBarColor(items: number, maxItems: number): string {
  if (maxItems <= 0 || items <= 0) return '#94A3B8';
  const ratio = items / maxItems;
  if (ratio > 0.66) return '#EF4444';
  if (ratio > 0.33) return '#F97316';
  return '#34D399';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ExpiringCard({ item, daysLeft, onPress }: {
  item: InventoryItem; daysLeft: number; onPress: () => void;
}) {
  const c = urgencyColors(daysLeft);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{
      width: 115, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
      borderRadius: 20, padding: 14, marginRight: 10,
    }}>
      <Text style={{ fontSize: 26 }}>{getEmoji(item.name)}</Text>
      <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 13, marginTop: 8 }} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
        {item.quantity} {item.unit}
      </Text>
      <View style={{
        marginTop: 8, paddingHorizontal: 8, paddingVertical: 3,
        backgroundColor: c.badge, borderRadius: 20, alignSelf: 'flex-start',
      }}>
        <Text style={{ color: c.text, fontSize: 10, fontWeight: '700' }}>
          {daysLeft <= 0 ? 'Expired!' : daysLeft === 1 ? 'Today!' : `${daysLeft} days`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function PantryRow({ item, daysLeft, onPress }: {
  item: InventoryItem; daysLeft: number; onPress: () => void;
}) {
  const status = getStatus(daysLeft);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
      borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    }}>
      <View style={{
        width: 36, height: 36, backgroundColor: '#F0FDF4', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
      }}>
        <Feather name="package" size={15} color="#2D6A4F" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#1E293B', fontWeight: '600', fontSize: 13 }}>{item.name}</Text>
        <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
          {item.quantity} {item.unit} · Expires {formatExpiry(item.expiryDate)}
        </Text>
      </View>
      <Text style={{ color: statusColor(status), fontSize: 11, fontWeight: '700', marginRight: 6 }}>
        {status}
      </Text>
      <Feather name="chevron-right" size={14} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeDashboardScreen() {
  const { session } = useAuth();
  const firstName = session?.name?.split(' ')[0] ?? 'there';
  const navigation = useNavigation<Nav>();

  const [tipIndex,    setTipIndex]    = useState(0);
  const [items,       setItems]       = useState<InventoryItem[]>([]);
  const [wasteLogs,   setWasteLogs]   = useState<WasteLog[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // ── Load inventory + waste logs (same collections as backend services) ─────
  const loadDashboard = useCallback(async () => {
    if (!session?.userId) return;
    try {
      const [inv, waste] = await Promise.all([
        getUserInventory(session.userId),
        getUserWasteLogs(session.userId),
      ]);
      const active = inv.filter((i) => i.status === 'active');
      setItems(active);
      setWasteLogs(waste);
      scheduleExpiryNotifications(
        active.map((i) => ({
          id: i.id,
          name: i.name,
          expiryDate: i.expiryDate,
          status: i.status,
        }))
      ).catch(() => {});
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.userId]);

  // Reload whenever screen comes into focus (e.g. after adding an item)
  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadDashboard();
  }, [loadDashboard]));

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const itemsWithDays = items.map(i => ({ item: i, daysLeft: getDaysLeft(i.expiryDate) }));

  const freshCount   = itemsWithDays.filter(({ daysLeft }) => getStatus(daysLeft) === 'Fresh').length;
  const soonCount    = itemsWithDays.filter(({ daysLeft }) => getStatus(daysLeft) === 'Soon').length;
  const expiredCount = itemsWithDays.filter(({ daysLeft }) => getStatus(daysLeft) === 'Expired').length;

  // Expiring Soon = items expiring within 3 days, sorted by urgency
  const expiringSoon = itemsWithDays
    .filter(({ daysLeft }) => daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // All items preview — show first 5, sorted soonest first
  const previewItems = [...itemsWithDays]
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const wasteStreak = useMemo(
    () => computeZeroWasteStreak(wasteLogs),
    [wasteLogs]
  );

  const monthlyTrend = useMemo(
    () => monthlyWastedCounts(wasteLogs, 4),
    [wasteLogs]
  );

  const maxMonthlyWaste = useMemo(
    () => Math.max(...monthlyTrend.map((r) => r.items), 1),
    [monthlyTrend]
  );

  const currentTip = AI_TIPS[tipIndex];

  // ── Quick Access ───────────────────────────────────────────────────────────
  const QUICK_LINKS: { label: string; icon: React.ComponentProps<typeof Feather>['name']; onPress: () => void }[] = [
    { label: 'Quick Add',  icon: 'plus-circle', onPress: () => navigation.navigate('QuickAdd')       },
    { label: 'Shop list',  icon: 'shopping-cart', onPress: () => navigation.navigate('ShoppingList') },
    { label: 'Pantry',     icon: 'box',         onPress: () => navigation.navigate('Pantry')         },
    { label: 'Recipes',    icon: 'book-open',   onPress: () => navigation.navigate('Recipes')        },
    { label: 'Meal Plan',  icon: 'calendar',    onPress: () => navigation.navigate('MealPlan')       },
    { label: 'Waste',      icon: 'bar-chart-2', onPress: () => navigation.navigate('WasteAnalytics') },
    { label: 'Donate',     icon: 'heart',       onPress: () => navigation.navigate('Donate')         },
    { label: 'Report',     icon: 'flag',        onPress: () => navigation.navigate('Report' as never)},
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        {/* Background blobs */}
        <View style={{ position: 'absolute', top: 30,  right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#C5D8C3', opacity: 0.35 }} />
        <View style={{ position: 'absolute', top: 320, left: -80,  width: 260, height: 260, borderRadius: 130, backgroundColor: '#C5D8C3', opacity: 0.25 }} />
        <View style={{ position: 'absolute', bottom: 40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#F97316', opacity: 0.04 }} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" />}
        >
          {/* ── Greeting + stat boxes ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20, paddingTop: 22 }}>
            <Text style={{ color: '#1C3A2E', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 }}>
              Hello {firstName} <Text style={{ color: '#F59E0B' }}>👋🏾</Text>
            </Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 18 }}>
              {loading ? 'Loading your pantry…' : `${soonCount + expiredCount} item${soonCount + expiredCount !== 1 ? 's' : ''} need attention today`}
            </Text>

            {loading ? (
              <ActivityIndicator color="#2D6A4F" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([
                  { label: 'Fresh',    value: freshCount,   color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
                  { label: 'Expiring', value: soonCount,    color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
                  { label: 'Expired',  value: expiredCount, color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
                ] as const).map(s => (
                  <TouchableOpacity
                    key={s.label}
                    onPress={() => navigation.navigate('Pantry')}
                    activeOpacity={0.8}
                    style={{
                      flex: 1, backgroundColor: s.bg, borderWidth: 1, borderColor: s.border,
                      borderRadius: 18, paddingVertical: 14, alignItems: 'center',
                      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
                    }}>
                    <Text style={{ color: s.color, fontWeight: '800', fontSize: 26 }}>{s.value}</Text>
                    <Text style={{ color: s.color, fontSize: 11, marginTop: 3, fontWeight: '600', opacity: 0.8 }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── AI Tip ── */}
          <TouchableOpacity
            onPress={() => setTipIndex((tipIndex + 1) % AI_TIPS.length)}
            activeOpacity={0.85}
            style={{
              marginHorizontal: 20, marginBottom: 16,
              backgroundColor: '#2D6A4F', borderRadius: 24, padding: 20,
              shadowColor: '#2D6A4F', shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>DAILY TIP</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Tap for next</Text>
                <Feather name="refresh-cw" size={11} color="rgba(255,255,255,0.5)" />
              </View>
            </View>
            <Text style={{ fontSize: 24 }}>{currentTip.icon}</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, marginTop: 8, lineHeight: 22 }}>{currentTip.tip}</Text>
            <View style={{ flexDirection: 'row', marginTop: 14, gap: 6 }}>
              {AI_TIPS.map((_, i) => (
                <View key={i} style={{
                  height: 4, flex: i === tipIndex ? 2 : 1, borderRadius: 2,
                  backgroundColor: i === tipIndex ? '#86EFAC' : 'rgba(255,255,255,0.25)',
                }} />
              ))}
            </View>
          </TouchableOpacity>

          {/* ── Streak ── */}
          <View style={{
            marginHorizontal: 20, marginBottom: 16, backgroundColor: '#fff',
            borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
          }}>
            <View style={{
              width: 58, height: 58, borderRadius: 29, backgroundColor: '#E2EBE1',
              borderWidth: 4, borderColor: '#2D6A4F',
              alignItems: 'center', justifyContent: 'center', marginRight: 14,
            }}>
              <Text style={{ color: '#2D6A4F', fontWeight: '800', fontSize: 20 }}>{wasteStreak}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 13 }}>
                {wasteStreak > 0 ? `${wasteStreak}-day zero-waste streak 🔥` : 'Start your zero-waste streak!'}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 3 }}>
                {items.length} item{items.length !== 1 ? 's' : ''} currently in your pantry
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 4 }}>
                {[...Array(7)].map((_, i) => (
                  <View key={i} style={{
                    height: 6, flex: 1, borderRadius: 3,
                    backgroundColor: i < wasteStreak ? '#2D6A4F' : '#E2E8F0',
                  }} />
                ))}
              </View>
            </View>
          </View>

          {/* ── Expiring Soon ── */}
          {!loading && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
                <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 15 }}>Expiring Soon</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Pantry')}>
                  <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '600' }}>See all</Text>
                </TouchableOpacity>
              </View>
              {expiringSoon.length === 0 ? (
                <View style={{
                  marginHorizontal: 20, backgroundColor: '#F0FDF4', borderRadius: 20,
                  padding: 20, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 28 }}>✅</Text>
                  <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 14, marginTop: 8 }}>All good!</Text>
                  <Text style={{ color: '#86EFAC', fontSize: 12, marginTop: 4 }}>No items expiring in the next 3 days</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 20, paddingRight: 10 }}>
                  {expiringSoon.map(({ item, daysLeft }) => (
                    <ExpiringCard
                      key={item.id}
                      item={item}
                      daysLeft={daysLeft}
                      onPress={() => navigation.navigate('Pantry')}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── Quick Access ── */}
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 15, marginBottom: 12 }}>Quick Access</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {QUICK_LINKS.map(link => (
                <TouchableOpacity
                  key={link.label}
                  onPress={link.onPress}
                  activeOpacity={0.8}
                  style={{
                    width: (width - 70) / 3,
                    backgroundColor: '#fff', borderRadius: 18,
                    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
                    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
                  }}
                >
                  <View style={{
                    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F0FDF4',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                  }}>
                    <Feather name={link.icon} size={17} color="#2D6A4F" />
                  </View>
                  <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>
                    {link.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── All Food Items preview ── */}
          {!loading && items.length > 0 && (
            <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 15 }}>All Food Items</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Pantry')}>
                  <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '600' }}>View pantry</Text>
                </TouchableOpacity>
              </View>
              {previewItems.map(({ item, daysLeft }) => (
                <PantryRow
                  key={item.id}
                  item={item}
                  daysLeft={daysLeft}
                  onPress={() => navigation.navigate('Pantry')}
                />
              ))}
            </View>
          )}

          {/* ── Empty state ── */}
          {!loading && items.length === 0 && (
            <View style={{
              marginHorizontal: 20, marginBottom: 16, backgroundColor: '#fff',
              borderRadius: 24, padding: 28, alignItems: 'center',
              shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
            }}>
              <Text style={{ fontSize: 40 }}>🛒</Text>
              <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 16, marginTop: 12 }}>Your pantry is empty</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                Add your first item to start tracking freshness and reducing waste
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('QuickAdd')}
                style={{
                  marginTop: 16, backgroundColor: '#2D6A4F', borderRadius: 16,
                  paddingHorizontal: 24, paddingVertical: 12,
                }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Monthly Waste Trend (from wasteLogs / wasteLogs collection) ── */}
          <View style={{
            marginHorizontal: 20, marginBottom: 16, backgroundColor: '#fff',
            borderRadius: 24, padding: 20,
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
          }}>
            <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 15, marginBottom: 16 }}>Monthly Waste Trend</Text>
            {monthlyTrend.map((r) => {
              const color = trendBarColor(r.items, maxMonthlyWaste);
              const pct = maxMonthlyWaste > 0 ? (r.items / maxMonthlyWaste) * 100 : 0;
              return (
              <View key={r.month} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12, width: 36 }}>{r.month}</Text>
                <View style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 6, height: 12, marginHorizontal: 10, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: 12, backgroundColor: color, borderRadius: 6 }} />
                </View>
                <Text style={{ color: '#94A3B8', fontSize: 11, width: 52, textAlign: 'right' }}>{r.items} items</Text>
              </View>
            );})}
            <TouchableOpacity
              onPress={() => navigation.navigate('WasteAnalytics')}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
                borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4,
              }}>
              <Feather name="bar-chart-2" size={13} color="#16A34A" />
              <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '600', marginLeft: 6, flex: 1 }}>
                View full waste analytics
              </Text>
              <Feather name="chevron-right" size={13} color="#16A34A" />
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate('QuickAdd')}
        style={{
          position: 'absolute', bottom: 100, right: 20,
          width: 56, height: 56, borderRadius: 28, backgroundColor: '#2D6A4F',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#2D6A4F', shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}


