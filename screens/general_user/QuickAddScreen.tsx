// screens/general_user/QuickAddScreen.tsx
import { useAuth } from '../../context/AuthContext';
import { addInventoryItem, getUserInventory } from '../../services/inventoryService';
import { scheduleExpiryNotifications } from '../../services/notificationService';
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, Animated, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import DatePickerField from '../../components/DatePickerField';

const STORAGE_TAGS = ['Fridge', 'Pantry', 'Freezer', 'Braai Freezer', 'Mini-Fridge'];
const CATEGORIES   = ['Vegetables', 'Fruit', 'Dairy', 'Protein', 'Bakery', 'Dry Goods', 'Cooked'];
const UNITS        = ['g', 'kg', 'L', 'ml', 'items', 'loaf', 'pack'];

/** Accept YYYY-MM-DD, YYYY/MM/DD, and MM/DD/YYYY; return a Date or null. */
function parseFlexibleDate(s: string): Date | null {
  if (!s || s.length < 8) return null;
  let y: number, m: number, d: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const p = s.split('-').map(Number);
    [y, m, d] = [p[0], p[1] - 1, p[2]];
  } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    const p = s.split('/').map(Number);
    [y, m, d] = [p[0], p[1] - 1, p[2]];
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const p = s.split('/').map(Number);
    [m, d, y] = [p[0] - 1, p[1], p[2]];
  } else {
    return null;
  }
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const dt = new Date(y, m, d);
  // Guard against month/day overflow (e.g. Feb 30)
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return dt;
}

type Method = 'Manual' | 'Receipt' | 'Voice';

// ── Voice chat bubble types ──────────────────────────────────────────────────
type Bubble = { id: string; from: 'user' | 'bot'; text: string };
type ParsedItem = { name: string; quantity: number; unit: string; expiryDays: number | null; category: string };

function parseVoiceInput(text: string): ParsedItem | null {
  const t = text.toLowerCase().trim();
  // Extract expiry in days
  let expiryDays: number | null = null;
  const expiryMatch = t.match(/expir(?:es?|ing|y)?\s+(?:in\s+)?(\d+)\s+days?/);
  if (expiryMatch) expiryDays = parseInt(expiryMatch[1], 10);
  // Extract quantity + unit
  const unitMap: Record<string, string> = {
    g: 'g', gram: 'g', grams: 'g',
    kg: 'kg', kilogram: 'kg', kilograms: 'kg',
    l: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
    ml: 'ml',
    pack: 'pack', packs: 'pack',
    loaf: 'loaf', loaves: 'loaf',
    item: 'items', items: 'items',
  };
  let quantity = 1;
  let unit = 'items';
  const qtyMatch = t.match(/(\d+(?:\.\d+)?)\s*(g(?:rams?)?|kg|l(?:itres?|iters?)?|ml|packs?|loaves?|loaf|items?)?(?:\s+of)?\s+/);
  if (qtyMatch) {
    quantity = parseFloat(qtyMatch[1]);
    unit = unitMap[(qtyMatch[2] ?? '').toLowerCase()] ?? 'items';
  }
  // Strip noise to extract item name
  let name = t;
  name = name.replace(/^(?:i\s+)?(?:bought|got|picked\s+up|purchased|have)\s+/, '');
  name = name.replace(/^\d+(?:\.\d+)?\s*(?:g(?:rams?)?|kg|l(?:itres?|iters?)?|ml|packs?|loaves?|loaf|items?)?\s*(?:of\s+)?/, '');
  name = name.replace(/(?:for\s+)?r\s*\d+(?:\.\d+)?/g, '');
  name = name.replace(/\bfor\b\s*/g, '');
  name = name.replace(/[,;]?\s*expir(?:es?|ing|y)?\s+(?:in\s+)?\d+\s+days?/g, '');
  name = name.replace(/\s+(?:in\s+(?:the\s+)?)?(?:fridge|freezer|pantry|cupboard)/g, '');
  name = name.replace(/[,;.]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name || name.length < 2) return null;
  name = name.charAt(0).toUpperCase() + name.slice(1);
  // Guess category
  const catMap: { p: RegExp; c: string }[] = [
    { p: /milk|yogh?urt|cheese|cream|butter/,                                    c: 'Dairy'      },
    { p: /spinach|lettuce|tomato|carrot|pepper|onion|potato|broccoli|kale|cabbage/, c: 'Vegetables' },
    { p: /apple|banana|orange|mango|grape|strawberr|pear|peach|avocado/,         c: 'Fruit'      },
    { p: /chicken|beef|pork|lamb|fish|tuna|mince|steak|sausage|egg/,             c: 'Protein'    },
    { p: /bread|roll|muffin|croissant|baguette|pastry/,                          c: 'Bakery'     },
    { p: /rice|pasta|oat|cereal|flour|sugar|lentil|bean/,                        c: 'Dry Goods'  },
  ];
  let category = 'Dry Goods';
  for (const { p, c } of catMap) { if (p.test(t)) { category = c; break; } }
  return { name, quantity, unit, expiryDays, category };
}

const INITIAL_BUBBLES: Bubble[] = [
  { id: '1', from: 'bot', text: "Hi! Tell me what you bought and I'll add it to your pantry. 🛒" },
  { id: '2', from: 'bot', text: 'Try: "5 apples expiring in 3 days" or "300g spinach expires in 7 days"' },
];

export default function QuickAddScreen() {
  const navigation  = useNavigation<any>();
  const { session } = useAuth();
  const [method, setMethod]               = useState<Method>('Manual');

  // Manual form state
  const [foodName,        setFoodName]        = useState('');
  const [category,        setCategory]        = useState('Vegetables');
  const [quantity,        setQuantity]        = useState('');
  const [unit,            setUnit]            = useState('g');
  const [price,           setPrice]           = useState('');
  const [expiryDate,      setExpiryDate]      = useState('');
  const [storageLocation, setStorageLocation] = useState('Fridge');
  const [dateError,       setDateError]       = useState('');

  // Voice state
  const [bubbles,         setBubbles]        = useState<Bubble[]>(INITIAL_BUBBLES);
  const [voiceMsg,        setVoiceMsg]       = useState('');
  const [isTyping,        setIsTyping]       = useState(false);
  const [pendingItem,     setPendingItem]    = useState<ParsedItem | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const handleDateChange = (text: string) => {
    // Auto-format 8-digit compact input: 20260520 → 2026-05-20
    let formatted = text;
    if (/^\d{8}$/.test(text.trim())) {
      formatted = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
    }
    setExpiryDate(formatted);
    if (!formatted) { setDateError(''); return; }
    const d = parseFlexibleDate(formatted);
    if (!d) { setDateError('Use YYYY-MM-DD, YYYY/MM/DD, or MM/DD/YYYY'); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d <= today) setDateError('Expiry must be a future date');
    else            setDateError('');
  };

  const getExpiryPreview = () => {
    if (dateError || !expiryDate) return null;
    const parsed = parseFlexibleDate(expiryDate);
    if (!parsed) return null;
    const diff = Math.ceil((parsed.getTime() - Date.now()) / 86400000);
    if (diff <= 1)  return { label: 'Expires today!',        color: '#EF4444', fill: 0.05, bg: '#FEF2F2' };
    if (diff <= 3)  return { label: `${diff} days — Urgent`, color: '#F97316', fill: 0.2,  bg: '#FFF7ED' };
    if (diff <= 7)  return { label: `${diff} days — Soon`,   color: '#EAB308', fill: 0.5,  bg: '#FEFCE8' };
    return           { label: `${diff} days — Fresh`,        color: '#16A34A', fill: 0.85, bg: '#F0FDF4' };
  };
  const preview = getExpiryPreview();

  const sendVoiceMessage = async () => {
    if (!voiceMsg.trim()) return;
    const text = voiceMsg.trim();
    const userBubble: Bubble = { id: Date.now().toString(), from: 'user', text };
    setBubbles(b => [...b, userBubble]);
    setVoiceMsg('');

    // Handle yes/no confirmation on a previously parsed item
    if (awaitingConfirm && pendingItem) {
      const lower = text.toLowerCase();
      if (/^y(?:es|ep|eah)?$|^sure$|^ok$|^add( it)?$|^confirm$/.test(lower)) {
        if (!session?.userId) {
          setBubbles(b => [...b, { id: Date.now().toString(), from: 'bot', text: 'Please sign in to save items.' }]);
          return;
        }
        try {
          const expiryDate = pendingItem.expiryDays != null
            ? new Date(Date.now() + pendingItem.expiryDays * 86400000)
            : null;
          await addInventoryItem(
            { name: pendingItem.name, quantity: pendingItem.quantity, unit: pendingItem.unit, expiryDate, price: 0, category: pendingItem.category, storageLocation: 'Fridge' },
            session.userId,
          );
          setBubbles(b => [...b, { id: (Date.now() + 1).toString(), from: 'bot', text: `✅ ${pendingItem.name} added to your pantry! Check Smart Pantry to review or update it.` }]);
        } catch {
          setBubbles(b => [...b, { id: (Date.now() + 1).toString(), from: 'bot', text: 'Something went wrong. Please try the Manual tab. 📝' }]);
        }
        setPendingItem(null);
        setAwaitingConfirm(false);
      } else if (/^n(?:o|ope)?$|^cancel$|^stop$|^wrong$/.test(lower)) {
        setBubbles(b => [...b, { id: (Date.now() + 1).toString(), from: 'bot', text: 'No problem! Try again or use the Manual tab for full control. 📝' }]);
        setPendingItem(null);
        setAwaitingConfirm(false);
      } else {
        setBubbles(b => [...b, { id: (Date.now() + 1).toString(), from: 'bot', text: 'Reply "yes" to add the item, or "no" to cancel.' }]);
      }
      return;
    }

    // Parse a new item description
    setIsTyping(true);
    setTimeout(() => {
      const parsed = parseVoiceInput(text);
      if (!parsed) {
        setBubbles(b => [...b, { id: Date.now().toString(), from: 'bot', text: "I couldn't understand that. Try: \"5 apples expiring in 3 days\" or switch to the Manual tab. 📝" }]);
        setIsTyping(false);
        return;
      }
      const expiryText = parsed.expiryDays != null
        ? `Expires in ${parsed.expiryDays} day${parsed.expiryDays === 1 ? '' : 's'}`
        : 'No expiry set';
      setBubbles(b => [...b, {
        id: Date.now().toString(), from: 'bot',
        text: `Got it! Here's what I'll add:\n• ${parsed.name} — ${parsed.quantity} ${parsed.unit}\n• ${expiryText}\n• Category: ${parsed.category}\n\nType "yes" to confirm or "no" to cancel.`,
      }]);
      setPendingItem(parsed);
      setAwaitingConfirm(true);
      setIsTyping(false);
    }, 800);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>

      <CustomHeader />


      {/* ── Method Tabs ── */}
      <View style={{
        flexDirection: 'row', gap: 10,
        paddingHorizontal: 20, paddingVertical: 16,
        backgroundColor: '#E2EBE1',
      }}>
        {([
          { key: 'Manual',  icon: 'edit-2'    as const, label: 'Manual'        },
          { key: 'Receipt', icon: 'file-text' as const, label: 'Receipt (soon)' },
          { key: 'Voice',   icon: 'mic'       as const, label: 'Voice'         },
        ] as { key: Method; icon: React.ComponentProps<typeof Feather>['name']; label: string }[]).map(m => {
          const active = method === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMethod(m.key)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                backgroundColor: active ? '#1C3A2E' : '#fff',
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: 'center',
                gap: 5,
                shadowColor: '#000',
                shadowOpacity: active ? 0.15 : 0.05,
                shadowRadius: 8,
                elevation: active ? 4 : 2,
              }}
            >
              <Feather name={m.icon} size={18} color={active ? '#4ADE80' : '#94A3B8'} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : '#94A3B8' }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── MANUAL VIEW ── */}
      {method === 'Manual' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>

            {/* Item details card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Item details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Food name</Text>
                <TextInput style={styles.input} value={foodName} onChangeText={setFoodName}
                  placeholder="e.g. Spinach" placeholderTextColor="#CBD5E1" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                  {CATEGORIES.map(cat => {
                    const sel = category === cat;
                    return (
                      <TouchableOpacity key={cat} onPress={() => setCategory(cat)} activeOpacity={0.8}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                          backgroundColor: sel ? '#1C3A2E' : '#F8FAFC',
                          borderWidth: 1, borderColor: sel ? '#1C3A2E' : '#E2E8F0',
                        }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? '#fff' : '#64748B' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput style={styles.input} value={quantity} onChangeText={setQuantity}
                    keyboardType="numeric" placeholder="0" placeholderTextColor="#CBD5E1" />
                </View>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}>
                    {UNITS.map(u => {
                      const sel = unit === u;
                      return (
                        <TouchableOpacity key={u} onPress={() => setUnit(u)} activeOpacity={0.8}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12,
                            backgroundColor: sel ? '#1C3A2E' : '#F8FAFC',
                            borderWidth: 1, borderColor: sel ? '#1C3A2E' : '#E2E8F0',
                          }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#fff' : '#64748B' }}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Price (R)</Text>
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                  <Text style={{ color: '#94A3B8', fontSize: 15, fontWeight: '700', marginRight: 6 }}>R</Text>
                  <TextInput style={{ flex: 1, fontSize: 15, color: '#1E293B', paddingVertical: 14 }}
                    value={price} onChangeText={setPrice} keyboardType="decimal-pad"
                    placeholder="0.00" placeholderTextColor="#CBD5E1" />
                </View>
              </View>
            </View>

            {/* Expiry & storage card */}
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.sectionTitle}>Expiry & storage</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Expiry date</Text>
                <DatePickerField
                  value={expiryDate}
                  onChange={handleDateChange}
                  format="MM/DD/YYYY"
                  error={!!dateError}
                  accentColor="#1C3A2E"
                />
                {!!dateError && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                    <Feather name="alert-circle" size={12} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600' }}>{dateError}</Text>
                  </View>
                )}
              </View>

              {preview && (
                <View style={{ backgroundColor: preview.bg, borderRadius: 14, padding: 14, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: preview.color, fontSize: 12, fontWeight: '700' }}>Expiry preview</Text>
                    <Text style={{ color: preview.color, fontSize: 12, fontWeight: '800' }}>{preview.label}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${preview.fill * 100}%`, height: '100%', backgroundColor: preview.color, borderRadius: 3 }} />
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Storage location</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                  {STORAGE_TAGS.map(tag => {
                    const sel = storageLocation === tag;
                    return (
                      <TouchableOpacity key={tag} onPress={() => setStorageLocation(tag)} activeOpacity={0.8}
                        style={{
                          paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                          backgroundColor: sel ? '#1C3A2E' : '#F8FAFC',
                          borderWidth: 1, borderColor: sel ? '#1C3A2E' : '#E2E8F0',
                        }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#fff' : '#64748B' }}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity onPress={async () => {
  if (!foodName.trim()) {
    Alert.alert('Missing info', 'Please enter a food name.');
    return;
  }
  if (!quantity.trim()) {
    Alert.alert('Missing info', 'Please enter a quantity.');
    return;
  }
  if (!session?.userId) {
    Alert.alert('Not signed in', 'Please sign in to save items.');
    return;
  }

  try {
    const expiry = expiryDate && !dateError
      ? parseFlexibleDate(expiryDate)
      : null;

    await addInventoryItem(
      {
        name: foodName.trim(),
        quantity: parseFloat(quantity) || 0,
        unit,
        expiryDate: expiry,
        price: parseFloat(price) || 0,
        category,
        storageLocation,
      },
      session.userId
    );
    try {
      const inv = await getUserInventory(session.userId);
      const active = inv.filter((i) => i.status === 'active');
      await scheduleExpiryNotifications(
        active.map((i) => ({
          id: i.id,
          name: i.name,
          expiryDate: i.expiryDate,
          status: i.status,
        }))
      );
    } catch {
      /* pantry refresh will reschedule on Home/Pantry focus */
    }
    Alert.alert('Saved!', `${foodName} added to your pantry.`);
    navigation.goBack();
  } catch (e) {
    Alert.alert('Error', 'Could not save item. Please try again.');
  }
}}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Save food item</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── RECEIPT VIEW ── */}
      {method === 'Receipt' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
          }}>
            <Feather name="camera" size={36} color="#2D6A4F" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>
            Scan your receipt
          </Text>
          <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            Point your camera at a till slip and we'll automatically extract the items, quantities and prices for you.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required to scan your receipt.'); return; }
              const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
              if (!result.canceled && result.assets?.length) {
                Alert.alert('Receipt Captured', 'Scanning your receipt… Item extraction will be available in the full release.');
              }
            }}
            style={{
              backgroundColor: '#1C3A2E', borderRadius: 18,
              paddingVertical: 16, paddingHorizontal: 40,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              shadowColor: '#1C3A2E', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
            }}
          >
            <Feather name="camera" size={18} color="#4ADE80" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Open camera</Text>
          </TouchableOpacity>
          <View style={{
            marginTop: 20, backgroundColor: '#FFF7ED',
            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Feather name="clock" size={13} color="#F97316" />
            <Text style={{ fontSize: 12, color: '#EA580C', fontWeight: '600' }}>
              Full functionality coming soon
            </Text>
          </View>
        </View>
      )}

      {/* ── VOICE VIEW (WhatsApp-inspired) ── */}
      {method === 'Voice' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Chat bubbles */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
          >
            {/* Context banner */}
            <View style={{
              backgroundColor: 'rgba(45,106,79,0.1)',
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Feather name="info" size={13} color="#2D6A4F" />
              <Text style={{ fontSize: 12, color: '#2D6A4F', fontWeight: '600', flex: 1 }}>
                FreshBot knows your pantry — just speak naturally
              </Text>
            </View>

            {bubbles.map(b => (
              <View key={b.id} style={{
                alignSelf: b.from === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                marginBottom: 10,
              }}>
                {b.from === 'bot' && (
                  <View style={{
                    width: 26, height: 26, borderRadius: 8,
                    backgroundColor: '#1C3A2E',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4,
                  }}>
                    <Feather name="message-circle" size={13} color="#4ADE80" />
                  </View>
                )}
                <View style={{
                  backgroundColor: b.from === 'user' ? '#1C3A2E' : '#fff',
                  borderRadius: b.from === 'user'
                    ? 18 : 18,
                  borderBottomRightRadius: b.from === 'user' ? 4 : 18,
                  borderBottomLeftRadius:  b.from === 'bot'  ? 4 : 18,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 2,
                }}>
                  <Text style={{
                    fontSize: 14, lineHeight: 21,
                    color: b.from === 'user' ? '#fff' : '#1E293B',
                  }}>{b.text}</Text>
                </View>
                <Text style={{
                  fontSize: 10, color: '#94A3B8', marginTop: 3,
                  alignSelf: b.from === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {b.from === 'user' ? 'You' : 'FreshBot'}
                </Text>
              </View>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <View style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                <View style={{
                  backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4,
                  paddingHorizontal: 16, paddingVertical: 12,
                  flexDirection: 'row', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{
                      width: 7, height: 7, borderRadius: 4,
                      backgroundColor: '#CBD5E1',
                    }} />
                  ))}
                </View>
              </View>
            )}

            {/* Quick prompts */}
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 8, marginBottom: 8 }}>
              TRY SAYING
            </Text>
            {[
              '2 litres of milk for R35, expires Friday',
              '6 eggs, expires in 5 days, in the fridge',
              'Loaf of bread for R28, 3 days left',
            ].map(prompt => (
              <TouchableOpacity key={prompt} onPress={() => setVoiceMsg(prompt)} activeOpacity={0.8}
                style={{
                  backgroundColor: '#fff', borderRadius: 14,
                  paddingHorizontal: 14, paddingVertical: 10,
                  marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0',
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                }}>
                <Feather name="corner-down-right" size={13} color="#2D6A4F" />
                <Text style={{ fontSize: 13, color: '#475569', flex: 1 }}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input bar — WhatsApp style */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end',
            paddingHorizontal: 12, paddingVertical: 10,
            paddingBottom: Platform.OS === 'ios' ? 24 : 12,
            backgroundColor: '#E2EBE1',
            borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
            gap: 8,
          }}>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'flex-end',
              backgroundColor: '#fff', borderRadius: 26,
              paddingHorizontal: 16, paddingVertical: 10,
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
            }}>
              <Feather name="message-circle" size={18} color="#94A3B8" style={{ marginRight: 8, marginBottom: 2 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: '#1E293B', maxHeight: 100, paddingVertical: 0 }}
                value={voiceMsg}
                onChangeText={setVoiceMsg}
                placeholder="Tell FreshBot what you bought…"
                placeholderTextColor="#CBD5E1"
                multiline
              />
            </View>

            {/* Mic / Send toggle — like WhatsApp */}
            <TouchableOpacity
              onPress={voiceMsg.trim() ? sendVoiceMessage : undefined}
              activeOpacity={0.85}
              style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: '#1C3A2E',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#1C3A2E', shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
              }}>
              <Feather
                name={voiceMsg.trim() ? 'send' : 'mic'}
                size={20}
                color="#4ADE80"
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#1E293B',
    marginBottom: 16, letterSpacing: 0.2,
  },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 11, color: '#94A3B8', marginBottom: 8,
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#1E293B', backgroundColor: '#FAFAFA',
  },
});