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
          householdSize: typeof d.householdSize === 'number' ? d.householdSize : 2,
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

  const activeCount = pantryItems.length;

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
      setRecipes(generated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Recipe generation failed', msg);
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
            {showSuggestions ? 'AI picks using your Firestore pantry' : 'Previously saved recipes'}
          </Text>
        </View>

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
