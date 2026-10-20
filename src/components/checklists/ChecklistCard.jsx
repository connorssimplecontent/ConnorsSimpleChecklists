import React from 'react';
import { RotateCcw, Users, Radio } from 'lucide-react';
import { progress } from '../../utils/checklist';
import { ProgressBar } from '../ui/Modal';
import VersionToggle from './VersionToggle';

export default function ChecklistCard({ checklist, me, onOpen, onReset, onVersionChange }) {
  const p = progress(checklist);
  const isOwner = !me || checklist.ownerId === me.uid;
  const others = checklist.members.length - 1;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(checklist.id)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onOpen(checklist.id)}
      className="op-card op-checklist-card p-4 flex flex-col gap-3"
      aria-label={`Open ${checklist.title}`}
    >
      <div className="flex items-start gap-3">
        <span className="op-emoji" aria-hidden="true">{checklist.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="op-heading text-lg leading-tight truncate">{checklist.title}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px] font-semibold">
            {!isOwner && (
              <span className="op-badge op-chip px-2 py-0.5 inline-flex items-center gap-1">
                <Users size={11} /> Shared by {checklist.ownerName || 'someone'}
              </span>
            )}
            {isOwner && others > 0 && (
              <span className="op-badge op-chip px-2 py-0.5 inline-flex items-center gap-1">
                <Users size={11} /> Shared with {others}
              </span>
            )}
            {isOwner && checklist.liveCode && (
              <span className="op-badge op-chip px-2 py-0.5 inline-flex items-center gap-1">
                <Radio size={11} /> Live code on
              </span>
            )}
          </div>
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onReset(checklist);
          }}
          disabled={!Object.keys(checklist.checked).length}
          title="Reset completed items"
          aria-label={`Reset ${checklist.title}`}
          className="op-btn-secondary p-2 disabled:opacity-30"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <VersionToggle
        size="sm"
        variants={checklist.variants}
        activeId={checklist.activeVariantId}
        onChange={vid => onVersionChange(checklist, vid)}
      />

      <div className="mt-auto">
        <div className="flex justify-between text-xs font-semibold mb-1.5">
          <span>{p.complete ? 'All done! 🎉' : `${p.total - p.done} left`}</span>
          <span className="opacity-75">{p.done}/{p.total} · {p.pct}%</span>
        </div>
        <ProgressBar pct={p.pct} complete={p.complete} label={`${checklist.title} progress`} />
      </div>
    </div>
  );
}
