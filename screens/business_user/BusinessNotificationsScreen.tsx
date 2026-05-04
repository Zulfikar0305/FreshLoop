// screens/business_user/BusinessNotificationsScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeNotifications,
  markNotificationRead,
  deleteNotification,
  type InAppNotification,
} from '../../services/inAppNotificationService';

type FilterType = 'All' | 'Unread' | 'Donations' | 'Claims' | 'System';
const FILTERS: FilterType[] = ['All', 'Unread', 'Donations', 'Claims', 'System'];

const NOTIF_META: Record<string, {
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
  bg: string;
}> = {
  donation: { icon: 'package',        color: '#2D6A4F', bg: 'rgba(45,106,79,0.1)'   },
  claim:    { icon: 'truck',           color: '#2E7BBF', bg: 'rgba(46,123,191,0.1)'  },
  report:   { icon: 'flag',            color: '#7C3AED', bg: 'rgba(124,58,237,0.1)'  },
  system:   { icon: 'info',            color: '#60A5FA', bg: 'rgba(96,165,250,0.1)'  },
  expiry:   { icon: 'alert-triangle',  color: '#F97316', bg: 'rgba(249,115,22,0.1)'  },
};

function getMeta(type: string) {
  return NOTIF_META[type] ?? NOTIF_META.system;
}

function passesFilter(n: InAppNotification, filter: FilterType): boolean {
  switch (filter) {
    case 'All':       return true;
    case 'Unread':    return !n.isRead;
    case 'Donations': return n.type === 'donation';
    case 'Claims':    return n.type === 'claim';
    case 'System':    return n.type === 'system' || n.type === 'report' || n.type === 'expiry';
  }
}

function formatTime(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export default function BusinessNotificationsScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [notifs, setNotifs] = useState<InAppNotification[]>([]);
  const [filter, setFilter] = useState<FilterType>('All');

  useEffect(() => {
    if (!session?.userId) return;
    const unsub = subscribeNotifications(session.userId, setNotifs);
    return unsub;
  }, [session?.userId]);

  const unreadCount = useMemo(() => notifs.filter(n => !n.isRead).length, [notifs]);
  const filtered    = useMemo(() => notifs.filter(n => passesFilter(n, filter)), [notifs, filter]);

  const markAllRead = () =>
    notifs.filter(n => !n.isRead).forEach(n => markNotificationRead(n.id).catch(() => {}));

  const dismiss = (id: string) => deleteNotification(id).catch(() => {});

  const markRead = (id: string) => markNotificationRead(id).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader
        settingsScreen="BusinessSecurity"
        profileTab="Profile"
        notificationsScreen="BusinessNotifications"
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back ── */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}
        >
          <Feather name="arrow-left" size={16} color="#2D6A4F" />
          <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 14 }}>Back</Text>
        </TouchableOpacity>

        {/* ── Title row ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{
              color: '#1E293B', fontSize: 22,
              fontWeight: '800', letterSpacing: -0.5,
            }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={{
                backgroundColor: '#F97316', borderRadius: 10,
                paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
              <Text style={{ fontSize: 12, color: '#2D6A4F', fontWeight: '700' }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
          Stay on top of claims, pickups and updates.
        </Text>

        {/* ── Filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 20 }}
        >
          {FILTERS.map(f => {
            const isActive = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
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

        {/* ── Notification cards ── */}
        {filtered.length === 0 ? (
          <View style={{
            backgroundColor: '#fff', borderRadius: 20,
            padding: 36, alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
          }}>
            <Feather name="bell-off" size={32} color="#CBD5E1" />
            <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
              No notifications yet. Updates will appear here when activity happens.
            </Text>
          </View>
        ) : (
          filtered.map(n => {
            const s = getMeta(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => markRead(n.id)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 20, padding: 16,
                  marginBottom: 10,
                  borderWidth: n.isRead ? 1 : 1.5,
                  borderColor: n.isRead ? '#F1F5F9' : 'rgba(45,106,79,0.2)',
                  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icon */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 13,
                    backgroundColor: s.bg,
                    alignItems: 'center', justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    <Feather name={s.icon} size={18} color={s.color} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 3,
                    }}>
                      <Text style={{
                        fontWeight: n.isRead ? '600' : '800', fontSize: 14, color: '#1E293B', flex: 1,
                      }}>
                        {n.title}
                      </Text>
                      {!n.isRead && (
                        <View style={{
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: '#F97316', marginLeft: 8,
                        }} />
                      )}
                    </View>
                    <Text style={{
                      fontSize: 12, color: '#64748B',
                      lineHeight: 18, marginBottom: 8,
                    }}>
                      {n.message}
                    </Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8' }}>{formatTime(n.createdAt)}</Text>
                      <TouchableOpacity
                        onPress={() => dismiss(n.id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={14} color="#CBD5E1" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}