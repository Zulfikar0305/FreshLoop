// screens/general_user/AIRecipeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getDoc, doc } from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import RecipeModal from '../../components/RecipeModal';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { getUserInventory, type InventoryItem } from '../../services/inventoryService';
import {
  generateRecipesFromInventory,
  type PantryRecipeCard,
} from '../../services/geminiRecipeService';

type Recipe = PantryRecipeCard;

type ProfilePrefs = {
  householdSize: number;
  diets: string[];
  allergens: string[];
};

const DEFAULT_PREFS: ProfilePrefs = { householdSize: 2, diets: [], allergens: [] };

export default function AIRecipeScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<'suggestions' | 'archive'>('suggestions');
  const [selected, setSelected] = useState<Recipe | null>(null);

  const [pantryItems, setPantryItems] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingPantry, setLoadingPantry] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prefs, setPrefs] = useState<ProfilePrefs>(DEFAULT_PREFS);

  const loadPantry = useCallback(async () => {
    if (!session?.userId) {
      setPantryItems([]);
      setLoadingPantry(false);
      setRefreshing(false);
      return;
    }
    try {
      const [inv, snap] = await Promise.all([
        getUserInventory(session.userId),
        getDoc(doc(db, 'users', session.userId)),
      ]);
      setPantryItems(inv.filter((i) => i.status === 'active'));
      if (snap.exists()) {
        const d = snap.data();
        const allDiets = [
          ...(Array.isArray(d.activeDiets) ? (d.activeDiets as string[]) : []),
          ...(Array.isArray(d.customDiets) ? (d.customDiets as string[]) : []),
        ];
        setPrefs({
          householdSize: typeof d.householdSize === 'number' && d.householdSize > 0 ? d.householdSize : 2,
          diets: allDiets,
          allergens: Array.isArray(d.allergens) ? (d.allergens as string[]) : [],
        });
      }
    } catch {
      setPantryItems([]);
    } finally {
      setLoadingPantry(false);
      setRefreshing(false);
    }
  }, [session?.userId]);

  useFocusEffect(
    useCallback(() => {
      setLoadingPantry(true);
      loadPantry();
    }, [loadPantry])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPantry();
  };

  const [offlineFallback, setOfflineFallback] = useState(false);

  const activeCount = pantryItems.length;

  /** Returns true when the error looks like a Gemini quota/rate-limit failure. */
  function isQuotaError(e: unknown): boolean {
    const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
    return m.includes('quota') || m.includes('429') || m.includes('resource_exhausted') || m.includes('rate limit');
  }

  /** Builds offline recipe cards using the actual pantry items (no generic fallback). */
  function buildOfflineRecipes(items: InventoryItem[]): Recipe[] {
    const cap = (s: string) =>
      s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const firstProtein = items.find(i => /mince|chicken|beef|fish|pork|lamb|tuna|sausage|bacon|prawn|egg/i.test(i.name));
    const firstCarb    = items.find(i => /pasta|rice|bread|noodle|potato|flour|oat/i.test(i.name));
    const veggies      = items.filter(i => /tomato|onion|spinach|pepper|carrot|mushroom|broccoli|cucumber|garlic|leek/i.test(i.name));
    const firstVeggie  = veggies.length > 0 ? veggies[0] : undefined;
    const secondVeggie = veggies.length > 1 ? veggies[1] : undefined;
    const firstCheese  = items.find(i => /cheese|gouda|cheddar|feta|mozzarella|brie/i.test(i.name));
    const results: Recipe[] = [];

    // Recipe 1: protein + carb (+ optional cheese bake)
    if (firstProtein && firstCarb) {
      const title = firstCheese
        ? `${cap(firstCheese.name)} ${cap(firstProtein.name)} ${cap(firstCarb.name)} Bake`
        : `${cap(firstProtein.name)} ${cap(firstCarb.name)}`;
      results.push({
        id: 'offline-1', title, time: '25 min', difficulty: 'Easy',
        tag: 'Offline suggestion', tagColor: '#0D9488', tagBg: '#CCFBF1', icon: '🍝',
        calories: 440,
        steps: [
          `Cook the ${firstCarb.name} until tender.`,
          `Brown the ${firstProtein.name} in a pan over medium-high heat until cooked through.`,
          ...(firstVeggie ? [`Add ${firstVeggie.name} and cook for 3 minutes.`] : []),
          firstCheese
            ? `Combine with ${firstCarb.name}, top with ${firstCheese.name}, and bake at 180 °C for 10 minutes.`
            : `Toss the ${firstProtein.name} with the ${firstCarb.name}. Season and serve.`,
        ],
        ingredients: [
          { name: firstProtein.name, inPantry: true },
          { name: firstCarb.name,    inPantry: true },
          ...(firstCheese  ? [{ name: firstCheese.name,  inPantry: true }] : []),
          ...(firstVeggie  ? [{ name: firstVeggie.name,  inPantry: true }] : []),
          { name: 'Salt & pepper', inPantry: false },
        ],
      });
    }

    // Recipe 2: veggie + carb sauce
    if (firstVeggie && firstCarb) {
      const title = secondVeggie
        ? `${cap(firstVeggie.name)} & ${cap(secondVeggie.name)} ${cap(firstCarb.name)}`
        : `${cap(firstVeggie.name)} ${cap(firstCarb.name)}`;
      results.push({
        id: 'offline-2', title, time: '20 min', difficulty: 'Easy',
        tag: 'Offline suggestion', tagColor: '#0D9488', tagBg: '#CCFBF1', icon: '🍲',
        calories: 310,
        steps: [
          `Cook the ${firstCarb.name} until tender and set aside.`,
          `Dice the ${firstVeggie.name}${secondVeggie ? ' and ' + secondVeggie.name : ''} and sauté in oil for 5 minutes.`,
          `Combine with the cooked ${firstCarb.name}, season with salt and pepper, and serve.`,
        ],
        ingredients: [
          { name: firstVeggie.name, inPantry: true },
          ...(secondVeggie ? [{ name: secondVeggie.name, inPantry: true }] : []),
          { name: firstCarb.name,   inPantry: true },
          { name: 'Olive oil',      inPantry: false },
        ],
      });
    }

    // Recipe 3: protein skillet
    if (firstProtein) {
      const skilletVeg = firstVeggie;
      const title = skilletVeg
        ? `${cap(firstProtein.name)} & ${cap(skilletVeg.name)} Skillet`
        : `${cap(firstProtein.name)} Skillet`;
      results.push({
        id: 'offline-3', title, time: '15 min', difficulty: 'Easy',
        tag: 'Offline suggestion', tagColor: '#0D9488', tagBg: '#CCFBF1', icon: '🍳',
        calories: 360,
        steps: [
          'Heat a splash of oil in a large skillet over medium-high heat.',
          `Add the ${firstProtein.name} and cook until browned.`,
          ...(skilletVeg ? [`Add ${skilletVeg.name} and stir-fry for 3 minutes.`] : []),
          'Season with salt and pepper. Serve immediately.',
        ],
        ingredients: [
          { name: firstProtein.name, inPantry: true },
          ...(skilletVeg ? [{ name: skilletVeg.name, inPantry: true }] : []),
          { name: 'Cooking oil', inPantry: false },
        ],
      });
    }

    // Recipe 4: cheese + carb bake
    if (firstCheese && firstCarb) {
      results.push({
        id: 'offline-4', title: `${cap(firstCheese.name)} ${cap(firstCarb.name)} Bake`,
        time: '30 min', difficulty: 'Easy',
        tag: 'Offline suggestion', tagColor: '#0D9488', tagBg: '#CCFBF1', icon: '🧀',
        calories: 390,
        steps: [
          `Cook the ${firstCarb.name} until just tender.`,
          `Drain and toss with grated or sliced ${firstCheese.name}.`,
          'Transfer to an oven dish and bake at 180 °C for 15 minutes until golden.',
        ],
        ingredients: [
          { name: firstCheese.name, inPantry: true },
          { name: firstCarb.name,   inPantry: true },
          { name: 'Salt',           inPantry: false },
        ],
      });
    }

    // Generic fallback when nothing matched any category
    if (results.length === 0) {
      const mainItem = items.find(() => true);
      results.push({
        id: 'offline-generic',
        title: mainItem ? `${cap(mainItem.name)} Bowl` : 'Pantry Bowl',
        time: '15 min', difficulty: 'Easy',
        tag: 'Offline suggestion', tagColor: '#0D9488', tagBg: '#CCFBF1', icon: '🍽️',
        calories: 300,
        steps: ['Combine your pantry items and cook until done.', 'Season to taste and serve.'],
        ingredients: items.slice(0, 3).map(i => ({ name: i.name, inPantry: true })),
      });
    }

    return results.slice(0, 4);
  }

  const handleGenerateRecipes = async () => {
    if (!session?.userId) {
      Alert.alert('Sign in required', 'Please sign in to load your pantry.');
      return;
    }
    if (activeCount === 0) {
      Alert.alert(
        'Pantry empty',
        'Add ingredients with Quick Add before generating recipes.'
      );
      return;
    }

      setGenerating(true);
    try {
      const generated = await generateRecipesFromInventory(pantryItems, {
        householdSize: prefs.householdSize,
        recipeCount: 4,
        diets: prefs.diets,
        allergens: prefs.allergens,
      });
      setOfflineFallback(false);
      setRecipes(generated);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn('[FreshLoop] Recipe generation failed:', errMsg);
      const offline = buildOfflineRecipes(pantryItems);
      setOfflineFallback(true);
      setRecipes(offline);
    } finally {
      setGenerating(false);
    }
  };

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <TouchableOpacity
      onPress={() => setSelected(recipe)}
      activeOpacity={0.75}
      style={s.card}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={[s.iconBox, { backgroundColor: recipe.tagBg }]}>
          <Text style={{ fontSize: 24 }}>{recipe.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{recipe.title}</Text>
          <Text style={s.cardSub} numberOfLines={1}>
            {recipe.ingredients.map((i) => i.name).join(' · ') || 'Ingredients from AI'}
          </Text>
        </View>
        <Feather name="share-2" size={16} color="#CBD5E1" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="clock" size={11} color="#94A3B8" />
          <Text style={s.meta}>{recipe.time}</Text>
          <Text style={s.dot}>·</Text>
          <Text style={s.meta}>{recipe.difficulty}</Text>
          <Text style={s.dot}>·</Text>
          <Text style={s.meta}>{recipe.calories} kcal</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[s.tag, { backgroundColor: recipe.tagBg }]}>
            <Text style={[s.tagText, { color: recipe.tagColor }]} numberOfLines={1}>
              {recipe.tag}
            </Text>
          </View>
          <Feather name="chevron-right" size={14} color="#CBD5E1" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const showSuggestions = activeTab === 'suggestions';
  const list = showSuggestions ? recipes : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <CustomHeader />
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" />
        }
      >
        <View style={{ backgroundColor: '#E2EBE1', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Text style={s.screenTitle}>Recipe suggestions 🍽️</Text>
          <Text style={s.screenSub}>{`Built from what's in your pantry`}</Text>
          <View style={s.tabBar}>
            {(['suggestions', 'archive'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={[s.tab, activeTab === tab && s.tabActive]}
              >
                <Text style={[s.tabText, activeTab === tab && { color: '#fff' }]}>
                  {tab === 'suggestions' ? 'Suggestions' : 'Archive'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Text style={{ fontSize: 22 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 3 }}>
              Gemini · pantry-only recipes
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18 }}>
              {loadingPantry
                ? 'Loading pantry…'
                : `${activeCount} active item${activeCount === 1 ? '' : 's'} · Cooking for `}
              {!loadingPantry && (
                <Text style={{ fontWeight: '700', color: '#4ADE80' }}>{prefs.householdSize} {prefs.householdSize === 1 ? 'person' : 'people'}</Text>
              )}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
            style={s.bannerEdit}
          >
            <Text style={{ color: '#4ADE80', fontSize: 11, fontWeight: '700' }}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 }}>
          <Feather name="zap" size={13} color="#F97316" style={{ marginRight: 5 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
            {showSuggestions ? (offlineFallback ? 'Offline suggestions from your pantry' : 'AI picks using your Firestore pantry') : 'Previously saved recipes'}
          </Text>
        </View>

        {offlineFallback && showSuggestions && (
          <View style={{ marginHorizontal: 20, marginBottom: 14, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)' }}>
            <Feather name="info" size={15} color="#D97706" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 }}>
              AI recipe generation is temporarily unavailable. Here are offline suggestions from your pantry. Tap Generate to retry when AI is available.
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {showSuggestions && recipes.length === 0 && !generating && (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>📋</Text>
              <Text style={s.emptyTitle}>No AI recipes yet</Text>
              <Text style={s.emptySub}>
                {`We'll send your active pantry items to Gemini and return recipes that only use what you have.`}
              </Text>
            </View>
          )}
          {!showSuggestions && list.length === 0 && (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>📂</Text>
              <Text style={s.emptyTitle}>No saved recipes yet</Text>
              <Text style={s.emptySub}>
                Generated recipes will appear here once saving is supported.
              </Text>
            </View>
          )}
          {generating && (
            <View style={s.genRow}>
              <ActivityIndicator color="#2D6A4F" />
              <Text style={s.genText}>Generating recipes with Gemini…</Text>
            </View>
          )}
          {list.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </View>

        {showSuggestions && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[s.loadMore, generating && { opacity: 0.65 }]}
            onPress={handleGenerateRecipes}
            disabled={generating || loadingPantry}
          >
            <Feather name="refresh-cw" size={14} color="#2D6A4F" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
              {recipes.length === 0 ? 'Generate recipes from pantry' : 'Generate new recipes'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={() => navigation.navigate('QuickAdd')}
        activeOpacity={0.85}
        style={s.fab}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <RecipeModal
        visible={!!selected}
        recipe={selected}
        onClose={() => setSelected(null)}
        householdSize={prefs.householdSize}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  screenSub: { fontSize: 13, color: '#94A3B8', marginBottom: 16 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#1C3A2E' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  banner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#2D6A4F',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2D6A4F',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerEdit: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 3 },
  cardSub: { fontSize: 12, color: '#94A3B8' },
  tag: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '46%' },
  tagText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  dot: { color: '#E2E8F0', fontWeight: '800' },
  loadMore: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  fab: {
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
  },
  emptyWrap: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  genRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  genText: { fontSize: 13, fontWeight: '600', color: '#475569' },
});
