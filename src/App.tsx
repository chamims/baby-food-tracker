import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import type { View } from './types';
import { useFoodEntries } from './hooks/useFoodEntries';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import CalendarView from './components/Calendar/CalendarView';
import FoodHistoryView from './components/FoodHistory/FoodHistoryView';
import StatsView from './components/FoodHistory/StatsView';

const BABY_NAME = 'Baby'; // TODO: make this configurable via settings

export default function App() {
  const [view, setView] = useState<View>('calendar');
  const {
    entries,
    addEntry,
    deleteEntry,
    isFirstIntroduction,
  } = useFoodEntries();

  return (
    <div className="min-h-screen flex flex-col bg-sage-50">
      <Header view={view} babyName={BABY_NAME} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {view === 'calendar' && (
            <CalendarView
              entries={entries}
              onAddEntry={addEntry}
              onDeleteEntry={deleteEntry}
              isFirstIntroduction={isFirstIntroduction}
            />
          )}
          {view === 'history' && (
            <FoodHistoryView
              entries={entries}
              onDeleteEntry={deleteEntry}
            />
          )}
          {view === 'stats' && (
            <StatsView entries={entries} />
          )}
        </div>
      </main>

      <Navigation view={view} onViewChange={setView} />
      <Analytics />
    </div>
  );
}
