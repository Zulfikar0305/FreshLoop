// screens/general_user/WasteAnalyticsScreen.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { getUserWasteLogs, type WasteLog } from '../../services/wasteService';

// ── Types ──────────────────────────────────────────────────────────────────
type Period = 'weekly' | 'monthly';

type AnalyticsBundle = {
  wasted: number;
  saved: number;
  wastedKg: number;
  savedKg: number;
  categories: { label: string; percent: number; color: string; icon: string }[];
  insights: { id: string; text: string; icon: string }[];
};

const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  Vegetables: { color: '#22C55E', icon: '🥦' },
  Dairy:      { color: '#0EA5E9', icon: '🥛' },
  Protein:    { color: '#F97316', icon: '🍗' },
  Carbs:      { color: '#F59E0B', icon: '🍞' },
  Other:      { color: '#A78BFA', icon: '📦' },
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function estimateKg(quantity: number, unit: string): number {
  const u = unit.toLowerCase().trim();
  if (u === 'kg') return quantity;
  if (u === 'g') return quantity / 1000;
  if (u === 'l' || u === 'liter' || u === 'litre') return quantity;
  if (u === 'ml') return quantity / 1000;
  return quantity * 0.15;
}

function inferWasteCategory(name: string): keyof typeof CATEGORY_META {
  const n = name.toLowerCase();
  if (/(spinach|lettuce|tomato|carrot|vegetable|broccoli|pepper|cabbage)/.test(n)) return 'Vegetables';
  if (/(milk|cheese|yoghurt|yogurt|cream|butter)/.test(n)) return 'Dairy';
  if (/(chicken|beef|pork|fish|meat|protein)/.test(n)) return 'Protein';
  if (/(bread|rice|pasta|flour|cereal|oat|potato)/.test(n)) return 'Carbs';
  return 'Other';
}

function buildInsights(wasted: WasteLog[]): { id: string; text: string; icon: string }[] {
  if (wasted.length === 0) {
    return [{
      id: 'empty',
      icon: '✅',
      text: 'No wasted items logged in this period. Keep using “Mark used” when you finish something so savings stay accurate.',
    }];
  }
  const byName = new Map<string, { total: number; count: number }>();
  for (const log of wasted) {
    const cur = byName.get(log.itemName) ?? { total: 0, count: 0 };
    cur.total += log.price;
    cur.count += 1;
    byName.set(log.itemName, cur);
  }
  const sorted = [...byName.entries()].sort((a, b) => b[1].total - a[1].total);
  const out: { id: string; text: string; icon: string }[] = [];
  const [first] = sorted;
  if (first) {
    const [name, { total, count }] = first;
    out.push({
      id: 'top',
      icon: inferWasteCategory(name) === 'Dairy' ? '🥛' : '🥘',
      text: count > 1
        ? `You logged R${total.toFixed(2)} waste across ${count} entries for ${name}. Buying smaller packs may help.`
        : `Your largest waste line item was ${name} (about R${total.toFixed(2)}). Adjust portions or freeze leftovers early.`,
    });
  }
  if (sorted[1]) {
    const [name2, { total: t2 }] = sorted[1];
    out.push({
      id: 'second',
      icon: '📉',
      text: `${name2} was next at about R${t2.toFixed(2)} wasted — worth moving up the meal plan when it is close to expiry.`,
    });
  }
  return out;
}

function computeAnalytics(logs: WasteLog[], period: Period): AnalyticsBundle {
  const today = startOfToday();
  const rangeStart = subDays(today, period === 'weekly' ? 7 : 30);
  const inRange = logs.filter((l) => l.wastedAt >= rangeStart);

  const wastedLogs = inRange.filter((l) => l.status === 'wasted');
  const usedLogs = inRange.filter((l) => l.status === 'used');

  const wasted = wastedLogs.reduce((s, l) => s + l.price, 0);
  const saved = usedLogs.reduce((s, l) => s + l.price, 0);
  const wastedKg = wastedLogs.reduce((s, l) => s + estimateKg(l.quantity, l.unit), 0);
  const savedKg = usedLogs.reduce((s, l) => s + estimateKg(l.quantity, l.unit), 0);

  const catTotals: Record<string, number> = {
    Vegetables: 0, Dairy: 0, Protein: 0, Carbs: 0, Other: 0,
  };
  for (const log of wastedLogs) {
    const c = inferWasteCategory(log.itemName);
    catTotals[c] += log.price;
  }
  const catSum = Object.values(catTotals).reduce((a, b) => a + b, 0);
  let categories: AnalyticsBundle['categories'];
  if (catSum <= 0) {
    categories = [{ label: 'Other', percent: 100, color: '#94A3B8', icon: '📦' }];
  } else {
    const entries = (Object.entries(catTotals) as [string, number][])
      .filter(([, v]) => v > 0)
      .map(([label, v]) => ({
        label,
        percent: Math.round((v / catSum) * 100),
        color: CATEGORY_META[label]?.color ?? '#94A3B8',
        icon: CATEGORY_META[label]?.icon ?? '📦',
      }))
      .sort((a, b) => b.percent - a.percent);
    let drift = 100 - entries.reduce((s, e) => s + e.percent, 0);
    if (entries.length && drift !== 0) {
      entries[0].percent += drift;
    }
    categories = entries;
  }

  return {
    wasted,
    saved,
    wastedKg: Math.round(wastedKg * 10) / 10,
    savedKg: Math.round(savedKg * 10) / 10,
    categories,
    insights: buildInsights(wastedLogs),
  };
}

// ── Donut chart — pure RN, no library needed ───────────────────────────────
function DonutChart({
  categories,
  totalWasted,
}: {
  categories: AnalyticsBundle['categories'];
  totalWasted: number;
}) {
  const SIZE   = 160;
  const STROKE = 22;
  const R      = (SIZE - STROKE) / 2;
  const CIRC   = 2 * Math.PI * R;

  // Build segments
  let offset = 0;
  const segments = categories.map(cat => {
    const dash    = (cat.percent / 100) * CIRC;
    const gap     = CIRC - dash;
    const segment = { ...cat, dash, gap, offset };
    offset += dash + 2; // 2px gap between segments
    return segment;
  });

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      {/* SVG-free donut using View rings — simple but effective for static display */}
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer ring segments approximated as colored arcs via stacked Views */}
        <View style={dc.outerRing}>
          {categories.map((cat, i) => (
            <View
              key={cat.label}
              style={[
                dc.segment,
                {
                  flex: cat.percent,
                  backgroundColor: cat.color,
                  borderRadius: i === 0 ? 4 : 0,
                },
              ]}
            />
          ))}
        </View>
        {/* Centre hole */}
        <View style={dc.hole}>
          <Text style={dc.holeAmount}>R{totalWasted.toFixed(0)}</Text>
          <Text style={dc.holeLabel}>wasted</Text>
        </View>
      </View>
    </View>
  );
}

const dc = StyleSheet.create({
  outerRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, overflow: 'hidden', flexDirection: 'row' },
  segment:   { height: '100%' },
  hole:      { width: 112, height: 112, borderRadius: 56, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  holeAmount:{ fontSize: 22, fontWeight: '800', color: '#1E293B' },
  holeLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function WasteAnalyticsScreen() {
  const { session } = useAuth();
  const [period, setPeriod] = useState<Period>('monthly');
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!session?.userId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserWasteLogs(session.userId);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
  );

  const data = useMemo(() => computeAnalytics(logs, period), [logs, period]);

  const handleShare = async () => {
    await Share.share({
      message:
        `FreshLoop Impact — ${period === 'monthly' ? 'This Month' : 'This Week'}\n\n` +
        `💚 Saved: R${data.saved.toFixed(2)} · ${data.savedKg}kg rescued\n` +
        `🗑️ Wasted: R${data.wasted.toFixed(2)} · ${data.wastedKg}kg binned\n\n` +
        `Tracked with FreshLoop 🌿`,
    });
  };

  return (
    <View style={s.root}>
      <CustomHeader />
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        stickyHeaderIndices={[0]}
      >
        {/* ── Sticky header ── */}
        <View style={s.stickyTop}>
          <View style={s.titleRow}>
            <View>
              <Text style={s.screenTitle}>Waste Analytics 📊</Text>
              <Text style={s.screenSub}>
                {loading && logs.length === 0
                  ? 'Loading waste history…'
                  : 'From items marked used or wasted in your pantry'}
              </Text>
            </View>
            {/* Share impact card — design doc: generates shareable summary graphic */}
            <TouchableOpacity onPress={handleShare} activeOpacity={0.8} style={s.shareBtn}>
              <Feather name="share-2" size={14} color="#2D6A4F" />
              <Text style={s.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Weekly / Monthly toggle — design doc: switch between 7-day and 30-day view */}
          <View style={s.tabBar}>
            {(['weekly', 'monthly'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                activeOpacity={0.8}
                style={[s.tab, period === p && s.tabActive]}
              >
                <Text style={[s.tabText, period === p && s.tabTextActive]}>
                  {p === 'weekly' ? 'This Week' : 'This Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Rand saved / wasted summary cards ── */}
        {/* design doc: exact rand figure from price logged when item was added */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, s.summaryCardSaved]}>
            <View style={s.summaryIconWrap}>
              <Text style={{ fontSize: 20 }}>💚</Text>
            </View>
            <Text style={s.summaryAmount}>R{data.saved.toFixed(2)}</Text>
            <Text style={s.summaryLabel}>Rand saved</Text>
            <Text style={s.summaryKg}>{data.savedKg} kg rescued</Text>
          </View>

          <View style={[s.summaryCard, s.summaryCardWasted]}>
            <View style={s.summaryIconWrap}>
              <Text style={{ fontSize: 20 }}>🗑️</Text>
            </View>
            <Text style={[s.summaryAmount, { color: '#EF4444' }]}>
              R{data.wasted.toFixed(2)}
            </Text>
            <Text style={s.summaryLabel}>Rand wasted</Text>
            <Text style={s.summaryKg}>{data.wastedKg} kg binned</Text>
          </View>
        </View>

        {/* ── Pie chart — design doc: breakdown by food category from Smart Bin history ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Waste by category</Text>
          <Text style={s.sectionSub}>From your Smart Bin history</Text>

          <DonutChart categories={data.categories} totalWasted={data.wasted} />

          {/* Legend */}
          <View style={s.legendGrid}>
            {data.categories.map(cat => (
              <View key={cat.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: cat.color }]} />
                <Text style={s.legendIcon}>{cat.icon}</Text>
                <Text style={s.legendLabel}>{cat.label}</Text>
                <Text style={s.legendPercent}>{cat.percent}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Category breakdown bars ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Category breakdown</Text>
          <View style={{ gap: 12 }}>
            {data.categories.map(cat => (
              <View key={cat.label}>
                <View style={s.barLabelRow}>
                  <Text style={s.barIcon}>{cat.icon}</Text>
                  <Text style={s.barLabel}>{cat.label}</Text>
                  <Text style={s.barPercent}>{cat.percent}%</Text>
                </View>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.barFill,
                      { width: `${cat.percent}%` as any, backgroundColor: cat.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── AI purchasing insights ── */}
        {/* design doc: Gemini analyses Smart Bin history, always specific to that user's data */}
        <View style={s.section}>
          <View style={s.insightsTitleRow}>
            <View style={s.insightsIconWrap}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
            <View>
              <Text style={s.sectionTitle}>AI purchasing insights</Text>
              <Text style={s.sectionSub}>Based on your actual waste data</Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {data.insights.map(insight => (
              <View key={insight.id} style={s.insightCard}>
                <View style={s.insightIconBox}>
                  <Text style={{ fontSize: 22 }}>{insight.icon}</Text>
                </View>
                <Text style={s.insightText}>{insight.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Share impact card ── */}
        {/* design doc: generates clean summary graphic shareable via native share sheet */}
        <View style={s.impactCard}>
          <View style={s.impactCardTop}>
            <Text style={s.impactCardTitle}>🌿 My FreshLoop Impact</Text>
            <Text style={s.impactCardPeriod}>
              {period === 'monthly' ? 'This month' : 'This week'}
            </Text>
          </View>

          <View style={s.impactStats}>
            <View style={s.impactStat}>
              <Text style={s.impactStatAmount}>R{data.saved.toFixed(0)}</Text>
              <Text style={s.impactStatLabel}>saved</Text>
            </View>
            <View style={s.impactDivider} />
            <View style={s.impactStat}>
              <Text style={s.impactStatAmount}>{data.savedKg} kg</Text>
              <Text style={s.impactStatLabel}>rescued</Text>
            </View>
            <View style={s.impactDivider} />
            <View style={s.impactStat}>
              <Text style={s.impactStatAmount}>R{data.wasted.toFixed(0)}</Text>
              <Text style={s.impactStatLabel}>wasted</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.85}
            style={s.impactShareBtn}
          >
            <Feather name="share-2" size={15} color="#4ADE80" />
            <Text style={s.impactShareText}>Share my impact</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#E2EBE1' },

  // Sticky top
  stickyTop:          { backgroundColor: '#E2EBE1', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  titleRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  screenTitle:        { fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  screenSub:          { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  shareBtn:           { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  shareBtnText:       { fontSize: 13, fontWeight: '700', color: '#2D6A4F' },

  // Period toggle
  tabBar:             { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  tab:                { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive:          { backgroundColor: '#1C3A2E' },
  tabText:            { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  tabTextActive:      { color: '#fff' },

  // Summary cards
  summaryRow:         { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  summaryCard:        { flex: 1, borderRadius: 22, padding: 18, alignItems: 'center', borderWidth: 1 },
  summaryCardSaved:   { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  summaryCardWasted:  { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  summaryIconWrap:    { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  summaryAmount:      { fontSize: 22, fontWeight: '800', color: '#16A34A', marginBottom: 2 },
  summaryLabel:       { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  summaryKg:          { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  // Sections
  section:            { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 22, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  sectionTitle:       { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  sectionSub:         { fontSize: 12, color: '#94A3B8', marginBottom: 16 },

  // Donut legend
  legendGrid:         { gap: 10, marginTop: 8 },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:          { width: 10, height: 10, borderRadius: 5 },
  legendIcon:         { fontSize: 14 },
  legendLabel:        { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  legendPercent:      { fontSize: 13, fontWeight: '800', color: '#1E293B' },

  // Bars
  barLabelRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  barIcon:            { fontSize: 14 },
  barLabel:           { flex: 1, fontSize: 13, fontWeight: '600', color: '#475569' },
  barPercent:         { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  barTrack:           { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barFill:            { height: 8, borderRadius: 4 },

  // AI insights
  insightsTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  insightsIconWrap:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center' },
  insightCard:        { flexDirection: 'row', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'flex-start' },
  insightIconBox:     { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', flexShrink: 0 },
  insightText:        { flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 },

  // Impact card
  impactCard:         { marginHorizontal: 20, marginBottom: 16, backgroundColor: '#1C3A2E', borderRadius: 24, padding: 22, shadowColor: '#1C3A2E', shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  impactCardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  impactCardTitle:    { fontSize: 16, fontWeight: '800', color: '#fff' },
  impactCardPeriod:   { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  impactStats:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  impactStat:         { flex: 1, alignItems: 'center' },
  impactStatAmount:   { fontSize: 22, fontWeight: '800', color: '#4ADE80', marginBottom: 2 },
  impactStatLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  impactDivider:      { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },
  impactShareBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 13 },
  impactShareText:    { fontSize: 14, fontWeight: '800', color: '#4ADE80' },
});