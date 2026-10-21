import React, { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Share2, RotateCcw, Trash2, LogOut, Eye, EyeOff, Plus, Users, CalendarPlus, CalendarDays, AlertTriangle } from 'lucide-react';
import { visibleItems, groupBySection, progress, variantName, newId } from '../../utils/checklist';
import { ProgressBar } from '../ui/Modal';
import VersionToggle from './VersionToggle';
import { DueBadge, ItemDateModal, ExportCalendarModal } from './DueDate';
import { dueStatus, isValidDate, useNow, cleanDue } from '../../utils/dates';

/** Interactive view of one checklist: switch versions, check items off, reset, quick-add. */
export default function ChecklistView({ checklist, me, onBack, onEdit, onShare, onReset, onDelete, onLeave, onToggleItem, onVersionChange, onUpdate, notify }) {
  const [hideDone, setHideDone] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newDue, setNewDue] = useState('');
  const [dateFor, setDateFor] = useState(null); // item id whose date dialog is open
  const [exporting, setExporting] = useState(false);
  const now = useNow();

  const isOwner = !me || checklist.ownerId === me.uid;
  const p = progress(checklist);
  const items = useMemo(() => visibleItems(checklist), [checklist]);
  const groups = useMemo(() => groupBySection(hideDone ? items.filter(i => !i.done) : items), [items, hideDone]);
  const dated = items.filter(i => isValidDate(i.due));
  const overdueCount = items.filter(i => dueStatus(i, now) === 'overdue').length;
  const dueTodayCount = items.filter(i => dueStatus(i, now) === 'today').length;
  const dateItem = dateFor ? items.find(i => i.id === dateFor) : null;

  const setItemDate = (itemId, due, dueTime) =>
    onUpdate(checklist.id, { items: checklist.items.map(it => (it.id === itemId ? cleanDue({ ...it, due, dueTime }) : it)) });

  const memberNames = checklist.members.map(uid => (me && uid === me.uid ? 'You' : checklist.memberNames[uid] || 'Member'));

  const quickAdd = e => {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    const versions = Object.fromEntries(checklist.variants.map(v => [v.id, { qty: null }]));
    const item = cleanDue({ id: newId('i'), text: text.slice(0, 200), section: '', versions, due: newDue });
    onUpdate(checklist.id, { items: [...checklist.items, item] });
    setNewItem('');
    setNewDue('');
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
          {dated.length > 0 && (
            <button onClick={() => setExporting(true)} className="op-btn-secondary px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1.5">
              <CalendarPlus size={15} /> Export dated tasks
            </button>
          )}
        </div>

        {(overdueCount > 0 || dueTodayCount > 0) && (
          <p className="op-due-summary text-sm font-semibold inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <AlertTriangle size={15} aria-hidden="true" />
            {overdueCount > 0 && <span className="op-text-overdue">{overdueCount} overdue</span>}
            {dueTodayCount > 0 && <span className="op-text-today">{dueTodayCount} due today</span>}
          </p>
        )}
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
                <li key={item.id} className={`op-item ${item.done ? 'is-done' : ''} ${dueStatus(item, now) ? `due-${dueStatus(item, now)}` : ''} flex items-center gap-2 pr-2`}>
                  <label className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1 pl-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="op-check"
                      checked={item.done}
                      onChange={e => onToggleItem(checklist.id, item.id, e.target.checked)}
                    />
                    <span className="op-item-text flex-1 min-w-[8rem] font-medium">{item.text}</span>
                    {item.qty ? <span className="op-qty">×{item.qty}</span> : null}
                  </label>
                  <button
                    onClick={() => setDateFor(item.id)}
                    className={isValidDate(item.due) ? 'op-due-btn' : 'op-date-add p-1.5'}
                    aria-label={isValidDate(item.due) ? `Change date for ${item.text}, or add it to a calendar` : `Set a date for ${item.text}`}
                    title={isValidDate(item.due) ? 'Change date / add to calendar' : 'Set a date'}
                  >
                    {isValidDate(item.due) ? <DueBadge item={item} now={now} /> : <CalendarDays size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <form onSubmit={quickAdd} className="flex flex-wrap sm:flex-nowrap gap-2 pt-2">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder={checklist.variants.length > 1 ? 'Quick add an item (adds to every version)' : 'Quick add an item'}
            className="flex-1 basis-full sm:basis-0 min-w-0 px-3 py-2 rounded border text-sm"
            maxLength={200}
            aria-label="New item"
          />
          <input
            type="date"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            className="flex-1 sm:flex-none sm:w-[9.5rem] px-2 py-2 rounded border text-sm"
            aria-label="Date for new item (optional)"
            title="Date (optional)"
          />
          <button type="submit" className="op-btn-primary px-3 py-2 text-sm font-bold inline-flex items-center gap-1" disabled={!newItem.trim()}>
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      {dateItem && (
        <ItemDateModal
          item={dateItem}
          checklist={checklist}
          onSave={(due, dueTime) => setItemDate(dateItem.id, due, dueTime)}
          onClose={() => setDateFor(null)}
        />
      )}
      {exporting && <ExportCalendarModal checklist={checklist} notify={notify} onClose={() => setExporting(false)} />}

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
