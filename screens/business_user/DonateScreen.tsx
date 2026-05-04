// screens/business_user/DonateScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import DatePickerField from '../../components/DatePickerField';
import { useAuth } from '../../context/AuthContext';
import { createDonationListing } from '../../services/donationService';
import { createNotification } from '../../services/inAppNotificationService';



const { width } = Dimensions.get('window');

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Bakery', 'Dairy', 'Fresh Produce',
  'Dry Goods', 'Prepared Meals', 'Beverages', 'Other',
];

type Method = null | 'snap' | 'voice' | 'csv';

// ── Helpers ───────────────────────────────────────────────────────────────────
function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: '#94A3B8',
      letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7,
    }}>
      {label}
    </Text>
  );
}

function InputField({
  icon, placeholder, value, onChangeText,
  multiline, keyboardType,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  placeholder: string;
  value?: string;
  onChangeText?: (v: string) => void;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={{
      flexDirection: multiline ? 'column' : 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      backgroundColor: '#fff',
      borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
      paddingHorizontal: 14,
      paddingVertical: multiline ? 12 : 0,
      minHeight: multiline ? 90 : 50,
      marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    }}>
      {!multiline && (
        <Feather name={icon} size={16} color="#94A3B8" style={{ marginRight: 10 }} />
      )}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          flex: 1, fontSize: 14, color: '#1E293B',
          minHeight: multiline ? 70 : undefined,
        }}
      />
    </View>
  );
}

type FormData = {
  foodName: string;
  category: string;
  qty: string;
  expiry: string;
  desc: string;
  pickupFrom: string;
  pickupTo: string;
  pickupAddress: string;
};

// ── Form (shared across snap + voice methods) ─────────────────────────────────
function DonationForm({ data, onChange }: {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
}) {
  const card = {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16, shadowColor: '#000' as const,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  };

  return (
    <>
      {/* ── Donation Details ── */}
      <Text style={{
        color: '#94A3B8', fontSize: 11, fontWeight: '700',
        letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
      }}>
        DONATION DETAILS
      </Text>

      <View style={card}>
        <FieldLabel label="Food Name" />
        <InputField
          icon="tag"
          placeholder="e.g. Mixed Bread Loaves"
          value={data.foodName}
          onChangeText={(v) => onChange('foodName', v)}
        />

        {/* Category chips */}
        <FieldLabel label="Food Category" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 14 }}
        >
          {CATEGORIES.map(c => {
            const isActive = data.category === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => onChange('category', c)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20, borderWidth: 1.5,
                  borderColor: isActive ? '#2D6A4F' : '#E2E8F0',
                  backgroundColor: isActive ? 'rgba(45,106,79,0.1)' : '#F8FAFC',
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: '600',
                  color: isActive ? '#2D6A4F' : '#64748B',
                }}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <FieldLabel label="Quantity" />
        <InputField
          icon="package"
          placeholder="e.g. 45 kg or 120 loaves"
          value={data.qty} onChangeText={(v) => onChange('qty', v)}
        />

        <FieldLabel label="Best Before / Expiry Date" />
        <DatePickerField
          value={data.expiry}
          onChange={(v) => onChange('expiry', v)}
          format="YYYY-MM-DD"
          accentColor="#2D6A4F"
          containerStyle={{ marginBottom: 14 }}
        />

        <FieldLabel label="Description & Handling Instructions" />
        <InputField
          icon="file-text"
          placeholder="e.g. Day-old sourdough loaves, best toasted. Kept refrigerated."
          value={data.desc} onChangeText={(v) => onChange('desc', v)}
          multiline
        />

        <FieldLabel label="Pickup Window" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <InputField
              icon="clock"
              placeholder="From — 16:00"
              value={data.pickupFrom} onChangeText={(v) => onChange('pickupFrom', v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              icon="clock"
              placeholder="Until — 18:00"
              value={data.pickupTo} onChangeText={(v) => onChange('pickupTo', v)}
            />
          </View>
        </View>
      </View>

      {/* ── Pickup Location ── */}
      <Text style={{
        color: '#94A3B8', fontSize: 11, fontWeight: '700',
        letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
      }}>
        PICKUP LOCATION
      </Text>

      <View style={card}>
        <FieldLabel label="Pickup Address" />
        <InputField
          icon="map-pin"
          placeholder="e.g. 45 Berea Road, Durban"
          value={data.pickupAddress}
          onChangeText={(v) => onChange('pickupAddress', v)}
        />
        {/* Map placeholder */}
        <View style={{
          height: 140, borderRadius: 14, overflow: 'hidden',
          backgroundColor: '#E2EBE1', marginBottom: 12,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: '#D1E8D0',
        }}>
          {/* Grid lines to simulate map */}
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0.15,
          }}>
            {[1,2,3,4].map(i => (
              <View key={i} style={{
                position: 'absolute',
                top: `${i * 25}%`, left: 0, right: 0,
                height: 1, backgroundColor: '#2D6A4F',
              }} />
            ))}
            {[1,2,3,4,5].map(i => (
              <View key={i} style={{
                position: 'absolute',
                left: `${i * 20}%`, top: 0, bottom: 0,
                width: 1, backgroundColor: '#2D6A4F',
              }} />
            ))}
          </View>

          {/* Pin */}
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#2D6A4F',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.3,
              shadowRadius: 6, elevation: 4,
            }}>
              <Feather name="map-pin" size={20} color="#fff" />
            </View>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
              marginTop: 8,
            }}>
              <Text style={{
                fontSize: 11, fontWeight: '700', color: '#2D6A4F',
              }}>
                {data.pickupAddress || 'Enter address above'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => Alert.alert('Adjust Pickup Pin', 'Drop a pin on the map to set a more precise pickup location for this donation. Drivers will use this to navigate to you.', [{ text: 'OK' }])}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}
        >
          <Feather name="edit-2" size={13} color="#2D6A4F" />
          <Text style={{
            fontSize: 13, color: '#2D6A4F', fontWeight: '700',
          }}>
            Adjust pin for this pickup
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Success State ─────────────────────────────────────────────────────────────
function SuccessState({ onReset, donationId, category, qty, pickupWindow }: {
  onReset: () => void;
  donationId?: string;
  category?: string;
  qty?: string;
  pickupWindow?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader 
        settingsScreen="BusinessSecurity" 
        profileTab="Profile" 
        notificationsScreen="BusinessNotifications" 
      />
      <View style={{
        flex: 1, paddingHorizontal: 24,
        alignItems: 'center', justifyContent: 'center',
      }}>

        {/* Tick */}
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(45,106,79,0.1)',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          borderWidth: 2, borderColor: '#2D6A4F',
        }}>
          <Feather name="check" size={36} color="#2D6A4F" />
        </View>

        <Text style={{
          fontSize: 22, fontWeight: '800',
          color: '#1E293B', letterSpacing: -0.5,
        }}>
          Listing Published!
        </Text>
        <Text style={{
          fontSize: 13, color: '#64748B',
          marginTop: 6, textAlign: 'center', lineHeight: 20,
        }}>
          NPOs in your area have been notified.{'\n'}
          You'll receive a claim notification shortly.
        </Text>

        {/* Listing summary card */}
        <View style={{
          marginTop: 24, width: '100%',
          backgroundColor: '#fff', borderRadius: 20,
          padding: 20,
          shadowColor: '#000', shadowOpacity: 0.05,
          shadowRadius: 10, elevation: 3,
          borderWidth: 1.5, borderColor: 'rgba(45,106,79,0.2)',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            gap: 8, marginBottom: 12,
          }}>
            <View style={{
              backgroundColor: 'rgba(45,106,79,0.1)',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{
                color: '#2D6A4F', fontSize: 10, fontWeight: '800',
              }}>
                ACTIVE LISTING
              </Text>
            </View>
          </View>

          <Text style={{
            color: '#94A3B8', fontSize: 11,
            fontWeight: '700', marginBottom: 2,
          }}>
            LISTING ID
          </Text>
          <Text style={{
            color: '#1E293B', fontSize: 15,
            fontWeight: '800', marginBottom: 14,
          }}>
            {donationId ? `FL-${donationId.slice(0, 8).toUpperCase()}` : 'FL-...'}
          </Text>

          {[
            { icon: 'tag' as const,     label: 'Category',      value: category    || '—' },
            { icon: 'package' as const, label: 'Quantity',      value: qty         || '—' },
            { icon: 'clock' as const,   label: 'Pickup window', value: pickupWindow || '—' },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 8, gap: 10,
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Feather name={row.icon} size={14} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '700' }}>
                    {row.label.toUpperCase()}
                  </Text>
                  <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '600', marginTop: 1 }}>
                    {row.value}
                  </Text>
                </View>
              </View>
              {i < arr.length - 1 && (
                <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
              )}
            </View>
          ))}
        </View>

        {/* Create another button */}
        <TouchableOpacity
          onPress={onReset}
          activeOpacity={0.85}
          style={{
            marginTop: 20, width: '100%',
            backgroundColor: '#2D6A4F',
            borderRadius: 14, paddingVertical: 15,
            alignItems: 'center', flexDirection: 'row',
            justifyContent: 'center', gap: 8,
            shadowColor: '#2D6A4F',
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
          }}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            Create Another Listing
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DonateScreen() {
  const { session } = useAuth();
  const [method,      setMethod]      = useState<Method>(null);
  const [submitted,   setSubmitted]   = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [donationId,  setDonationId]  = useState('');
  const [form, setForm] = useState<FormData>({
    foodName: '', category: '', qty: '', expiry: '',
    desc: '', pickupFrom: '', pickupTo: '', pickupAddress: '',
  });

  const handleChange = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setForm({ foodName: '', category: '', qty: '', expiry: '', desc: '', pickupFrom: '', pickupTo: '', pickupAddress: '' });
    setMethod(null);
    setVoiceActive(false);
    setDonationId('');
    setSubmitted(false);
  };

  const handlePublish = async () => {
    if (!session?.userId) {
      Alert.alert('Not signed in', 'Please sign in to publish a donation listing.');
      return;
    }
    if (!form.foodName.trim()) {
      Alert.alert('Missing info', 'Please enter a food name.');
      return;
    }
    if (!form.category) {
      Alert.alert('Missing info', 'Please select a food category.');
      return;
    }
    if (!form.qty.trim()) {
      Alert.alert('Missing info', 'Please enter a quantity.');
      return;
    }
    if (!form.pickupAddress.trim()) {
      Alert.alert('Missing info', 'Please enter a pickup address.');
      return;
    }
    setLoading(true);
    try {
      const pickupWindow = [form.pickupFrom, form.pickupTo].filter(Boolean).join(' – ');
      const id = await createDonationListing({
        donorId: session.userId,
        donorRole: session.role as 'home' | 'business',
        donorName: session.name,
        foodName: form.foodName,
        quantity: form.qty,
        unit: '',
        category: form.category,
        storageInstructions: form.desc,
        expiryDate: form.expiry,
        pickupAddress: form.pickupAddress,
        pickupWindow,
        city: 'Durban',
        notes: '',
      });
      setDonationId(id);
      createNotification(session.userId, {
        type:    'donation',
        title:   'Listing published ✅',
        message: `Your ${form.category || form.foodName} listing is now live. Nearby NPOs can claim it.`,
      }).catch(() => {});
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not publish listing.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const pickupWindow = [form.pickupFrom, form.pickupTo].filter(Boolean).join(' – ');
    return (
      <SuccessState
        donationId={donationId}
        category={form.category}
        qty={form.qty}
        pickupWindow={pickupWindow}
        onReset={resetForm}
      />
    );
  }

  const card = {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16, shadowColor: '#000' as const,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader 
        settingsScreen="BusinessSecurity" 
        profileTab="Profile" 
        notificationsScreen="BusinessNotifications" 
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Page title ── */}
        <Text style={{
          color: '#1E293B', fontSize: 22,
          fontWeight: '800', letterSpacing: -0.5,
          marginBottom: 4,
        }}>
          New Donation
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
          List surplus food for nearby NPOs to claim.
        </Text>

        {/* ── Method selector ── */}
        {!method && (
          <>
            <Text style={{
              color: '#94A3B8', fontSize: 11, fontWeight: '700',
              letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
            }}>
              CHOOSE ENTRY METHOD
            </Text>

            {/* Snap + Voice cards */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {[
                {
                  id: 'snap' as const,
                  icon: 'camera' as const,
                  title: 'Camera Entry',
                  sub: 'Coming soon',
                  color: '#94A3B8',
                  bg: 'rgba(148,163,184,0.1)',
                },
                {
                  id: 'voice' as const,
                  icon: 'mic' as const,
                  title: 'Voice & Manual Entry',
                  sub: 'Speak or fill the form manually',
                  color: '#F97316',
                  bg: 'rgba(249,115,22,0.1)',
                },
              ].map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setMethod(item.id)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, backgroundColor: '#fff',
                    borderRadius: 20, padding: 18,
                    alignItems: 'center',
                    borderWidth: 1.5, borderColor: '#E2E8F0',
                    shadowColor: '#000', shadowOpacity: 0.05,
                    shadowRadius: 8, elevation: 2,
                  }}
                >
                  <View style={{
                    width: 52, height: 52, borderRadius: 16,
                    backgroundColor: item.bg,
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Feather name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={{
                    fontWeight: '700', fontSize: 13,
                    color: '#1E293B', textAlign: 'center',
                    marginBottom: 4,
                  }}>
                    {item.title}
                  </Text>
                  <Text style={{
                    fontSize: 11, color: '#94A3B8',
                    textAlign: 'center', lineHeight: 16,
                  }}>
                    {item.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* CSV Import */}
            <TouchableOpacity
              onPress={() => setMethod('csv')}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#fff', borderRadius: 20,
                borderWidth: 1.5, borderColor: '#E2E8F0',
                borderStyle: 'dashed',
                padding: 18, flexDirection: 'row',
                alignItems: 'center', gap: 14,
                shadowColor: '#000', shadowOpacity: 0.03,
                shadowRadius: 6, elevation: 1,
              }}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: 'rgba(96,165,250,0.1)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Feather name="upload" size={22} color="#60A5FA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontWeight: '700', fontSize: 14, color: '#1E293B',
                }}>
                  Import CSV
                </Text>
                <Text style={{
                  fontSize: 12, color: '#94A3B8', marginTop: 2,
                }}>
                  Bulk listings from a spreadsheet
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </>
        )}

        {/* ── Back button (when method selected) ── */}
        {method && (
          <TouchableOpacity
            onPress={() => { setMethod(null); setVoiceActive(false); }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center',
              gap: 6, marginBottom: 20,
            }}
          >
            <Feather name="arrow-left" size={16} color="#2D6A4F" />
            <Text style={{
              color: '#2D6A4F', fontSize: 13, fontWeight: '700',
            }}>
              Change method
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Smart Snap ── */}
        {method === 'snap' && (
          <>
            <Text style={{
              color: '#94A3B8', fontSize: 11, fontWeight: '700',
              letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
            }}>
              CAPTURE ITEMS
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Alert.alert('Camera Entry', 'Camera item capture will be available in the full release.')}
              style={{
                backgroundColor: '#fff',
                borderWidth: 1.5, borderColor: '#E2E8F0',
                borderStyle: 'dashed', borderRadius: 20,
                height: 180, alignItems: 'center',
                justifyContent: 'center', marginBottom: 20,
                shadowColor: '#000', shadowOpacity: 0.03,
                shadowRadius: 6, elevation: 1,
              }}
            >
              <View style={{
                width: 60, height: 60, borderRadius: 18,
                backgroundColor: 'rgba(45,106,79,0.1)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Feather name="camera" size={28} color="#2D6A4F" />
              </View>
              <Text style={{
                fontWeight: '700', color: '#1E293B',
                fontSize: 14, marginBottom: 4,
              }}>
                Camera entry coming soon
              </Text>
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                Fill in the form below after taking your photo
              </Text>
            </TouchableOpacity>

            <DonationForm data={form} onChange={handleChange} />

            <TouchableOpacity
              onPress={handlePublish}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#2D6A4F', borderRadius: 14,
                paddingVertical: 15, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center',
                gap: 8, marginTop: 4,
                shadowColor: '#2D6A4F',
                shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Feather name="send" size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Publish Listing</Text></>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── Voice & Manual ── */}
        {method === 'voice' && (
          <>
            <Text style={{
              color: '#94A3B8', fontSize: 11, fontWeight: '700',
              letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
            }}>
              VOICE ENTRY
            </Text>

            <TouchableOpacity
              onPress={() => setVoiceActive(v => !v)}
              activeOpacity={0.8}
              style={{
                padding: 24, borderRadius: 20,
                backgroundColor: voiceActive
                  ? 'rgba(239,68,68,0.07)'
                  : 'rgba(45,106,79,0.07)',
                borderWidth: 1.5,
                borderColor: voiceActive ? '#EF4444' : '#2D6A4F',
                alignItems: 'center', marginBottom: 20,
              }}
            >
              <View style={{
                width: 60, height: 60, borderRadius: 30,
                backgroundColor: voiceActive
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(45,106,79,0.12)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Feather
                  name={voiceActive ? 'mic-off' : 'mic'}
                  size={28}
                  color={voiceActive ? '#EF4444' : '#2D6A4F'}
                />
              </View>
              <Text style={{
                fontWeight: '700', fontSize: 15,
                color: voiceActive ? '#EF4444' : '#2D6A4F',
              }}>
                {voiceActive
                  ? 'Recording... Tap to stop'
                  : 'Tap to start voice entry'}
              </Text>

              {/* Waveform */}
              {voiceActive && (
                <View style={{
                  flexDirection: 'row', gap: 3,
                  alignItems: 'center', marginTop: 12,
                }}>
                  {[8, 14, 6, 18, 10, 16, 7, 12, 9, 15].map((h, i) => (
                    <View key={i} style={{
                      width: 4, height: h,
                      backgroundColor: '#EF4444',
                      borderRadius: 2, opacity: 0.8,
                    }} />
                  ))}
                </View>
              )}

              {!voiceActive && (
                <Text style={{
                  fontSize: 12, color: '#64748B',
                  marginTop: 6, textAlign: 'center',
                }}>
                  Speak naturally — e.g. "45 kg of mixed bread, expires tomorrow"
                </Text>
              )}
            </TouchableOpacity>

            <DonationForm data={form} onChange={handleChange} />

            <TouchableOpacity
              onPress={handlePublish}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#2D6A4F', borderRadius: 14,
                paddingVertical: 15, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center',
                gap: 8, marginTop: 4,
                shadowColor: '#2D6A4F',
                shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Feather name="send" size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Publish Listing</Text></>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── CSV Import ── */}
        {method === 'csv' && (
          <>
            <Text style={{
              color: '#94A3B8', fontSize: 11, fontWeight: '700',
              letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
            }}>
              BULK IMPORT
            </Text>

            {/* Upload card */}
            <View style={card}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => Alert.alert('CSV Import', 'CSV bulk import will be available in the full release.')}
                style={{
                  borderWidth: 1.5, borderColor: '#E2E8F0',
                  borderStyle: 'dashed', borderRadius: 14,
                  padding: 24, alignItems: 'center',
                  backgroundColor: '#F8FAFC', marginBottom: 14,
                }}
              >
                <View style={{
                  width: 56, height: 56, borderRadius: 16,
                  backgroundColor: 'rgba(96,165,250,0.1)',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <Feather name="file-text" size={26} color="#60A5FA" />
                </View>
                <Text style={{
                  fontWeight: '700', fontSize: 14,
                  color: '#1E293B', marginBottom: 4,
                }}>
                  Upload CSV File
                </Text>
                <Text style={{
                  fontSize: 12, color: '#94A3B8', textAlign: 'center',
                }}>
                  .csv format only · Max 5MB
                </Text>
              </TouchableOpacity>

              {/* Column guide */}
              <View style={{
                backgroundColor: 'rgba(96,165,250,0.07)',
                borderRadius: 12, padding: 12,
              }}>
                <Text style={{
                  color: '#60A5FA', fontSize: 11,
                  fontWeight: '700', marginBottom: 6,
                }}>
                  REQUIRED COLUMNS
                </Text>
                {[
                  'item_name', 'quantity', 'unit',
                  'expiry_date', 'food_category',
                ].map(col => (
                  <View key={col} style={{
                    flexDirection: 'row', alignItems: 'center',
                    gap: 6, marginBottom: 3,
                  }}>
                    <View style={{
                      width: 5, height: 5, borderRadius: 3,
                      backgroundColor: '#60A5FA',
                    }} />
                    <Text style={{
                      fontSize: 12, color: '#475569',
                      fontFamily: 'monospace', fontWeight: '600',
                    }}>
                      {col}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

              <View style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                backgroundColor: '#FFFBEB',
                borderRadius: 14, borderWidth: 1,
                borderColor: 'rgba(251,191,36,0.3)',
                padding: 14, marginBottom: 16,
              }}>
                <Feather name="clock" size={15} color="#D97706" style={{ marginTop: 1 }} />
                <Text style={{
                  flex: 1, color: '#92400E',
                  fontSize: 12, lineHeight: 18, fontWeight: '500',
                }}>
                  CSV bulk import is not yet available. This feature will be enabled in the full release.
                </Text>
              </View>

            <TouchableOpacity
              onPress={() => Alert.alert('CSV Import', 'CSV bulk import will be available in the full release.')}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#94A3B8', borderRadius: 14,
                paddingVertical: 15, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center',
                gap: 8,
              }}
            >
              <Feather name="clock" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                Coming Soon
              </Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </View>
  );
}