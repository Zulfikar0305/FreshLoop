// components/RecipeModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
  StyleSheet,
  Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const UNITS = ['g', 'ml', 'pcs', 'slices', 'tbsp', 'tsp', 'cups', 'oz'];

type RecipeModalProps = {
  visible: boolean;
  recipe: any; // Using 'any' to accept both AIRecipe and MealPlanner recipe types seamlessly
  onClose: () => void;
  householdSize?: number;
};

export default function RecipeModal({ visible, recipe, onClose, householdSize = 2 }: RecipeModalProps) {
  // Internal State managed purely by the modal
  const [servings, setServings] = useState(householdSize);
  const [removed, setRemoved] = useState<string[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('g');

  // Reset state every time a new recipe is opened
  useEffect(() => {
    if (recipe) {
      setServings(householdSize);
      setRemoved([]);
      setExtras([]);
      setShowManualForm(false);
      setNewName('');
      setNewAmount('');
      setNewUnit('g');
    }
  }, [recipe]);

  if (!recipe) return null;

  const scaled = (amount?: number) => {
    if (!amount) return ''; // Handles MealPlanner data which lacks amounts
    return parseFloat(((amount / householdSize) * servings).toFixed(1));
  };

  const toggleRemove = (name: string) =>
    setRemoved((r) => (r.includes(name) ? r.filter((x) => x !== name) : [...r, name]));

  const addQuickIngredient = (ing: any) => {
    if (extras.find((e) => e.name === ing.name)) return;
    setExtras((e) => [...e, { ...ing, custom: true }]);
  };

  const addManualIngredient = () => {
    const amt = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amt) || amt <= 0) return;
    setExtras((e) => [...e, { name: newName.trim(), amount: amt, unit: newUnit, inPantry: false, custom: true }]);
    setNewName('');
    setNewAmount('');
    setNewUnit('g');
    setShowManualForm(false);
  };

  const handleShare = async () => {
    await Share.share({
      message: `FreshLoop Recipe: ${recipe.title}\n\nTime: ${recipe.time}\nDifficulty: ${recipe.difficulty || 'Easy'}\n\nSteps:\n${recipe.steps.join('\n')}`,
    });
  };

  // Filter out original ingredients if they have been added to the extras list
  const allIngredients = [
    ...recipe.ingredients.filter((i: any) => !extras.some((e) => e.name === i.name)),
    ...extras
  ];
  const suggestedToBuy = recipe.ingredients.filter(
    (i: any) => !i.inPantry && !extras.find((e) => e.name === i.name) && !removed.includes(i.name)
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, { backgroundColor: recipe.tagBg || '#F0FDF4' }]}>
              <Text style={{ fontSize: 28 }}>{recipe.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{recipe.title}</Text>
              <View style={styles.metaRow}>
                <Feather name="clock" size={11} color="#94A3B8" />
                <Text style={styles.metaText}>{recipe.time}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{recipe.difficulty || 'Easy'}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{recipe.calories} kcal/serving</Text>
              </View>
              {recipe.tag && (
                <View style={[styles.tagPill, { backgroundColor: recipe.tagBg || '#F0FDF4' }]}>
                  <Text style={[styles.tagPillText, { color: recipe.tagColor || '#0D9488' }]}>{recipe.tag}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Servings */}
          <View style={styles.servingsBox}>
            <View>
              <Text style={styles.servingsLabel}>Serving size</Text>
              <Text style={styles.servingsSub}>Household default: {householdSize} people</Text>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity onPress={() => setServings((sv) => Math.max(1, sv - 1))} style={styles.servBtn}>
                <Feather name="minus" size={16} color="#16A34A" />
              </TouchableOpacity>
              <Text style={styles.counterText}>{servings}</Text>
              <TouchableOpacity onPress={() => setServings((sv) => Math.min(20, sv + 1))} style={[styles.servBtn, styles.servBtnPlus]}>
                <Feather name="plus" size={16} color="#4ADE80" />
              </TouchableOpacity>
            </View>
          </View>
          {servings !== householdSize && (
            <Text style={styles.scaledNotice}>↑ Scaled for {servings} {servings === 1 ? 'person' : 'people'}</Text>
          )}

          {/* Ingredients */}
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <Text style={styles.helperText}>Tap an ingredient to remove it from the recipe</Text>
          
          <View style={styles.ingredientsList}>
            {allIngredients.map((ing) => {
              const isRemoved = removed.includes(ing.name);
              const dotColor = isRemoved ? '#EF4444' : ing.custom ? '#F97316' : ing.inPantry ? '#22C55E' : '#CBD5E1';
              const bg = isRemoved ? '#FEF2F2' : ing.inPantry ? '#F0FDF4' : '#F8FAFC';
              const border = isRemoved ? '#FECACA' : ing.inPantry ? '#BBF7D0' : '#E2E8F0';
              
              return (
                <TouchableOpacity
                  key={ing.name}
                  onPress={() => toggleRemove(ing.name)}
                  activeOpacity={0.75}
                  style={[styles.ingRow, { backgroundColor: bg, borderColor: border, opacity: isRemoved ? 0.6 : 1 }]}
                >
                  <View style={[styles.dot8, { backgroundColor: dotColor }]} />
                  <Text style={[styles.ingName, isRemoved && styles.removedText]}>{ing.name}</Text>
                  
                  {/* Only show amount if it exists in the data */}
                  {!!ing.amount && (
                    <Text style={[styles.ingAmt, isRemoved && { color: '#EF4444' }]}>
                      {scaled(ing.amount)} {ing.unit}
                    </Text>
                  )}
                  
                  {!ing.inPantry && !ing.custom && !isRemoved && (
                    <View style={styles.buyBadge}><Text style={styles.buyText}>BUY</Text></View>
                  )}
                  {ing.custom && !isRemoved && (
                    <View style={[styles.buyBadge, { backgroundColor: '#FFF7ED' }]}>
                      <Text style={[styles.buyText, { color: '#F97316' }]}>ADDED</Text>
                    </View>
                  )}
                  {ing.custom ? (
                    <TouchableOpacity onPress={() => setExtras((e) => e.filter((x) => x.name !== ing.name))} style={{ marginLeft: 6 }}>
                      <Feather name="trash-2" size={13} color="#CBD5E1" />
                    </TouchableOpacity>
                  ) : isRemoved && <Feather name="x-circle" size={14} color="#EF4444" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Add Custom Ingredients Section */}
          <View style={styles.addSection}>
            <View style={styles.addSectionHeader}>
              <View style={styles.addIconWrap}>
                <Feather name="shopping-bag" size={13} color="#4ADE80" />
              </View>
              <Text style={styles.addSectionTitle}>Add ingredients</Text>
              {extras.length > 0 && (
                <View style={styles.extrasBadge}>
                  <Text style={styles.extrasBadgeText}>{extras.length} added</Text>
                </View>
              )}
            </View>

            {suggestedToBuy.length > 0 && (
              <View style={styles.suggestedBlock}>
                <Text style={styles.suggestedLabel}>
                  <Feather name="alert-circle" size={10} color="#F97316" /> SUGGESTED — needed for this recipe
                </Text>
                <View style={styles.chipRow}>
                  {suggestedToBuy.map((ing: any) => (
                    <TouchableOpacity key={ing.name} onPress={() => addQuickIngredient(ing)} style={styles.suggestedChip}>
                      <Feather name="plus" size={12} color="#F97316" />
                      <Text style={styles.suggestedChipText}>{ing.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {!showManualForm ? (
              <TouchableOpacity onPress={() => setShowManualForm(true)} style={styles.manualAddBtn}>
                <Feather name="plus-circle" size={15} color="#2D6A4F" />
                <Text style={styles.manualAddBtnText}>Add a custom ingredient</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.manualForm}>
                <Text style={styles.formLabel}>INGREDIENT NAME</Text>
                <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Garlic" style={styles.input} autoFocus />
                
                <Text style={[styles.formLabel, { marginTop: 10 }]}>AMOUNT & UNIT</Text>
                <View style={styles.inputRow}>
                  <TextInput value={newAmount} onChangeText={setNewAmount} placeholder="0" keyboardType="decimal-pad" style={[styles.input, { width: 80 }]} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {UNITS.map((u) => (
                      <TouchableOpacity key={u} onPress={() => setNewUnit(u)} style={[styles.unitChip, newUnit === u && styles.unitChipActive]}>
                        <Text style={[styles.unitChipText, newUnit === u && styles.unitChipTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity onPress={() => setShowManualForm(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={addManualIngredient} style={[styles.confirmBtn, !(newName.trim() && newAmount) && { opacity: 0.4 }]}>
                    <Feather name="plus" size={15} color="#4ADE80" />
                    <Text style={styles.confirmText}>Add to recipe</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {[
              ['#22C55E', 'In pantry'],
              ['#CBD5E1', 'Need to buy'],
              ['#F97316', 'Added'],
              ['#EF4444', 'Removed'],
            ].map(([color, label]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.dot8, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>How to make it</Text>
          <View style={styles.stepsList}>
            {recipe.steps.map((step: string, i: number) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity activeOpacity={0.85} style={styles.cookBtn}>
            <Feather name="check-circle" size={18} color="#4ADE80" />
            <Text style={styles.cookBtnText}>Cook this — mark ingredients used</Text>
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryBtn}>
              <Feather name="bookmark" size={15} color="#1C3A2E" />
              <Text style={styles.secondaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
              <Feather name="share-2" size={15} color="#1C3A2E" />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12 },
  scrollContent: { padding: 20, paddingBottom: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', letterSpacing: -0.4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  dot: { color: '#E2E8F0', fontWeight: '800' },
  tagPill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  tagPillText: { fontSize: 10, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  servingsBox: { backgroundColor: '#F0FDF4', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servingsLabel: { fontSize: 13, fontWeight: '800', color: '#15803D' },
  servingsSub: { fontSize: 11, color: '#16A34A', marginTop: 2, opacity: 0.8 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  servBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center' },
  servBtnPlus: { backgroundColor: '#1C3A2E', borderColor: '#1C3A2E' },
  counterText: { fontSize: 20, fontWeight: '800', color: '#15803D', minWidth: 28, textAlign: 'center' },
  scaledNotice: { fontSize: 11, color: '#16A34A', fontWeight: '600', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B', letterSpacing: 0.2, marginBottom: 6 },
  helperText: { fontSize: 11, color: '#94A3B8', marginBottom: 12, fontWeight: '600' },
  ingredientsList: { gap: 8, marginBottom: 20 },
  ingRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1 },
  dot8: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  ingName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  removedText: { color: '#EF4444', textDecorationLine: 'line-through' },
  ingAmt: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  buyBadge: { marginLeft: 8, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#FFF7ED' },
  buyText: { fontSize: 9, fontWeight: '700', color: '#F97316' },
  addSection: { borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FAFAFA', overflow: 'hidden', marginBottom: 20 },
  addSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  addIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#1C3A2E', alignItems: 'center', justifyContent: 'center' },
  addSectionTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: '#1E293B' },
  extrasBadge: { backgroundColor: '#CCFBF1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  extrasBadgeText: { fontSize: 11, fontWeight: '700', color: '#0D9488' },
  suggestedBlock: { paddingHorizontal: 16, paddingTop: 14 },
  suggestedLabel: { fontSize: 10, fontWeight: '700', color: '#F97316', letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  suggestedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF7ED', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#FED7AA' },
  suggestedChipText: { fontSize: 13, fontWeight: '700', color: '#C2410C' },
  manualAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#2D6A4F', borderStyle: 'dashed' },
  manualAddBtnText: { fontSize: 14, fontWeight: '700', color: '#2D6A4F' },
  manualForm: { padding: 16 },
  formLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1E293B' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  unitChipActive: { backgroundColor: '#1C3A2E', borderColor: '#1C3A2E' },
  unitChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  unitChipTextActive: { color: '#4ADE80' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  confirmBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1C3A2E' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  stepsList: { gap: 12, marginBottom: 28 },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#1C3A2E', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText: { color: '#4ADE80', fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 22 },
  cookBtn: { backgroundColor: '#1C3A2E', borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginBottom: 10, shadowColor: '#1C3A2E', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  cookBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  secondaryActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  secondaryBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
});