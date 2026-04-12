import { useMemo } from 'react';
import type { FoodEntry } from '../../types';
import { FOOD_CATEGORIES, ENJOYMENT_LEVELS, ALLERGENS } from '../../utils/constants';

interface StatsViewProps {
  entries: FoodEntry[];
}

export default function StatsView({ entries }: StatsViewProps) {
  const stats = useMemo(() => {
    const uniqueFoods = new Set(entries.map(e => e.foodName.toLowerCase()));
    const reactions = entries.filter(e => e.hadReaction);
    const firstIntros = entries.filter(e => e.isFirstIntroduction);
    const allergenFoods = entries.filter(e => e.allergens.length > 0);

    const byCategory = FOOD_CATEGORIES.map(cat => ({
      ...cat,
      count: entries.filter(e => e.foodCategory === cat.id).length,
    })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

    const byEnjoyment = ENJOYMENT_LEVELS.map(lvl => ({
      ...lvl,
      count: entries.filter(e => e.enjoyment === lvl.id).length,
    }));

    const topFoods = Array.from(
      entries.reduce((map, entry) => {
        const key = entry.foodName.toLowerCase();
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const favoriteFoods = entries
      .filter(e => e.enjoyment === 'loved_it')
      .reduce((map, entry) => {
        const key = entry.foodName;
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>());

    const topFavorites = Array.from(favoriteFoods).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { uniqueFoods, reactions, firstIntros, allergenFoods, byCategory, byEnjoyment, topFoods, topFavorites };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-gray-500 font-medium">No data yet</p>
        <p className="text-gray-400 text-sm mt-1">Start logging foods to see stats here!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-sage-600">{stats.uniqueFoods.size}</p>
          <p className="text-sm text-gray-500 mt-0.5">Unique foods tried</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-sage-600">{entries.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total feedings logged</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-amber-500">{stats.reactions.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Reactions logged</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-sage-500">{stats.firstIntros.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">First introductions</p>
        </div>
      </div>

      {/* Enjoyment breakdown */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Enjoyment Breakdown</h3>
        <div className="space-y-2">
          {stats.byEnjoyment.filter(e => e.count > 0).map(e => (
            <div key={e.id} className="flex items-center gap-2">
              <span className="text-lg w-6">{e.emoji}</span>
              <span className="text-sm text-gray-600 w-24 flex-shrink-0">{e.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sage-400 transition-all"
                  style={{ width: `${Math.round((e.count / entries.length) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-6 text-right">{e.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      {stats.byCategory.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">By Food Category</h3>
          <div className="space-y-2">
            {stats.byCategory.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <span className="text-lg w-6">{cat.emoji}</span>
                <span className="text-sm text-gray-600 w-24 flex-shrink-0">{cat.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-peach-400 transition-all"
                    style={{ width: `${Math.round((cat.count / entries.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      {stats.topFavorites.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">😍 Most Loved Foods</h3>
          <div className="space-y-1.5">
            {stats.topFavorites.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">
                  <span className="text-gray-400 mr-1.5">{i + 1}.</span>{name}
                </span>
                <span className="chip bg-green-100 text-green-700">{count}× loved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top foods by frequency */}
      {stats.topFoods.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">🍽️ Most Frequently Given</h3>
          <div className="space-y-1.5">
            {stats.topFoods.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">
                  <span className="text-gray-400 mr-1.5">{i + 1}.</span>{name}
                </span>
                <span className="chip bg-sage-100 text-sage-700">{count}× given</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergen foods */}
      {stats.allergenFoods.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-amber-700 mb-3">⚠️ Allergen Foods Tried</h3>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set(stats.allergenFoods.flatMap(e => e.allergens))).map(id => {
              const allergen = ALLERGENS.find(a => a.id === id);
              return allergen ? (
                <span key={id} className="chip bg-amber-100 text-amber-700">
                  {allergen.emoji} {allergen.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
