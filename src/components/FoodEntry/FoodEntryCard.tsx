import { useState } from 'react';
import type { FoodEntry } from '../../types';
import { ALLERGENS, ENJOYMENT_LEVELS, FOOD_CATEGORIES, AMOUNTS, TEXTURES, TIMES_OF_DAY, SYMPTOMS } from '../../utils/constants';

interface FoodEntryCardProps {
  entry: FoodEntry;
  onDelete: (id: string) => void;
}

export default function FoodEntryCard({ entry, onDelete }: FoodEntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const category = FOOD_CATEGORIES.find(c => c.id === entry.foodCategory);
  const enjoyment = ENJOYMENT_LEVELS.find(e => e.id === entry.enjoyment);
  const amount = AMOUNTS.find(a => a.id === entry.amountEaten);
  const time = TIMES_OF_DAY.find(t => t.id === entry.timeOfDay);
  const texture = TEXTURES.find(t => t.id === entry.texture);
  const allergenLabels = entry.allergens.map(id => ALLERGENS.find(a => a.id === id)?.label).filter(Boolean);
  const symptomLabels = entry.symptoms.map(id => SYMPTOMS.find(s => s.id === id)?.label).filter(Boolean);

  return (
    <div className={`rounded-xl border p-3 transition-all ${entry.hadReaction ? 'border-amber-300 bg-amber-50' : 'border-sage-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{category?.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-800 capitalize">{entry.foodName}</span>
              {entry.isFirstIntroduction && (
                <span className="chip bg-sage-100 text-sage-700">⭐ First try!</span>
              )}
              {entry.hadReaction && (
                <span className="chip bg-amber-100 text-amber-700">⚠️ Reaction</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
              <span>{time?.emoji} {time?.label}</span>
              <span>·</span>
              <span className={`chip ${enjoyment?.color}`}>{enjoyment?.emoji} {enjoyment?.label}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400 text-xs uppercase font-medium">Texture</span>
              <p className="text-gray-700">{texture?.label}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase font-medium">Amount eaten</span>
              <p className="text-gray-700">{amount?.emoji} {amount?.label}</p>
            </div>
          </div>

          {allergenLabels.length > 0 && (
            <div>
              <span className="text-gray-400 text-xs uppercase font-medium block mb-1">Contains allergens</span>
              <div className="flex flex-wrap gap-1">
                {allergenLabels.map(label => (
                  <span key={label} className="chip bg-amber-100 text-amber-700">{label}</span>
                ))}
              </div>
            </div>
          )}

          {entry.hadReaction && symptomLabels.length > 0 && (
            <div>
              <span className="text-gray-400 text-xs uppercase font-medium block mb-1">Symptoms observed</span>
              <div className="flex flex-wrap gap-1">
                {symptomLabels.map(label => (
                  <span key={label} className="chip bg-red-100 text-red-700">{label}</span>
                ))}
              </div>
              {entry.reactionDelay && (
                <p className="text-xs text-red-500 mt-1">
                  Appeared: {entry.reactionDelay === 'immediate' ? 'Immediately' : entry.reactionDelay === 'within_hours' ? 'Within a few hours' : 'Next day'}
                </p>
              )}
            </div>
          )}

          {entry.notes && (
            <div>
              <span className="text-gray-400 text-xs uppercase font-medium block mb-1">Notes</span>
              <p className="text-sm text-gray-700">{entry.notes}</p>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            {confirmDelete ? (
              <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">
                <span className="text-sm text-red-700 font-medium">Delete this entry?</span>
                <div className="flex gap-3">
                  <button onClick={() => onDelete(entry.id)} className="text-sm text-red-600 font-semibold hover:underline">Yes, delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500 hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-400 hover:text-red-600 transition-colors">
                Delete entry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
