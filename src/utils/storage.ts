import type { FoodEntry } from '../types';
import { STORAGE_KEY } from './constants';

export function loadEntries(): FoodEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FoodEntry[];
  } catch {
    console.error('Failed to load food entries from storage');
    return [];
  }
}

export function saveEntries(entries: FoodEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    console.error('Failed to save food entries to storage');
  }
}

export function importData(file: File): Promise<FoodEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) {
          reject(new Error('Invalid file format: expected an array of entries'));
          return;
        }
        const entries = data.filter(
          (item): item is FoodEntry =>
            item !== null &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.date === 'string' &&
            typeof item.foodName === 'string'
        );
        if (entries.length === 0 && data.length > 0) {
          reject(new Error('Invalid file format: no valid food entries found'));
          return;
        }
        resolve(entries);
      } catch {
        reject(new Error('Invalid file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
