// screens/general_user/MealPlannerScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import RecipeModal from '../../components/RecipeModal'; // Import the reusable modal
import { useAuth } from '../../context/AuthContext';
import { getUserInventory } from '../../services/inventoryService';
import { generateRecipesFromInventory, type PantryRecipeCard } from '../../services/geminiRecipeService';
import { db } from '../../firebase/firebaseConfig';

// ── Types ──────────────────────────────────────────────────────────────────
type Ingredient = { name: string; inPantry: boolean; amount?: number; unit?: string };
type MealRecipe = {
  id: string;
  title: string;
  icon: string;
  time: string;
  tag: string;
  tagColor: string;
  tagBg: string; // Added to match the unified modal props
  usesExpiring?: boolean;
  prepNote?: string;
  calories: number;
  ingredients: Ingredient[];
  steps: string[];
};

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type DayPlan = {
  [K in MealSlot]: MealRecipe | null;
};

// ── Dynamic week helpers ───────────────────────────────────────────────────────────────────────────────
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type DayKey = typeof DAY_KEYS[number];

const DAY_FULL_NAMES: Record<DayKey, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

function getMondayOfCurrentWeek(): Date {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun, 1 = Mon …
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildCurrentWeekDays(): { day: DayKey; date: string }[] {
  const monday = getMondayOfCurrentWeek();
  return DAY_KEYS.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { day, date: String(d.getDate()) };
  });
}

function getTodayDayKey(): DayKey {
  const jsDay = new Date().getDay(); // 0 = Sun, 1 = Mon …
  if (jsDay === 0) return 'Sun';
  return DAY_KEYS[jsDay - 1] ?? 'Mon';
}

// ── Mock recipe pool (AI would generate these) ─────────────────────────────
const RECIPE_POOL: Record<MealSlot, MealRecipe[]> = {
  breakfast: [
    {
      id: 'b1', title: 'French Toast', icon: '🍞', time: '15 min',
      tag: 'Uses expiring bread', tagColor: '#0D9488', tagBg: '#CCFBF1', usesExpiring: true,
      calories: 320,
      prepNote: undefined,
      ingredients: [
        { name: 'Bread', inPantry: true }, { name: 'Eggs', inPantry: true },
        { name: 'Milk', inPantry: true }, { name: 'Butter', inPantry: false },
      ],
      steps: [
        'Whisk eggs, milk and a pinch of sugar in a bowl.',
        'Dip each bread slice into the egg mixture on both sides.',
        'Melt butter in a pan over medium heat.',
        'Fry slices for 2–3 min per side until golden brown.',
        'Serve warm with syrup or fresh fruit.',
      ],
    },
    {
      id: 'b2', title: 'Green Smoothie', icon: '🥤', time: '5 min',
      tag: 'Uses expiring spinach', tagColor: '#0D9488', tagBg: '#CCFBF1', usesExpiring: true,
      calories: 180, prepNote: undefined,
      ingredients: [
        { name: 'Baby Spinach', inPantry: true }, { name: 'Apples', inPantry: true },
        { name: 'Milk', inPantry: true }, { name: 'Honey', inPantry: false },
      ],
      steps: [
        'Core and chop the apple into chunks.',
        'Add spinach, apple and milk to a blender.',
        'Add honey to taste.',
        'Blend on high for 45 seconds until smooth.',
        'Pour into a glass and serve immediately.',
      ],
    },
    {
      id: 'b3', title: 'Tomato Omelette', icon: '🍳', time: '12 min',
      tag: 'High protein', tagColor: '#16A34A', tagBg: '#DCFCE7', usesExpiring: false,
      calories: 280, prepNote: undefined,
      ingredients: [
        { name: 'Eggs', inPantry: true }, { name: 'Tomatoes', inPantry: true },
        { name: 'Cheese', inPantry: true }, { name: 'Olive oil', inPantry: false },
      ],
      steps: [
        'Dice tomatoes.',
        'Whisk eggs with salt and pepper.',
        'Heat oil in a non-stick pan.',
        'Pour in eggs, add filling, fold and cook 1 more minute.',
      ],
    },
  ],
  lunch: [
    {
      id: 'l1', title: 'Veggie Wrap', icon: '🌯', time: '10 min',
      tag: 'Quick & easy', tagColor: '#7C3AED', tagBg: '#EDE9FE', usesExpiring: false,
      calories: 350, prepNote: undefined,
      ingredients: [
        { name: 'Tortilla', inPantry: true }, { name: 'Lettuce', inPantry: true },
        { name: 'Tomatoes', inPantry: true }, { name: 'Hummus', inPantry: false },
      ],
      steps: [
        'Spread hummus on the tortilla.',
        'Layer lettuce and sliced tomatoes.',
        'Roll tightly and slice in half.',
      ],
    },
    {
      id: 'l2', title: 'Lentil Soup', icon: '🍜', time: '25 min',
      tag: 'Clears pantry items', tagColor: '#0284C7', tagBg: '#E0F2FE', usesExpiring: false,
      calories: 290, prepNote: 'Soak lentils tonight.',
      ingredients: [
        { name: 'Lentils', inPantry: true }, { name: 'Carrots', inPantry: true },
        { name: 'Onion', inPantry: false }, { name: 'Stock', inPantry: false },
      ],
      steps: [
        'Dice onion and carrots.',
        'Sauté onion until soft.',
        'Add lentils, carrots and stock.',
        'Simmer 20 min until tender. Season to taste.',
      ],
    },
    {
      id: 'l3', title: 'Egg Fried Rice', icon: '🍚', time: '20 min',
      tag: 'High protein', tagColor: '#16A34A', tagBg: '#DCFCE7', usesExpiring: false,
      calories: 400, prepNote: undefined,
      ingredients: [
        { name: 'Rice', inPantry: true }, { name: 'Eggs', inPantry: true },
        { name: 'Soy sauce', inPantry: false },
      ],
      steps: [
        'Cook rice and allow to cool completely.',
        'Scramble eggs in a hot wok and set aside.',
        'Stir-fry rice until slightly crispy.',
        'Add eggs back, drizzle soy sauce, toss to combine.',
      ],
    },
  ],
  dinner: [
    {
      id: 'd1', title: 'Vegetable Stew', icon: '🍲', time: '30 min',
      tag: 'Clears 4 items', tagColor: '#0284C7', tagBg: '#E0F2FE', usesExpiring: true,
      calories: 240, prepNote: 'Defrost the stock tonight.',
      ingredients: [
        { name: 'Tomatoes', inPantry: true }, { name: 'Carrots', inPantry: true },
        { name: 'Baby Spinach', inPantry: true }, { name: 'Onion', inPantry: false },
        { name: 'Stock', inPantry: false },
      ],
      steps: [
        'Dice onion, carrots and tomatoes.',
        'Sauté onion in a pot with oil until soft.',
        'Add carrots and tomatoes, cook 5 min.',
        'Pour in stock and simmer 15 min.',
        'Stir in spinach and cook 2 more minutes. Season to taste.',
      ],
    },
    {
      id: 'd2', title: 'Pasta Primavera', icon: '🍝', time: '25 min',
      tag: 'Family favourite', tagColor: '#7C3AED', tagBg: '#EDE9FE', usesExpiring: false,
      calories: 420, prepNote: undefined,
      ingredients: [
        { name: 'Pasta', inPantry: true }, { name: 'Baby Spinach', inPantry: true },
        { name: 'Olive oil', inPantry: false }, { name: 'Parmesan', inPantry: false },
      ],
      steps: [
        'Boil pasta until al dente.',
        'Sauté spinach in olive oil.',
        'Toss pasta with spinach and a splash of pasta water.',
        'Finish with parmesan.',
      ],
    },
    {
      id: 'd3', title: 'Bean Tacos', icon: '🌮', time: '20 min',
      tag: 'Budget friendly', tagColor: '#16A34A', tagBg: '#DCFCE7', usesExpiring: false,
      calories: 380, prepNote: undefined,
      ingredients: [
        { name: 'Taco shells', inPantry: true }, { name: 'Beans', inPantry: true },
        { name: 'Cheese', inPantry: true }, { name: 'Salsa', inPantry: false },
      ],
      steps: [
        'Warm beans in a pan with cumin and chilli.',
        'Heat taco shells.',
        'Fill shells with beans, cheese and salsa.',
      ],
    },
  ],
  snack: [
    {
      id: 's1', title: 'Apple & Peanut Butter', icon: '🍎', time: '2 min',
      tag: 'Quick snack', tagColor: '#F97316', tagBg: '#FFEDD5', usesExpiring: true,
      calories: 160, prepNote: undefined,
      ingredients: [
        { name: 'Apples', inPantry: true }, { name: 'Peanut butter', inPantry: false },
      ],
      steps: ['Slice apple.', 'Serve with peanut butter for dipping.'],
    },
    {
      id: 's2', title: 'Yoghurt & Honey', icon: '🥛', time: '2 min',
      tag: 'High protein', tagColor: '#16A34A', tagBg: '#DCFCE7', usesExpiring: false,
      calories: 120, prepNote: undefined,
      ingredients: [
        { name: 'Yoghurt', inPantry: true }, { name: 'Honey', inPantry: false },
      ],
      steps: ['Spoon yoghurt into a bowl.', 'Drizzle honey on top.'],
    },
    {
      id: 's3', title: 'Boiled Eggs', icon: '🥚', time: '8 min',
      tag: 'High protein', tagColor: '#16A34A', tagBg: '#DCFCE7', usesExpiring: false,
      calories: 140, prepNote: undefined,
      ingredients: [{ name: 'Eggs', inPantry: true }],
      steps: ['Bring water to a boil.', 'Add eggs and cook 7 min.', 'Cool in cold water and peel.'],
    },
  ],
};

// ── Build the weekly plan (keyed by day-of-week string) ──────────────────────────────────
const buildInitialPlan = (): Record<string, DayPlan> => {
  const plan: Record<string, DayPlan> = {};
  DAY_KEYS.forEach((day, i) => {
    plan[day] = {
      breakfast: RECIPE_POOL.breakfast[i % RECIPE_POOL.breakfast.length],
      lunch: i % 3 === 1 ? null : RECIPE_POOL.lunch[i % RECIPE_POOL.lunch.length],
      dinner: RECIPE_POOL.dinner[i % RECIPE_POOL.dinner.length],
      snack: i % 2 === 0 ? RECIPE_POOL.snack[i % RECIPE_POOL.snack.length] : null,
    };
  });
  return plan;
};

// ── Calendar data — computed dynamically from current week ────────────────────────────
// WEEK_DAYS and DAY_NAMES are no longer static constants.
// Use buildCurrentWeekDays() inside the component (memoized) and DAY_FULL_NAMES.

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks',
};

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// ── Missing ingredients ────────────────────────────────────────────────────
function getMissingForDay(plan: DayPlan): string[] {
  const missing: string[] = [];
  MEAL_SLOTS.forEach(slot => {
    const recipe = plan[slot];
    if (!recipe) return;
    recipe.ingredients.forEach(ing => {
      if (!ing.inPantry && !missing.includes(ing.name)) missing.push(ing.name);
    });
  });
  return missing;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MealPlannerScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  // Compute current week dates once on mount (Mon–Sun)
  const weekDays = useMemo(() => buildCurrentWeekDays(), []);

  const [activeDate, setActiveDate] = useState<string>(() => getTodayDayKey());
  const [weekPlan, setWeekPlan] = useState<Record<string, DayPlan>>(buildInitialPlan);
  const [planLoading, setPlanLoading] = useState(false);

  // Modal State
  const [detailRecipe, setDetailRecipe] = useState<MealRecipe | null>(null);

  // AI auto-fill
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  // ── Firestore plan persistence ───────────────────────────────────────────────────
  const savePlan = useCallback(async (plan: Record<string, DayPlan>) => {
    if (!session?.userId) return;
    try {
      // JSON round-trip converts undefined → null so Firestore never sees undefined
      const sanitized = JSON.parse(JSON.stringify(plan)) as Record<string, unknown>;
      await setDoc(doc(db, 'mealPlans', session.userId), { plan: sanitized }, { merge: true });
    } catch {
      // Non-blocking — silent on save failure
    }
  }, [session?.userId]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.userId) return;
      setPlanLoading(true);
      getDoc(doc(db, 'mealPlans', session.userId))
        .then((snap) => {
          if (snap.exists()) {
            const saved = snap.data()?.plan as Record<string, DayPlan> | undefined;
            if (saved && typeof saved === 'object') {
              // Merge over initial plan to guarantee all 7 day keys are present
              setWeekPlan({ ...buildInitialPlan(), ...saved });
            }
          }
        })
        .catch(() => {})
        .finally(() => setPlanLoading(false));
    }, [session?.userId]),
  );

  const handleAutoFill = useCallback(async () => {
    if (!session?.userId) {
      Alert.alert('Sign in required', 'Please sign in to use AI auto-fill.');
      return;
    }
    setAutoFillLoading(true);
    try {
      const inv = await getUserInventory(session.userId);
      const active = inv.filter((i) => i.status === 'active');
      if (active.length === 0) {
        Alert.alert('Pantry empty', 'Add ingredients with Quick Add before using AI auto-fill.');
        return;
      }
      const generated = await generateRecipesFromInventory(active, { recipeCount: 4 });
      const asMeal = (r: PantryRecipeCard): MealRecipe => ({
        id: r.id,
        title: r.title,
        icon: r.icon,
        time: r.time,
        tag: r.tag,
        tagColor: r.tagColor,
        tagBg: r.tagBg,
        calories: r.calories,
        steps: r.steps,
        ingredients: r.ingredients,
        usesExpiring: false,
        prepNote: undefined,
      });
      const [bf, lu, di, sn] = generated;
      const newPlan: Record<string, DayPlan> = {};
      weekDays.forEach(({ day }) => {
        newPlan[day] = {
          breakfast: bf ? asMeal(bf) : RECIPE_POOL.breakfast[0],
          lunch:     lu ? asMeal(lu) : RECIPE_POOL.lunch[0],
          dinner:    di ? asMeal(di) : RECIPE_POOL.dinner[0],
          snack:     sn ? asMeal(sn) : RECIPE_POOL.snack[0],
        };
      });
      setWeekPlan(newPlan);
      await savePlan(newPlan);
      Alert.alert('Done! 🤖', 'Your week has been filled with AI-suggested recipes from your pantry. Tap any meal to swap.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Auto-fill failed', msg);
    } finally {
      setAutoFillLoading(false);
    }
  }, [session?.userId, weekDays, savePlan]);

  // Cycle to next recipe in pool when tapped (swap)
  const cycleRecipe = (slot: MealSlot) => {
    const pool = RECIPE_POOL[slot];
    const current = weekPlan[activeDate]?.[slot];
    const currentIdx = current ? pool.findIndex(r => r.id === current.id) : -1;
    const next = pool[(currentIdx + 1) % pool.length];
    const newPlan = {
      ...weekPlan,
      [activeDate]: { ...weekPlan[activeDate], [slot]: next },
    };
    setWeekPlan(newPlan);
    savePlan(newPlan).catch(() => {});
  };

  const addSlot = (slot: MealSlot) => {
    const pool = RECIPE_POOL[slot];
    const newPlan = {
      ...weekPlan,
      [activeDate]: { ...weekPlan[activeDate], [slot]: pool[0] },
    };
    setWeekPlan(newPlan);
    savePlan(newPlan).catch(() => {});
  };

  const currentPlan: DayPlan = weekPlan[activeDate] ?? {
    breakfast: null, lunch: null, dinner: null, snack: null,
  };
  const missingIngredients = getMissingForDay(currentPlan);

  const handleShare = async () => {
    const lines = MEAL_SLOTS.map(slot => {
      const r = currentPlan[slot];
      return `${SLOT_LABELS[slot]}: ${r ? r.title : '—'}`;
    });
    await Share.share({
      message: `FreshLoop — ${DAY_FULL_NAMES[activeDate as DayKey] ?? activeDate}'s Meal Plan\n\n${lines.join('\n')}`,
    });
  };

  const prepNotes = MEAL_SLOTS.flatMap(slot => {
    const r = currentPlan[slot];
    return r?.prepNote ? [`${SLOT_LABELS[slot]}: ${r.prepNote}`] : [];
  });

  return (
    <View style={s.root}>
      <CustomHeader />
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        stickyHeaderIndices={[0]}
      >
        {/* ── Sticky top block ── */}
        <View style={s.stickyTop}>
          <View style={s.titleRow}>
            <View>
              <Text style={s.screenTitle}>Meal Planner 🗓️</Text>
              <Text style={s.screenSub}>Tap to swap · Hold to view recipe</Text>
            </View>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.8} style={s.shareBtn}>
              <Feather name="share-2" size={15} color="#2D6A4F" />
              <Text style={s.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.calendarScroll}
          >
            {weekDays.map(item => {
              const isActive = activeDate === item.day;
              const dayPlan = weekPlan[item.day] ?? { breakfast: null, lunch: null, dinner: null, snack: null };
              const hasPrepNote = MEAL_SLOTS.some(sl => !!dayPlan[sl]?.prepNote);
              return (
                <TouchableOpacity
                  key={item.day}
                  style={[s.dayCard, isActive && s.dayCardActive]}
                  onPress={() => setActiveDate(item.day)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.dayText, isActive && s.dayTextActive]}>{item.day}</Text>
                  <Text style={[s.dateText, isActive && s.dateTextActive]}>{item.date}</Text>
                  {hasPrepNote && (
                    <View style={[s.prepDot, isActive && { backgroundColor: '#F97316' }]} />
                  )}
                  {!hasPrepNote && isActive && <View style={s.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── AI auto-fill banner ── */}
        <TouchableOpacity style={s.aiBanner} activeOpacity={0.8} onPress={handleAutoFill} disabled={autoFillLoading}>
          <View style={s.aiIconBox}>
            {autoFillLoading
              ? <ActivityIndicator size="small" color="#B45309" />
              : <Text style={{ fontSize: 18 }}>🤖</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiBannerTitle}>Auto-fill entire week with AI</Text>
            <Text style={s.aiBannerSub}>
              {autoFillLoading
                ? 'Generating your weekly meal plan…'
                : 'Prioritises your expiring items · Builds around your pantry'}
            </Text>
          </View>
          {!autoFillLoading && <Feather name="chevron-right" size={18} color="#F59E0B" />}
        </TouchableOpacity>

        {/* ── Dynamic auto shopping list (Screen 4) ── */}
        <TouchableOpacity
          style={s.shopListBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ShoppingList')}
        >
          <View style={s.shopListIcon}>
            <Feather name="shopping-bag" size={16} color="#166534" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.shopListTitle}>Auto shopping list</Text>
            <Text style={s.shopListSub}>Replenish items used, wasted, or out of stock</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#64748B" />
        </TouchableOpacity>

        {/* ── Day heading ── */}
        <View style={s.dayHeading}>
          <Text style={s.dayHeadingText}>{DAY_FULL_NAMES[activeDate as DayKey] ?? activeDate}'s Plan</Text>
          {missingIngredients.length > 0 && (
            <View style={s.missingBadge}>
              <Feather name="shopping-cart" size={11} color="#0284C7" />
              <Text style={s.missingBadgeText}>{missingIngredients.length} to buy</Text>
            </View>
          )}
        </View>

        {/* ── Prep-ahead reminder banner ── */}
        {prepNotes.length > 0 && (
          <View style={s.prepBanner}>
            <View style={s.prepBannerIcon}>
              <Feather name="bell" size={14} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.prepBannerTitle}>Prep reminder for tonight</Text>
              {prepNotes.map((note, i) => (
                <Text key={i} style={s.prepBannerNote}>· {note}</Text>
              ))}
            </View>
          </View>
        )}

        {/* ── Meal slots ── */}
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {MEAL_SLOTS.map(slot => {
            const recipe = currentPlan[slot];
            return (
              <View key={slot}>
                <Text style={s.slotLabel}>{SLOT_LABELS[slot].toUpperCase()}</Text>
                {recipe ? (
                  // ── Filled slot ──
                  <TouchableOpacity
                    onPress={() => cycleRecipe(slot)}
                    onLongPress={() => setDetailRecipe(recipe)}
                    delayLongPress={350}
                    activeOpacity={0.75}
                    style={s.filledCard}
                  >
                    <View style={[s.recipeIconBox, { backgroundColor: recipe.tagBg || '#F0FDF4' }]}>
                      <Text style={{ fontSize: 26 }}>{recipe.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recipeTitle}>{recipe.title}</Text>
                      <View style={s.recipeMeta}>
                        <Feather name="clock" size={11} color="#94A3B8" />
                        <Text style={s.metaText}>{recipe.time}</Text>
                        <Text style={s.metaDot}>·</Text>
                        <Text style={s.metaText}>{recipe.calories} kcal</Text>
                        {recipe.usesExpiring && (
                          <>
                            <Text style={s.metaDot}>·</Text>
                            <View style={s.expiringBadge}>
                              <Text style={s.expiringText}>⚡ expiring</Text>
                            </View>
                          </>
                        )}
                      </View>
                      <View style={[s.tagPill, { backgroundColor: recipe.tagBg || '#F0FDF4' }]}>
                        <Text style={[s.tagPillText, { color: recipe.tagColor }]}>{recipe.tag}</Text>
                      </View>
                    </View>
                    <View style={s.swapHint}>
                      <Feather name="refresh-cw" size={14} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  // ── Empty slot ──
                  <TouchableOpacity
                    onPress={() => addSlot(slot)}
                    activeOpacity={0.7}
                    style={s.emptyCard}
                  >
                    <View style={s.emptyIconBox}>
                      <Feather name="plus" size={18} color="#10B981" />
                    </View>
                    <Text style={s.emptyText}>Add {SLOT_LABELS[slot].toLowerCase()}</Text>
                    <Feather name="chevron-right" size={14} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Missing ingredients list ── */}
        {missingIngredients.length > 0 && (
          <View style={s.missingSection}>
            <View style={s.missingSectionHeader}>
              <Feather name="shopping-cart" size={14} color="#0284C7" />
              <Text style={s.missingSectionTitle}>Missing ingredients for today</Text>
            </View>
            <View style={s.missingGrid}>
              {missingIngredients.map(item => (
                <View key={item} style={s.missingChip}>
                  <Text style={s.missingChipText}>{item}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.shareListBtn} activeOpacity={0.8} onPress={handleShare}>
              <Feather name="share-2" size={14} color="#0284C7" />
              <Text style={s.shareListText}>Share shopping list</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ── REUSABLE RECIPE MODAL ── */}
      <RecipeModal 
        visible={!!detailRecipe} 
        recipe={detailRecipe} 
        onClose={() => setDetailRecipe(null)} 
        householdSize={2} // Assuming standard 2 people per your earlier mock
      />

    </View>
  );
}

// ── Stripped-down Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E2EBE1' },

  // Sticky top
  stickyTop: { backgroundColor: '#E2EBE1', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  screenSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#2D6A4F' },

  // Calendar
  calendarScroll: { gap: 8, paddingRight: 4 },
  dayCard: { width: 52, height: 68, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dayCardActive: { backgroundColor: '#1C3A2E', borderColor: '#1C3A2E', shadowColor: '#1C3A2E', shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  dayText: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 4 },
  dayTextActive: { color: 'rgba(255,255,255,0.7)' },
  dateText: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  dateTextActive: { color: '#fff' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4ADE80', marginTop: 4 },
  prepDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F97316', marginTop: 4 },

  // AI banner
  aiBanner: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIconBox: { width: 40, height: 40, backgroundColor: '#FDE68A', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aiBannerTitle: { fontSize: 14, fontWeight: '800', color: '#B45309', marginBottom: 2 },
  aiBannerSub: { fontSize: 12, color: '#D97706' },

  shopListBanner: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  shopListIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopListTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  shopListSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Day heading
  dayHeading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  dayHeadingText: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1E293B' },
  missingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  missingBadgeText: { fontSize: 12, fontWeight: '700', color: '#0284C7' },

  // Prep reminder
  prepBanner: { marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFF7ED', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#FED7AA' },
  prepBannerIcon: { width: 28, height: 28, backgroundColor: '#FEF3C7', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  prepBannerTitle: { fontSize: 13, fontWeight: '800', color: '#C2410C', marginBottom: 4 },
  prepBannerNote: { fontSize: 12, color: '#EA580C', lineHeight: 18 },

  // Slot label
  slotLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 8 },

  // Filled meal card
  filledCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  recipeIconBox: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  recipeTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  metaText: { fontSize: 12, color: '#64748B' },
  metaDot: { color: '#E2E8F0', fontWeight: '800', fontSize: 12 },
  expiringBadge: { backgroundColor: '#CCFBF1', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  expiringText: { fontSize: 10, fontWeight: '700', color: '#0D9488' },
  tagPill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagPillText: { fontSize: 10, fontWeight: '700' },
  swapHint: { width: 32, height: 32, backgroundColor: '#F8FAFC', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },

  // Empty meal card
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyIconBox: { width: 40, height: 40, backgroundColor: '#ECFDF5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#94A3B8' },

  // Missing ingredients
  missingSection: { marginHorizontal: 20, marginTop: 24, backgroundColor: '#EFF6FF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  missingSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  missingSectionTitle: { fontSize: 13, fontWeight: '800', color: '#0284C7' },
  missingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  missingChip: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  missingChipText: { fontSize: 13, fontWeight: '600', color: '#1E40AF' },
  shareListBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  shareListText: { fontSize: 13, fontWeight: '700', color: '#0284C7' },
});