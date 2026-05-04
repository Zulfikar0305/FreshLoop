// screens/general_user/NotificationsScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeNotifications,
  markNotificationRead,
  deleteNotification,
  type InAppNotification,
} from '../../services/inAppNotificationService';
import CustomHeader from '../../components/CustomHeader';

type FilterType = 'All' | 'Unread' | 'Expiry' | 'Donation' | 'Claim' | 'System';
const FILTERS: FilterType[] = ['All', 'Unread', 'Expiry', 'Donation', 'Claim', 'System'];

type NotificationItem = {
  id: string; type: string; title: string; message: string; time: string; isRead: boolean;
  icon: React.ComponentProps<typeof Feather>['name']; color: string; bgColor: string;
};

// ── Map InAppNotification to display-ready NotificationItem ───────────────────────────
const NOTIF_META: Record<string, { icon: React.ComponentProps<typeof Feather>['name']; color: string; bgColor: string }> = {
  expiry:   { icon: 'alert-triangle', color: '#F97316', bgColor: '#FFF7ED' },
  donation: { icon: 'gift',           color: '#2D6A4F', bgColor: '#DCFCE7' },
  claim:    { icon: 'check-circle',   color: '#0284C7', bgColor: '#E0F2FE' },
  report:   { icon: 'flag',           color: '#7C3AED', bgColor: '#EDE9FE' },
  system:   { icon: 'bell',           color: '#64748B', bgColor: '#F1F5F9' },
};

function toDisplayItem(n: InAppNotification): NotificationItem {
  const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
  const timeStr = n.createdAt
    ? n.createdAt.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    : '';
  return {
    id:      n.id,
    type:    n.type,
    title:   n.title,
    message: n.message,
    time:    timeStr,
    isRead:  n.isRead,
    icon:    meta.icon,
    color:   meta.color,
    bgColor: meta.bgColor,
  };
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  // ── Subscribe to Firestore notifications for this user ─────────────────────────
  useEffect(() => {
    if (!session?.userId) return;
    const unsub = subscribeNotifications(
      session.userId,
      (items) => setNotifications(items.map(toDisplayItem)),
    );
    return unsub;
  }, [session?.userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ── Firestore-backed actions (subscription re-renders automatically) ─────────
  const markAllAsRead = () => {
    notifications
      .filter(n => !n.isRead)
      .forEach(n => markNotificationRead(n.id).catch(() => {}));
  };

  const markOneAsRead = (id: string) => {
    markNotificationRead(id).catch(() => {});
  };

  const deleteOne = (id: string) => {
    deleteNotification(id).catch(() => {});
  };

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const matchesFilter =
        activeFilter === 'All'    ? true :
        activeFilter === 'Unread' ? !n.isRead :
        n.type === activeFilter.toLowerCase();
      const matchesSearch =
        search.trim() === '' ? true :
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [notifications, activeFilter, search]);

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>

      {/* ── CustomHeader — sits at top, no curve below it ── */}
      <CustomHeader />

      {/* ── Everything below header is on sage background ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        stickyHeaderIndices={[0]}
      >

        {/* ── Sticky top section: title + search + filters ── */}
        <View style={{ backgroundColor: '#E2EBE1', paddingTop: 20 }}>

          {/* Title row */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginBottom: 14,
          }}>
            <View>
              <Text style={{
                color: '#1E293B', fontSize: 22,
                fontWeight: '800', letterSpacing: -0.5,
              }}>
                Notifications
              </Text>
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
                  <Text style={{ color: '#2D6A4F', fontSize: 12, fontWeight: '600' }}>
                    All caught up!
                  </Text>
                </View>
              )}
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={markAllAsRead}
                style={{
                  backgroundColor: '#2D6A4F',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  shadowColor: '#2D6A4F',
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search bar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 14,
            marginHorizontal: 20,
            marginBottom: 12,
            paddingHorizontal: 12, paddingVertical: 10,
            gap: 8,
            shadowColor: '#000', shadowOpacity: 0.05,
            shadowRadius: 6, elevation: 2,
          }}>
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search notifications..."
              placeholderTextColor="#CBD5E1"
              style={{
                flex: 1, color: '#1E293B',
                fontSize: 14, fontWeight: '500', padding: 0,
              }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 12,
              gap: 8,
            }}
          >
            {FILTERS.map(f => {
              const isActive = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: isActive ? '#2D6A4F' : '#fff',
                    borderWidth: isActive ? 0 : 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#000',
                    shadowOpacity: isActive ? 0.1 : 0.03,
                    shadowRadius: 4, elevation: isActive ? 2 : 1,
                  }}
                >
                  <Text style={{
                    color: isActive ? '#fff' : '#64748B',
                    fontSize: 12, fontWeight: '700',
                  }}>
                    {f === 'Unread' && unreadCount > 0 ? `Unread (${unreadCount})` : f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Notification cards ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <View style={{
                width: 68, height: 68, borderRadius: 22,
                backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
                shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
              }}>
                <Feather name="bell-off" size={28} color="#CBD5E1" />
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                {search ? 'No results found' : 'No notifications yet.\nUpdates will appear here when activity happens.'}
              </Text>
            </View>
          ) : (
            filtered.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => markOneAsRead(item.id)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 14,
                  marginBottom: 10,
                  alignItems: 'flex-start',
                  borderWidth: item.isRead ? 0 : 1.5,
                  borderColor: item.isRead ? 'transparent' : 'rgba(45,106,79,0.3)',
                  shadowColor: '#000',
                  shadowOpacity: item.isRead ? 0.04 : 0.08,
                  shadowRadius: 8,
                  elevation: item.isRead ? 1 : 3,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: item.bgColor,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Feather name={item.icon} size={19} color={item.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 3,
                  }}>
                    <Text style={{
                      color: '#1E293B',
                      fontWeight: item.isRead ? '600' : '800',
                      fontSize: 13, flex: 1, marginRight: 6,
                    }}>
                      {item.title}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 1 }}>
                      {item.time}
                    </Text>
                  </View>
                  <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 17 }} numberOfLines={2}>
                    {item.message}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => deleteOne(item.id)}
                  style={{ paddingLeft: 10, paddingTop: 2 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color="#CBD5E1" />
                </TouchableOpacity>

                {!item.isRead && (
                  <View style={{
                    position: 'absolute', top: 14, right: 36,
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: '#2D6A4F',
                    borderWidth: 1.5, borderColor: '#fff',
                  }} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}