import React from 'react';

export const THEMES = [
  { id: 'standard', label: 'Standard Theme' },
  { id: 'pretty', label: 'Pretty Theme ✨' },
  { id: 'manly', label: 'Manly Theme ⚡' },
  { id: 'beach', label: 'Beach Vibe 🏖️' },
  { id: 'circus', label: 'Circus Theme 🎪' }
];

export default function ThemeSwitcher({ currentTheme, setTheme }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-select" className="text-xs font-bold uppercase hidden sm:inline">Theme:</label>
      <select
        id="theme-select"
        value={currentTheme}
        onChange={e => setTheme(e.target.value)}
        className="p-1.5 text-xs rounded border border-gray-600 bg-black/20 font-semibold cursor-pointer"
      >
        {THEMES.map(t => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}
