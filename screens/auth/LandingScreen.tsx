// screens/auth/LandingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const USER_PATHS: {
  id: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  sub: string;
  color: string;
  bg: string;
  badge?: string;
}[] = [
  {
    id: 'home',
    icon: 'home',
    title: 'Home User',
    sub: 'Manage your pantry, reduce waste, and discover recipes.',
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.15)',
    
  },
  {
    id: 'business',
    icon: 'shopping-bag',
    title: 'Business',
    sub: 'List surplus food and track donations from your store.',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.15)',
  },
  {
    id: 'npo',
    icon: 'heart',
    title: 'NPO / Coordinator',
    sub: 'Claim donations and coordinate community pickups.',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.15)',
  },
  {
    id: 'admin',
    icon: 'shield',
    title: 'Platform Admin',
    sub: 'Manage verifications, moderation, and platform health.',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.15)',
  },
];

const STATS = [
  { value: '2.4t',  label: 'Food Saved'  },
  { value: '1,200', label: 'Active Users' },
  { value: '48',    label: 'NPO Partners' },
];

export default function LandingScreen({
  onContinue,
}: {
  onContinue: (role: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>('home');
  const selectedPath = USER_PATHS.find(p => p.id === selectedId)!;

  return (
    <View style={{ flex: 1, backgroundColor: '#1C3A2E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

      {/* Decorative blobs */}
      <View style={{
        position: 'absolute', top: -80, right: -80,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: 'rgba(74,222,128,0.07)',
      }} />
      <View style={{
        position: 'absolute', top: 160, left: -100,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(96,165,250,0.05)',
      }} />
      <View style={{
        position: 'absolute', bottom: 100, right: -60,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(251,146,60,0.05)',
      }} />

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 36,
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Hero ── */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 26,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: 'rgba(134,239,172,0.2)',
              marginBottom: 24,
              shadowColor: '#000',
              shadowOpacity: 0.35, shadowRadius: 20, elevation: 14,
            }}>
              <Image
                source={require('../../assets/Logo.jpeg')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>

            <Text style={{
              fontSize: 44, fontWeight: '800',
              letterSpacing: -1.5, color: '#fff', lineHeight: 48,
            }}>
              Fresh<Text style={{ color: '#4ADE80' }}>Loop</Text>
            </Text>

            <Text style={{
              fontSize: 14, color: 'rgba(255,255,255,0.5)',
              marginTop: 8, fontStyle: 'italic',
              letterSpacing: 0.3, textAlign: 'center',
            }}>
              "Closing the loop on food waste."
            </Text>

            {/* Stats row */}
            <View style={{
              flexDirection: 'row',
              marginTop: 24,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 18, borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              paddingHorizontal: 20, paddingVertical: 14,
              width: '100%', justifyContent: 'space-between',
            }}>
              {STATS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#4ADE80', fontSize: 18, fontWeight: '800' }}>
                      {s.value}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>
                      {s.label}
                    </Text>
                  </View>
                  {i < STATS.length - 1 && (
                    <View style={{
                      width: 1,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      alignSelf: 'stretch',
                    }} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* ── Role selector ── */}
          <Text style={{
            color: 'rgba(255,255,255,0.35)', fontSize: 11,
            fontWeight: '700', letterSpacing: 1.2,
            marginBottom: 12, paddingLeft: 2,
          }}>
            SIGN IN AS
          </Text>

          <View style={{ gap: 10, marginBottom: 32 }}>
            {USER_PATHS.map(path => {
              const isSelected = selectedId === path.id;
              return (
                <TouchableOpacity
                  key={path.id}
                  onPress={() => setSelectedId(path.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.04)',
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected
                      ? path.color
                      : 'rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Icon bubble */}
                  <View style={{
                    width: 48, height: 48, borderRadius: 15,
                    backgroundColor: path.bg,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Feather name={path.icon} size={21} color={path.color} />
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      gap: 8, marginBottom: 3,
                    }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: '#fff' }}>
                        {path.title}
                      </Text>
                      {path.badge && (
                        <View style={{
                          backgroundColor: 'rgba(74,222,128,0.15)',
                          borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                        }}>
                          <Text style={{ color: '#4ADE80', fontSize: 9, fontWeight: '800' }}>
                            {path.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.45)',
                      lineHeight: 17,
                    }}>
                      {path.sub}
                    </Text>
                  </View>

                  {/* Selection indicator */}
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: isSelected
                      ? path.color
                      : 'rgba(255,255,255,0.2)',
                    backgroundColor: isSelected ? path.color : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && (
                      <Feather name="check" size={12} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── CTA ── */}
          <View style={{ gap: 14 }}>
            <TouchableOpacity
              onPress={() => onContinue(selectedId)}
              activeOpacity={0.85}
              style={{
                backgroundColor: selectedPath.color,
                borderRadius: 18,
                paddingVertical: 17,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
                shadowColor: selectedPath.color,
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Text style={{
                color: '#fff', fontWeight: '800',
                fontSize: 16, letterSpacing: 0.2,
              }}>
                Continue as {selectedPath.title}
              </Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={{
              textAlign: 'center', fontSize: 10,
              color: 'rgba(255,255,255,0.2)', marginTop: 2,
            }}>
              Verified businesses · Certified NPOs · Durban &amp; beyond
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}