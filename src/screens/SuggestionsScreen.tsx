import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { getUserInventory, InventoryItem } from "../services/inventoryService";
import { COLORS } from "../constants/theme";
import BottomNav from "../components/BottomNav";

// ─── Expiry helpers ───────────────────────────────────────────────────────────

function getDaysRemaining(expiryDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryColor(days: number): string {
  if (days < 0) return "#c0392b";
  if (days <= 1) return "#e74c3c";
  if (days <= 3) return "#e67e22";
  return "#27ae60";
}

function getExpiryLabel(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  return `${days}d left`;
}

// ─── Recipe engine ────────────────────────────────────────────────────────────

type Recipe = { title: string; description: string; ingredients: string[] };

const KEYWORDS: Record<string, string[]> = {
  vegetable: [
    "spinach","broccoli","carrot","lettuce","peas","zucchini","potato",
    "onion","garlic","pepper","capsicum","kale","cabbage","celery",
    "mushroom","corn","green bean","pumpkin","sweet potato","leek",
    "asparagus","cucumber","courgette","bok choy","eggplant","aubergine",
  ],
  tomato:  ["tomato"],
  bread:   ["bread","toast","bun","baguette","roll","loaf"],
  rice:    ["rice"],
  pasta:   ["pasta","spaghetti","penne","fettuccine","linguine","macaroni"],
  noodle:  ["noodle","ramen","udon","soba"],
  oats:    ["oats","oatmeal","porridge","muesli"],
  egg:     ["egg","eggs"],
  protein: [
    "chicken","beef","pork","lamb","tuna","salmon","mince",
    "tofu","chickpea","turkey","ham","bacon","prawn","shrimp",
  ],
  legume:  ["beans","lentils","chickpea","lentil"],
  dairy:   ["milk","yogurt","yoghurt","cheese","butter","cream","sour cream"],
  yogurt:  ["yogurt","yoghurt"],
  fruit:   [
    "apple","banana","mango","berry","strawberry","orange","grape","pear",
    "peach","watermelon","pineapple","kiwi","blueberry","raspberry","melon",
  ],
};

function hasCategory(names: string[], cat: string): boolean {
  const kws = KEYWORDS[cat] ?? [];
  return names.some((n) => kws.some((kw) => n.toLowerCase().includes(kw)));
}

function matchedNames(names: string[], cat: string): string[] {
  const kws = KEYWORDS[cat] ?? [];
  return names.filter((n) => kws.some((kw) => n.toLowerCase().includes(kw)));
}

function generateRecipes(items: InventoryItem[]): Recipe[] {
  const names = items.map((i) => i.name);
  const recipes: Recipe[] = [];

  // 1. Vegetable stir fry
  if (hasCategory(names, "vegetable")) {
    recipes.push({
      title: "🥦 Vegetable Stir Fry",
      description: "Toss vegetables in a hot pan with oil, garlic, and soy sauce. Ready in 10 minutes.",
      ingredients: matchedNames(names, "vegetable").slice(0, 5),
    });
  }

  // 2. Hearty vegetable soup (2+ veg)
  if (matchedNames(names, "vegetable").length >= 2) {
    recipes.push({
      title: "🍲 Hearty Vegetable Soup",
      description: "Simmer chopped vegetables in stock with herbs for a warming soup.",
      ingredients: matchedNames(names, "vegetable").slice(0, 4),
    });
  }

  // 3. French / breakfast toast (bread + eggs)
  if (hasCategory(names, "bread") && hasCategory(names, "egg")) {
    recipes.push({
      title: "🍳 French Toast",
      description: "Dip bread in beaten egg, pan-fry until golden. Serve with fruit or honey.",
      ingredients: [...matchedNames(names, "bread"), ...matchedNames(names, "egg")],
    });
  }

  // 4. Egg fried rice (rice + anything)
  if (hasCategory(names, "rice")) {
    const extras = [
      ...matchedNames(names, "egg"),
      ...matchedNames(names, "vegetable").slice(0, 2),
      ...matchedNames(names, "protein").slice(0, 1),
    ];
    recipes.push({
      title: "🍳 Egg Fried Rice",
      description: "Stir-fry cold rice with egg, vegetables, and soy sauce for a quick meal.",
      ingredients: [...matchedNames(names, "rice"), ...extras],
    });
  }

  // 5. Tomato pasta
  if (hasCategory(names, "pasta") && hasCategory(names, "tomato")) {
    recipes.push({
      title: "🍝 Tomato Pasta",
      description: "Cook pasta, toss with fresh or tinned tomatoes, garlic, and olive oil.",
      ingredients: [...matchedNames(names, "pasta"), ...matchedNames(names, "tomato")],
    });
  }

  // 6. Smoothie bowl (fruit + yogurt)
  if (hasCategory(names, "fruit") && hasCategory(names, "yogurt")) {
    recipes.push({
      title: "🍓 Smoothie Bowl",
      description: "Blend fruit with yoghurt until smooth. Top with granola and fresh fruit.",
      ingredients: [...matchedNames(names, "fruit").slice(0, 3), ...matchedNames(names, "yogurt")],
    });
  }

  // 7. Quick omelette (eggs + dairy or veg)
  if (hasCategory(names, "egg") && (hasCategory(names, "dairy") || hasCategory(names, "vegetable"))) {
    recipes.push({
      title: "🥚 Quick Omelette",
      description: "Beat eggs, pour into a pan, add fillings, and fold. Done in 5 minutes.",
      ingredients: [
        ...matchedNames(names, "egg"),
        ...matchedNames(names, "vegetable").slice(0, 2),
        ...matchedNames(names, "dairy").slice(0, 1),
      ],
    });
  }

  // 8. Overnight oats (oats + fruit or milk)
  if (hasCategory(names, "oats") && (hasCategory(names, "fruit") || hasCategory(names, "dairy"))) {
    recipes.push({
      title: "🌙 Overnight Oats",
      description: "Mix oats with milk and toppings the night before for a no-cook breakfast.",
      ingredients: [
        ...matchedNames(names, "oats"),
        ...matchedNames(names, "fruit").slice(0, 2),
        ...matchedNames(names, "dairy").slice(0, 1),
      ],
    });
  }

  // 9. One-pan roast (protein + vegetables)
  if (hasCategory(names, "protein") && hasCategory(names, "vegetable")) {
    recipes.push({
      title: "🍗 One-Pan Roast",
      description: "Season protein and vegetables with oil and herbs, roast at 200 °C for 35 min.",
      ingredients: [
        ...matchedNames(names, "protein").slice(0, 2),
        ...matchedNames(names, "vegetable").slice(0, 3),
      ],
    });
  }

  // 10. Bean & vegetable stew
  if (hasCategory(names, "legume") && hasCategory(names, "vegetable")) {
    recipes.push({
      title: "🫘 Bean & Vegetable Stew",
      description: "Simmer legumes with vegetables, tinned tomato, and spices for a hearty stew.",
      ingredients: [
        ...matchedNames(names, "legume"),
        ...matchedNames(names, "vegetable").slice(0, 3),
      ],
    });
  }

  // 11. Noodle soup (noodles + anything)
  if (hasCategory(names, "noodle")) {
    const extras = [
      ...matchedNames(names, "protein").slice(0, 1),
      ...matchedNames(names, "vegetable").slice(0, 2),
    ];
    recipes.push({
      title: "🍜 Quick Noodle Soup",
      description: "Cook noodles in broth, add protein and vegetables for an easy bowl.",
      ingredients: [...matchedNames(names, "noodle"), ...extras],
    });
  }

  // Deduplicate ingredient lists
  return recipes.map((r) => ({ ...r, ingredients: [...new Set(r.ingredients)] }));
}

// ─── Cooking-skill descriptions ───────────────────────────────────────────────

const SKILL_DESCRIPTIONS: Record<string, { beginner: string; intermediate: string; advanced: string }> = {
  "🥦 Vegetable Stir Fry": {
    beginner:     "Chop vegetables, heat oil in a pan, add everything and stir for 5–7 min. Splash in soy sauce at the end.",
    intermediate: "Toss vegetables in a hot pan with oil, garlic, and soy sauce. Ready in 10 minutes.",
    advanced:     "Wok-fry on high heat — layer aromatics (ginger, garlic, chilli) first. Finish with a splash of rice wine for depth.",
  },
  "🍲 Hearty Vegetable Soup": {
    beginner:     "Chop vegetables, add to a pot with stock and water. Simmer for 20 minutes until soft.",
    intermediate: "Simmer chopped vegetables in stock with herbs for a warming soup.",
    advanced:     "Sweat aromatics, deglaze with white wine, add stock and roasted veg for a complex, layered flavour.",
  },
  "🍳 French Toast": {
    beginner:     "Beat an egg with a splash of milk. Dip bread in the mix and fry each side for 2 minutes until golden.",
    intermediate: "Dip bread in beaten egg, pan-fry until golden. Serve with fruit or honey.",
    advanced:     "Custard-soak thick-cut bread (milk, egg, vanilla, cinnamon) overnight. Fry in butter and caramelise with a honey drizzle.",
  },
  "🍳 Egg Fried Rice": {
    beginner:     "Heat oil, add rice and stir. Push aside, scramble eggs in the gap, mix together with a splash of soy sauce.",
    intermediate: "Stir-fry cold rice with egg, vegetables, and soy sauce for a quick meal.",
    advanced:     "Use day-old cold rice for best texture. Season with sesame oil, dark soy, and white pepper. Crown with a soft-fried egg.",
  },
  "🍝 Tomato Pasta": {
    beginner:     "Boil pasta. Fry garlic and tomato in oil for 5 minutes. Mix together and season with salt.",
    intermediate: "Cook pasta, toss with fresh or tinned tomatoes, garlic, and olive oil.",
    advanced:     "Reduce tomatoes with garlic and a basil stem for 15 minutes. Finish with butter and pasta water for a silky sauce.",
  },
  "🍓 Smoothie Bowl": {
    beginner:     "Blend fruit and yoghurt together. Pour into a bowl and add any toppings you like.",
    intermediate: "Blend fruit with yoghurt until smooth. Top with granola and fresh fruit.",
    advanced:     "Freeze fruit for a thicker base. Layer textures: granola, seeds, sliced fresh fruit, and a drizzle of honey or tahini.",
  },
  "🥚 Quick Omelette": {
    beginner:     "Beat 2 eggs, pour into an oiled pan, add toppings, cook 3 minutes and fold in half.",
    intermediate: "Beat eggs, pour into a pan, add fillings, and fold. Done in 5 minutes.",
    advanced:     "Use the French folding technique — stir eggs over medium heat, remove while still custardy. Season with fines herbes.",
  },
  "🌙 Overnight Oats": {
    beginner:     "Mix oats with milk in a jar, stir, and leave in the fridge overnight. Add toppings in the morning.",
    intermediate: "Mix oats with milk and toppings the night before for a no-cook breakfast.",
    advanced:     "Layer with chia seeds, flavoured kefir, and fruit compote. Batch-make 4 jars at once for the whole week.",
  },
  "🍗 One-Pan Roast": {
    beginner:     "Put protein and chopped vegetables on a tray, drizzle with oil and salt, roast at 200 °C for 35 minutes.",
    intermediate: "Season protein and vegetables with oil and herbs, roast at 200 °C for 35 min.",
    advanced:     "Marinate protein overnight. Roast vegetables in stages by density. Rest meat before carving to retain juices.",
  },
  "🫘 Bean & Vegetable Stew": {
    beginner:     "Fry onion and garlic, add tinned tomatoes and beans, simmer for 15 minutes with any vegetables you have.",
    intermediate: "Simmer legumes with vegetables, tinned tomato, and spices for a hearty stew.",
    advanced:     "Build a soffritto base, add smoked paprika and cumin. Partially mash beans for a silkier, protein-rich stew.",
  },
  "🍜 Quick Noodle Soup": {
    beginner:     "Cook noodles in water, add a stock cube, then drop in any protein or veg. Serve hot.",
    intermediate: "Cook noodles in broth, add protein and vegetables for an easy bowl.",
    advanced:     "Build a flavour base with miso, ginger, and soy. Add a soft-boiled egg and garnish with sesame and spring onion.",
  },
};

function getSkillDesc(recipe: Recipe, skill: string): string {
  const entry = SKILL_DESCRIPTIONS[recipe.title];
  if (!entry) return recipe.description;
  if (skill === "beginner") return entry.beginner;
  if (skill === "advanced") return entry.advanced;
  return entry.intermediate;
}

// ─── Waste prevention tips ────────────────────────────────────────────────────

const WASTE_TIPS = [
  "🧊 Store fresh herbs upright in a glass of water in the fridge to double their life.",
  "🔄 Apply FIFO — move older items to the front of shelves so they get used first.",
  "📦 Batch-cook and freeze portions when ingredients are nearing their expiry date.",
  "🛒 Plan your weekly meals before shopping to buy only what you'll actually use.",
  "🍋 Freeze citrus zest and juice in ice-cube trays before the fruit goes off.",
  "🥚 Crack nearly-expiring eggs into a container and freeze for use in baking later.",
  "🍞 Freeze bread slices you won't finish — toast them straight from frozen.",
];

// ─── Personalisation helpers ──────────────────────────────────────────────────

type UserPrefs = {
  dietaryPreferences: string[];
  householdSize: number;
  cookingSkill: string;
  wasteGoal: string;
  reminderWindowDays: number;
};

const DEFAULT_PREFS: UserPrefs = {
  dietaryPreferences: [],
  householdSize: 0,
  cookingSkill: "",
  wasteGoal: "",
  reminderWindowDays: 3,
};

function getGoalCardTip(wasteGoal: string, urgent: boolean): string {
  if (urgent) {
    if (wasteGoal === "save_money") return "Avoid waste — use this now to save money.";
    if (wasteGoal === "donate_more") return "Consider donating this if you won't cook it today.";
    return "Use, cook, or donate this today to avoid waste.";
  }
  if (wasteGoal === "save_money") return "Plan a budget meal with this to get value from it.";
  if (wasteGoal === "donate_more") return "Plan a meal or consider donating surplus before it expires.";
  return "Plan a meal with this ingredient this week.";
}

function householdNote(size: number): string {
  if (size <= 0) return "";
  if (size <= 2) return "Good for 1\u20132 people";
  if (size <= 5) return "Serves a medium household";
  return "Batch cook for your large household";
}

function getDietaryNote(recipe: Recipe, diets: string[]): string {
  if (diets.length === 0) return "";
  const lower = diets.map((d) => d.toLowerCase());
  const isVeg = lower.some((d) => d.includes("vegan") || d.includes("vegetarian"));
  const isGF = lower.some((d) => d.includes("gluten"));
  const glutenKws = [...KEYWORDS.bread, ...KEYWORDS.pasta, ...KEYWORDS.noodle, ...KEYWORDS.oats];
  const hasProtein = recipe.ingredients.some((ing) =>
    KEYWORDS.protein.some((kw) => ing.toLowerCase().includes(kw))
  );
  const hasGluten = recipe.ingredients.some((ing) =>
    glutenKws.some((kw) => ing.toLowerCase().includes(kw))
  );
  const notes: string[] = [];
  if (isVeg && !hasProtein) notes.push("🌱 Plant-based");
  if (isVeg && hasProtein) notes.push("⚠️ Contains meat");
  if (isGF && !hasGluten) notes.push("✓ Gluten-free");
  if (isGF && hasGluten) notes.push("⚠️ Contains gluten");
  return notes.join(" · ");
}

const GOAL_TIPS: Record<string, string[]> = {
  save_money: [
    "💰 Batch-cook with near-expiry items and freeze portions to cut future grocery bills.",
    "💰 Check your pantry before shopping to avoid buying duplicates.",
  ],
  reduce_waste: [
    "♻️ Log everything you add — tracked items are 3× less likely to be wasted.",
    "♻️ FIFO rule: move older items to the front of your fridge and shelves.",
  ],
  donate_more: [
    "🤝 List surplus items on the Donations screen before they expire.",
    "🤝 Many food banks accept items up to 1 day before expiry — act early!",
  ],
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SuggestionsScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business" ? "business" :
    userData?.role === "coordinator" ? "coordinator" : "home";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    const fetchItems = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "No logged-in user found.");
        setLoading(false);
        return;
      }
      try {
        const [userSnap, all] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid)),
          getUserInventory(currentUser.uid),
        ]);
        if (userSnap.exists()) {
          const d = userSnap.data();
          setPrefs({
            dietaryPreferences: Array.isArray(d.dietaryPreferences) ? d.dietaryPreferences : [],
            householdSize: typeof d.householdSize === "number" ? d.householdSize : 0,
            cookingSkill: d.cookingSkill ?? "",
            wasteGoal: d.wasteGoal ?? "",
            reminderWindowDays: (d.reminderWindowDays === 1 || d.reminderWindowDays === 7) ? d.reminderWindowDays : 3,
          });
        }
        const active = all
          .filter((i) => i.status === "active" && i.expiryDate !== null)
          .sort((a, b) => (a.expiryDate as Date).getTime() - (b.expiryDate as Date).getTime());
        setItems(active);
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <BottomNav navigation={navigation} active="Suggestions" role={role} userData={userData} />
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={styles.emptyTitle}>FreshBot needs your pantry!</Text>
          <Text style={styles.emptyBody}>
            Add items to your inventory and FreshBot will suggest recipes, flag
            expiring food, and help you cut waste.
          </Text>
        </View>
        <BottomNav navigation={navigation} active="Suggestions" role={role} userData={userData} />
      </View>
    );
  }

  const useToday    = items.filter((i) => getDaysRemaining(i.expiryDate as Date) <= 0);
  const useThisWeek = items.filter((i) => {
    const d = getDaysRemaining(i.expiryDate as Date);
    return d >= 1 && d <= 7;
  });
  const recipes = generateRecipes(items);

  const expiringSoonItems = items.filter((i) => {
    const d = getDaysRemaining(i.expiryDate as Date);
    return d >= 0 && d <= prefs.reminderWindowDays;
  });
  const showDonateCard =
    prefs.wasteGoal === "donate_more" || expiringSoonItems.length >= 2;

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.pageTitle}>FreshBot</Text>
        <Text style={styles.pageSubtitle}>
          {prefs.wasteGoal === "save_money"
            ? "💰 Personalised for saving money"
            : prefs.wasteGoal === "donate_more"
            ? "🤝 Personalised for donating more"
            : prefs.wasteGoal === "reduce_waste"
            ? "♻️ Personalised to reduce waste"
            : "AI-style pantry assistant"}
        </Text>

        {/* ══ Section 1 — FreshBot Suggestions ══ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>🤖 FreshBot Suggestions</Text>
        </View>

        {useToday.length > 0 && (
          <>
            <Text style={styles.groupLabel}>⚡ Use Today</Text>
            {useToday.map((item) => {
              const days = getDaysRemaining(item.expiryDate as Date);
              return (
                <View key={item.id} style={[styles.card, styles.urgentCard]}>
                  <View style={styles.cardRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: getExpiryColor(days) }]}>
                      <Text style={styles.badgeText}>{getExpiryLabel(days)}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTip}>{getGoalCardTip(prefs.wasteGoal, true)}</Text>
                </View>
              );
            })}
          </>
        )}

        {useThisWeek.length > 0 && (
          <>
            <Text style={styles.groupLabel}>📅 Use This Week</Text>
            {useThisWeek.map((item) => {
              const days = getDaysRemaining(item.expiryDate as Date);
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: getExpiryColor(days) }]}>
                      <Text style={styles.badgeText}>{getExpiryLabel(days)}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTip}>{getGoalCardTip(prefs.wasteGoal, false)}</Text>
                </View>
              );
            })}
          </>
        )}

        {useToday.length === 0 && useThisWeek.length === 0 && (
          <View style={styles.allGoodCard}>
            <Text style={styles.allGoodText}>✅ Your pantry looks healthy — nothing urgent this week!</Text>
          </View>
        )}

        {/* ══ Smart Donate Suggestion ══ */}
        {showDonateCard && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>🤝 Smart Donate Suggestion</Text>
            </View>
            <View style={styles.donateCard}>
              <Text style={styles.donateText}>
                {expiringSoonItems.length > 0
                  ? `You have ${expiringSoonItems.length} item${expiringSoonItems.length !== 1 ? "s" : ""} expiring within ${prefs.reminderWindowDays} day${prefs.reminderWindowDays !== 1 ? "s" : ""}. If you won't use them, consider donating before they go to waste.`
                  : "Your waste goal is set to donate more. List surplus food so coordinators can collect it."}
              </Text>
              <TouchableOpacity
                style={styles.donateButton}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("CreateDonation", { userData })}
              >
                <Text style={styles.donateButtonText}>Create Donation</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ══ Section 2 — Recipe Ideas ══ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>🍽️ Recipe Ideas</Text>
        </View>
        <Text style={styles.sectionDesc}>Recipes based on ingredients currently in your pantry.</Text>

        {recipes.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTip}>
              No matches yet. Try adding ingredients like vegetables, eggs, rice, or pasta.
            </Text>
          </View>
        ) : (
          recipes.map((recipe, idx) => {
            const hNote = householdNote(prefs.householdSize);
            const dNote = getDietaryNote(recipe, prefs.dietaryPreferences);
            return (
              <View key={idx} style={styles.recipeCard}>
                <Text style={styles.recipeTitle}>{recipe.title}</Text>
                <Text style={styles.recipeDesc}>{getSkillDesc(recipe, prefs.cookingSkill)}</Text>
                {(hNote !== "" || dNote !== "") && (
                  <Text style={styles.recipePersonalised}>
                    {[hNote, dNote].filter(Boolean).join("  ·  ")}
                  </Text>
                )}
                <Text style={styles.recipeIngLabel}>Pantry match:</Text>
                <Text style={styles.recipeIngredients}>{recipe.ingredients.join(" · ")}</Text>
              </View>
            );
          })
        )}

        {/* ══ Section 3 — Waste Prevention Tips ══ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>💡 Waste Prevention Tips</Text>
        </View>
        {(GOAL_TIPS[prefs.wasteGoal] ?? []).map((tip, idx) => (
          <View key={`goal-${idx}`} style={[styles.tipCard, styles.tipCardGoal]}>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
        {WASTE_TIPS.map((tip, idx) => (
          <View key={idx} style={styles.tipCard}>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
      <BottomNav navigation={navigation} active="Suggestions" role={role} userData={userData} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 32,
  },

  // Empty state
  emptyIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
  },
  emptyBody: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  // Page header
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 28,
  },

  // Section headings
  sectionHeaderRow: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingLeft: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: -10,
    marginBottom: 14,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },

  // Generic card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cardTip: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
  },

  // All-good banner
  allGoodCard: {
    backgroundColor: "#e8f8f2",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
  },
  allGoodText: {
    fontSize: 14,
    color: "#27ae60",
    fontWeight: "600",
  },

  // Recipe cards
  recipeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  recipeDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginBottom: 10,
  },
  recipeIngLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  recipeIngredients: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: "italic",
  },

  // Tip cards
  tipCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  recipePersonalised: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 8,
  },
  tipCardGoal: {
    borderLeftColor: COLORS.primary,
    backgroundColor: "#f0fdfd",
  },
  donateCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  donateText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  donateButton: {
    alignSelf: "flex-start",
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  donateButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
