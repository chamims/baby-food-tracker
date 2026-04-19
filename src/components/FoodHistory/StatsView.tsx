import { useMemo, useRef, useState } from 'react';
import type { FoodEntry } from '../../types';
import { FOOD_CATEGORIES, ENJOYMENT_LEVELS, ALLERGENS, TIMES_OF_DAY } from '../../utils/constants';
import { importData } from '../../utils/storage';
import { SUPABASE_ENABLED } from '../../utils/supabase';
import type { BabyProfile } from '../../utils/profile';

interface StatsViewProps {
  entries: FoodEntry[];
  profile?: BabyProfile;
  onImport: (entries: FoodEntry[]) => void;
  onSyncToCloud?: () => Promise<number>;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DOW_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StatsView({ entries, profile, onImport, onSyncToCloud }: StatsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState('');

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baby-food-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
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

  const weeklyNewFoods = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => isoDaysAgo(6 - i));
    const cutoff = days[0];
    const dailyCounts = days.map(day => entries.filter(e => e.date === day).length);
    const newFoodCount = entries.filter(e => e.isFirstIntroduction && e.date >= cutoff).length;
    const sparkMax = Math.max(1, ...dailyCounts);
    return { days, dailyCounts, newFoodCount, sparkMax };
  }, [entries]);

  const heatmap = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => isoDaysAgo(6 - i));
    const dayOfWeekForCol = days.map(d => new Date(d + 'T00:00:00').getDay());
    const grid: Record<string, number[]> = {};
    for (const bucket of TIMES_OF_DAY) grid[bucket.id] = Array(7).fill(0);
    for (let col = 0; col < 7; col++) {
      const day = days[col];
      const dayEntries = entries.filter(e => e.date === day);
      for (const entry of dayEntries) {
        if (grid[entry.timeOfDay]) grid[entry.timeOfDay][col] += 1;
      }
    }
    let max = 0;
    for (const bucket of TIMES_OF_DAY) {
      for (const c of grid[bucket.id]) if (c > max) max = c;
    }
    return { grid, max: Math.max(1, max), dayOfWeekForCol };
  }, [entries]);

  const textureNudge = useMemo(() => {
    if (!profile?.dob) return null;
    const dob = new Date(profile.dob + 'T00:00:00');
    if (isNaN(dob.getTime())) return null;
    const ageMonths = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (ageMonths < 7) return null;
    const cutoff = isoDaysAgo(13);
    const recent = entries.filter(e => e.date >= cutoff);
    if (recent.length < 5) return null;
    const soft = recent.filter(e => e.texture === 'puree' || e.texture === 'mashed').length;
    const softShare = soft / recent.length;
    if (softShare < 0.8) return null;
    return { softShare };
  }, [entries, profile?.dob]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-gray-500 font-medium">No data yet</p>
          <p className="text-gray-400 text-sm mt-1">Start logging foods to see stats here!</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-700 dark:text-stone-200 mb-3">Data</h3>
          <div className="flex gap-2">
            <button onClick={() => handleExport()} className="btn-secondary flex-1 text-sm">Export JSON</button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex-1 text-sm">Import JSON</button>
          </div>
          {SUPABASE_ENABLED && onSyncToCloud && (
            <button
              onClick={async () => {
                setSyncing(true);
                setSyncStatus('');
                try {
                  const count = await onSyncToCloud();
                  setSyncStatus(`Synced ${count} entries to cloud ✓`);
                } catch {
                  setSyncStatus('Sync failed — check connection');
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing || entries.length === 0}
              className="btn-secondary w-full text-sm mt-2 disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync to Cloud ☁️'}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = '';
              try {
                const imported = await importData(file);
                onImport(imported);
                setImportStatus(`Imported ${imported.length} entries ✓`);
              } catch {
                setImportStatus('Import failed: invalid format');
              }
            }}
          />
          {importStatus && (
            <p className={`text-xs mt-2 ${importStatus.includes('failed') ? 'text-red-500' : 'text-sage-600'}`}>{importStatus}</p>
          )}
          {syncStatus && (
            <p className={`text-xs mt-2 ${syncStatus.includes('failed') ? 'text-red-500' : 'text-sage-600'}`}>
              {syncStatus}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {textureNudge && (
        <div className="bg-sage-50 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-700 rounded-2xl p-4 shadow-sm">
          <p className="font-semibold text-sage-700 dark:text-sage-300 mb-1">🍽️ Ready for more texture?</p>
          <p className="text-sm text-sage-700/90 dark:text-sage-200/90">
            {Math.round(textureNudge.softShare * 100)}% of the last 14 days have been purée or mashed. Your baby may be ready to try soft chunks or finger foods.
          </p>
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-sage-600">{stats.uniqueFoods.size}</p>
          <p className="text-sm text-gray-500 dark:text-stone-400 mt-0.5">Unique foods tried</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-sage-600">{entries.length}</p>
          <p className="text-sm text-gray-500 dark:text-stone-400 mt-0.5">Total feedings logged</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-amber-500">{stats.reactions.length}</p>
          <p className="text-sm text-gray-500 dark:text-stone-400 mt-0.5">Reactions logged</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-sage-500">{stats.firstIntros.length}</p>
          <p className="text-sm text-gray-500 dark:text-stone-400 mt-0.5">First introductions</p>
        </div>
      </div>

      {/* Weekly new foods + sparkline */}
      <div className="card">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-sage-600">{weeklyNewFoods.newFoodCount}</p>
            <p className="text-sm text-gray-500 dark:text-stone-400 mt-0.5">New foods this week</p>
          </div>
          <div className="flex-1 max-w-[160px]">
            <div className="flex items-end gap-1 h-10">
              {weeklyNewFoods.dailyCounts.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 bg-sage-400 dark:bg-sage-500 rounded-sm"
                  style={{ height: `${Math.max(6, (count / weeklyNewFoods.sparkMax) * 100)}%`, opacity: count === 0 ? 0.15 : 1 }}
                  title={`${count} entr${count === 1 ? 'y' : 'ies'}`}
                />
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {weeklyNewFoods.days.map(day => (
                <div key={day} className="flex-1 text-center text-[10px] text-gray-400 dark:text-stone-500">
                  {DOW_INITIALS[new Date(day + 'T00:00:00').getDay()]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enjoyment breakdown */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 dark:text-stone-200 mb-3">Enjoyment Breakdown</h3>
        <div className="space-y-2">
          {stats.byEnjoyment.filter(e => e.count > 0).map(e => (
            <div key={e.id} className="flex items-center gap-2">
              <span className="text-lg w-6">{e.emoji}</span>
              <span className="text-sm text-gray-600 dark:text-stone-300 w-24 flex-shrink-0">{e.label}</span>
              <div className="flex-1 bg-gray-100 dark:bg-stone-700 rounded-full h-2 overflow-hidden">
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
          <h3 className="font-semibold text-gray-700 dark:text-stone-200 mb-3">By Food Category</h3>
          <div className="space-y-2">
            {stats.byCategory.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <span className="text-lg w-6">{cat.emoji}</span>
                <span className="text-sm text-gray-600 dark:text-stone-300 w-24 flex-shrink-0">{cat.label}</span>
                <div className="flex-1 bg-gray-100 dark:bg-stone-700 rounded-full h-2 overflow-hidden">
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

      {/* Feeding windows heatmap */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 dark:text-stone-200 mb-3">Feeding Windows — Last 7 Days</h3>
        <div className="space-y-1.5">
          {TIMES_OF_DAY.map(bucket => (
            <div key={bucket.id} className="flex items-center gap-2">
              <span className="text-lg w-6 text-center" aria-label={bucket.label}>{bucket.emoji}</span>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {heatmap.grid[bucket.id].map((count, col) => (
                  <div
                    key={col}
                    className={`aspect-square rounded-md ${count === 0 ? 'bg-gray-100 dark:bg-stone-700' : 'bg-sage-500'}`}
                    style={count === 0 ? undefined : { opacity: 0.2 + 0.8 * (count / heatmap.max) }}
                    title={`${count} ${bucket.label.toLowerCase()} feeding${count === 1 ? '' : 's'}`}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <span className="w-6" />
            <div className="flex-1 grid grid-cols-7 gap-1">
              {heatmap.dayOfWeekForCol.map((dow, col) => (
                <div key={col} className="text-center text-[10px] text-gray-400 dark:text-stone-500">
                  {DOW_INITIALS[dow]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Favorites */}
      {stats.topFavorites.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 dark:text-stone-200 mb-3">😍 Most Loved Foods</h3>
          <div className="space-y-1.5">
            {stats.topFavorites.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-stone-200 capitalize">
                  <span className="text-gray-400 dark:text-stone-500 mr-1.5">{i + 1}.</span>{name}
                </span>
                <span className="chip bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">{count}× loved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top foods by frequency */}
      {stats.topFoods.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 dark:text-stone-200 mb-3">🍽️ Most Frequently Given</h3>
          <div className="space-y-1.5">
            {stats.topFoods.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-stone-200 capitalize">
                  <span className="text-gray-400 dark:text-stone-500 mr-1.5">{i + 1}.</span>{name}
                </span>
                <span className="chip bg-sage-100 dark:bg-stone-700 text-sage-700 dark:text-sage-300">{count}× given</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergen foods */}
      {stats.allergenFoods.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-3">⚠️ Allergen Foods Tried</h3>
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

      {/* Data management */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 dark:text-stone-200 mb-3">Data</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport()}
            className="btn-secondary flex-1 text-sm"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex-1 text-sm"
          >
            Import JSON
          </button>
        </div>
        {SUPABASE_ENABLED && onSyncToCloud && (
          <button
            onClick={async () => {
              setSyncing(true);
              setSyncStatus('');
              try {
                const count = await onSyncToCloud();
                setSyncStatus(`Synced ${count} entries to cloud ✓`);
              } catch {
                setSyncStatus('Sync failed — check connection');
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing || entries.length === 0}
            className="btn-secondary w-full text-sm mt-2 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync to Cloud ☁️'}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';
            try {
              const imported = await importData(file);
              onImport(imported);
              setImportStatus(`Imported ${imported.length} entries ✓`);
            } catch {
              setImportStatus('Import failed: invalid format');
            }
          }}
        />
        {importStatus && (
          <p className={`text-xs mt-2 ${importStatus.includes('failed') ? 'text-red-500' : 'text-sage-600'}`}>
            {importStatus}
          </p>
        )}
        {syncStatus && (
          <p className={`text-xs mt-2 ${syncStatus.includes('failed') ? 'text-red-500' : 'text-sage-600'}`}>
            {syncStatus}
          </p>
        )}
      </div>
    </div>
  );
}
