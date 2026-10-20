import React, { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Share2, RotateCcw, Trash2, LogOut, Eye, EyeOff, Plus, Users } from 'lucide-react';
import { visibleItems, groupBySection, progress, variantName, newId } from '../../utils/checklist';
import { ProgressBar } from '../ui/Modal';
import VersionToggle from './VersionToggle';

/** Interactive view of one checklist: switch versions, check items off, reset, quick-add. */
export default function ChecklistView({ checklist, me, onBack, onEdit, onShare, onReset, onDelete, onLeave, onToggleItem, onVersionChange, onUpdate }) {
  const [hideDone, setHideDone] = useState(false);
  const [newItem, setNewItem] = useState('');

  const isOwner = !me || checklist.ownerId === me.uid;
  const p = progress(checklist);
  const items = useMemo(() => visibleItems(checklist), [checklist]);
  const groups = useMemo(() => groupBySection(hideDone ? items.filter(i => !i.done) : items), [items, hideDone]);
  const memberNames = checklist.members.map(uid => (me && uid === me.uid ? 'You' : checklist.memberNames[uid] || 'Member'));

  const quickAdd = e => {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    const versions = Object.fromEntries(checklist.variants.map(v => [v.id, { qty: null }]));
    onUpdate(checklist.id, { items: [...checklist.items, { id: newId('i'), text: text.slice(0, 200), section: '', versions }] });
    setNewItem('');
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-semibold inline-flex items-center gap-1.5 opacity-80 hover:opacity-100">
        <ArrowLeft size={16} /> All checklists
      </button>

      {/* Header */}
      <div className="op-card p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className="op-emoji text-4xl" aria-hidden="true">{checklist.emoji}</span>
          <div className="flex-1 min-w-[12rem]">
            <h2 className="op-heading text-2xl leading-tight">{checklist.title}</h2>
            {checklist.description && <p className="text-sm opacity-80 mt-1">{checklist.description}</p>}
            {checklist.members.length > 1 && (
              <p className="text-xs mt-2 inline-flex items-center gap-1.5 opacity-80">
                <Users size={13} /> Live with {memberNames.join(', ')}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onEdit(checklist.id)} className="op-btn-secondary px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5">
              <Pencil size={15} /> Edit
            </button>
            <button onClick={() => onShare(checklist.id)} className="op-btn-primary px-3 py-2 text-sm font-bold inline-flex items-center gap-1.5">
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>

        <VersionToggle variants={checklist.variants} activeId={checklist.activeVariantId} onChange={vid => onVersionChange(checklist, vid)} />

        <div>
          <div className="flex justify-between text-sm font-semibold mb-1.5">
            <span>
              {p.complete ? 'All done! 🎉' : `${p.done} of ${p.total} done`}
              {checklist.variants.length > 1 && <span className="opacity-70"> · {variantName(checklist)}</span>}
            </span>
            <span>{p.pct}%</span>
          </div>
          <ProgressBar pct={p.pct} complete={p.complete} label="Checklist progress" />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onReset(checklist)}
            disabled={!Object.keys(checklist.checked).length}
            className="op-btn-secondary px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <RotateCcw size={15} /> Reset checklist
          </button>
          <button onClick={() => setHideDone(h => !h)} className="op-btn-secondary px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1.5" aria-pressed={hideDone}>
            {hideDone ? <Eye size={15} /> : <EyeOff size={15} />} {hideDone ? 'Show completed' : 'Hide completed'}
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="op-card p-4 md:p-5 space-y-5">
        {!items.length && (
          <p className="text-sm opacity-80">
            No items in this version yet. Add one below, or use <strong>Edit</strong> to build the list and choose which versions each item belongs to.
          </p>
        )}
        {hideDone && items.length > 0 && !groups.length && <p className="text-sm font-semibold">Everything is checked off. 🎉</p>}

        {groups.map(group => (
          <section key={group.section || '_'} className="space-y-2">
            {group.section && <h3 className="op-section-label">{group.section}</h3>}
            <ul className="space-y-2">
              {group.items.map(item => (
                <li key={item.id}>
                  <label className={`op-item ${item.done ? 'is-done' : ''} flex items-center gap-3 px-3 py-2.5 cursor-pointer`}>
                    <input
                      type="checkbox"
                      className="op-check"
                      checked={item.done}
                      onChange={e => onToggleItem(checklist.id, item.id, e.target.checked)}
                    />
                    <span className="op-item-text flex-1 font-medium">{item.text}</span>
                    {item.qty ? <span className="op-qty">×{item.qty}</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <form onSubmit={quickAdd} className="flex gap-2 pt-2">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder={checklist.variants.length > 1 ? 'Quick add an item (adds to every version)' : 'Quick add an item'}
            className="flex-1 px-3 py-2 rounded border text-sm"
            maxLength={200}
            aria-label="New item"
          />
          <button type="submit" className="op-btn-primary px-3 py-2 text-sm font-bold inline-flex items-center gap-1" disabled={!newItem.trim()}>
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      <div className="flex justify-end">
        {isOwner ? (
          <button onClick={() => onDelete(checklist)} className="text-sm text-red-400 font-semibold inline-flex items-center gap-1.5 px-2 py-1">
            <Trash2 size={15} /> Delete checklist
          </button>
        ) : (
          <button onClick={() => onLeave(checklist)} className="text-sm text-red-400 font-semibold inline-flex items-center gap-1.5 px-2 py-1">
            <LogOut size={15} /> Leave shared checklist
          </button>
        )}
      </div>
    </div>
  );
}
