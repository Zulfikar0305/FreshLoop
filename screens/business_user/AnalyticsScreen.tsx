// screens/business_user/AnalyticsDashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Polyline, Circle as SvgCircle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { subscribeDonorDonations, type DonationListing } from '../../services/donationService';



const { width } = Dimensions.get('window');

// ── Config (layout only — no hardcoded chart data) ────────────────────────────
const METRIC_CONFIG = [
  { label: 'Active Listings',  icon: '📋', color: '#2D6A4F' },
  { label: 'Completed',        icon: '✅', color: '#F97316' },
  { label: 'Total Donations',  icon: '📦', color: '#60A5FA' },
  { label: 'Meals Est.',       icon: '🍽️', color: '#A78BFA' },
];

// Colour palette assigned to categories in discovery order
const CAT_COLORS = ['#F97316', '#60A5FA', '#2D6A4F', '#A78BFA', '#F43F5E', '#FBBF24', '#34D399', '#818CF8'];

const HIST_H = 160;

// ── Module-level pure helpers ─────────────────────────────────────────────────

/** Last N calendar months (oldest → newest) as { label: 'Jan', key: '2026-01' }. */
function buildMonthSlots(n: number): { label: string; key: string }[] {
  const now   = new Date();
  const slots: { label: string; key: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    slots.push({
      label: d.toLocaleString('en-US', { month: 'short' }),
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  return slots;
}

/** Return the kg value of a donation, or 0 if the unit is not 'kg'. */
function parseKg(d: DonationListing): number {
  if (d.unit !== 'kg') return 0;
  const v = parseFloat(d.quantity);
  return isNaN(v) ? 0 : v;
}

/** 'YYYY-MM' month key from a Date | null. */
function toMonthKey(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

type SelectedBar = { category: string; month: string; value: number; color: string; maxRef: number };
type CatSeries   = { name: string; color: string; data: number[] };

// ── Helpers ───────────────────────────────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 2 }} />;
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      color: '#94A3B8', fontSize: 11, fontWeight: '700',
      letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
    }}>
      {text}
    </Text>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AnalyticsDashboardScreen() {
  const { session } = useAuth();
  const bizName = session?.name ?? 'Your Business';
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [selectedBar, setSelectedBar] = useState<SelectedBar | null>(null);
  const [donations, setDonations] = useState<DonationListing[]>([]);

  useEffect(() => {
    const uid = session?.userId;
    if (!uid) return;
    const unsub = subscribeDonorDonations(uid, setDonations, () => {});
    return unsub;
  }, [session?.userId]);

  const activeCount      = donations.filter(d => d.status === 'available').length;
  const completedCount   = donations.filter(d => d.status === 'completed').length;
  const totalCount       = donations.length;
  const mealsEst         = completedCount * 15;
  const currentYear      = new Date().getFullYear();
  const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const metricValues     = [
    String(activeCount),
    String(completedCount),
    String(totalCount),
    mealsEst > 0 ? `~${mealsEst}` : '0',
  ];
  const prSuffix = ` created ${totalCount} donation${totalCount !== 1 ? 's' : ''}${
    completedCount > 0
      ? `, completed ${completedCount}, and supported an estimated ~${mealsEst} meals`
      : ''
  }. All activity is recorded in FreshLoop.`;

  const card = {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16, shadowColor: '#000' as const,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  };

  // ── Chart derivations (live from Firestore donations) ──────────────────────
  const monthSlots  = buildMonthSlots(6);
  const monthLabels = monthSlots.map(s => s.label);

  // Category histogram: one series per discovered category, kg only
  const catNames = Array.from(new Set(donations.map(d => d.category)));
  const catChartData: CatSeries[] = catNames.map((name, ci) => ({
    name,
    color: CAT_COLORS[ci % CAT_COLORS.length],
    data: monthSlots.map(slot =>
      donations
        .filter(d => d.category === name && toMonthKey(d.createdAt) === slot.key)
        .reduce((sum, d) => sum + parseKg(d), 0)
    ),
  }));

  // Histogram Y-axis: 6 evenly-spaced grid lines based on real max
  const allBarValues = catChartData.flatMap(c => c.data);
  const maxBarVal    = Math.max(...allBarValues, 1);
  const yStep        = Math.ceil(maxBarVal / 5);
  const yMax         = yStep * 5;
  const yLabels      = [0, yStep, yStep * 2, yStep * 3, yStep * 4, yMax];

  // Trend chart: total kg per month across all categories
  const trendKgPerMonth = monthSlots.map(slot =>
    donations
      .filter(d => toMonthKey(d.createdAt) === slot.key)
      .reduce((sum, d) => sum + parseKg(d), 0)
  );
  const maxTrendKg = Math.max(...trendKgPerMonth, 1);
  const nMonths    = monthSlots.length;

  // SVG trend points (viewBox 0 0 300 90, baseline y=80, 5 px top headroom)
  const trendPoints = monthSlots.map((slot, i) => {
    const kg = trendKgPerMonth[i];
    const x  = nMonths <= 1 ? 150 : (i / (nMonths - 1)) * 300;
    const y  = 80 - (kg / maxTrendKg) * 75;
    return { x, y, kg, label: slot.label };
  });
  const trendPointsStr = trendPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const lastTrendX     = nMonths <= 1 ? 150 : 300;
  const areaPointsStr  = trendPointsStr + ` ${lastTrendX},80 0,80`;
  const trendGrid      = [
    { y: 5,  label: `${Math.round(maxTrendKg)} kg`                   },
    { y: 25, label: `${Math.round(maxTrendKg * 55 / 75)} kg`         },
    { y: 45, label: `${Math.round(maxTrendKg * 35 / 75)} kg`         },
    { y: 65, label: `${Math.round(maxTrendKg * 15 / 75)} kg`         },
  ];

  // Category breakdown totals
  const catTotals   = catChartData.map(c => ({ name: c.name, color: c.color, total: c.data.reduce((a, b) => a + b, 0) }));
  const maxCatTotal = Math.max(...catTotals.map(c => c.total), 1);

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>

      <CustomHeader 
        settingsScreen="BusinessSecurity" 
        profileTab="Profile" 
        notificationsScreen="BusinessNotifications" 
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 130,
        }}
      >

        {/* ── Page title + period toggle ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 20,
        }}>
          <View>
            <Text style={{
              color: '#1E293B', fontSize: 22,
              fontWeight: '800', letterSpacing: -0.5,
            }}>
              Analytics
            </Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
              {bizName} · {currentMonthYear}
            </Text>
          </View>

          {/* Period toggle */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(0,0,0,0.06)',
            borderRadius: 12, padding: 3,
          }}>
            {(['week', 'month'] as const).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: period === p ? '#fff' : 'transparent',
                  shadowColor: period === p ? '#000' : 'transparent',
                  shadowOpacity: 0.06, shadowRadius: 4,
                  elevation: period === p ? 2 : 0,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: period === p ? '#1C3A2E' : '#94A3B8',
                }}>
                  {p === 'week' ? '7 days' : '30 days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Metrics grid 2×2 ── */}
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap',
          gap: 12, marginBottom: 16,
        }}>
          {METRIC_CONFIG.map((m, i) => (
            <View key={m.label} style={{
              width: (width - 52) / 2,
              backgroundColor: '#fff',
              borderRadius: 20, padding: 16,
              shadowColor: '#000', shadowOpacity: 0.05,
              shadowRadius: 8, elevation: 2,
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                gap: 8, marginBottom: 10,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: `${m.color}15`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                </View>
                <Text style={{
                  fontSize: 10, color: '#94A3B8',
                  fontWeight: '700', flex: 1,
                }} numberOfLines={2}>
                  {m.label.toUpperCase()}
                </Text>
              </View>
              <Text style={{
                fontSize: 22, fontWeight: '800', color: m.color,
              }}>
                {metricValues[i]}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 2 }}>
                {currentMonthYear}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Grouped Histogram ── */}
        <SectionLabel text="DONATIONS BY CATEGORY (KG)" />
        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: -8, marginBottom: 12 }}>
          Tap any bar for details · kg donations only
        </Text>
        <View style={card}>
          {catChartData.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Feather name="bar-chart-2" size={28} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 10 }}>No kg donations yet</Text>
            </View>
          ) : (
            <>
              {/* Legend */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {catChartData.map(cat => (
                  <View key={cat.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: cat.color }} />
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{cat.name}</Text>
                  </View>
                ))}
              </View>

              {/* Chart: Y axis + scrollable bars */}
              <View style={{ flexDirection: 'row' }}>
                {/* Y axis labels */}
                <View style={{ width: 34, height: HIST_H, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6 }}>
                  {[...yLabels].reverse().map(val => (
                    <Text key={val} style={{ fontSize: 9, color: '#94A3B8', fontWeight: '700' }}>{val}</Text>
                  ))}
                </View>

                {/* Scrollable chart area */}
                <View style={{ flex: 1 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      {/* Bars + grid */}
                      <View style={{ height: HIST_H, position: 'relative' }}>
                        {/* Grid lines */}
                        {yLabels.map(val => (
                          <View
                            key={val}
                            style={{
                              position: 'absolute',
                              top: (1 - val / yMax) * HIST_H,
                              left: 0, right: 0, height: 1,
                              backgroundColor: val === 0 ? '#CBD5E1' : '#F1F5F9',
                            }}
                          />
                        ))}
                        {/* Grouped bars */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: HIST_H, gap: 10, paddingHorizontal: 4 }}>
                          {monthLabels.map((month, mi) => (
                            <View key={month} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                              {catChartData.map(cat => {
                                const barH = Math.max((cat.data[mi] / yMax) * HIST_H, 4);
                                return (
                                  <TouchableOpacity
                                    key={cat.name}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedBar({ category: cat.name, month, value: cat.data[mi], color: cat.color, maxRef: yMax })}
                                    style={{ width: 13, height: barH, backgroundColor: cat.color, borderRadius: 3 }}
                                  />
                                );
                              })}
                            </View>
                          ))}
                        </View>
                      </View>
                      {/* X axis labels */}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, paddingHorizontal: 4 }}>
                        {monthLabels.map(month => (
                          <View key={month} style={{ width: (13 * catChartData.length) + (2 * (catChartData.length - 1)), alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{month}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Y axis unit label */}
              <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '600', marginTop: 8, textAlign: 'center', letterSpacing: 0.5 }}>
                QUANTITY (KG) ↑ · MONTH →
              </Text>
            </>
          )}
        </View>
        {/* ── Trend Line with axes ── */}
        <SectionLabel text="MONTH-ON-MONTH TREND (KG)" />
        <View style={{ ...card, paddingBottom: 14 }}>
          {trendKgPerMonth.every(v => v === 0) ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Feather name="trending-up" size={28} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 10 }}>No kg donation data yet</Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row' }}>
                {/* Y axis labels */}
                <View style={{ width: 40, height: 120, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6, paddingBottom: 0 }}>
                  {trendGrid.map(g => (
                    <Text key={g.y} style={{ fontSize: 9, color: '#94A3B8', fontWeight: '700' }}>{g.label}</Text>
                  ))}
                </View>

                {/* SVG chart */}
                <View style={{ flex: 1, height: 120 }}>
                  <Svg width="100%" height="120" viewBox="0 0 300 90" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {trendGrid.map(g => (
                      <SvgLine
                        key={g.y}
                        x1="0" y1={g.y} x2="300" y2={g.y}
                        stroke="#F1F5F9" strokeWidth="1.5"
                        strokeDasharray="4,3"
                      />
                    ))}
                    {/* X axis baseline */}
                    <SvgLine x1="0" y1="80" x2="300" y2="80" stroke="#E2E8F0" strokeWidth="1" />
                    {/* Area fill */}
                    <Polyline points={areaPointsStr} fill="#2D6A4F" opacity="0.08" />
                    {/* Trend line */}
                    <Polyline
                      points={trendPointsStr}
                      fill="none"
                      stroke="#2D6A4F"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Data points — tappable */}
                    {trendPoints.map((p, i) => (
                      <React.Fragment key={i}>
                        <SvgCircle
                          cx={p.x} cy={p.y} r="12"
                          fill="transparent"
                          onPress={() => setSelectedBar({ category: 'Total Donations', month: p.label, value: Math.round(p.kg), color: '#2D6A4F', maxRef: maxTrendKg })}
                        />
                        <SvgCircle cx={p.x} cy={p.y} r="5" fill="#2D6A4F" />
                        <SvgText x={p.x} y={p.y - 10} fontSize="8" fill="#2D6A4F" fontWeight="700" textAnchor="middle">
                          {Math.round(p.kg)}
                        </SvgText>
                      </React.Fragment>
                    ))}
                  </Svg>

                  {/* X axis labels */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 }}>
                    {monthLabels.map(m => (
                      <Text key={m} style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{m}</Text>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(45,106,79,0.07)',
                borderRadius: 12, padding: 10, marginTop: 14,
              }}>
                <Feather name="trending-up" size={14} color="#2D6A4F" />
                <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '600', flex: 1 }}>
                  Showing real kg donations over the past 6 months.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── PR & Impact Report ── */}
        <SectionLabel text="PR & IMPACT REPORT" />
        <View style={card}>
          <View style={{
            backgroundColor: 'rgba(45,106,79,0.07)',
            borderRadius: 14, padding: 14, marginBottom: 16,
          }}>
            <Text style={{ fontSize: 13, color: '#1E293B', lineHeight: 22 }}>
              {'This month, '}
              <Text style={{ fontWeight: '800' }}>{bizName}</Text>
              {prSuffix}
            </Text>
          </View>

          <Divider />
          <View style={{ height: 14 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                const report = `FreshLoop Impact Report — ${currentMonthYear}\n\n${bizName}\n\nActive Listings: ${activeCount}\nCompleted Donations: ${completedCount}\nTotal Donations: ${totalCount}\nMeals Supported (est.): ~${mealsEst}\n\nGenerated by FreshLoop`;
                Share.share({ message: report, title: 'FreshLoop Impact Report' });
              }}
              style={{
                flex: 1, flexDirection: 'row',
                alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingVertical: 12, borderRadius: 12,
                backgroundColor: '#2D6A4F',
              }}
            >
              <Feather name="download" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                Export PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Share.share({
                  message: `🌱 ${bizName} ${completedCount > 0 ? `completed ${completedCount} donation${completedCount !== 1 ? 's' : ''}, supporting ~${mealsEst} meals` : `has ${totalCount} active donation listing${totalCount !== 1 ? 's' : ''}`} on FreshLoop this month! #FreshLoop #ZeroFoodWaste`,
                  title: 'FreshLoop Impact',
                });
              }}
              style={{
                flex: 1, flexDirection: 'row',
                alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingVertical: 12, borderRadius: 12,
                backgroundColor: '#F97316',
                shadowColor: '#F97316',
                shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
              }}
            >
              <Feather name="share-2" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                Share Card
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Category breakdown ── */}
        <SectionLabel text="CATEGORY BREAKDOWN" />
        <View style={card}>
          {catTotals.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Feather name="pie-chart" size={28} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 10 }}>No donation data yet</Text>
            </View>
          ) : (
            catTotals.map((cat, i) => {
              const pct = Math.round((cat.total / maxCatTotal) * 100);
              return (
                <View key={cat.name}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 12,
                  }}>
                    <View style={{
                      width: 10, height: 10, borderRadius: 3,
                      backgroundColor: cat.color, marginRight: 12,
                    }} />
                    <Text style={{
                      flex: 1, fontSize: 13,
                      fontWeight: '600', color: '#1E293B',
                    }}>
                      {cat.name}
                    </Text>
                    <Text style={{
                      fontSize: 13, fontWeight: '800',
                      color: cat.color, marginRight: 10,
                    }}>
                      {cat.total} kg
                    </Text>
                    <View style={{
                      width: 80, height: 6,
                      backgroundColor: '#F1F5F9',
                      borderRadius: 3, overflow: 'hidden',
                    }}>
                      <View style={{
                        width: `${pct}%`, height: 6,
                        backgroundColor: cat.color, borderRadius: 3,
                      }} />
                    </View>
                  </View>
                  {i < catTotals.length - 1 && <Divider />}
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── Bar detail popup ── */}
      <Modal visible={!!selectedBar} transparent animationType="fade" onRequestClose={() => setSelectedBar(null)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={1}
          onPress={() => setSelectedBar(null)}
        >
          {selectedBar && (
            <View style={{
              backgroundColor: '#fff', borderRadius: 24, padding: 28, width: 280,
              alignItems: 'center',
              shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
            }}>
              {/* Color dot */}
              <View style={{
                width: 56, height: 56, borderRadius: 18,
                backgroundColor: `${selectedBar.color}20`,
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: selectedBar.color }} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>
                {selectedBar.value} kg
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: selectedBar.color, marginBottom: 2 }}>
                {selectedBar.category}
              </Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>
                {selectedBar.month} {currentYear}
              </Text>
              {/* % of max */}
              <View style={{ width: '100%', height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round((selectedBar.value / selectedBar.maxRef) * 100)}%`, height: 8, backgroundColor: selectedBar.color, borderRadius: 4 }} />
              </View>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 20 }}>
                {Math.round((selectedBar.value / selectedBar.maxRef) * 100)}% of chart max ({Math.round(selectedBar.maxRef)} kg)
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedBar(null)}
                style={{ backgroundColor: '#1C3A2E', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 32 }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}