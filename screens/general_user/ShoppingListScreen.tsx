// screens/general_user/ShoppingListScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { LIGHT_COLORS } from '../../context/ThemeContext';
import {
  subscribeShoppingList,
  removeShoppingListItem,
  type ShoppingListItem,
} from '../../services/shoppingListService';

const PAGE_BG = '#E2EBE1';

function emojiForName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('milk')) return '🥛';
  if (n.includes('egg')) return '🥚';
  if (n.includes('bread')) return '🍞';
  if (n.includes('spinach') || n.includes('lettuce')) return '🥬';
  if (n.includes('tomato')) return '🍅';
  if (n.includes('apple')) return '🍎';
  if (n.includes('banana')) return '🍌';
  if (n.includes('chicken') || n.includes('meat') || n.includes('beef')) return '🍖';
  if (n.includes('fish')) return '🐟';
  if (n.includes('cheese')) return '🧀';
  if (n.includes('yogurt') || n.includes('yoghurt')) return '🥛';
  if (n.includes('rice') || n.includes('pasta')) return '🍚';
  return '🛒';
}

export default function ShoppingListScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const c = LIGHT_COLORS;

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeShoppingList(
      session.userId,
      (rows) => {
        setItems(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [session?.userId]);

  const totalEstimate = useMemo(
    () => items.reduce((s, i) => s + (i.lastKnownPrice ?? 0), 0),
    [items]
  );

  const confirmRemove = useCallback((row: ShoppingListItem) => {
    Alert.alert(
      'Remove from list',
      `Remove "${row.itemName}" from your shopping list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            removeShoppingListItem(row.id).catch(() =>
              Alert.alert('Error', 'Could not remove item.')
            ),
        },
      ]
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <CustomHeader />
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        stickyHeaderIndices={[0]}
      >
        <View
          style={{
            backgroundColor: PAGE_BG,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#1E293B',
              letterSpacing: -0.4,
            }}
          >
            Shopping list 📝
          </Text>
          <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>
            {loading ? 'Loading…' : `${items.length} item${items.length !== 1 ? 's' : ''} to replenish`}
          </Text>

          <View
            style={{
              marginTop: 14,
              backgroundColor: '#2D6A4F',
              borderRadius: 22,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#2D6A4F',
              shadowOpacity: 0.28,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Feather name="shopping-cart" size={20} color="#4ADE80" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)' }}>
                ESTIMATED REPLACE COST
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 }}>
                R{totalEstimate.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                Uses last-known prices from Quick Add
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          {loading && items.length === 0 ? (
            <ActivityIndicator color="#2D6A4F" style={{ marginTop: 48 }} />
          ) : items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 56 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                Nothing to buy yet
              </Text>
              <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 24 }}>
                When pantry items hit zero or you mark them used or wasted in Smart Pantry, they appear here with the same category and price you logged.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.card,
                  borderRadius: 20,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: '#F1F5F9',
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: '#F0FDF4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{emojiForName(item.itemName)}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>
                    {item.itemName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        backgroundColor: '#F1F5F9',
                        borderRadius: 8,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                      }}
                    >
                      <Feather name="tag" size={10} color="#64748B" />
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                        {item.category}
                      </Text>
                    </View>
                    {!!item.unit && (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>
                        last unit · {item.unit}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D', marginTop: 8 }}>
                    ~ R{item.lastKnownPrice.toFixed(2)} replace est.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => confirmRemove(item)}
                  activeOpacity={0.7}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FEF2F2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                  }}
                >
                  <Feather name="trash-2" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('QuickAdd')}
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Feather name="plus-circle" size={15} color="#2D6A4F" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
            Restock pantry (Quick Add)
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        onPress={() => navigation.navigate('Pantry')}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#2D6A4F',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#2D6A4F',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Feather name="box" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
