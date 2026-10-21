import React, { useMemo, useState } from 'react';
import { AlarmClock, ChevronRight, CalendarPlus, Download } from 'lucide-react';
import { dueAcrossLists, cleanDue } from '../../utils/dates';
import { visibleItems } from '../../utils/checklist';
import { eventFor, buildIcs, downloadIcs } from '../../utils/calendar';
import { DueBadge, ItemDateModal } from './DueDate';

const RANGES = [
  ['now', 'Due & overdue', 0],
  ['week', 'Next 7 days', 7]
];

/**
 * Every open task, across all checklists, that's overdue or due today
 * (or coming up in the next 7 days). Check things off right here.
 */
export default function DuePanel({ checklists, now, onOpen, onToggleItem, onUpdate, notify }) {
  const [range, setRange] = useState('now');
  const [dateFor, setDateFor] = useState(null); // { checklistId, itemId }

  const days = RANGES.find(r => r[0] === range)[2];
  const rows = useMemo(() => dueAcrossLists(checklists, now, days), [checklists, now, days]);
  const overdue = rows.filter(r => r.status === 'overdue').length;

  const anyDated = useMemo(() => checklists.some(c => c.items.some(i => i.due)), [checklists]);
  if (!anyDated) return null;

  // Look the task up directly (not in `rows`) so the dialog stays open if its new date moves it out of range
  const activeList = dateFor ? checklists.find(c => c.id === dateFor.checklistId) : null;
  const activeItem = activeList ? visibleItems(activeList).find(i => i.id === dateFor.itemId) : null;
  const active = activeItem ? { checklist: activeList, item: activeItem } : null;

  const exportAll = () => {
    downloadIcs(buildIcs(rows.map(r => eventFor(r.item, r.checklist)), 'Checklist tasks'), range === 'now' ? 'due-tasks.ics' : 'upcoming-tasks.ics');
    notify?.(`Exported ${rows.length} task${rows.length === 1 ? '' : 's'} to a calendar file`);
  };

  return (
    <section className="op-card p-4 md:p-5 space-y-3" aria-labelledby="due-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlarmClock size={20} aria-hidden="true" />
          <h2 id="due-heading" className="op-heading text-lg">
            {range === 'now' ? 'Due & overdue' : 'Coming up'}
          </h2>
          {overdue > 0 && <span className="op-due is-overdue">{overdue} overdue</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="op-segment inline-flex p-1 gap-1" role="radiogroup" aria-label="Which tasks">
            {RANGES.map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={range === id}
                onClick={() => setRange(id)}
                className={`px-3 py-1 text-xs font-bold ${range === id ? 'op-btn-primary' : 'opacity-75'}`}
                style={{ borderRadius: 'var(--btn-radius)' }}
              >
                {label}
              </button>
            ))}
          </div>
          {rows.length > 0 && (
            <button onClick={exportAll} className="op-btn-secondary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5" title="Download these tasks as one calendar file (.ics)">
              <Download size={14} /> Export .ics
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm opacity-80">
          {range === 'now' ? 'Nothing due today and nothing overdue. 🎉' : 'Nothing due in the next 7 days.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ item, checklist, status }) => (
            <li key={`${checklist.id}-${item.id}`} className={`op-item due-${status} flex items-center gap-2 pr-2`}>
              <label className="flex-1 min-w-0 flex items-center gap-3 pl-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="op-check"
                  checked={false}
                  onChange={() => {
                    onToggleItem(checklist.id, item.id, true);
                    notify?.(`Checked off “${item.text}”`);
                  }}
                  aria-label={`Mark ${item.text} done`}
                />
                <span className="min-w-0 flex-1">
                  <span className="op-item-text font-medium block truncate">
                    {item.text}{item.qty ? <span className="op-qty ml-2">×{item.qty}</span> : null}
                  </span>
                  <span className="text-xs opacity-75 block truncate">{checklist.emoji} {checklist.title}</span>
                </span>
              </label>
              <button onClick={() => setDateFor({ checklistId: checklist.id, itemId: item.id })} className="op-due-btn" title="Change date / add to calendar" aria-label={`Date options for ${item.text}`}>
                <DueBadge item={item} now={now} />
              </button>
              <button onClick={() => setDateFor({ checklistId: checklist.id, itemId: item.id })} className="op-date-add p-1.5 hidden sm:inline-flex" title="Add to calendar" aria-label={`Add ${item.text} to a calendar`}>
                <CalendarPlus size={16} />
              </button>
              <button onClick={() => onOpen(checklist.id)} className="op-date-add p-1.5" title="Open checklist" aria-label={`Open ${checklist.title}`}>
                <ChevronRight size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && (
        <ItemDateModal
          item={active.item}
          checklist={active.checklist}
          onOpenList={() => { setDateFor(null); onOpen(active.checklist.id); }}
          onSave={(due, dueTime) =>
            onUpdate(active.checklist.id, {
              items: active.checklist.items.map(it => (it.id === active.item.id ? cleanDue({ ...it, due, dueTime }) : it))
            })
          }
          onClose={() => setDateFor(null)}
        />
      )}
    </section>
  );
}
