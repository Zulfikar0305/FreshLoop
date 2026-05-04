import type { InventoryItem } from './inventoryService';

const GEMINI_MODEL = 'gemini-2.0-flash';

export type PantryRecipeIngredient = {
  name: string;
  amount?: number;
  unit?: string;
  inPantry: boolean;
  custom?: boolean;
};

/** Shape consumed by `RecipeModal` and AI recipe cards */
export type PantryRecipeCard = {
  id: string;
  title: string;
  time: string;
  difficulty: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  icon: string;
  calories: number;
  steps: string[];
  ingredients: PantryRecipeIngredient[];
};

type GeminiRecipeRaw = {
  title?: unknown;
  summary?: unknown;
  prepTimeMinutes?: unknown;
  difficulty?: unknown;
  caloriesPerServing?: unknown;
  ingredients?: unknown;
  steps?: unknown;
};

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env and restart Expo.'
    );
  }
  return key.trim();
}

function formatInventoryLines(items: InventoryItem[]): string {
  return items
    .map((i) => {
      const qty = `${i.quantity} ${i.unit}`.trim();
      const exp =
        i.expiryDate instanceof Date
          ? ` · expires ${i.expiryDate.toISOString().slice(0, 10)}`
          : '';
      const cat = i.category ? ` · ${i.category}` : '';
      return `- ${i.name} (${qty})${cat}${exp}`;
    })
    .join('\n');
}

function stripCodeFence(text: string): string {
  let t = text.trim();
  const fenced = /^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/im.exec(t);
  if (fenced) return fenced[1].trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  }
  return t.trim();
}

function parseRecipeArray(rawText: string): GeminiRecipeRaw[] {
  const cleaned = stripCodeFence(rawText);
  const parsed = JSON.parse(cleaned) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as GeminiRecipeRaw[];
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as { recipes?: unknown }).recipes)
  ) {
    return (parsed as { recipes: GeminiRecipeRaw[] }).recipes;
  }
  throw new Error('Gemini did not return a JSON array of recipes.');
}

function coerceIngredient(x: unknown): PantryRecipeIngredient | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) return null;
  let amount: number | undefined;
  if (typeof o.amount === 'number' && !Number.isNaN(o.amount)) amount = o.amount;
  else if (typeof o.amount === 'string' && o.amount.trim()) {
    const n = parseFloat(o.amount);
    if (!Number.isNaN(n)) amount = n;
  }
  const unit = typeof o.unit === 'string' ? o.unit.trim() : undefined;
  const fromPantry =
    o.fromPantry === true ||
    o.inPantry === true ||
    o.from_pantry === true;
  return { name, amount, unit, inPantry: fromPantry };
}

function coerceRecipe(raw: GeminiRecipeRaw, index: number): PantryRecipeCard {
  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim().slice(0, 140)
      : `Recipe ${index + 1}`;
  const summary =
    typeof raw.summary === 'string' ? raw.summary.trim().slice(0, 280) : '';

  let prep =
    typeof raw.prepTimeMinutes === 'number' && raw.prepTimeMinutes > 0
      ? Math.round(raw.prepTimeMinutes)
      : 20;
  if (typeof raw.prepTimeMinutes === 'string') {
    const n = parseFloat(raw.prepTimeMinutes);
    if (!Number.isNaN(n) && n > 0) prep = Math.round(n);
  }

  const difficultyRaw =
    typeof raw.difficulty === 'string' ? raw.difficulty.trim() : 'Easy';
  const difficulty = ['Easy', 'Medium', 'Hard'].includes(difficultyRaw)
    ? difficultyRaw
    : 'Easy';

  let calories = 250;
  if (typeof raw.caloriesPerServing === 'number' && raw.caloriesPerServing > 0) {
    calories = Math.round(raw.caloriesPerServing);
  }

  let steps = Array.isArray(raw.steps)
    ? raw.steps.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (steps.length === 0) {
    steps = [
      'Combine the listed ingredients and cook until textures and flavours come together and food is safe to eat.',
    ];
  }

  const ingredients: PantryRecipeIngredient[] = Array.isArray(raw.ingredients)
    ? (raw.ingredients.map(coerceIngredient).filter(Boolean) as PantryRecipeIngredient[])
    : [];

  const icons = ['🍽️', '🥗', '🍲', '🍳', '🥘', '🍝', '🌯', '🥙'];
  const icon = icons[(title.length + index) % icons.length];

  const tag =
    summary.length > 50 ? `${summary.slice(0, 47)}…` : summary || 'From your pantry';

  return {
    id: `gemini-${Date.now()}-${index}`,
    title,
    time: `${prep} min`,
    difficulty,
    tag,
    tagColor: '#0D9488',
    tagBg: '#CCFBF1',
    icon,
    calories,
    steps,
    ingredients,
  };
}

export type GenerateRecipesOptions = {
  householdSize?: number;
  recipeCount?: number;
  diets?: string[];
  allergens?: string[];
};

/**
 * Calls Gemini with the user's pantry list and returns recipes that should only use those ingredients
 * (optional pantry staples like salt / pepper / cooking oil / water may appear as non-pantry extras).
 */
export async function generateRecipesFromInventory(
  inventory: InventoryItem[],
  options?: GenerateRecipesOptions
): Promise<PantryRecipeCard[]> {
  const apiKey = getApiKey();
  const householdSize = options?.householdSize ?? 2;
  const recipeCount = Math.min(Math.max(options?.recipeCount ?? 4, 1), 8);
  const diets = options?.diets?.filter(Boolean) ?? [];
  const allergens = options?.allergens?.filter(Boolean) ?? [];

  const active = inventory.filter((i) => i.status === 'active');
  if (active.length === 0) {
    throw new Error('No active pantry items. Add food in Quick Add first.');
  }

  const pantryBlock = formatInventoryLines(active);

  const dietLine = diets.length > 0
    ? `8. This meal plan must suit these dietary requirements: ${diets.join(', ')}. All recipes must comply.`
    : '';
  const allergenLine = allergens.length > 0
    ? `${diets.length > 0 ? '9' : '8'}. STRICTLY AVOID the following allergens in every recipe — do not include even trace amounts: ${allergens.join(', ')}.`
    : '';
  const extraRules = [dietLine, allergenLine].filter(Boolean).join('\n');

  const prompt = `You are FreshLoop, a practical home-cooking assistant.

STRICT RULES:
1. The user ONLY has the ingredients listed below. Every main ingredient must come from this list.
2. You MAY additionally assume tiny amounts of basic pantry staples ONLY when essential: salt, black pepper, water, and neutral cooking oil. List those in "ingredients" with fromPantry: false and small realistic amounts.
3. Do NOT require any other ingredients (no butter, milk, lemon, herbs, stock, etc.) unless they appear in the list below.
4. Prefer recipes that use items expiring soon when expiry dates are shown.
5. Servings should generally suit ${householdSize} people — mention scaling only inside steps if needed.
6. ALWAYS include at least one no-cook or minimal-prep recipe if the pantry allows it. If there is bread + any spread (peanut butter, jam, honey, butter) → include a sandwich or toast recipe. If there is fruit + yoghurt → a bowl or smoothie. Simple, obvious combinations ARE valid recipes and must be included.
7. If the pantry has fewer than 4 active items, propose recipes that use only those exact items — do not invent extra main ingredients. A peanut butter sandwich IS a valid recipe. An apple with peanut butter IS a valid recipe. Do not pad with ingredients not in the list.${extraRules ? '\n' + extraRules : ''}

PANTRY (only allowed ingredients from here as primary foods):
${pantryBlock}

Return ONLY valid JSON (no markdown): an array of exactly ${recipeCount} recipe objects.
Each object MUST have this shape:
{
  "title": string,
  "summary": string (one short sentence),
  "prepTimeMinutes": number,
  "difficulty": "Easy" | "Medium" | "Hard",
  "caloriesPerServing": number (rough estimate),
  "ingredients": [ { "name": string, "amount": number | null, "unit": string | null, "fromPantry": boolean } ],
  "steps": string[] (numbered instructions as plain sentences, no numbering prefix needed)
}

Use fromPantry: true for any ingredient drawn from the PANTRY list above (match names loosely). Use fromPantry: false only for salt/pepper/oil/water staples or items truly not from the list (there should be none except staples).`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.65,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gemini error (${res.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    throw new Error('Empty response from Gemini. Try again.');
  }

  let rawList: GeminiRecipeRaw[];
  try {
    rawList = parseRecipeArray(text);
  } catch {
    throw new Error('Could not parse recipe JSON from Gemini. Try generating again.');
  }

  const cards = rawList
    .map((r, i) => coerceRecipe(r, i))
    .filter((c) => c.title.trim().length > 0 && c.ingredients.length > 0);

  if (cards.length === 0) {
    throw new Error('Gemini returned no usable recipes. Try again.');
  }

  return cards;
}
