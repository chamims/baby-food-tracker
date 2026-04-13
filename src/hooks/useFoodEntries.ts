import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FoodEntry } from '../types';
import { loadEntries, saveEntries } from '../utils/storage';
import {
  SUPABASE_ENABLED,
  dbLoadEntries,
  dbInsertEntry,
  dbUpdateEntry,
  dbDeleteEntry,
} from '../utils/supabase';

export function useFoodEntries() {
  // When Supabase is enabled, start with an empty list and load from DB.
  // Otherwise, hydrate immediately from localStorage.
  const [entries, setEntries] = useState<FoodEntry[]>(() =>
    SUPABASE_ENABLED ? [] : loadEntries()
  );
  const [syncing, setSyncing] = useState(SUPABASE_ENABLED);

  // On mount: load from Supabase (when enabled), fall back to localStorage on error.
  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    dbLoadEntries()
      .then((data) => {
        setEntries(data);
        saveEntries(data); // keep localStorage in sync as offline cache
      })
      .catch((err) => {
        console.error('Failed to load from Supabase, falling back to localStorage:', err);
        setEntries(loadEntries());
      })
      .finally(() => setSyncing(false));
  }, []);

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
    if (SUPABASE_ENABLED) {
      dbInsertEntry(newEntry).catch(err =>
        console.error('Supabase insert failed:', err)
      );
    }
    return newEntry;
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<FoodEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveEntries(updated);
      return updated;
    });
    if (SUPABASE_ENABLED) {
      dbUpdateEntry(id, updates).catch(err =>
        console.error('Supabase update failed:', err)
      );
    }
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveEntries(updated);
      return updated;
    });
    if (SUPABASE_ENABLED) {
      dbDeleteEntry(id).catch(err =>
        console.error('Supabase delete failed:', err)
      );
    }
  }, []);

  const getEntriesForDate = useCallback((date: string) => {
    return entries.filter(e => e.date === date);
  }, [entries]);

  const getEntriesForMonth = useCallback((year: number, month: number) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return entries.filter(e => e.date.startsWith(prefix));
  }, [entries]);

  const getFoodNames = useCallback(() => {
    const names = new Set(entries.map(e => e.foodName.toLowerCase()));
    return Array.from(names).sort();
  }, [entries]);

  const isFirstIntroduction = useCallback((foodName: string, date: string) => {
    return !entries.some(e =>
      e.foodName.toLowerCase() === foodName.toLowerCase() && e.date < date
    );
  }, [entries]);

  return {
    entries,
    syncing,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntriesForDate,
    getEntriesForMonth,
    getFoodNames,
    isFirstIntroduction,
  };
}
