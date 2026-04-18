export type FoodCategory = 'fruits' | 'vegetables' | 'grains' | 'proteins' | 'dairy' | 'purees' | 'other';
export type Texture = 'puree' | 'mashed' | 'soft_chunks' | 'finger_food';
export type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening';
export type AmountEaten = 'none' | 'a_little' | 'half' | 'most' | 'all';
export type EnjoymentLevel = 'loved_it' | 'liked_it' | 'neutral' | 'disliked' | 'refused';
export type ReactionDelay = 'immediate' | 'within_hours' | 'next_day';

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  foodName: string;
  foodCategory: FoodCategory;
  texture: Texture;
  timeOfDay: TimeOfDay;
  amountEaten: AmountEaten;
  enjoyment: EnjoymentLevel;
  allergens: string[]; // allergen IDs from ALLERGENS constant
  isFirstIntroduction: boolean;
  hadReaction: boolean;
  reactionDelay: ReactionDelay | null;
  symptoms: string[]; // symptom IDs from SYMPTOMS constant
  notes: string;
  createdAt: string; // ISO timestamp
  feedingTime?: string; // "HH:MM" 24h format, e.g. "07:30"
  nutrition?: {
    calories: number;
    protein: number; // grams
    carbs: number;   // grams
    fat: number;     // grams
    fiber: number;   // grams
  };
  photoAnalysis?: string; // one-sentence AI description from Vision
}

export type View = 'calendar' | 'history' | 'stats';
