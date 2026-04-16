import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
export type { Session };
import type { FoodEntry } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_ENABLED = Boolean(supabaseUrl && supabaseKey);

export const supabase = SUPABASE_ENABLED
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

// ---------------------------------------------------------------------------
// DB row type (snake_case columns matching the food_entries table)
// ---------------------------------------------------------------------------
interface DbRow {
  id: string;
  date: string;
  food_name: string;
  food_category: string;
  texture: string;
  time_of_day: string;
  amount_eaten: string;
  enjoyment: string;
  allergens: string[];
  is_first_introduction: boolean;
  had_reaction: boolean;
  reaction_delay: string | null;
  symptoms: string[];
  notes: string;
  created_at: string;
  feeding_time: string | null;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } | null;
  photo_analysis: string | null;
  household_id: string;
}

function rowToEntry(row: DbRow): FoodEntry {
  return {
    id: row.id,
    date: row.date,
    foodName: row.food_name,
    foodCategory: row.food_category as FoodEntry['foodCategory'],
    texture: row.texture as FoodEntry['texture'],
    timeOfDay: row.time_of_day as FoodEntry['timeOfDay'],
    amountEaten: row.amount_eaten as FoodEntry['amountEaten'],
    enjoyment: row.enjoyment as FoodEntry['enjoyment'],
    allergens: row.allergens,
    isFirstIntroduction: row.is_first_introduction,
    hadReaction: row.had_reaction,
    reactionDelay: row.reaction_delay as FoodEntry['reactionDelay'],
    symptoms: row.symptoms,
    notes: row.notes,
    createdAt: row.created_at,
    feedingTime: row.feeding_time ?? undefined,
    nutrition: row.nutrition ?? undefined,
    photoAnalysis: row.photo_analysis ?? undefined,
  };
}

function entryToRow(entry: FoodEntry, householdId: string): DbRow {
  return {
    id: entry.id,
    date: entry.date,
    food_name: entry.foodName,
    food_category: entry.foodCategory,
    texture: entry.texture,
    time_of_day: entry.timeOfDay,
    amount_eaten: entry.amountEaten,
    enjoyment: entry.enjoyment,
    allergens: entry.allergens,
    is_first_introduction: entry.isFirstIntroduction,
    had_reaction: entry.hadReaction,
    reaction_delay: entry.reactionDelay ?? null,
    symptoms: entry.symptoms,
    notes: entry.notes,
    created_at: entry.createdAt,
    feeding_time: entry.feedingTime ?? null,
    nutrition: entry.nutrition ?? null,
    photo_analysis: entry.photoAnalysis ?? null,
    household_id: householdId,
  };
}

function updatesToPartialRow(updates: Partial<FoodEntry>): Partial<DbRow> {
  const row: Partial<DbRow> = {};
  if (updates.date !== undefined) row.date = updates.date;
  if (updates.foodName !== undefined) row.food_name = updates.foodName;
  if (updates.foodCategory !== undefined) row.food_category = updates.foodCategory;
  if (updates.texture !== undefined) row.texture = updates.texture;
  if (updates.timeOfDay !== undefined) row.time_of_day = updates.timeOfDay;
  if (updates.amountEaten !== undefined) row.amount_eaten = updates.amountEaten;
  if (updates.enjoyment !== undefined) row.enjoyment = updates.enjoyment;
  if (updates.allergens !== undefined) row.allergens = updates.allergens;
  if (updates.isFirstIntroduction !== undefined) row.is_first_introduction = updates.isFirstIntroduction;
  if (updates.hadReaction !== undefined) row.had_reaction = updates.hadReaction;
  if (updates.reactionDelay !== undefined) row.reaction_delay = updates.reactionDelay ?? null;
  if (updates.symptoms !== undefined) row.symptoms = updates.symptoms;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.feedingTime !== undefined) row.feeding_time = updates.feedingTime ?? null;
  if (updates.nutrition !== undefined) row.nutrition = updates.nutrition ?? null;
  if (updates.photoAnalysis !== undefined) row.photo_analysis = updates.photoAnalysis ?? null;
  return row;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export async function dbLoadEntries(): Promise<FoodEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DbRow[]).map(rowToEntry);
}

export async function dbInsertEntry(entry: FoodEntry, householdId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('food_entries').insert(entryToRow(entry, householdId));
  if (error) throw error;
}

export async function dbUpdateEntry(id: string, updates: Partial<FoodEntry>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('food_entries')
    .update(updatesToPartialRow(updates))
    .eq('id', id);
  if (error) throw error;
}

export async function dbDeleteEntry(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('food_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function dbUpsertEntries(entries: FoodEntry[], householdId: string): Promise<number> {
  if (!supabase || entries.length === 0) return 0;
  const rows = entries.map(e => entryToRow(e, householdId));
  const { error, count } = await supabase
    .from('food_entries')
    .upsert(rows, { onConflict: 'id', count: 'exact' });
  if (error) throw error;
  return count ?? rows.length;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithOtp(email: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function signOutFromSupabase(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

// ---------------------------------------------------------------------------
// Household helpers
// ---------------------------------------------------------------------------

export async function dbGetHousehold(): Promise<{ id: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1)
    .single();
  if (error) return null;
  return { id: (data as { household_id: string }).household_id };
}

export async function dbCreateHousehold(userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not enabled');
  const { data: household, error: hErr } = await supabase
    .from('households')
    .insert({ owner_user_id: userId })
    .select('id')
    .single();
  if (hErr) throw hErr;
  const householdId = (household as { id: string }).id;
  const { error: mErr } = await supabase
    .from('household_members')
    .insert({ household_id: householdId, user_id: userId, role: 'owner' });
  if (mErr) throw mErr;
  return householdId;
}
