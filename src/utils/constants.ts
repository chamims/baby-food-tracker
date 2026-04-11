import type { FoodCategory, Texture, TimeOfDay, AmountEaten, EnjoymentLevel } from '../types';

export const ALLERGENS = [
  { id: 'milk', label: 'Milk / Dairy', emoji: '🥛' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚' },
  { id: 'fish', label: 'Fish', emoji: '🐟' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { id: 'tree_nuts', label: 'Tree Nuts', emoji: '🌰' },
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'wheat', label: 'Wheat / Gluten', emoji: '🌾' },
  { id: 'soybeans', label: 'Soybeans', emoji: '🫘' },
  { id: 'sesame', label: 'Sesame', emoji: '🌿' },
] as const;

export const SYMPTOMS = [
  { id: 'rash', label: 'Rash / Hives', emoji: '🔴' },
  { id: 'swelling', label: 'Swelling', emoji: '🫧' },
  { id: 'vomiting', label: 'Vomiting', emoji: '🤢' },
  { id: 'diarrhea', label: 'Diarrhea', emoji: '💧' },
  { id: 'gas', label: 'Gas / Bloating', emoji: '😣' },
  { id: 'constipation', label: 'Constipation', emoji: '😖' },
  { id: 'runny_nose', label: 'Runny Nose', emoji: '🤧' },
  { id: 'watery_eyes', label: 'Watery Eyes', emoji: '👁️' },
  { id: 'fussiness', label: 'Fussiness', emoji: '😢' },
  { id: 'sleep_changes', label: 'Sleep Changes', emoji: '😴' },
] as const;

export const FOOD_CATEGORIES: { id: FoodCategory; label: string; emoji: string; color: string }[] = [
  { id: 'fruits', label: 'Fruits', emoji: '🍎', color: 'bg-red-100 text-red-700' },
  { id: 'vegetables', label: 'Vegetables', emoji: '🥕', color: 'bg-orange-100 text-orange-700' },
  { id: 'grains', label: 'Grains', emoji: '🌾', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'proteins', label: 'Proteins', emoji: '🥩', color: 'bg-rose-100 text-rose-700' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛', color: 'bg-blue-100 text-blue-700' },
  { id: 'other', label: 'Other', emoji: '🍽️', color: 'bg-gray-100 text-gray-700' },
];

export const TEXTURES: { id: Texture; label: string }[] = [
  { id: 'puree', label: 'Purée / Smooth' },
  { id: 'mashed', label: 'Mashed' },
  { id: 'soft_chunks', label: 'Soft Chunks' },
  { id: 'finger_food', label: 'Finger Food' },
];

export const TIMES_OF_DAY: { id: TimeOfDay; label: string; emoji: string }[] = [
  { id: 'morning', label: 'Morning', emoji: '🌅' },
  { id: 'midday', label: 'Midday', emoji: '☀️' },
  { id: 'afternoon', label: 'Afternoon', emoji: '🌤️' },
  { id: 'evening', label: 'Evening', emoji: '🌙' },
];

export const AMOUNTS: { id: AmountEaten; label: string; emoji: string }[] = [
  { id: 'none', label: 'None', emoji: '❌' },
  { id: 'a_little', label: 'A little', emoji: '🤏' },
  { id: 'half', label: 'About half', emoji: '🌗' },
  { id: 'most', label: 'Most of it', emoji: '🌕' },
  { id: 'all', label: 'All of it!', emoji: '✅' },
];

export const ENJOYMENT_LEVELS: { id: EnjoymentLevel; label: string; emoji: string; color: string }[] = [
  { id: 'loved_it', label: 'Loved it!', emoji: '😍', color: 'bg-green-100 text-green-700' },
  { id: 'liked_it', label: 'Liked it', emoji: '😊', color: 'bg-sage-100 text-sage-700' },
  { id: 'neutral', label: 'Meh', emoji: '😐', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'disliked', label: 'Disliked', emoji: '😕', color: 'bg-orange-100 text-orange-700' },
  { id: 'refused', label: 'Refused', emoji: '🙅', color: 'bg-red-100 text-red-700' },
];

export const STORAGE_KEY = 'baby-food-tracker-entries';
