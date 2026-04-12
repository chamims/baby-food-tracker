import type { FoodEntry } from '../../types';
import { FOOD_CATEGORIES } from '../../utils/constants';

interface DayCellProps {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  entries: FoodEntry[];
  onClick: (date: string) => void;
}

export default function DayCell({ date, dayNumber, isToday, isCurrentMonth, entries, onClick }: DayCellProps) {
  const hasReaction = entries.some(e => e.hadReaction);
  const hasFirstIntro = entries.some(e => e.isFirstIntroduction);

  const getCategoryEmoji = (category: string) => {
    return FOOD_CATEGORIES.find(c => c.id === category)?.emoji ?? '🍽️';
  };

  return (
    <button
      onClick={() => onClick(date)}
      className={`
        relative p-1.5 min-h-[72px] rounded-xl text-left transition-all border
        ${isCurrentMonth ? 'text-gray-800' : 'text-gray-300'}
        ${isToday ? 'border-sage-400 bg-sage-50' : 'border-transparent hover:border-sage-200 hover:bg-sage-50/50'}
        ${entries.length > 0 ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <span className={`text-xs font-semibold block mb-1 ${isToday ? 'text-sage-600' : ''}`}>
        {dayNumber}
      </span>

      {/* Indicator dots */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {entries.slice(0, 3).map(entry => (
            <span key={entry.id} className="text-xs leading-none" title={entry.foodName}>
              {getCategoryEmoji(entry.foodCategory)}
            </span>
          ))}
          {entries.length > 3 && (
            <span className="text-xs text-gray-400 leading-none">+{entries.length - 3}</span>
          )}
        </div>
      )}

      {/* Status badges */}
      <div className="absolute top-1 right-1 flex gap-0.5">
        {hasReaction && (
          <span className="text-xs leading-none" title="Had a reaction">⚠️</span>
        )}
        {hasFirstIntro && !hasReaction && (
          <span className="text-xs leading-none" title="First introduction">⭐</span>
        )}
      </div>
    </button>
  );
}
