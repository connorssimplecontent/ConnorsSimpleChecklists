import React from 'react';

/** Segmented control for switching between a checklist's pre-established versions. */
export default function VersionToggle({ variants, activeId, onChange, size = 'md' }) {
  if (!variants || variants.length < 2) return null;
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <div className="op-segment inline-flex flex-wrap p-1 gap-1" role="radiogroup" aria-label="Checklist version">
      {variants.map(v => {
        const active = v.id === activeId;
        return (
          <button
            key={v.id}
            role="radio"
            aria-checked={active}
            onClick={e => {
              e.stopPropagation();
              if (!active) onChange(v.id);
            }}
            className={`${pad} font-bold ${active ? 'op-btn-primary' : 'opacity-75 hover:opacity-100'}`}
            style={{ borderRadius: 'var(--btn-radius)' }}
          >
            {v.name}
          </button>
        );
      })}
    </div>
  );
}
