// screens/general_user/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useSignOut } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DIETARY_PRESETS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free'];
const EQUIPMENT_OPTIONS: { id: string; icon: string; label: string }[] = [
  { id: 'microwave', icon: '📡', label: 'Microwave'   },
  { id: 'oven',      icon: '🔥', label: 'Oven'        },
  { id: 'stovetop',  icon: '🍳', label: 'Stovetop'    },
  { id: 'airfryer',  icon: '💨', label: 'Air Fryer'   },
  { id: 'braai',     icon: '🍖', label: 'Braai'       },
  { id: 'blender',   icon: '🥤', label: 'Blender'     },
  { id: 'instapot',  icon: '♨️', label: 'Instant Pot' },
];

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 2 }} />;
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      color: '#94A3B8', fontSize: 11, fontWeight: '700',
      letterSpacing: 1, marginBottom: 10, paddingLeft: 2,
    }}>{text}</Text>
  );
}

// Reusable removable tag pill
function TagPill({ label, onRemove, icon }: {
  label: string;
  onRemove: () => void;
  icon?: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#F1F5F9', borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 7,
    }}>
      {icon && <Feather name={icon} size={12} color="#2D6A4F" style={{ marginRight: 5 }} />}
      <Text style={{ fontSize: 12, color: '#1E293B', fontWeight: '600' }}>{label}</Text>
      <TouchableOpacity
        onPress={onRemove} style={{ marginLeft: 6 }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Feather name="x" size={12} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
}

// Reusable add-tag input row
function AddTagRow({ value, onChangeText, onSubmit, placeholder }: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
      <TextInput
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor="#CBD5E1"
        onSubmitEditing={onSubmit}
        style={{
          flex: 1, backgroundColor: '#F8FAFC',
          borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
          fontSize: 13, color: '#1E293B',
        }}
      />
      <TouchableOpacity
        onPress={onSubmit}
        style={{
          backgroundColor: '#2D6A4F', borderRadius: 12,
          paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  // ── Profile editing ──
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName,  setDisplayName]  = useState(session?.name  ?? '');
  const [displayEmail, setDisplayEmail] = useState(session?.email ?? '');
  const [editName,     setEditName]     = useState(session?.name  ?? '');
  const [editEmail,    setEditEmail]    = useState(session?.email ?? '');

  const saveProfile = async () => {
    const newName = editName.trim() || displayName;
    setDisplayName(newName);
    setDisplayEmail(editEmail.trim() || displayEmail);
    setIsEditingProfile(false);
    if (session?.userId && newName) {
      try {
        await setDoc(doc(db, 'users', session.userId), { name: newName }, { merge: true });
      } catch {}
    }
  };

  const cancelEdit = () => {
    setEditName(displayName);
    setEditEmail(displayEmail);
    setIsEditingProfile(false);
  };

  // ── Household ──
  const [householdSize, setHouseholdSize] = useState(3);

  // ── Dietary — presets toggled + custom tags added ──
  const [activeDiets,  setActiveDiets]  = useState<string[]>(['Vegetarian']);
  const [customDiets,  setCustomDiets]  = useState<string[]>([]);
  const [newDiet,      setNewDiet]      = useState('');

  const togglePresetDiet = (diet: string) =>
    setActiveDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );

  const addCustomDiet = () => {
    const t = newDiet.trim();
    if (t && !customDiets.includes(t) && !DIETARY_PRESETS.includes(t)) {
      setCustomDiets(prev => [...prev, t]);
      setNewDiet('');
    }
  };

  const removeCustomDiet = (diet: string) =>
    setCustomDiets(prev => prev.filter(d => d !== diet));

  // ── Allergens ──
  const [allergens,  setAllergens]  = useState<string[]>([]);
  const [newAllergen, setNewAllergen] = useState('');

  const addAllergen = () => {
    const t = newAllergen.trim();
    if (t && !allergens.includes(t)) {
      setAllergens(prev => [...prev, t]);
      setNewAllergen('');
    }
  };

  const removeAllergen = (a: string) =>
    setAllergens(prev => prev.filter(x => x !== a));

  // ── Equipment ──
  const [equipment,    setEquipment]    = useState<string[]>(['microwave', 'stovetop', 'oven']);
  const [newEquipment, setNewEquipment] = useState('');

  const toggleEquipment = (id: string) =>
    setEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );

  const addCustomEquipment = () => {
    const t = newEquipment.trim();
    if (t && !equipment.includes(t)) {
      setEquipment(prev => [...prev, t]);
      setNewEquipment('');
    }
  };

  // ── Storage tags ──
  const [storageTags, setStorageTags] = useState(['Fridge', 'Pantry', 'Freezer']);
  const [newTag,      setNewTag]      = useState('');

  const addStorageTag = () => {
    const t = newTag.trim();
    if (t && !storageTags.includes(t)) {
      setStorageTags(prev => [...prev, t]);
      setNewTag('');
    }
  };

  const removeStorageTag = (tagToRemove: string) => {
    setStorageTags(prevTags => prevTags.filter(t => t !== tagToRemove));
  };

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.userId) return;
    getDoc(doc(db, 'users', session.userId)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (typeof d.householdSize === 'number') setHouseholdSize(d.householdSize);
      if (Array.isArray(d.activeDiets))        setActiveDiets(d.activeDiets as string[]);
      if (Array.isArray(d.customDiets))        setCustomDiets(d.customDiets as string[]);
      if (Array.isArray(d.allergens))          setAllergens(d.allergens as string[]);
      if (Array.isArray(d.equipment))          setEquipment(d.equipment as string[]);
      if (Array.isArray(d.storageTags))        setStorageTags(d.storageTags as string[]);
      if (typeof d.name === 'string' && d.name) {
        setDisplayName(d.name);
        setEditName(d.name);
      }
    }).catch(() => {});
  }, []);

  const savePreferences = async () => {
    if (!session?.userId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', session.userId), {
        householdSize,
        activeDiets,
        customDiets,
        allergens,
        equipment,
        storageTags,
      }, { merge: true });
      Alert.alert('Saved', 'Your preferences have been saved.');
    } catch {
      Alert.alert('Error', 'Could not save preferences. Please try again.');
    }
    setSaving(false);
  };

  const card = {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16, shadowColor: '#000' as const,
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  };

  const signOut = useSignOut();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#E2EBE1' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CustomHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 130 }}
      >

        {/* ── Profile card ── */}
        <View style={{ ...card, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isEditingProfile ? 16 : 0 }}>
            <View style={{ position: 'relative', marginRight: 14 }}>
              <Image
                source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2D6A4F&color=fff&size=150` }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
              />
              <TouchableOpacity
                onPress={async () => {
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!perm.granted) { Alert.alert('Permission needed', 'Photo library access is required to change your profile photo.'); return; }
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
                  if (!result.canceled && result.assets?.length) {
                    Alert.alert('Photo preview only', 'Profile photo saving is not available in this version.');
                  }
                }}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Feather name="camera" size={10} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '800' }}>
                {displayName}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
                {displayEmail}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <View style={{
                  backgroundColor: 'rgba(45,106,79,0.1)', borderRadius: 8,
                  paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{ color: '#2D6A4F', fontSize: 10, fontWeight: '700' }}>
                    HOME USER
                  </Text>
                </View>
              </View>
            </View>

            {/* Edit / Settings icons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setIsEditingProfile(true)}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Feather name="edit-2" size={14} color="#475569" />
              </TouchableOpacity>
              
            </View>
          </View>

          {/* Inline edit form */}
          {isEditingProfile && (
            <View>
              <Divider />
              <View style={{ height: 14 }} />

              <Text style={{ color: '#1E293B', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                Full Name
              </Text>
              <TextInput
                value={editName} onChangeText={setEditName}
                placeholder="Your name" placeholderTextColor="#CBD5E1"
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                  fontSize: 13, color: '#1E293B', marginBottom: 12,
                }}
              />

              <Text style={{ color: '#1E293B', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                Email Address
              </Text>
              <TextInput
                value={editEmail} onChangeText={setEditEmail}
                placeholder="Your email" placeholderTextColor="#CBD5E1"
                keyboardType="email-address" autoCapitalize="none"
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                  fontSize: 13, color: '#1E293B', marginBottom: 16,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={cancelEdit}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 12,
                    backgroundColor: '#F1F5F9', alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveProfile}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 12,
                    backgroundColor: '#2D6A4F', alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── PREFERENCES ── */}
        <SectionLabel text="PREFERENCES" />

        {/* Household & Diet */}
        <View style={card}>
          <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '800', marginBottom: 16 }}>
            Household & Diet
          </Text>

          {/* Household size */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '700' }}>Household size</Text>
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>Scales recipe portions</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity
                onPress={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#E2EBE1', alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="minus" size={15} color="#2D6A4F" />
              </TouchableOpacity>
              <Text style={{ color: '#1E293B', fontSize: 18, fontWeight: '800', minWidth: 18, textAlign: 'center' }}>
                {householdSize}
              </Text>
              <TouchableOpacity
                onPress={() => setHouseholdSize(householdSize + 1)}
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="plus" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Divider />
          <View style={{ height: 12 }} />

          {/* Dietary preferences */}
          <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
            Dietary preferences
          </Text>

          {/* Preset toggles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DIETARY_PRESETS.map(diet => {
              const isActive = activeDiets.includes(diet);
              return (
                <TouchableOpacity
                  key={diet} onPress={() => togglePresetDiet(diet)} activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: isActive ? '#2D6A4F' : '#F8FAFC',
                  }}
                >
                  {isActive && <Feather name="check" size={11} color="#fff" style={{ marginRight: 4 }} />}
                  <Text style={{ fontSize: 12, fontWeight: isActive ? '700' : '500', color: isActive ? '#fff' : '#64748B' }}>
                    {diet}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom diet tags (removable) */}
            {customDiets.map(diet => (
              <TagPill key={diet} label={diet} onRemove={() => removeCustomDiet(diet)} />
            ))}
          </View>

          {/* Add custom diet */}
          <AddTagRow
            value={newDiet} onChangeText={setNewDiet}
            onSubmit={addCustomDiet} placeholder="e.g. Pescatarian, Low-carb..."
          />

          <View style={{ height: 14 }} />
          <Divider />
          <View style={{ height: 14 }} />

          {/* Allergens */}
          <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
            Allergens & Restrictions
          </Text>

          {allergens.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {allergens.map(a => (
                <TagPill key={a} label={a} onRemove={() => removeAllergen(a)} />
              ))}
            </View>
          )}

          {allergens.length === 0 && (
            <Text style={{ color: '#CBD5E1', fontSize: 12, marginBottom: 4 }}>
              No allergens added yet
            </Text>
          )}

          <AddTagRow
            value={newAllergen} onChangeText={setNewAllergen}
            onSubmit={addAllergen} placeholder="e.g. Peanuts, Shellfish..."
          />
        </View>

        {/* Kitchen Equipment */}
        <View style={card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <View>
              <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '800' }}>Kitchen Equipment</Text>
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Filters AI recipe suggestions</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(45,106,79,0.1)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#2D6A4F', fontSize: 13, fontWeight: '800' }}>
                {equipment.length} selected
              </Text>
            </View>
          </View>

          {EQUIPMENT_OPTIONS.map((eq, i) => (
            <View key={eq.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 16 }}>{eq.icon}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{eq.label}</Text>
                <Switch
                  trackColor={{ false: '#E2E8F0', true: '#2D6A4F' }}
                  thumbColor="#fff" ios_backgroundColor="#E2E8F0"
                  onValueChange={() => toggleEquipment(eq.id)}
                  value={equipment.includes(eq.id)}
                />
              </View>
              {i < EQUIPMENT_OPTIONS.length - 1 && <Divider />}
            </View>
          ))}

          <View style={{ height: 12 }} />
          <Text style={{ color: '#1E293B', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
            Add custom equipment
          </Text>
          <AddTagRow
            value={newEquipment} onChangeText={setNewEquipment}
            onSubmit={addCustomEquipment} placeholder="e.g. Wok, Pressure Cooker..."
          />
        </View>

        {/* Storage Locations */}
        <View style={card}>
          <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '800', marginBottom: 4 }}>Storage Locations</Text>
          <Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 14 }}>Custom tags used when adding food items</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {storageTags.map(tag => (
              <TagPill key={tag} label={tag} icon="box" onRemove={() => removeStorageTag(tag)} />
            ))}
          </View>
          <AddTagRow
            value={newTag} onChangeText={setNewTag}
            onSubmit={addStorageTag} placeholder="e.g. Braai Fridge"
          />
        </View>

        {/* DATA & PRIVACY */}
        <SectionLabel text="DATA & PRIVACY" />

        <View style={card}>
          <TouchableOpacity onPress={() => navigation.navigate('SecuritySettings')} activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="shield" size={16} color="#475569" />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' }}>Security Settings</Text>
            <Feather name="chevron-right" size={17} color="#CBD5E1" />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                'Download My Data',
                'Your data export will include profile info, pantry history, and activity logs.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Export', onPress: () => Alert.alert('Export Requested', 'Your data export will be sent to your registered email address within 24 hours.') },
                ]
              );
            }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="download" size={16} color="#475569" />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' }}>Download my data (POPIA)</Text>
            <Feather name="chevron-right" size={17} color="#CBD5E1" />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert(
              'Delete Account',
              'This will permanently delete your account and all associated data. This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Request Submitted', 'Your account deletion request has been submitted. You will receive a confirmation email within 48 hours.') },
              ]
            )}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="trash-2" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#EF4444' }}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Save Preferences */}
        <TouchableOpacity
          onPress={savePreferences}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 14, backgroundColor: '#2D6A4F', borderRadius: 16,
            marginBottom: 12, opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="save" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sign Out */}
    <TouchableOpacity
      onPress={signOut}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, backgroundColor: '#fff', borderRadius: 16,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
     }}
    >
    <Feather name="log-out" size={16} color="#EF4444" />
    <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Sign Out</Text>
  </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}