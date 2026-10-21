// Task date helpers.
//
// An item can carry an optional date and time:
//   item.due      'YYYY-MM-DD'   (local calendar date)
//   item.dueTime  'HH:MM'        (24h, optional – no time means "all day")
// Dates are stored as plain local values (not timestamps) so a task due "Friday"
// stays on Friday for everyone on a shared list, whatever their time zone.

import { useEffect, useState } from 'react';
import { visibleItems } from './checklist';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidDate = v => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(parseDate(v).getTime());
export const isValidTime = v => typeof v === 'string' && TIME_RE.test(v);

const pad = n => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for a local Date. */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight Date for 'YYYY-MM-DD'. */
export function parseDate(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Add whole days to 'YYYY-MM-DD' and return the new key. */
export function addDays(key, days) {
  const d = parseDate(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Local Date for an item's due moment (start of day when there's no time). */
export function dueDateTime(item) {
  if (!isValidDate(item?.due)) return null;
  const d = parseDate(item.due);
  if (isValidTime(item.dueTime)) {
    const [h, m] = item.dueTime.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/** Keep only well-formed date fields on an item (drops time when there's no date). */
export function cleanDue(item) {
  const { due, dueTime, ...rest } = item;
  if (!isValidDate(due)) return rest;
  return isValidTime(dueTime) ? { ...rest, due, dueTime } : { ...rest, due };
}

export const SOON_DAYS = 2; // "due soon" = within the next 2 days

/**
 * Where a task stands relative to now:
 *  'overdue' – the date (or date + time) has passed
 *  'today'   – due later today
 *  'soon'    – due within the next SOON_DAYS days
 *  'later'   – further out
 *  null      – no date, or already checked off
 */
export function dueStatus(item, now = new Date()) {
  if (!isValidDate(item?.due) || item.done) return null;
  const today = dateKey(now);
  if (item.due < today) return 'overdue';
  if (item.due === today) {
    if (isValidTime(item.dueTime) && dueDateTime(item) < now) return 'overdue';
    return 'today';
  }
  if (item.due <= addDays(today, SOON_DAYS)) return 'soon';
  return 'later';
}

export function formatTime(hhmm) {
  if (!isValidTime(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: m ? '2-digit' : undefined });
}

/** Short, friendly label: "Today · 3 PM", "Tomorrow", "Yesterday", "Fri, Oct 23", "Jan 4, 2027". */
export function formatDue(item, now = new Date()) {
  if (!isValidDate(item?.due)) return '';
  const today = dateKey(now);
  const d = parseDate(item.due);
  let day;
  if (item.due === today) day = 'Today';
  else if (item.due === addDays(today, 1)) day = 'Tomorrow';
  else if (item.due === addDays(today, -1)) day = 'Yesterday';
  else {
    const sameYear = d.getFullYear() === now.getFullYear();
    day = d.toLocaleDateString(undefined, sameYear ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const time = formatTime(item.dueTime);
  return time ? `${day} · ${time}` : day;
}

/** Long label for dialogs and calendar descriptions: "Wednesday, October 21, 2026 at 3:00 PM". */
export function formatDueLong(item) {
  if (!isValidDate(item?.due)) return '';
  const day = parseDate(item.due).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = formatTime(item.dueTime);
  return time ? `${day} at ${time}` : `${day} (all day)`;
}

/** Sort key: earlier first; all-day tasks sort at the start of their day. */
export const compareDue = (a, b) => (dueDateTime(a)?.getTime() ?? Infinity) - (dueDateTime(b)?.getTime() ?? Infinity);

/** Dated items in a checklist's current version, each with done/qty attached. */
export function datedItems(checklist, variantId = checklist.activeVariantId) {
  return visibleItems(checklist, variantId).filter(i => isValidDate(i.due)).sort(compareDue);
}

/**
 * Open tasks across every checklist that are overdue, due today, or (with withinDays)
 * due in the next N days. Returns [{ item, checklist, status }], earliest first.
 */
export function dueAcrossLists(checklists, now = new Date(), withinDays = 0) {
  const limit = addDays(dateKey(now), withinDays);
  const out = [];
  for (const checklist of checklists) {
    for (const item of visibleItems(checklist)) {
      const status = dueStatus(item, now);
      if (!status) continue;
      if (status === 'overdue' || status === 'today' || item.due <= limit) out.push({ item, checklist, status });
    }
  }
  return out.sort((a, b) => compareDue(a.item, b.item));
}

/** Re-render once a minute so "overdue" flips over without a reload. */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export const STATUS_LABEL = { overdue: 'Overdue', today: 'Due today', soon: 'Due soon', later: '' };
