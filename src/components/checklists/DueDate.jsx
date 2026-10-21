import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, Download, X } from 'lucide-react';
import Modal from '../ui/Modal';
import { dueStatus, formatDue, formatDueLong, isValidDate, isValidTime, STATUS_LABEL, datedItems } from '../../utils/dates';
import { eventFor, googleCalendarUrl, outlookCalendarUrl, buildIcs, downloadIcs, icsFileName, openExternal } from '../../utils/calendar';

/** Small chip showing a task's date, coloured by how soon it's due. */
export function DueBadge({ item, now, className = '' }) {
  if (!isValidDate(item?.due)) return null;
  const status = dueStatus(item, now);
  const label = formatDue(item, now);
  return (
    <span className={`op-due ${status ? `is-${status}` : 'is-done'} ${className}`} title={STATUS_LABEL[status] ? `${STATUS_LABEL[status]} – ${formatDueLong(item)}` : formatDueLong(item)}>
      <CalendarDays size={12} aria-hidden="true" />
      {status === 'overdue' && <span className="sr-only">Overdue: </span>}
      {label}
    </span>
  );
}

/** One button per calendar for a single event. */
export function CalendarButtons({ event, onBeforeOpen }) {
  if (!event) return null;
  const go = fn => () => {
    onBeforeOpen?.();
    fn();
  };
  const btn = 'op-btn-secondary px-3 py-2 text-sm font-semibold inline-flex items-center justify-center gap-2 w-full';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button className={btn} onClick={go(() => openExternal(googleCalendarUrl(event)))}>
        <CalIcon color="#4285F4" letter="G" /> Google Calendar
      </button>
      <button className={btn} onClick={go(() => downloadIcs(buildIcs([event]), icsFileName(event.title)))}>
        <CalIcon color="#8e8e93" letter="" apple /> Apple Calendar
      </button>
      <button className={btn} onClick={go(() => openExternal(outlookCalendarUrl(event, 'work')))}>
        <CalIcon color="#0F6CBD" letter="O" /> Outlook (work/school)
      </button>
      <button className={btn} onClick={go(() => openExternal(outlookCalendarUrl(event, 'personal')))}>
        <CalIcon color="#0F6CBD" letter="O" /> Outlook.com (personal)
      </button>
    </div>
  );
}

/** Tiny generic coloured tile so each calendar is easy to spot (no brand logos). */
function CalIcon({ color, letter, apple = false }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center text-[10px] font-extrabold"
      style={{ width: 18, height: 18, borderRadius: 4, background: color, color: '#fff', flexShrink: 0 }}
    >
      {apple ? <CalendarDays size={12} /> : letter}
    </span>
  );
}

/**
 * Set, change or clear a task's date/time, and add it to a calendar.
 * Calendar buttons use what's in the form and save it first, so you can set a date and add it in one go.
 */
export function ItemDateModal({ item, checklist, onSave, onClose, onOpenList }) {
  const [due, setDue] = useState(item.due || '');
  const [time, setTime] = useState(item.dueTime || '');
  const validDate = isValidDate(due);
  const draft = { ...item, due: validDate ? due : undefined, dueTime: validDate && isValidTime(time) ? time : undefined };
  const event = useMemo(() => (validDate ? eventFor(draft, checklist) : null), [due, time, item, checklist]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = (item.due || '') !== (validDate ? due : '') || (item.dueTime || '') !== (draft.dueTime || '');

  const save = () => {
    onSave(draft.due, draft.dueTime);
    onClose();
  };

  return (
    <Modal title="Task date" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="font-semibold">{item.text}{item.qty ? <span className="op-qty ml-2">×{item.qty}</span> : null}</p>
          <p className="text-xs opacity-75 mt-0.5">
            {checklist.emoji} {checklist.title}
            {onOpenList && (
              <> · <button className="underline font-semibold" onClick={onOpenList}>Open list</button></>
            )}
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="task-date" className="text-xs font-bold uppercase block mb-1.5">Date</label>
            <input id="task-date" type="date" value={due} onChange={e => setDue(e.target.value)} className="w-full p-2 rounded border text-sm" />
          </div>
          <div>
            <label htmlFor="task-time" className="text-xs font-bold uppercase block mb-1.5">Time <span className="normal-case font-normal opacity-70">(optional)</span></label>
            <input id="task-time" type="time" value={time} onChange={e => setTime(e.target.value)} disabled={!validDate} className="p-2 rounded border text-sm disabled:opacity-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {validDate && time && (
            <button onClick={() => setTime('')} className="op-btn-secondary px-2.5 py-1 font-semibold inline-flex items-center gap-1"><X size={12} /> Make it all-day</button>
          )}
          {due && (
            <button onClick={() => { setDue(''); setTime(''); }} className="op-btn-secondary px-2.5 py-1 font-semibold inline-flex items-center gap-1"><X size={12} /> Remove date</button>
          )}
        </div>
        {validDate && <p className="text-xs opacity-80">{formatDueLong(draft)}</p>}

        {event && (
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold uppercase inline-flex items-center gap-1.5"><CalendarPlus size={14} /> Add to calendar</h3>
            <CalendarButtons event={event} onBeforeOpen={() => changed && onSave(draft.due, draft.dueTime)} />
            <p className="text-[11px] opacity-70">
              Google and Outlook open a ready-to-save event in a new tab. Apple Calendar downloads a calendar file; open it to add the event.
              {draft.dueTime ? ' Timed tasks are added as 1-hour events.' : ' Tasks without a time are added as all-day events.'}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="op-btn-secondary px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={!changed || (due && !validDate)} className="op-btn-primary px-4 py-2 text-sm font-bold disabled:opacity-40">
            Save date
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Export every dated task in a checklist (current version) as one .ics file. */
export function ExportCalendarModal({ checklist, onClose, notify }) {
  const [includeDone, setIncludeDone] = useState(false);
  const all = datedItems(checklist);
  const items = includeDone ? all : all.filter(i => !i.done);

  const exportIt = () => {
    downloadIcs(buildIcs(items.map(i => eventFor(i, checklist)), checklist.title), icsFileName(checklist.title));
    notify?.(`Exported ${items.length} task${items.length === 1 ? '' : 's'} to a calendar file`);
    onClose();
  };

  return (
    <Modal title="Export dated tasks" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm">
          Creates one calendar file (<strong>.ics</strong>) with {items.length ? <strong>{items.length}</strong> : 'no'} dated task{items.length === 1 ? '' : 's'} from “{checklist.title}”
          {checklist.variants.length > 1 ? ` (${checklist.variants.find(v => v.id === checklist.activeVariantId)?.name})` : ''}.
        </p>
        {all.length > 0 && all.some(i => i.done) && (
          <label className="text-sm inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeDone} onChange={e => setIncludeDone(e.target.checked)} /> Include completed tasks
          </label>
        )}
        {items.length > 0 && (
          <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
            {items.map(i => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="truncate">{i.text}</span>
                <DueBadge item={i} />
              </li>
            ))}
          </ul>
        )}
        <div className="op-item p-3 text-xs space-y-1.5">
          <p><strong>Apple Calendar:</strong> open the downloaded file (on iPhone, tap <em>Add All</em>).</p>
          <p><strong>Google Calendar:</strong> Settings → Import &amp; export → Import, then choose the file.</p>
          <p><strong>Outlook:</strong> double-click the file in Outlook for desktop, or in Outlook on the web choose Add calendar → Upload from file.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="op-btn-secondary px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={exportIt} disabled={!items.length} className="op-btn-primary px-4 py-2 text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-40">
            <Download size={15} /> Download .ics
          </button>
        </div>
      </div>
    </Modal>
  );
}
