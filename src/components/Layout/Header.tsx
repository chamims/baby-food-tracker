import React from 'react';
import type { View } from '../../types';

interface HeaderProps {
  view: View;
  babyName?: string;
}

const VIEW_TITLES: Record<View, string> = {
  calendar: 'Food Calendar',
  history: 'Food History',
  stats: 'Stats & Insights',
};

export default function Header({ view, babyName }: HeaderProps) {
  return (
    <header className="bg-white border-b border-sage-100 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sage-700">{VIEW_TITLES[view]}</h1>
          {babyName && (
            <p className="text-xs text-gray-400">Tracking for {babyName}</p>
          )}
        </div>
        <span className="text-2xl">🍼</span>
      </div>
    </header>
  );
}
