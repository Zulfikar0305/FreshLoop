// screens/auth/OnboardBotCheck.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const ALL_ITEMS = [
  { id: 'broccoli', emoji: '🥦', label: 'Broccoli', isVeg: true  },
  { id: 'carrot',   emoji: '🥕', label: 'Carrot',   isVeg: true  },
  { id: 'corn',     emoji: '🌽', label: 'Corn',      isVeg: true  },
  { id: 'onion',    emoji: '🧅', label: 'Onion',     isVeg: true  },
  { id: 'lettuce',  emoji: '🥬', label: 'Lettuce',   isVeg: true  },
  { id: 'tomato',   emoji: '🍅', label: 'Tomato',    isVeg: true  },
  { id: 'spinach',  emoji: '🌿', label: 'Spinach',   isVeg: true  },
  { id: 'pepper',   emoji: '🫑', label: 'Pepper',    isVeg: true  },
  { id: 'pizza',    emoji: '🍕', label: 'Pizza',     isVeg: false },
  { id: 'chicken',  emoji: '🍗', label: 'Chicken',   isVeg: false },
  { id: 'cupcake',  emoji: '🧁', label: 'Cupcake',   isVeg: false },
  { id: 'bread',    emoji: '🍞', label: 'Bread',     isVeg: false },
  { id: 'cheese',   emoji: '🧀', label: 'Cheese',    isVeg: false },
  { id: 'apple',    emoji: '🍎', label: 'Apple',     isVeg: false },
  { id: 'milk',     emoji: '🥛', label: 'Milk',      isVeg: false },
  { id: 'steak',    emoji: '🥩', label: 'Steak',     isVeg: false },
];

const TIMER = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRound() {
  const vegs    = shuffle(ALL_ITEMS.filter(i => i.isVeg)).slice(0, 3);
  const nonVegs = shuffle(ALL_ITEMS.filter(i => !i.isVeg)).slice(0, 3);
  return shuffle([...vegs, ...nonVegs]);
}

export default function OnboardBotCheck({
  role,
  onContinue,
}: {
  role?: 'home' | 'business' | 'npo';
  onContinue: () => void;
}) {
  const totalSteps = (role === 'business' || role === 'npo') ? 5 : 4;
  const [items,    setItems]    = useState(getRound());
  const [selected, setSelected] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [result,   setResult]   = useState<'idle' | 'success' | 'fail'>('idle');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (result !== 'idle') return;
    if (timeLeft === 0) { handleFail(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, result]);

  const vegIds = items.filter(i => i.isVeg).map(i => i.id);

  const toggle = (id: string) => {
    if (result !== 'idle') return;
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    const correct =
      selected.length === vegIds.length &&
      selected.every(id => vegIds.includes(id));
    if (correct) {
      setResult('success');
    } else {
      handleFail();
    }
  };

  const handleFail = () => {
    setResult('fail');
    setAttempts(p => p + 1);
    setTimeout(() => {
      setItems(getRound());
      setSelected([]);
      setTimeLeft(TIMER);
      setResult('idle');
    }, 1400);
  };

  const timerPct   = (timeLeft / TIMER) * 100;
  const timerColor = timeLeft > 4 ? '#2D6A4F' : timeLeft > 2 ? '#F59E0B' : '#EF4444';

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#1C3A2E' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
          justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 38, height: 38, borderRadius: 11, overflow: 'hidden',
              borderWidth: 1.5, borderColor: 'rgba(134,239,172,0.3)', marginRight: 10,
            }}>
              <Image
                source={require('../../assets/Logo.jpeg')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>
              Fresh<Text style={{ color: '#4ADE80' }}>Loop</Text>
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10,
            paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' }}>
              Step 3 of {totalSteps}
            </Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20, borderRadius: 2, marginBottom: 16 }}>
          <View style={{ height: 3, width: `${(3 / totalSteps) * 100}%`, backgroundColor: '#4ADE80', borderRadius: 2 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ marginBottom: 20, marginTop: 4 }}>
          <Text style={{ color: '#1E293B', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            Quick check 🥦
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, lineHeight: 20 }}>
            Tap all the vegetables on screen, then press Submit. You have 8 seconds.
          </Text>
        </View>

        {/* Timer bar */}
        {result === 'idle' && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                Time remaining
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: timerColor }}>
                {timeLeft}s
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3 }}>
              <View style={{
                height: 6, borderRadius: 3,
                backgroundColor: timerColor,
                width: `${timerPct}%`,
              }} />
            </View>
          </View>
        )}

        {/* Result banners */}
        {result === 'success' && (
          <View style={{
            backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, marginBottom: 20,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: '#A7F3D0',
          }}>
            <Feather name="check-circle" size={20} color="#10B981" />
            <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 14 }}>
              Correct! You're definitely not a bot 🎉
            </Text>
          </View>
        )}
        {result === 'fail' && (
          <View style={{
            backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, marginBottom: 20,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: '#FECACA',
          }}>
            <Feather name="x-circle" size={20} color="#EF4444" />
            <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 14 }}>
              Not quite — loading a new set!
            </Text>
          </View>
        )}

        {/* Food grid */}
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap', gap: 12,
          justifyContent: 'center', marginBottom: 28,
        }}>
          {items.map(item => {
            const sel = selected.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggle(item.id)}
                activeOpacity={0.8}
                style={{
                  width: '28%', aspectRatio: 1,
                  backgroundColor: sel ? 'rgba(45,106,79,0.10)' : '#fff',
                  borderRadius: 18,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: sel ? 2 : 1,
                  borderColor: sel ? '#2D6A4F' : '#E2E8F0',
                  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
                }}
              >
                <Text style={{ fontSize: 36 }}>{item.emoji}</Text>
                <Text style={{
                  fontSize: 10, fontWeight: '700', marginTop: 4,
                  color: sel ? '#2D6A4F' : '#94A3B8',
                }}>
                  {item.label}
                </Text>
                {sel && (
                  <View style={{
                    position: 'absolute', top: 7, right: 7,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: '#2D6A4F',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Feather name="check" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action buttons */}
        {result !== 'success' ? (
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={selected.length === 0 || result !== 'idle'}
            style={{
              backgroundColor: selected.length === 0 || result !== 'idle' ? '#CBD5E1' : '#2D6A4F',
              borderRadius: 14, paddingVertical: 15,
              alignItems: 'center', marginBottom: 12,
              shadowColor: '#2D6A4F',
              shadowOpacity: selected.length > 0 && result === 'idle' ? 0.3 : 0,
              shadowRadius: 10,
              elevation: selected.length > 0 && result === 'idle' ? 4 : 0,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              {selected.length > 0 ? `Submit (${selected.length} selected)` : 'Select vegetables to submit'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onContinue}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#2D6A4F', borderRadius: 14, paddingVertical: 15,
              alignItems: 'center', marginBottom: 12,
              shadowColor: '#2D6A4F', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              Continue →
            </Text>
          </TouchableOpacity>
        )}

        {attempts > 0 && result === 'idle' && (
          <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            Attempt {attempts + 1} — tap only the vegetables, then submit
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
