import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FoodEntry } from '../types';
import { loadEntries, saveEntries } from '../utils/storage';
import { ALLERGENS } from '../utils/constants';
import {
  SUPABASE_ENABLED,
  dbLoadEntries,
  dbInsertEntry,
  dbUpdateEntry,
  dbDeleteEntry,
  dbUpsertEntries,
  subscribeFoodEntries,
} from '../utils/supabase';

function describeSyncError(err: unknown, fallback: string): string {
  const code = (err as { code?: string; status?: number })?.code;
  const status = (err as { status?: number })?.status;
  if (status === 401 || code === 'PGRST301') {
    return 'Cloud sync failed — please sign in again';
  }
  if (code === '42501') {
    return 'Cloud sync blocked — you no longer have access to this household';
  }
  return fallback;
}

interface UseFoodEntriesOptions {
  onSyncError?: (message: string) => void;
  householdId?: string | null;
}

export function useFoodEntries(options: UseFoodEntriesOptions = {}) {
  const { onSyncError, householdId } = options;
  // When Supabase is enabled, start with an empty list and load from DB.
  // Otherwise, hydrate immediately from localStorage.
  const [entries, setEntries] = useState<FoodEntry[]>(() =>
    SUPABASE_ENABLED ? [] : loadEntries()
  );
  const [syncing, setSyncing] = useState(false);

  // On mount (or when householdId changes): load from Supabase when household is set.
  // When householdId goes null (sign-out), clear in-memory + localStorage cache
  // so the next user on the same browser never sees the previous user's data.
  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    if (!householdId) {
      setEntries([]);
      saveEntries([]);
      return;
    }
    setSyncing(true);
    dbLoadEntries()
      .then((data) => {
        setEntries(data);
        saveEntries(data);
      })
      .catch((err) => {
        console.error('Failed to load from Supabase:', err);
        onSyncError?.('Failed to load your data from the cloud');
      })
      .finally(() => setSyncing(false));

    // Realtime: subscribe to inserts/updates/deletes from household-mates.
    // Dedupe by id vs. our optimistic writes.
    const unsubscribe = subscribeFoodEntries(householdId, {
      onInsert: (entry) => setEntries(prev => {
        if (prev.some(e => e.id === entry.id)) return prev;
        const next = [...prev, entry];
        saveEntries(next);
        return next;
      }),
      onUpdate: (entry) => setEntries(prev => {
        const next = prev.map(e => e.id === entry.id ? entry : e);
        saveEntries(next);
        return next;
      }),
      onDelete: (id) => setEntries(prev => {
        const next = prev.filter(e => e.id !== id);
        saveEntries(next);
        return next;
      }),
    });
    return unsubscribe;
  }, [householdId, onSyncError]);

  const addEntry = useCallback((entry: Omit<FoodEntry, 'id' | 'createdAt'>) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => {
      const updated = [...prev, newEntry];
      saveEntries(updated);
      return updated;
    });
    if (SUPABASE_ENABLED && householdId) {
      dbInsertEntry(newEntry, householdId).catch(err => {
        console.error('Supabase insert failed:', err);
        onSyncError?.(describeSyncError(err, 'Failed to save to cloud — saved locally'));
      });
    }
    return newEntry;
  }, [householdId, onSyncError]);

  const updateEntry = useCallback((id: string, updates: Partial<FoodEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveEntries(updated);
      return updated;
    });
    if (SUPABASE_ENABLED) {
      dbUpdateEntry(id, updates).catch(err => {
        console.error('Supabase update failed:', err);
        onSyncError?.(describeSyncError(err, 'Failed to sync update to cloud — saved locally'));
      });
    }
  }, [onSyncError]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveEntries(updated);
      return updated;
    });
    if (SUPABASE_ENABLED) {
      dbDeleteEntry(id).catch(err => {
        console.error('Supabase delete failed:', err);
        onSyncError?.(describeSyncError(err, 'Failed to sync delete to cloud — removed locally'));
      });
    }
  }, [onSyncError]);

  const isFirstIntroduction = useCallback((foodName: string, _date: string) => {
    // First intro = no other stored entry has this food name (case-insensitive).
    // For new entries the to-be-saved record isn't in `entries` yet, so any
    // match means "already tried" — including same-day duplicates.
    // For edits, AddFoodModal only re-applies this flag when the food name
    // actually changes, so the self-match on unchanged edits is a non-issue.
    const needle = foodName.trim().toLowerCase();
    return !entries.some(e => e.foodName.trim().toLowerCase() === needle);
  }, [entries]);

  const recentNewAllergens = useMemo(() => {
    // Normalize to midnight so entry dates (parsed at 00:00) compare correctly
    // against the cutoff — otherwise reminders disappear up to 24h early.
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 5);

    // Build map: allergen ID → earliest entry date
    const firstSeen: Record<string, string> = {};
    for (const entry of entries) {
      for (const allergenId of entry.allergens) {
        if (!firstSeen[allergenId] || entry.date < firstSeen[allergenId]) {
          firstSeen[allergenId] = entry.date;
        }
      }
    }

    return Object.entries(firstSeen)
      .filter(([, date]) => new Date(date + 'T00:00:00') >= cutoff)
      .map(([allergenId, firstDate]) => {
        const first = new Date(firstDate + 'T00:00:00');
        const waitStart = new Date(first);
        waitStart.setDate(first.getDate() + 3);
        const waitEnd = new Date(first);
        waitEnd.setDate(first.getDate() + 5);
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const allergen = ALLERGENS.find(a => a.id === allergenId);
        return {
          allergenId,
          allergenLabel: allergen ? `${allergen.emoji} ${allergen.label}` : allergenId,
          firstDate: fmt(first),
          waitUntil: `${fmt(waitStart)}–${fmt(waitEnd)}`,
        };
      });
  }, [entries]);

  const importEntries = useCallback((imported: FoodEntry[]) => {
    setEntries(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const newEntries = imported.filter(e => !existingIds.has(e.id));
      const merged = [...prev, ...newEntries];
      saveEntries(merged);
      return merged;
    });
    if (SUPABASE_ENABLED && householdId) {
      dbUpsertEntries(imported, householdId).catch(err => {
        console.error('Supabase import sync failed:', err);
        onSyncError?.(describeSyncError(err, 'Imported locally but cloud sync failed'));
      });
    }
  }, [householdId, onSyncError]);

  return {
    entries,
    syncing,
    addEntry,
    updateEntry,
    deleteEntry,
    importEntries,
    isFirstIntroduction,
    recentNewAllergens,
  };
}
