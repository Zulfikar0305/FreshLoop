// screens/admin_user/AdminNotificationsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeNotifications, markNotificationRead, deleteNotification,
  type InAppNotification, type NotificationType,
} from '../../services/inAppNotificationService';

type FilterType = 'All' | 'Unread' | 'system' | 'report';
const FILTERS: FilterType[] = ['All', 'Unread', 'system', 'report'];
const FILTER_LABELS: Record<FilterType, string> = {
  All: 'All', Unread: 'Unread', system: 'System', report: 'Reports',
};

// ── Type → visual style ─────────────────────────────────────────────────────────────
type TypeStyle = {
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
  bgColor: string;
};
function getTypeStyle(type: NotificationType): TypeStyle {
  switch (type) {
    case 'report':   return { icon: 'alert-octagon', color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)'  };
    case 'donation': return { icon: 'package',        color: '#2D6A4F', bgColor: 'rgba(45,106,79,0.1)'  };
    case 'claim':    return { icon: 'bookmark',        color: '#0284C7', bgColor: 'rgba(2,132,199,0.1)'  };
    case 'expiry':   return { icon: 'alert-triangle',  color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' };
    case 'system':
    default:         return { icon: 'cpu',             color: '#7C3AED', bgColor: 'rgba(124,58,237,0.1)' };
  }
}

function fmtTimeAgo(date: Date | null): string {
  if (!date) return '';
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function AdminNotificationsScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [items,   setItems]   = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<FilterType>('All');

  useEffect(() => {
    if (!session?.userId) { setLoading(false); return; }
    const unsub = subscribeNotifications(
      session.userId,
      (notifs) => { setItems(notifs); setLoading(false); },
      ()        => setLoading(false),
    );
    return unsub;
  }, [session?.userId]);

  const unreadCount = items.filter(n => !n.isRead).length;

  const markAllRead = () =>
    items.filter(n => !n.isRead).forEach(n => markNotificationRead(n.id).catch(() => {}));
  const markOneRead = (id: string) => markNotificationRead(id).catch(() => {});
  const deleteOne   = (id: string) => deleteNotification(id).catch(() => {});

  const filtered = useMemo(() => items.filter(n => {
    const matchFilter =
      filter === 'All'    ? true :
      filter === 'Unread' ? !n.isRead :
      n.type === filter;
    const matchSearch =
      search.trim() === '' ? true :
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [items, filter, search]);

  return (
    <View style={s.root}>
      <CustomHeader
        settingsScreen="AdminSettings"
        profileScreen="AdminProfile"
        notificationsScreen="AdminNotifications"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky header */}
        <View style={{ backgroundColor: '#E2EBE1', paddingTop: 20 }}>

          {/* Title row */}
          <View style={s.titleRow}>
            <View>
              <Text style={s.pageTitle}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' }} />
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>
                    {unreadCount} unread alert{unreadCount > 1 ? 's' : ''}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <Feather name="check-circle" size={12} color="#2D6A4F" />
                  <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '600' }}>All caught up!</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity style={s.markAllBtn} onPress={markAllRead} activeOpacity={0.8}>
                <Text style={s.markAllTxt}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={s.searchBar}>
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search notifications…"
              placeholderTextColor="#CBD5E1"
              style={s.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
            {FILTERS.map(f => {
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.75}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                    {f === 'Unread' && unreadCount > 0
                      ? `Unread (${unreadCount})`
                      : FILTER_LABELS[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Cards */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          {loading ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator size="large" color="#1C3A2E" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <Feather name="bell-off" size={28} color="#CBD5E1" />
              </View>
              <Text style={s.emptyTxt}>{search ? 'No results found' : 'Nothing here yet'}</Text>
            </View>
          ) : filtered.map(item => {
            const ts = getTypeStyle(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => markOneRead(item.id)}
                activeOpacity={0.75}
                style={[s.card, !item.isRead && s.cardUnread]}
              >
                <View style={[s.iconBox, { backgroundColor: ts.bgColor }]}>
                  <Feather name={ts.icon} size={19} color={ts.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={s.cardTopRow}>
                    <Text style={[s.cardTitle, { fontWeight: item.isRead ? '600' : '800' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={s.cardTime}>{fmtTimeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={s.cardMsg} numberOfLines={2}>{item.message}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => deleteOne(item.id)}
                  style={{ paddingLeft: 10, paddingTop: 2 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color="#CBD5E1" />
                </TouchableOpacity>

                {!item.isRead && <View style={s.unreadDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#E2EBE1' },
  titleRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  markAllBtn:  { backgroundColor: '#2D6A4F', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  markAllTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, color: '#1E293B', fontSize: 14, fontWeight: '500', padding: 0 },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive:  { backgroundColor: '#1C3A2E', borderColor: '#1C3A2E' },
  chipTxt:     { color: '#64748B', fontSize: 12, fontWeight: '700' },
  chipTxtActive:{ color: '#fff' },
  card:        { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardUnread:  { borderWidth: 1.5, borderColor: 'rgba(28,58,46,0.25)', shadowOpacity: 0.08, elevation: 3 },
  iconBox:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  cardTitle:   { color: '#1E293B', fontSize: 13, flex: 1, marginRight: 6 },
  cardTime:    { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 1 },
  cardMsg:     { color: '#64748B', fontSize: 12, lineHeight: 17 },
  unreadDot:   { position: 'absolute', top: 14, right: 36, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1C3A2E', borderWidth: 1.5, borderColor: '#fff' },
  emptyWrap:   { alignItems: 'center', paddingTop: 60 },
  emptyIcon:   { width: 68, height: 68, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTxt:    { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
});
