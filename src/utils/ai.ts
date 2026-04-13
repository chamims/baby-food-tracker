import { GoogleGenerativeAI } from '@google/generative-ai';
import type { FoodCategory, TimeOfDay } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY as string | undefined;
export const AI_ENABLED = Boolean(API_KEY);

let _client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!_client) {
    _client = new GoogleGenerativeAI(API_KEY!);
  }
  return _client;
}

// Derive a TimeOfDay bucket from an HH:MM string
export function deriveTimeOfDay(hhmm: string): TimeOfDay {
  const [h, m] = hhmm.split(':').map(Number);
  const mins = h * 60 + (m || 0);
  if (mins >= 300 && mins < 660) return 'morning';   // 05:00–10:59
  if (mins >= 660 && mins < 840) return 'midday';    // 11:00–13:59
  if (mins >= 840 && mins < 1080) return 'afternoon'; // 14:00–17:59
  return 'evening';                                    // 18:00–04:59
}

// --- analyzeFood ---

export type FoodAnalysis = {
  category: FoodCategory;
  allergens: string[];
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
};

const ANALYZE_FOOD_PROMPT = (foodName: string) =>
  `You are a baby food nutrition assistant. Analyze "${foodName}" as typically prepared for babies (pureed, soft, or age-appropriate form).

Respond with ONLY a valid JSON object — no explanation, no markdown, no code fences. Use exactly this schema:

{
  "category": "<one of: fruits | vegetables | grains | proteins | dairy | other>",
  "allergens": ["<zero or more of: milk, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soybeans, sesame>"],
  "nutrition": {
    "calories": <number per 100g>,
    "protein_g": <number>,
    "carbs_g": <number>,
    "fat_g": <number>,
    "fiber_g": <number>
  }
}

Rules:
- allergens must only contain IDs from the exact list above
- nutrition values are per 100g, rounded to one decimal place
- if the food is unknown or ambiguous, use your best estimate and category "other"`;

function parseJson<T>(text: string): T {
  // Extract the first {...} block — handles any preamble/postamble the model adds
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]) as T;
  // Fallback: strip markdown code fences and try directly
  const stripped = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(stripped) as T;
}

export async function analyzeFood(foodName: string): Promise<FoodAnalysis | null> {
  if (!AI_ENABLED) return null;
  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(ANALYZE_FOOD_PROMPT(foodName));
    return parseJson<FoodAnalysis>(result.response.text());
  } catch {
    return null;
  }
}

// --- analyzeFoodImage ---

export type ImageAnalysis = {
  foodName: string;
  category: FoodCategory;
  allergens: string[];
  notes: string;
};

const ANALYZE_IMAGE_PROMPT =
  `You are a baby food assistant. Identify the food shown in this photo or on this food label.

Respond with ONLY a valid JSON object — no explanation, no markdown, no code fences:

{
  "foodName": "<the primary food name, capitalized, e.g. Sweet potato — always provide your best guess even if uncertain>",
  "category": "<one of: fruits | vegetables | grains | proteins | dairy | other>",
  "allergens": ["<zero or more of: milk, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soybeans, sesame>"],
  "notes": "<one short sentence describing what you see>"
}

Rules:
- allergens must only contain IDs from the exact list above
- foodName should be your best guess at the primary ingredient — only leave empty if absolutely no food is visible at all
- If reading a label, use the product's main food ingredient as the name`;

export async function analyzeFoodImage(
  base64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<ImageAnalysis | null> {
  if (!AI_ENABLED) return null;
  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      ANALYZE_IMAGE_PROMPT,
    ]);
    const text = result.response.text();
    const parsed = parseJson<ImageAnalysis>(text);

    // Fallback: if vision pass returned no food name but wrote a description,
    // ask the model to extract the name from that description.
    if (!parsed.foodName && parsed.notes) {
      try {
        const fallback = await model.generateContent(
          `Food description: "${parsed.notes}"\n\nWhat is the primary food item? Reply with ONLY the food name, 1–3 words, capitalized. Example: "Banana" or "Sweet potato".`
        );
        const name = fallback.response.text().trim();
        if (name) parsed.foodName = name;
      } catch {
        // fallback failed — foodName stays empty, caller will show hint
      }
    }

    return parsed;
  } catch (err) {
    console.error('[analyzeFoodImage] failed:', err);
    return null;
  }
}
