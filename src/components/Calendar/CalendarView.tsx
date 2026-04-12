import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import type { FoodEntry } from '../../types';
import DayCell from './DayCell';
import FoodEntryCard from '../FoodEntry/FoodEntryCard';
import AddFoodModal from '../FoodEntry/AddFoodModal';

interface CalendarViewProps {
  entries: FoodEntry[];
  onAddEntry: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void;
  onDeleteEntry: (id: string) => void;
  isFirstIntroduction: (foodName: string, date: string) => boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ entries, onAddEntry, onDeleteEntry, isFirstIntroduction }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForDate, setAddForDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEntriesForDate = (dateStr: string) => entries.filter(e => e.date === dateStr);

  const handleDayClick = (date: string) => {
    setSelectedDate(date === selectedDate ? null : date);
  };

  const handleAddForDate = (date: string) => {
    setAddForDate(date);
    setShowAddModal(true);
  };

  const selectedEntries = selectedDate ? getEntriesForDate(selectedDate) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-2 rounded-xl hover:bg-sage-100 text-sage-600 font-bold text-lg transition-colors"
        >
          ‹
        </button>
        <h2 className="text-lg font-bold text-gray-700">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-2 rounded-xl hover:bg-sage-100 text-sage-600 font-bold text-lg transition-colors"
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div key={format(currentMonth, 'yyyy-MM')} className="grid grid-cols-7 gap-1 animate-slide-in">
        {calDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <DayCell
              key={dateStr}
              date={dateStr}
              dayNumber={day.getDate()}
              isToday={isToday(day)}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              entries={getEntriesForDate(dateStr)}
              onClick={handleDayClick}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
        <span>⭐ First try</span>
        <span>⚠️ Reaction</span>
        <span>🍎 Fruit</span>
        <span>🥕 Veggie</span>
        <span>🌾 Grain</span>
        <span>🥩 Protein</span>
        <span>🥛 Dairy</span>
      </div>

      {/* Onboarding empty state */}
      {entries.length === 0 && (
        <div className="card bg-sage-50 border-sage-200 text-center py-6">
          <p className="text-4xl mb-2">🌱</p>
          <p className="font-semibold text-sage-700 text-base">Welcome! Start tracking Baby's food journey.</p>
          <p className="text-sm text-gray-500 mt-1">
            Tap any day on the calendar, or use the <span className="font-semibold">+</span> button below to log your first food.
          </p>
        </div>
      )}

      {/* Selected day detail */}
      {selectedDate && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d')}
            </h3>
            <button
              onClick={() => handleAddForDate(selectedDate)}
              className="btn-primary text-sm py-1.5 px-3"
            >
              + Add Food
            </button>
          </div>

          {selectedEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No foods logged this day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedEntries.map(entry => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={onDeleteEntry}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating add button (for today) */}
      {!selectedDate && (
        <button
          onClick={() => handleAddForDate(format(new Date(), 'yyyy-MM-dd'))}
          className="fixed bottom-28 right-4 w-14 h-14 bg-sage-500 hover:bg-sage-600 active:bg-sage-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors z-20"
          aria-label="Add food entry for today"
        >
          +
        </button>
      )}

      {showAddModal && (
        <AddFoodModal
          date={addForDate}
          onClose={() => setShowAddModal(false)}
          onSave={(entry) => {
            onAddEntry(entry);
            setShowAddModal(false);
          }}
          isFirstIntroduction={isFirstIntroduction}
        />
      )}
    </div>
  );
}
