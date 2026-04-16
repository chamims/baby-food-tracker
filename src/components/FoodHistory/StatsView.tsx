import { useMemo, useRef, useState } from 'react';
import type { FoodEntry } from '../../types';
import { FOOD_CATEGORIES, ENJOYMENT_LEVELS, ALLERGENS } from '../../utils/constants';
import { importData } from '../../utils/storage';
import { SUPABASE_ENABLED } from '../../utils/supabase';

interface StatsViewProps {
  entries: FoodEntry[];
  onImport: (entries: FoodEntry[]) => void;
  onSyncToCloud?: () => Promise<number>;
}

export default function StatsView({ entries, onImport, onSyncToCloud }: StatsViewProps) {
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
