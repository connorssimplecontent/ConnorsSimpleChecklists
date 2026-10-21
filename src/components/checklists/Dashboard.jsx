import React, { useMemo, useState } from 'react';
import { Plus, KeyRound, Search, ListChecks } from 'lucide-react';
import { progress } from '../../utils/checklist';
import ChecklistCard from './ChecklistCard';
import DuePanel from './DuePanel';
import { useNow } from '../../utils/dates';

const SORTS = {
  recent: (a, b) => b.updatedAt - a.updatedAt,
  name: (a, b) => a.title.localeCompare(b.title),
  progress: (a, b) => progress(b).pct - progress(a).pct
};

/** Top-level view of every checklist. */
export default function Dashboard({ checklists, me, onOpen, onNew, onJoin, onReset, onVersionChange, onToggleItem, onUpdate, notify, banner }) {
  const now = useNow();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all'); // all | mine | shared
  const [sort, setSort] = useState('recent');

  const stats = useMemo(() => {
    let done = 0, total = 0, complete = 0, shared = 0;
    for (const c of checklists) {
      const p = progress(c);
      done += p.done;
      total += p.total;
      if (p.complete) complete += 1;
      if (c.members.length > 1) shared += 1;
    }
    return { done, total, complete, shared };
  }, [checklists]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return checklists
      .filter(c => {
        if (scope === 'mine' && me && c.ownerId !== me.uid) return false;
        if (scope === 'shared' && c.members.length < 2) return false;
        if (!q) return true;
        return c.title.toLowerCase().includes(q) || c.items.some(i => i.text.toLowerCase().includes(q));
      })
      .sort(SORTS[sort]);
  }, [checklists, search, scope, sort, me]);

  return (
    <div className="space-y-5">
      {banner}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Checklists" value={checklists.length} />
        <Stat label="Items done" value={`${stats.done}/${stats.total}`} />
        <Stat label="Completed lists" value={stats.complete} />
        <Stat label="Shared lists" value={stats.shared} />
      </div>

      <DuePanel checklists={checklists} now={now} onOpen={onOpen} onToggleItem={onToggleItem} onUpdate={onUpdate} notify={notify} />

      {/* Toolbar */}
      <div className="op-card p-3 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search checklists and items…"
            className="w-full pl-9 pr-3 py-2 rounded border text-sm"
            aria-label="Search checklists"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {me && (
            <div className="op-segment inline-flex p-1 gap-1" role="radiogroup" aria-label="Filter">
              {[['all', 'All'], ['mine', 'Mine'], ['shared', 'Shared']].map(([id, label]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={scope === id}
                  onClick={() => setScope(id)}
                  className={`px-3 py-1 text-xs font-bold ${scope === id ? 'op-btn-primary' : 'opacity-75'}`}
                  style={{ borderRadius: 'var(--btn-radius)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <select value={sort} onChange={e => setSort(e.target.value)} className="p-1.5 text-xs rounded border font-semibold" aria-label="Sort">
            <option value="recent">Recently updated</option>
            <option value="name">Name</option>
            <option value="progress">Most complete</option>
          </select>
          <button onClick={onJoin} className="op-btn-secondary px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5">
            <KeyRound size={15} /> Join with code
          </button>
          <button onClick={onNew} className="op-btn-primary px-4 py-2 text-sm font-bold inline-flex items-center gap-1.5">
            <Plus size={16} /> New checklist
          </button>
        </div>
      </div>

      {/* Grid */}
      {visible.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(c => (
            <ChecklistCard key={c.id} checklist={c} me={me} now={now} onOpen={onOpen} onReset={onReset} onVersionChange={onVersionChange} />
          ))}
        </div>
      ) : (
        <div className="op-card p-10 text-center space-y-3">
          <ListChecks size={40} className="mx-auto opacity-60" />
          <p className="font-semibold">{checklists.length ? 'No checklists match.' : 'No checklists yet.'}</p>
          {!checklists.length && (
            <button onClick={onNew} className="op-btn-primary px-4 py-2 text-sm font-bold inline-flex items-center gap-1.5">
              <Plus size={16} /> Create your first checklist
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="op-stat p-3">
      <div className="text-[11px] font-bold uppercase opacity-75">{label}</div>
      <div className="op-modal-title text-xl mt-0.5">{value}</div>
    </div>
  );
}
