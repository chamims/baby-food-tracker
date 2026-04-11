import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FoodEntry } from '../types';
import { loadEntries, saveEntries } from '../utils/storage';

export function useFoodEntries() {
  const [entries, setEntries] = useState<FoodEntry[]>(() => loadEntries());

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
    return newEntry;
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<FoodEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveEntries(updated);
      return updated;
    });
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
    addEntry,
    updateEntry,
    deleteEntry,
    getEntriesForDate,
    getEntriesForMonth,
    getFoodNames,
    isFirstIntroduction,
    setEntries,
  };
}
