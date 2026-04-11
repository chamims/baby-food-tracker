import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { FoodEntry, FoodCategory } from '../../types';
import { FOOD_CATEGORIES, ENJOYMENT_LEVELS, ALLERGENS } from '../../utils/constants';
import FoodEntryCard from '../FoodEntry/FoodEntryCard';

interface FoodHistoryViewProps {
  entries: FoodEntry[];
  onDeleteEntry: (id: string) => void;
}

type SortBy = 'date_desc' | 'date_asc' | 'name' | 'enjoyment';
type FilterAllergen = string | 'all' | 'none';

export default function FoodHistoryView({ entries, onDeleteEntry }: FoodHistoryViewProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<FoodCategory | 'all'>('all');
  const [filterAllergen, setFilterAllergen] = useState<FilterAllergen>('all');
  const [filterReaction, setFilterReaction] = useState<'all' | 'reaction' | 'no_reaction'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [showOnlyFirst, setShowOnlyFirst] = useState(false);

  const uniqueFoods = useMemo(() => {
    const map = new Map<string, FoodEntry>();
    entries.forEach(e => {
      const key = e.foodName.toLowerCase();
      if (!map.has(key) || e.date < map.get(key)!.date) {
        map.set(key, e);
      }
    });
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    let result = [...entries];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => e.foodName.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q));
    }

    if (filterCategory !== 'all') {
      result = result.filter(e => e.foodCategory === filterCategory);
    }

    if (filterAllergen !== 'all') {
      if (filterAllergen === 'none') {
        result = result.filter(e => e.allergens.length === 0);
      } else {
        result = result.filter(e => e.allergens.includes(filterAllergen));
      }
    }

    if (filterReaction !== 'all') {
      result = result.filter(e => filterReaction === 'reaction' ? e.hadReaction : !e.hadReaction);
    }

    if (showOnlyFirst) {
      result = result.filter(e => e.isFirstIntroduction);
    }

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'name') return a.foodName.localeCompare(b.foodName);
      if (sortBy === 'enjoyment') {
        const order = ['loved_it', 'liked_it', 'neutral', 'disliked', 'refused'];
        return order.indexOf(a.enjoyment) - order.indexOf(b.enjoyment);
      }
      return 0;
    });

    return result;
  }, [entries, search, filterCategory, filterAllergen, filterReaction, sortBy, showOnlyFirst]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search foods or notes..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-gray-800 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCategory('all')}
            className={`chip px-3 py-1.5 flex-shrink-0 border transition-all ${filterCategory === 'all' ? 'bg-sage-100 text-sage-700 border-sage-300' : 'bg-white text-gray-500 border-gray-200'}`}
          >
            All
          </button>
          {FOOD_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`chip px-3 py-1.5 flex-shrink-0 border transition-all ${filterCategory === cat.id ? `${cat.color} border-current` : 'bg-white text-gray-500 border-gray-200'}`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-sage-400"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name">A–Z</option>
            <option value="enjoyment">Most enjoyed</option>
          </select>

          <select
            value={filterReaction}
            onChange={e => setFilterReaction(e.target.value as 'all' | 'reaction' | 'no_reaction')}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-sage-400"
          >
            <option value="all">All reactions</option>
            <option value="reaction">Had reaction ⚠️</option>
            <option value="no_reaction">No reaction ✅</option>
          </select>

          <button
            onClick={() => setShowOnlyFirst(f => !f)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${showOnlyFirst ? 'bg-sage-100 text-sage-700 border-sage-300' : 'bg-white text-gray-500 border-gray-200'}`}
          >
            ⭐ First tries only
          </button>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-400">
        {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} · {uniqueFoods.size} unique foods tried
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-gray-500">No entries match your filters</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(entry => (
            <div key={entry.id}>
              <p className="text-xs text-gray-400 mb-1 px-1">
                {format(new Date(entry.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              </p>
              <FoodEntryCard entry={entry} onDelete={onDeleteEntry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
