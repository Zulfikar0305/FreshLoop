// screens/general_user/FreshBotScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { getUserInventory, type InventoryItem } from '../../services/inventoryService';

const BOTTOM_NAV_HEIGHT = 80; // match your tab bar height exactly



const SUGGESTED_PROMPTS = [
  '🥬 Use my expiring spinach',
  '🧊 Can I freeze milk?',
  '🛒 Clear my pantry this week',
  '🍗 Chicken recipe ideas',
  '📊 Why do I waste dairy?',
  '🤝 Find nearby donations',
];



function getDaysLeft(expiryDate: Date | null): number {
  if (!expiryDate) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

// ── Gemini chat call ─────────────────────────────────────────────────────────
const GEMINI_CHAT_MODEL = 'gemini-2.0-flash';

async function callGeminiChat(
  userMessage: string,
  pantry: InventoryItem[],
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) {
    console.warn('[FreshBot] EXPO_PUBLIC_GEMINI_API_KEY is not set — local fallback will be used');
    throw new Error('No key');
  }
  console.log(`[FreshBot] Gemini call · key present · pantry items: ${pantry.length}`);

  const pantryBlock =
    pantry.length === 0
      ? 'No pantry items.'
      : pantry
          .map(i => {
            const expPart = i.expiryDate
              ? (() => {
                  const d = getDaysLeft(i.expiryDate);
                  return d <= 0
                    ? 'expired'
                    : d === 1
                    ? 'expires tomorrow'
                    : `expires in ${d} days`;
                })()
              : null;
            return [
              `- ${i.name}`,
              i.category ? `(${i.category})` : null,
              i.quantity && i.unit ? `${i.quantity} ${i.unit}` : null,
              expPart,
              i.storageLocation ? `in ${i.storageLocation}` : null,
            ]
              .filter(Boolean)
              .join(' ');
          })
          .join('\n');

  const prompt = `You are FreshBot, the AI food-saving assistant built into the FreshLoop app.

FreshLoop features:
- Smart Pantry: add and track food items with expiry dates
- AI Recipes: tap Generate to get Gemini-powered recipes from your pantry
- Meal Planner: weekly meal plan built from pantry stock
- Donation Hub: donate surplus food; NPOs claim it on their Operations Map
- Expiry Alerts: warns when items expire within 3 days
- Waste Analytics: shows which food categories get wasted most
- Shopping List: synced list, can be updated from Meal Planner

User's current pantry:
${pantryBlock}

Reply rules:
1. Be concise and practical — 2 to 6 sentences or up to 6 numbered steps maximum.
2. For cooking questions: give 2 to 4 meal ideas using the pantry items above, then one quick method for the best idea.
3. Only use pantry items the user actually has as primary ingredients. Say "if you have..." for any extras not in the list.
4. For app-help questions: name the exact screen or tab to navigate to.
5. Do not use markdown headers. Use plain text or numbered steps.
6. Never say you cannot help — give the best answer you can.

User: ${userMessage}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 512 },
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  if (!response.ok) {
    const reason = data.error?.message ?? `HTTP ${response.status}`;
    console.warn(`[FreshBot] Gemini failed · status=${response.status} · ${reason}`);
    throw new Error(reason);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    console.warn('[FreshBot] Gemini returned empty response');
    throw new Error('Empty Gemini response');
  }
  console.log(`[FreshBot] Gemini replied · ${text.length} chars`);
  return text;
}

export default function FreshBotScreen() {
  const { session } = useAuth();
  const firstName = session?.name?.split(' ')[0] ?? '';
  type Message = { id: string; sender: 'bot' | 'user'; text: string; time: string; type: string };
  const [inputText,    setInputText]  = useState('');
  const [messages,     setMessages]   = useState<Message[]>([{
    id: '1', sender: 'bot',
    text: `Hi${firstName ? ` ${firstName}` : ''}! 👋 I'm FreshBot, your food-saving assistant. Ask me anything about food storage, recipes, or reducing waste. 🌿`,
    time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    type: 'text',
  }]);
  const scrollRef = useRef<ScrollView>(null);
  const [pantryItems, setPantryItems] = useState<InventoryItem[]>([]);
  const [isSending,    setIsSending]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session?.userId) return;
      getUserInventory(session.userId)
        .then((inv) => setPantryItems(inv.filter((i) => i.status === 'active')))
        .catch(() => {});
    }, [session?.userId])
  );

  const getFreshBotReply = (input: string): string => {
    const msg = input.toLowerCase();

    // ── Pantry profile helpers ────────────────────────────────────────────────
    const getPantry = (keywords: string[]): InventoryItem | undefined =>
      pantryItems.find(i => keywords.some(k => i.name.toLowerCase().includes(k)));
    const hasPantry = (keywords: string[]): boolean =>
      pantryItems.some(i => keywords.some(k => i.name.toLowerCase().includes(k)));
    const cap = (s: string): string => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

    const cheeseItem  = getPantry(['gouda', 'cheddar', 'feta', 'mozzarella', 'brie', 'cheese']);
    const cheeseName  = cheeseItem?.name ?? '';
    const proteinItem = getPantry(['chicken mince', 'mince', 'chicken', 'beef', 'fish', 'pork', 'lamb', 'tuna', 'bacon', 'prawn', 'sausage']);
    const proteinName = proteinItem?.name ?? '';
    const carbItem       = getPantry(['pasta', 'rice', 'bread', 'noodle', 'potato', 'oat', 'flour']);
    const carbName       = carbItem?.name ?? '';
    const carbIsBoilable = !!carbName && !/bread/.test(carbName.toLowerCase());
    const carbCookVerb   = /rice/.test(carbName.toLowerCase()) ? 'Cook' : carbIsBoilable ? 'Boil' : 'Toast';
    const carbServeVerb  = carbIsBoilable ? 'toss through drained' : 'serve on toasted';
    const vegKeywords = ['tomato', 'onion', 'spinach', 'pepper', 'carrot', 'mushroom', 'broccoli', 'cucumber', 'garlic', 'leek'];
    const veggie1Item = getPantry(vegKeywords);
    const veggie1Name = veggie1Item?.name ?? '';
    const veggie2Name = veggie1Item
      ? (pantryItems.find(i => i.id !== veggie1Item.id && vegKeywords.some(k => i.name.toLowerCase().includes(k)))?.name ?? '')
      : '';
    const isCooking = /\b(use|cook|make|bake|recipe|prepare|eat|how|ideas?|what)\b/.test(msg);
    const isHowTo   = /\b(how|what|help|does|do|where|explain|which)\b/.test(msg);

    // ── App-help intents (checked before cooking questions) ───────────────────

    // Add food / pantry
    if (isHowTo && /\badd\b/.test(msg) && /\b(food|item|pantry|ingredient)\b/.test(msg)) {
      return '🥫 To add food to your pantry:\n\n1. Open Smart Pantry and tap the + button\n2. Choose **Manual** — fill in name, category, quantity, price, expiry date, and storage location\n3. Or choose **AI Addition** — type something like "1 block gouda for R35, expires in 7 days" and FreshLoop fills all the fields for you\n\nYou can describe multiple items in one sentence with AI Addition to add them all at once.';
    }

    // AI Addition
    if (isHowTo && /ai\s*addition/.test(msg)) {
      return '🤖 **AI Addition** is in Smart Pantry → tap + → AI Addition tab.\n\nType a natural description like:\n"2kg chicken mince, R89.99, expires in 3 days"\n\nFreshLoop extracts the name, quantity, price, expiry date, and storage location automatically. You can add multiple items in one sentence.';
    }

    // Expiry tracking (feature question — distinct from "what's expiring in my pantry")
    if (isHowTo && /expir/.test(msg) && /\b(track|work|alert|notif|remind|monitor)\b/.test(msg)) {
      return '📅 FreshLoop tracks expiry dates you add to pantry items. Items expiring within 3 days are highlighted in Smart Pantry. The app also:\n\n• Prioritises soon-expiring items in AI Recipes and the Meal Planner\n• Can send local reminders close to use-by dates\n• Lets you donate or mark items as used/wasted to keep data accurate\n\nAdd expiry dates when creating pantry items for the best experience.';
    }

    // Donate food (how-to)
    if ((isHowTo && /donat/.test(msg)) || /creat.*donat|post.*donat|donat.*listing/.test(msg)) {
      return '🤝 To donate food:\n\n1. Open the **Donation Hub** (gift icon in nav bar)\n2. Tap **Give Food** → **Create Donation**\n3. Fill in food details, pickup address, pickup date, and pickup time\n4. Post the listing — nearby NPOs will see it on their map and can claim it\n\nOnly post food that is safe to eat and within its use-by date.';
    }

    // NPO claim
    if (/npo.*claim|claim.*donat|how.*npo|how.*claim|npo.*pickup/.test(msg)) {
      return '🗺️ NPO users open **Operations Map**, which shows available donations nearby. They can tap a donation marker or card, view the details, then tap **Claim**.\n\nClaimed donations move to **Active Pickups**, where the NPO marks them complete after collection.';
    }

    // Meal planner (feature question)
    if (isHowTo && /meal.*plan|plan.*meal/.test(msg)) {
      return "📅 The **Meal Planner** builds a weekly plan from your pantry. You can:\n\n• Tap **Auto-fill** to generate AI meals (or pantry-based fallback if offline)\n• Tap any meal slot to swap it manually\n• Meals are prioritised around items expiring soonest in your pantry\n\nOpen it from the Home dashboard.";
    }

    // Generate recipes (feature question)
    if (isHowTo && (/\b(generat|creat|get)\b.*recipe/.test(msg) || /recipe.*\b(generat|work|screen|ai)\b/.test(msg))) {
      return '✨ To generate recipes:\n\n1. Open **AI Recipes** (spark icon in nav bar)\n2. Tap **Generate** — FreshLoop sends your pantry to Gemini AI and returns personalised recipes\n3. If Gemini is unavailable, you get pantry-based offline recipes instead\n\nRecipes use your actual pantry items and prioritise the ones expiring soonest.';
    }

    // Shopping list
    if (isHowTo && /shopping\s*list|list.*work/.test(msg)) {
      return '🛒 The **Shopping List** is accessible from the Home dashboard. You can:\n\n• Add items manually\n• Tick items off as you shop\n• Items suggested by the Meal Planner can be added directly\n\nThe list syncs to your account so it\'s available every time you open the app.';
    }

    // Profile / security
    if (isHowTo && /\b(profile|security|password|2fa|two.factor|biometric)\b/.test(msg)) {
      return '👤 To update your **Profile**: tap the person icon in your nav bar → edit your name, household size, city, and account details.\n\nFor **Security**: open Security Settings to change your password, enable two-factor authentication, or set up biometric login. 2FA sends a verification code to your phone when you sign in from a new device.';
    }

    // Notifications
    if (isHowTo && /notif/.test(msg)) {
      return '🔔 FreshLoop notifications cover:\n\n• Expiry alerts — when pantry items are near their use-by date\n• Donation updates — when an NPO claims your donation\n• Broadcasts — app-wide messages from admins\n\nManage your preferences in the **Notifications** screen (bell icon in nav bar).';
    }

    // Tabs / navigation
    if (isHowTo && /\b(tab|screen|icon|nav|section|menu)\b/.test(msg) && /\b(do|does|mean|which|what)\b/.test(msg)) {
      return '📱 Here\'s what each main tab does:\n\n🏠 Home — pantry overview and expiry summary\n🥫 Smart Pantry — add, edit, and track food items\n✨ AI Recipes — generate pantry-based recipes\n🎁 Donation Hub — donate surplus food or browse donations\n👤 Profile — account settings and household info\n\nMeal Planner, Shopping List, Waste Analytics, and FreshBot are also accessible from the Home dashboard.';
    }

    // ── Freezing / storage ────────────────────────────────────────────────────
    if (/freez|freeze|frozen|fridge|refrigerat|store|storage|keep/.test(msg)) {
      if (/milk/.test(msg))
        return '🧊 Yes, you can freeze milk! Pour into a sealed container (leave 2 cm for expansion). Thaw overnight in the fridge. Shake well before using — it may separate slightly but is perfect for cooking, sauces, and baking.';
      if (/bread/.test(msg))
        return '🧊 Bread freezes great! Slice it first, then freeze in a sealed bag. Toast straight from frozen, or thaw at room temperature in 30 minutes.';
      if (/cheese|gouda|cheddar|mozzarella|feta/.test(msg))
        return '🧊 Hard cheeses (gouda, cheddar) freeze well — grate or slice first. Soft cheeses (feta, brie) can be frozen but texture changes; best used in cooked dishes after thawing.';
      if (/chicken|mince|beef|meat|fish/.test(msg))
        return '🧊 Yes — meat and chicken freeze well for up to 3 months. Divide into portions before freezing. Always thaw in the fridge, not on the counter. Cook within 24 hours of thawing.';
      if (/egg/.test(msg))
        return "🧊 Don't freeze whole eggs in the shell — they'll crack. Beat eggs and freeze in a sealed container for up to 1 year. Egg whites and yolks can also be frozen separately in ice cube trays.";
      if (/pasta|rice/.test(msg))
        return '🧊 Cooked pasta and rice freeze well. Cool completely, portion into bags, and freeze. Reheat in a pan with a splash of water or in the microwave covered with a damp paper towel.';
      if (/tomato|veg|spinach|pepper|onion/.test(msg))
        return '🧊 Most veg freezes well after blanching (30–60 sec in boiling water, then ice bath). Tomatoes can go straight in — they soften but are great for sauces. Onions can be frozen raw, chopped.';
      return '🧊 General storage tips:\n• Fridge: keep at 0–4 °C\n• Freeze meat and fish in portions\n• Bread: freeze sliced or store in a cool dry place\n• Dairy: back of the fridge (coldest zone)\n• Cut fruit/veg: airtight container in fridge\n\nAsk me about a specific item for exact storage advice!';
    }

    // ── "Use first" / expiry priority ─────────────────────────────────────────
    if (/use\s+(first|soon|up)|what.*first|priorit|soonest|which.*first/.test(msg) ||
        (/expir|expiring|expire/.test(msg) && /\b(use|eat|cook|make)\b/.test(msg))) {
      const sorted = [...pantryItems]
        .map(i => ({ ...i, daysLeft: getDaysLeft(i.expiryDate) }))
        .filter(i => i.daysLeft < 999)
        .sort((a, b) => a.daysLeft - b.daysLeft);
      if (sorted.length === 0) {
        if (pantryItems.length > 0)
          return `📅 You have ${pantryItems.length} pantry item${pantryItems.length === 1 ? '' : 's'} but none have expiry dates set. Add them in Smart Pantry so I can help you use them in time!`;
        return '📅 Your pantry is empty. Add items in Smart Pantry so I can help you use them before they expire!';
      }
      const top = sorted.slice(0, 3);
      const lines = top.map(i =>
        `• ${i.name} — ${i.daysLeft <= 0 ? 'expires today!' : i.daysLeft === 1 ? 'expires tomorrow' : `${i.daysLeft} days left`}`
      ).join('\n');
      const firstItem = top[0];
      let tip = '';
      if (firstItem) {
        const n = firstItem.name.toLowerCase();
        if (/cheese|gouda|cheddar/.test(n))   tip = `Quick use for ${firstItem.name}: melt into pasta, add to a toasted sandwich, or stir into an omelette.`;
        else if (/chicken|mince|beef/.test(n)) tip = `Quick use for ${firstItem.name}: stir-fry with any veg, make a quick soup, or pan-fry and serve with rice.`;
        else if (/milk/.test(n))               tip = `Quick use for ${firstItem.name}: pancakes, white sauce, porridge, or a smoothie.`;
        else if (/tomato/.test(n))             tip = `Quick use for ${firstItem.name}: chop into a quick pasta sauce or make a simple tomato soup.`;
        else if (/egg/.test(n))                tip = `Quick use for ${firstItem.name}: scrambled eggs on toast, omelette, or egg fried rice.`;
        else if (/spinach/.test(n))            tip = `Quick use for ${firstItem.name}: wilt into pasta, add to an omelette, or blend into a smoothie.`;
        else if (/bread/.test(n))              tip = `Quick use for ${firstItem.name}: French toast, garlic bread, toasted cheese, or croutons.`;
        else                                   tip = `Quick tip: use ${firstItem.name} in a stir-fry, soup, or baked dish.`;
      }
      return `⏳ Use these first:\n\n${lines}\n\n💡 ${tip}`;
    }

    // ── Cheese questions ──────────────────────────────────────────────────────
    if (/\b(cheese|gouda|cheddar|feta|mozzarella|brie)\b/.test(msg) && isCooking) {
      const nm = cheeseName || (msg.match(/gouda|cheddar|feta|mozzarella|brie|cheese/)?.[0] ?? 'cheese');
      if (proteinName && carbName) {
        const dishName = carbIsBoilable
          ? `${cap(nm)} ${cap(proteinName)} ${cap(carbName)} Bake`
          : `${cap(nm)} ${cap(proteinName)} Toastie`;
        const method   = carbIsBoilable
          ? `${carbCookVerb} ${carbName}. Pan-cook ${proteinName}${veggie1Name ? ` with ${veggie1Name}` : ''}${veggie2Name ? ` and ${veggie2Name}` : ''}, add tomatoes if you have them, stir in grated ${nm} until creamy, ${carbServeVerb} ${carbName}.`
          : `Toast ${carbName}. Pan-cook ${proteinName}${veggie1Name ? ` with ${veggie1Name}` : ''}. Layer onto toast and top with grated ${nm} — press in a hot pan until melted.`;
        return `🧀 With your ${nm}, here's what you can make:\n\n1. ${dishName}\n2. Cheesy ${cap(proteinName)}${veggie1Name ? ` & ${cap(veggie1Name)}` : ''} on ${carbIsBoilable ? cap(carbName) : 'toast'}\n3. Quick toasted ${cap(nm)} sandwich\n\nQuick method for #1:\n${method}`;
      }
      if (carbName) {
        const idea1 = carbIsBoilable
          ? `Cheesy ${cap(carbName)} bake — layer ${carbName} with grated ${nm}, bake at 180 °C for 20 min`
          : `Toasted ${cap(nm)} sandwich — layer ${carbName} with grated ${nm}, press in a hot buttered pan`;
        return `🧀 Great ways to use your ${nm}:\n\n1. ${idea1}\n2. ${cap(nm)} sauce over ${carbIsBoilable ? carbName : 'pasta or veg'} — melt butter, stir in flour, add milk, then ${nm}\n3. Quick toasted ${cap(nm)} sandwich\n\nTip: ${nm} melts best when grated first and added off the heat.`;
      }
      return `🧀 Ways to use your ${nm}:\n\n1. Toasted cheese sandwich — melt between bread slices in a buttered pan\n2. Cheese sauce — butter + flour + milk + grated ${nm}, great over pasta or veg\n3. Grate over omelette, soup, or baked veg\n4. Cheese board with crackers and fruit\n\nAdd carbs or protein to your pantry and I'll suggest a full combined meal!`;
    }

    // ── Chicken / mince / protein questions ──────────────────────────────────
    if (/\b(chicken\s+mince|chicken|mince|beef|fish|pork|lamb)\b/.test(msg) && isCooking) {
      const nm = msg.match(/\b(chicken\s+mince|chicken|mince|beef|fish|pork|lamb)\b/)?.[0] || proteinName || 'protein';
      if (carbName && cheeseName) {
        const dishName    = carbIsBoilable ? `${cap(nm)} & ${cap(carbName)} Bake with melted ${cheeseName}` : `${cap(nm)} & ${cap(cheeseName)} Toastie on ${carbName}`;
        const serveMethod = carbIsBoilable ? `Serve over ${carbName}.` : `Load onto toasted ${carbName}.`;
        return `🍗 With your ${nm}, here's what you can make:\n\n1. ${dishName}\n2. ${cap(nm)}${veggie1Name ? ` & ${cap(veggie1Name)}` : ''} Skillet — quick 15-min pan meal\n3. ${cap(nm)} soup — water + ${nm} + onion, simmer 20 min\n\nQuick method for #2:\nHeat oil in a pan. Add ${nm}${veggie1Name ? `, ${veggie1Name}` : ''}${veggie2Name ? ` and ${veggie2Name}` : ''}, season with salt and pepper. Cook 10–12 min. ${serveMethod}`;
      }
      if (carbName) {
        const step2 = carbIsBoilable ? `${carbCookVerb.toLowerCase()} ${carbName}` : `toast ${carbName}`;
        return `🍗 With your ${nm} and ${carbName}:\n\n1. ${cap(nm)} & ${cap(carbName)} — cook ${nm} in a pan, ${step2}, combine with onion and sauce\n2. ${cap(nm)} soup — water + ${nm} + onion, simmer 25 min\n${veggie1Name ? `3. ${cap(nm)}, ${cap(veggie1Name)} & ${cap(carbName)} — stir-fry all together\n` : ''}\nQuick tip:\nCook ${nm} in a hot oiled pan with salt and pepper. Mince takes ~10 min, chicken pieces ~15 min. Always cook until no pink remains.`;
      }
      return `🍗 Ways to use your ${nm}:\n\n1. Simple stir-fry with any veg you have — 15 min\n2. ${cap(nm)} soup — water + onion + salt, 20 min\n3. Grilled or pan-fried ${nm} with rice or potatoes\n\nAdd carbs or veg to your pantry and I'll suggest a full meal with steps!`;
    }

    // ── Pasta / rice / bread / carb questions ─────────────────────────────────
    if (/\b(pasta|rice|bread|noodle|potato)\b/.test(msg) && isCooking) {
      const nm          = msg.match(/\b(pasta|rice|bread|noodle|potato)\b/)?.[0] || carbName || 'pasta';
      const reqBread    = /bread/.test(nm.toLowerCase());
      const reqRice     = /rice/.test(nm.toLowerCase());
      const reqBoilable = !reqBread;
      const reqCookVerb = reqRice ? 'Cook' : reqBoilable ? 'Boil' : 'Toast';
      const reqServeVerb = reqBoilable ? 'toss through drained' : 'serve on toasted';

      if (reqBread) {
        if (proteinName && cheeseName)
          return `🍞 With your ${nm}:\n\n1. ${cap(proteinName)} & ${cap(cheeseName)} toastie\n2. Open-faced ${cap(proteinName)} on toast${veggie1Name ? ` with ${cap(veggie1Name)}` : ''}\n3. ${cap(cheeseName)} melt sandwich\n\nQuick method for #1:\nToast two slices of ${nm}. Pan-cook ${proteinName}${veggie1Name ? ` with ${veggie1Name}` : ''}. Layer onto toast and top with grated ${cheeseName} — press in a hot pan until melted.`;
        if (proteinName)
          return `🍞 With your ${nm} and ${proteinName}:\n\n1. ${cap(proteinName)} sandwich\n2. Open-faced ${cap(proteinName)} on toast${veggie1Name ? ` with ${cap(veggie1Name)}` : ''}\n3. ${cap(proteinName)} toastie with cheese if you have it\n\nQuick method:\nToast the ${nm}. Pan-cook ${proteinName}${veggie1Name ? ` with ${veggie1Name}` : ''} with seasoning. Load onto toast.`;
        if (cheeseName)
          return `🍞 With your ${nm} and ${cheeseName}:\n\n1. Toasted ${cap(cheeseName)} sandwich — classic comfort food\n2. ${cap(cheeseName)} on toast${veggie1Name ? ` with ${cap(veggie1Name)}` : ''}\n3. Garlic bread with melted ${cheeseName}\n\nQuick method:\nButter two slices of ${nm}, add grated ${cheeseName}, pan-fry on medium heat until golden on both sides.`;
        return `🍞 Ways to use your ${nm}:\n\n1. Toasted cheese sandwich\n2. French toast — dip in beaten egg + milk, pan-fry until golden\n3. Garlic bread — butter + garlic, bake at 180 °C for 10 min\n4. Bruschetta — toast and top with tomato and olive oil\n\nAdd cheese or protein to your pantry and I'll build a full sandwich meal!`;
      }

      if (proteinName && cheeseName) {
        return `🍝 With your ${nm}:\n\n1. ${cap(cheeseName)} ${cap(proteinName)} ${cap(nm)} Bake\n2. ${cap(proteinName)}${veggie1Name ? ` & ${cap(veggie1Name)}` : ''} ${cap(nm)}\n3. Quick ${cap(nm)} with leftover bits in a hot pan\n\nQuick method for #1:\n${reqCookVerb} ${nm}${reqBoilable ? ', drain' : ''}. Cook ${proteinName}${veggie1Name ? ` with ${veggie1Name}` : ''}${veggie2Name ? ` and ${veggie2Name}` : ''} in a pan, add tomatoes, stir in grated ${cheeseName}, ${reqServeVerb} ${nm}.`;
      }
      if (proteinName) {
        const cookTip = reqRice
          ? `Rice tip: rinse before cooking, bring to boil in double the water, then simmer covered for 15 min.`
          : `Boiling tip: salt the water well, cook ${nm} until just al dente, and save a cup of the pasta water for your sauce.`;
        return `🍝 With your ${nm} and ${proteinName}:\n\n1. ${cap(proteinName)} ${cap(nm)} — pan-cook ${proteinName}, ${reqServeVerb} ${nm} with any sauce\n2. ${cap(nm)} soup with ${cap(proteinName)}\n3. Cold ${cap(nm)} salad with ${cap(proteinName)}\n\n${cookTip}`;
      }
      return `🍝 Ways to use your ${nm}:\n\n1. Garlic and olive oil ${nm} — simple and fast\n2. Quick tomato sauce ${nm}\n3. Add any cheese, meat, or veg you have on top\n\nAdd protein or cheese to your pantry and I'll build a full meal idea!`;
    }

    // ── Egg / milk / breakfast questions ──────────────────────────────────────
    if (/\b(egg|eggs|milk|yoghurt|yogurt|breakfast|oat|oats)\b/.test(msg) && isCooking) {
      const hasEgg   = hasPantry(['egg']);
      const hasMilk  = hasPantry(['milk']);
      const hasBread = hasPantry(['bread']);
      if (hasEgg && hasMilk && hasBread)
        return "🍳 With eggs, milk, and bread you can make:\n\n1. French toast — dip bread in beaten egg + milk, pan-fry until golden\n2. Scrambled eggs on toast — beat with milk, low heat, stir gently\n3. Eggy bread with cinnamon and sugar\n\nTip: Use bread that's a day old — it soaks up the egg better.";
      if (hasEgg)
        return "🍳 With your eggs:\n\n1. Scrambled eggs — beat with a pinch of salt, cook on low heat, stir slowly\n2. Omelette — add any cheese, veg, or leftover meat\n3. Fried egg on toast or rice\n4. Egg fried rice — day-old rice works best\n\nTip: Low and slow is the secret to fluffy scrambled eggs.";
      if (hasMilk)
        return '🥛 With your milk:\n\n1. Pancakes — flour + egg + milk, 2 min per side in a buttered pan\n2. White sauce — butter + flour + milk, great over pasta or veg\n3. Creamy porridge with oats\n4. Smoothie or milkshake base\n\nTip: Milk nearing its date? Freeze it in a sealed container before it turns!';
      return "🍳 Breakfast ideas:\n\n1. Scrambled eggs on toast\n2. Oats with honey and fruit\n3. Yoghurt parfait with banana\n\nTell me which specific ingredient you have and I'll give you exact cooking steps!";
    }

    // ── Expiry alerts ─────────────────────────────────────────────────────────
    if (/expir|expiring|expire/.test(msg)) {
      const urgent = pantryItems
        .map(i => ({ ...i, daysLeft: getDaysLeft(i.expiryDate) }))
        .filter(i => i.daysLeft <= 3 && i.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft);
      if (urgent.length > 0) {
        const list = urgent
          .slice(0, 4)
          .map(i => `${i.name} (${i.daysLeft === 0 ? 'today' : `${i.daysLeft}d`})`)
          .join(', ');
        return `⚠️ Expiring soon: ${list}. Ask me "how do I use my [item]" for quick meal ideas, or use the Donation Hub to pass on anything you won't finish.`;
      }
      return '✅ No items expiring in the next 3 days — great job! Check Smart Pantry regularly to stay on top of things.';
    }

    // ── Donation / waste ──────────────────────────────────────────────────────
    if (/donat|donation|give|surplus/.test(msg))
      return "🤝 You can donate safe surplus food through the Donation Hub. Tap the gift icon in your nav bar, switch to the 'Give Food' tab, and select a pantry item to post a listing for nearby NPOs to claim.";
    if (/waste|wasted|throwing|threw/.test(msg))
      return "📊 Check your Waste Analytics screen for a breakdown of which categories you waste most. Marking items as 'used' or 'wasted' in your pantry keeps the data accurate and helps FreshLoop give better advice.";

    // ── Sandwich / toastie explicit ───────────────────────────────────────────
    if (/\b(sandwich|toastie|toasted|sub|wrap|roll)\b/.test(msg) && isCooking) {
      const hasBread = hasPantry(['bread', 'roll', 'wrap', 'bun', 'tortilla', 'pita', 'bagel', 'baguette']);
      if (!hasBread) {
        const alt = proteinName || cheeseName || carbName;
        return alt
          ? `🍞 A sandwich needs bread — I don't see any in your pantry. With your ${alt}, you could make a quick stir-fry or soup instead. Grab some bread next shop and I'll build you a full toastie recipe!`
          : "🍞 A sandwich needs bread — add some to your pantry and I'll suggest the perfect filling based on what you have!";
      }
      if (proteinName && cheeseName) {
        return `🍞 With your bread, ${cheeseName} and ${proteinName}, here are your best options:\n\n1. ${cap(cheeseName)} & ${cap(proteinName)} toastie — toast bread, pan-cook ${proteinName}${veggie1Name ? ` with ${veggie1Name}` : ''} for 10 min, add ${cap(cheeseName)}, press in a hot buttered pan until golden.\n2. Open-faced ${cap(proteinName)} sandwich${veggie1Name ? ` with ${cap(veggie1Name)}` : ''}\n3. Cold ${cap(cheeseName)} & ${cap(proteinName)} wrap`;
      }
      if (cheeseName) {
        return `🍞 Toasted ${cheeseName} sandwich:\n\n1. Butter two slices of bread\n2. Add a generous layer of grated ${cheeseName}\n3. Press in a pan on medium heat, 2–3 min per side until golden\n\nTip: add a slice of tomato if you have one!`;
      }
      if (proteinName) {
        return `🍞 ${cap(proteinName)} sandwich:\n\n1. Toast the bread\n2. Pan-cook ${proteinName} with salt and pepper${veggie1Name ? ` and ${veggie1Name}` : ''} for 10–12 min\n3. Layer onto toast, add sauce or mustard if you have it\n\nFor more ideas, open AI Recipes!`;
      }
      return "🍞 Plain toast or open sandwich: toast your bread and top with butter or any spread you have. Add cheese or protein to your pantry and I'll build a full filled sandwich!";
    }

    // ── General "what can I cook" ─────────────────────────────────────────────
    if (/\b(cook|make|bake|recipe|prepare|meal|eat|idea)\b/.test(msg)) {
      if (pantryItems.length === 0)
        return "🍽️ Your pantry is empty! Add items in Smart Pantry and I'll suggest meals based on what you actually have.";
      if (proteinName && carbName && cheeseName) {
        const dishName = carbIsBoilable
          ? `${cap(cheeseName)} ${cap(proteinName)} ${cap(carbName)} Bake`
          : `${cap(proteinName)} & ${cap(cheeseName)} Toastie`;
        const step1 = carbIsBoilable ? `${carbCookVerb} ${carbName}` : `Toast ${carbName}`;
        const step5 = carbIsBoilable ? `${carbServeVerb} ${carbName}` : `layer onto ${carbName}`;
        return `🍽️ From your pantry, I'd suggest:\n\n${dishName}\n\n1. ${step1}\n2. Pan-cook ${proteinName}${veggie1Name ? ` with ${veggie1Name}` : ''}${veggie2Name ? ` and ${veggie2Name}` : ''}\n3. Add tomatoes if you have them, simmer 3 min\n4. Stir in grated ${cheeseName} until melted\n5. ${cap(step5)}\n\nFor more ideas, check AI Recipes!`;
      }
      if (proteinName && carbName) {
        const step2 = carbIsBoilable ? `${carbCookVerb} ${carbName}` : `Toast ${carbName}`;
        return `🍽️ From your pantry: ${cap(proteinName)} & ${cap(carbName)}\n\n1. Pan-cook ${proteinName} with onion and seasoning\n2. ${step2}\n3. Combine and add any sauce or cheese you have\n\nFor full recipes, open AI Recipes!`;
      }
      const topItems = pantryItems.slice(0, 3).map(i => i.name).join(', ');
      return `🍽️ You have ${pantryItems.length} item${pantryItems.length === 1 ? '' : 's'} in your pantry (${topItems}${pantryItems.length > 3 ? '…' : ''}). Tell me a specific ingredient and I'll give you meal ideas with steps!`;
    }

    // ── Matched pantry item by name ───────────────────────────────────────────
    const matched = pantryItems.find(i =>
      msg.includes(i.name.toLowerCase()) ||
      i.name.toLowerCase().split(' ').some(w => w.length > 3 && msg.includes(w))
    );
    if (matched)
      return `🍳 I found **${matched.name}** in your pantry! Here are quick ideas:\n\n1. Stir-fry with any veg you have\n2. Add to a quick soup — water + onion + seasoning\n3. Bake with cheese and a carb if you have them\n\nFor full step-by-step recipes, open AI Recipes!`;

    // ── Smart fallback ────────────────────────────────────────────────────────
    if (pantryItems.length > 0 && (proteinName || carbName || cheeseName)) {
      const items = [proteinName, carbName, cheeseName, veggie1Name].filter(Boolean).slice(0, 3).join(', ');
      return `💡 I can see you have ${items} in your pantry. Try asking:\n• "How do I use my ${proteinName || cheeseName || carbName}?"\n• "What can I cook?"\n• "What should I use first?"`;
    }
    return '💡 I\'m here to help with cooking ideas, food storage, and reducing waste! Try asking:\n• "How do I use my cheese?"\n• "What can I cook with chicken mince?"\n• "What should I use first?"\n• "Can I freeze milk?"';
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    const now = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmed,
      time: now,
      type: 'text',
    };

    const thinkingId = (Date.now() + 1).toString();
    const thinkingMsg: Message = {
      id: thinkingId,
      sender: 'bot',
      text: '',
      time: now,
      type: 'thinking',
    };

    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    setInputText('');
    setIsSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);

    let replyText: string;
    try {
      replyText = await callGeminiChat(trimmed, pantryItems);
    } catch (err) {
      // Gemini unavailable — fall back to local rule-based reply
      console.warn(`[FreshBot] Using local fallback — ${err instanceof Error ? err.message : String(err)}`);
      replyText = getFreshBotReply(trimmed);
    }

    const botReply: Message = {
      id: thinkingId,
      sender: 'bot',
      text: replyText,
      time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };

    setMessages(prev => prev.map(m => (m.id === thinkingId ? botReply : m)));
    setIsSending(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const handlePromptTap = (prompt: string) => {
    const clean = prompt.replace(/^\p{Emoji}\s*/u, '').trim();
    setInputText(clean);
  };

  return (
    // marginBottom pushes the entire screen above the bottom nav bar
    <View style={[s.root, { marginBottom: BOTTOM_NAV_HEIGHT }]}>
      <CustomHeader />
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />

      {/* ── Bot identity bar ── */}
      <View style={s.botBar}>
        <View style={s.botAvatar}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.botName}>FreshBot</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>Always online · Food-saving assistant</Text>
          </View>
        </View>

      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Chat scroll area ── */}
        <ScrollView
          ref={scrollRef}
          style={s.chatScroll}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {/* Date separator */}
          <View style={s.dateSep}>
            <View style={s.dateLine} />
            <Text style={s.dateLabel}>Today</Text>
            <View style={s.dateLine} />
          </View>

          {/* Messages */}
          {messages.map(msg => {
            const isBot        = msg.sender === 'bot';
            const isSuggestion = msg.type === 'suggestion';
            const isWarning    = msg.type === 'warning';
            const isThinking   = msg.type === 'thinking';

            return (
              <View
                key={msg.id}
                style={[s.msgRow, isBot ? s.msgRowBot : s.msgRowUser]}
              >
                {isBot && (
                  <View style={s.msgAvatar}>
                    <Text style={{ fontSize: 13 }}>🤖</Text>
                  </View>
                )}

                <View style={[
                  s.bubble,
                  isBot        ? s.bubbleBot        : s.bubbleUser,
                  isSuggestion && s.bubbleSuggestion,
                  isWarning    && s.bubbleWarning,
                ]}>
                  {isSuggestion && (
                    <View style={s.bubbleHeader}>
                      <Feather name="zap" size={12} color="#0D9488" />
                      <Text style={[s.bubbleHeaderText, { color: '#0D9488' }]}>
                        Recipe suggestions
                      </Text>
                    </View>
                  )}
                  {isWarning && (
                    <View style={s.bubbleHeader}>
                      <Feather name="alert-triangle" size={12} color="#F97316" />
                      <Text style={[s.bubbleHeaderText, { color: '#F97316' }]}>
                        Pantry alert
                      </Text>
                    </View>
                  )}

                  {isThinking ? (
                    <ActivityIndicator
                      size="small"
                      color="#2D6A4F"
                      style={{ marginVertical: 4, marginHorizontal: 4 }}
                    />
                  ) : (
                    <Text style={[
                      s.bubbleText,
                      isBot        ? s.bubbleTextBot  : s.bubbleTextUser,
                      isSuggestion && { color: '#0F766E' },
                      isWarning    && { color: '#C2410C' },
                    ]}>
                      {msg.text}
                    </Text>
                  )}

                  <Text style={[
                    s.bubbleTime,
                    isBot ? s.bubbleTimeBot : s.bubbleTimeUser,
                  ]}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Context awareness footer */}
          <View style={s.contextFooter}>
            <Feather name="shield" size={11} color="#CBD5E1" />
            <Text style={s.contextFooterText}>
              FreshBot checks your pantry for expiry alerts · general food-saving tips · waste reduction
            </Text>
          </View>
        </ScrollView>

        {/* ── Input area — sits above bottom nav, never overlaps it ── */}
        <View style={s.inputArea}>

          {/* Suggested prompts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.promptsScroll}
          >
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={s.promptChip}
                onPress={() => handlePromptTap(prompt)}
                activeOpacity={0.7}
              >
                <Text style={s.promptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input row */}
          <View style={s.inputRow}>
            {/* Camera button */}
            <TouchableOpacity
              style={s.roundIconBtn}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Camera', 'Camera input is not available in this version.')}
            >
              <Feather name="camera" size={18} color="#64748B" />
            </TouchableOpacity>

            {/* Text box */}
            <View style={s.textInputWrap}>
              <TextInput
                style={s.textInput}
                placeholder="Ask FreshBot anything..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={200}
              />
            </View>

            {/* Send or mic */}
            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                style={[s.sendBtn, isSending && { opacity: 0.5 }]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={isSending}
              >
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.sendBtn, s.sendBtnMic]}
                onPress={() => Alert.alert('Voice Input', 'Voice input is not available in this version.')}
                activeOpacity={0.85}
              >
                <Feather
                  name="mic"
                  size={16}
                  color="#fff"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#fff' },
  flex:               { flex: 1 },

  // Bot bar
  botBar:             { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  botAvatar:          { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  botName:            { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  onlineRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  onlineText:         { fontSize: 11, color: '#64748B', fontWeight: '500' },
  contextTag:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#BBF7D0' },
  contextTagText:     { fontSize: 12, fontWeight: '700', color: '#2D6A4F' },

  // Chat
  chatScroll:         { flex: 1, backgroundColor: '#F8FAFC' },
  chatContent:        { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },

  dateSep:            { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dateLine:           { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dateLabel:          { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

  // Proactive banner
  proactiveBanner:    { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  proactiveTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  proactiveIcon:      { width: 28, height: 28, backgroundColor: '#FEF3C7', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  proactiveTitle:     { flex: 1, fontSize: 13, fontWeight: '800', color: '#1E293B' },
  proactiveText:      { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 12 },
  proactiveChips:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  expiryChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FECACA' },
  expiryChipDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  expiryChipText:     { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  proactiveBtn:       { backgroundColor: '#1C3A2E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  proactiveBtnText:   { fontSize: 13, fontWeight: '800', color: '#4ADE80' },

  // Messages
  msgRow:             { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  msgRowBot:          { justifyContent: 'flex-start', paddingRight: 48 },
  msgRowUser:         { justifyContent: 'flex-end', paddingLeft: 48 },
  msgAvatar:          { width: 28, height: 28, borderRadius: 9, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2, flexShrink: 0 },

  bubble:             { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, flexShrink: 1 },
  bubbleBot:          { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 5, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  bubbleUser:         { backgroundColor: '#1C3A2E', borderBottomRightRadius: 5 },
  bubbleSuggestion:   { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 },
  bubbleWarning:      { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1 },

  bubbleHeader:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  bubbleHeaderText:   { fontSize: 11, fontWeight: '800' },
  bubbleText:         { fontSize: 14, lineHeight: 21 },
  bubbleTextBot:      { color: '#1E293B' },
  bubbleTextUser:     { color: '#fff' },
  bubbleTime:         { fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
  bubbleTimeBot:      { color: '#94A3B8' },
  bubbleTimeUser:     { color: 'rgba(255,255,255,0.5)' },

  contextFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingHorizontal: 20 },
  contextFooterText:  { fontSize: 11, color: '#CBD5E1', textAlign: 'center', flex: 1, lineHeight: 16 },

  // Input area
  inputArea:          { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingBottom: Platform.OS === 'ios' ? 12 : 8 },

  promptsScroll:      { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  promptChip:         { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16 },
  promptText:         { fontSize: 12, color: '#475569', fontWeight: '600' },

  recordingBanner:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEF2F2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#FECACA' },
  recordingDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  recordingText:      { flex: 1, fontSize: 12, color: '#DC2626', fontWeight: '600' },

  inputRow:           { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 4, gap: 8 },
  roundIconBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 1 },
  textInputWrap:      { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 22, minHeight: 44, maxHeight: 110, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 11 : 8, justifyContent: 'center' },
  textInput:          { fontSize: 14, color: '#1E293B', padding: 0 },

  sendBtn:            { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1C3A2E', alignItems: 'center', justifyContent: 'center', shadowColor: '#1C3A2E', shadowOpacity: 0.3, shadowRadius: 6, elevation: 3, marginBottom: 1 },
  sendBtnMic:         { backgroundColor: '#2D6A4F' },
  sendBtnRecording:   { backgroundColor: '#EF4444' },
});