// screens/business_user/HistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { subscribeDonorDonations, type DonationListing } from '../../services/donationService';



type DisplayStatus = 'Active' | 'Claimed' | 'Completed';

function statusStyle(s: DisplayStatus) {
  switch (s) {
    case 'Active':    return { color: '#fff', bg: '#10B981' };
    case 'Claimed':   return { color: '#fff', bg: '#F97316' };
    case 'Completed': return { color: '#fff', bg: '#94A3B8' };
  }
}

function toDisplayStatus(s: DonationListing['status']): DisplayStatus {
  if (s === 'completed') return 'Completed';
  if (s === 'claimed')   return 'Claimed';
  return 'Active';
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
  const { session } = useAuth();
  const [donations,    setDonations]    = useState<DonationListing[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Claimed' | 'Completed'>('All');
  const [sortOrder,    setSortOrder]    = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    const uid = session?.userId;
    if (!uid) { setLoading(false); return; }
    const unsub = subscribeDonorDonations(uid, (items) => {
      setDonations(items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [session?.userId]);

  const completedCount   = donations.filter(d => d.status === 'completed').length;
  const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const filtered = donations
    .filter(d => {
      if (filterStatus === 'Active')    return d.status === 'available';
      if (filterStatus === 'Claimed')   return d.status === 'claimed';
      if (filterStatus === 'Completed') return d.status === 'completed';
      return true;
    })
    .filter(d =>
      (d.foodName || d.category).toLowerCase().includes(search.toLowerCase()) ||
      (d.claimedByName ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === 'oldest'
        ? (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
        : (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );

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
          Donation History
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
          Track your food donations and generate certificates.
        </Text>

        {/* ── Stats row ── */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Listings', value: String(donations.length), color: '#2D6A4F', icon: 'package'     as const },
            { label: 'Completed',      value: String(completedCount),   color: '#F97316', icon: 'trending-up' as const },
          ].map(stat => (
            <View key={stat.label} style={{
              flex: 1, backgroundColor: '#fff', borderRadius: 20,
              padding: 16, alignItems: 'center',
              shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: stat.color === '#2D6A4F'
                  ? 'rgba(45,106,79,0.1)' : 'rgba(249,115,22,0.1)',
                alignItems: 'center', justifyContent: 'center', marginBottom: 8,
              }}>
                <Feather name={stat.icon} size={16} color={stat.color} />
              </View>
              <Text style={{
                fontSize: 20, fontWeight: '800', color: stat.color, marginBottom: 2,
              }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Search ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#fff', borderRadius: 14,
          paddingHorizontal: 14, height: 48, marginBottom: 20,
          shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
        }}>
          <Feather name="search" size={15} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search by item or NPO..."
            placeholderTextColor="#CBD5E1"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={15} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter chips + sort ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 16 }}
        >
          {(['All', 'Active', 'Claimed', 'Completed'] as const).map(f => (
            <TouchableOpacity key={f} onPress={() => setFilterStatus(f)} activeOpacity={0.8}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: filterStatus === f ? '#2D6A4F' : '#fff',
                borderWidth: 1, borderColor: filterStatus === f ? '#2D6A4F' : '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: filterStatus === f ? '#fff' : '#64748B' }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
              backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
              flexDirection: 'row', alignItems: 'center', gap: 4,
            }}
          >
            <Feather name="sliders" size={11} color="#64748B" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Section label ── */}
        <Text style={{
          color: '#94A3B8', fontSize: 11, fontWeight: '700',
          letterSpacing: 1, textTransform: 'uppercase',
          marginBottom: 10, paddingLeft: 2,
        }}>
          Donation Log
        </Text>

        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator color="#2D6A4F" />
          </View>
        ) : donations.length === 0 ? (
          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 32,
            alignItems: 'center', marginBottom: 12,
          }}>
            <Feather name="inbox" size={32} color="#CBD5E1" />
            <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 12 }}>
              No donations yet
            </Text>
            <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Create a listing from the Donate screen to get started.
            </Text>
          </View>
        ) : (
          <>
            {filtered.map((d) => {
              const displayStatus = toDisplayStatus(d.status);
              const s = statusStyle(displayStatus);
              const itemLabel = d.foodName || d.category;
              const npoLabel  = d.claimedByName ?? '—';
              const dateLabel = formatDate(d.createdAt);
              return (
                <View key={d.id} style={{
                  backgroundColor: '#fff', borderRadius: 20, padding: 16,
                  marginBottom: 10,
                  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{
                        fontWeight: '700', fontSize: 14, color: '#1E293B', marginBottom: 6,
                      }}>
                        {itemLabel} — {d.quantity}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Feather name="users" size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 12, color: '#64748B' }}>{npoLabel}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Feather name="calendar" size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>{dateLabel}</Text>
                      </View>
                      {d.pickupWindow ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                          <Feather name="clock" size={11} color="#94A3B8" />
                          <Text style={{ fontSize: 11, color: '#94A3B8' }}>{d.pickupWindow}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <View style={{
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                        backgroundColor: s.bg,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: s.color }}>
                          {displayStatus}
                        </Text>
                      </View>

                      {d.status === 'completed' && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => Share.share({
                            message: `FreshLoop Donation Certificate\n\nDate: ${dateLabel}\nItem: ${itemLabel}\nQuantity: ${d.quantity}\nReceiving NPO: ${npoLabel}\n\nThis donation was verified and accepted by FreshLoop.\n\nGenerated by FreshLoop`,
                            title: 'Donation Certificate',
                          })}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Feather name="file-text" size={11} color="#2E7BBF" />
                          <Text style={{ fontSize: 11, color: '#2E7BBF', fontWeight: '700' }}>
                            Certificate
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {filtered.length === 0 && (
              <View style={{
                backgroundColor: '#fff', borderRadius: 20, padding: 32,
                alignItems: 'center', marginBottom: 12,
              }}>
                <Feather name="inbox" size={32} color="#CBD5E1" />
                <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 12 }}>
                  No donations match your search
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Tax certificate banner ── */}
        <View style={{
          backgroundColor: '#2D6A4F',
          borderRadius: 20, padding: 18, marginTop: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Feather name="award" size={16} color="#fff" />
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#fff' }}>
              Tax Certificates — {currentMonthYear}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#fff', marginBottom: 14, lineHeight: 18 }}>
            Generate a SARS-compliant certificate for your total donations this period.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Share.share({
              message: `FreshLoop Monthly Tax Certificate — ${currentMonthYear}\n\nTotal Listings: ${donations.length}\nCompleted: ${completedCount}\nSARS Section 18A compliant\n\nGenerated by FreshLoop`,
              title: 'Monthly Tax Certificate',
            })}
            style={{
              backgroundColor: '#2D6A4F', borderRadius: 12,
              paddingVertical: 12, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              shadowColor: '#2D6A4F', shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
            }}
          >
            <Feather name="download" size={15} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
              Generate Monthly Certificate
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}