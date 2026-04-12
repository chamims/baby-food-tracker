import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { FoodEntry, FoodCategory } from '../../types';
import { FOOD_CATEGORIES } from '../../utils/constants';
import FoodEntryCard from '../FoodEntry/FoodEntryCard';

interface FoodHistoryViewProps {
  entries: FoodEntry[];
  onDeleteEntry: (id: string) => void;
}

type SortBy = 'date_desc' | 'date_asc' | 'name' | 'enjoyment';

export default function FoodHistoryView({ entries, onDeleteEntry }: FoodHistoryViewProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<FoodCategory | 'all'>('all');
  const [filterReaction, setFilterReaction] = useState<'all' | 'reaction' | 'no_reaction'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [showOnlyFirst, setShowOnlyFirst] = useState(false);

  const uniqueFoodCount = useMemo(() =>
    new Set(entries.map(e => e.foodName.toLowerCase())).size,
  [entries]);

  const filtered = useMemo(() => {
    let result = [...entries];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => e.foodName.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q));
    }

    if (filterCategory !== 'all') {
      result = result.filter(e => e.foodCategory === filterCategory);
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
  }, [entries, search, filterCategory, filterReaction, sortBy, showOnlyFirst]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
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
        <div className="relative">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none pr-6">
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
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-sage-50 to-transparent" />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
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

          {(search.trim() !== '' || filterCategory !== 'all' || filterReaction !== 'all' || showOnlyFirst) && (
            <button
              onClick={() => { setSearch(''); setFilterCategory('all'); setFilterReaction('all'); setShowOnlyFirst(false); }}
              className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all ml-auto"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-500 font-medium">
        {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        <span className="text-gray-400 font-normal"> · {uniqueFoodCount} unique foods tried</span>
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
