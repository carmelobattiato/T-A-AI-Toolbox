import React from 'react';
import { ICON_OPTIONS } from '../../utils/icons.tsx';
import { IconKey } from '../../utils/iconKeys.ts';

interface IconPickerProps {
  value: IconKey | null;
  onChange: (value: IconKey | null) => void;
}

// Grid of every icon the app uses. "Default" clears the choice: the map then picks the icon as before.
export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="font-semibold text-slate-700">Icon</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md cursor-pointer ${
          value === null ? 'text-purple-700 bg-purple-50' : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        Default
      </button>
    </div>
    <div className="grid grid-cols-8 gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50/60">
      {ICON_OPTIONS.map(({ key, label, Icon }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`flex h-9 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              selected
                ? 'border-purple-500 bg-white text-purple-700 ring-2 ring-purple-500/25 shadow-sm'
                : 'border-transparent text-slate-500 hover:bg-white hover:border-slate-200 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  </div>
);
