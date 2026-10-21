// Add-to-calendar helpers. No accounts or API keys needed:
//  - Google Calendar and Outlook open a pre-filled "new event" page; you press Save.
//  - Apple Calendar (and anything else) gets a standard .ics file.
//
// Timed tasks become 1-hour events in UTC (so every calendar shows the right local time).
// Tasks with a date but no time become all-day events.

import { addDays, dueDateTime, formatDueLong, isValidDate, isValidTime } from './dates';

export const DEFAULT_DURATION_MIN = 60;

const pad = n => String(n).padStart(2, '0');
const compactDate = key => key.replace(/-/g, ''); // 2026-10-21 -> 20261021

/** 20261021T190000Z */
function utcStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** 2026-10-21T19:00:00Z */
const utcIso = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /android|iphone|ipad|ipod|mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAppleMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Calendar event for one checklist item. Returns null when the item has no date. */
export function eventFor(item, checklist) {
  if (!isValidDate(item?.due)) return null;
  const title = `${item.text}${item.qty ? ` (×${item.qty})` : ''}`;
  const details = [
    `From checklist: ${checklist.emoji ? `${checklist.emoji} ` : ''}${checklist.title}`,
    item.section ? `Section: ${item.section}` : '',
    `Due: ${formatDueLong(item)}`
  ].filter(Boolean).join('\n');

  const base = { uid: `${checklist.id || 'list'}-${item.id}@connors-simple-checklists`, title, details };
  if (isValidTime(item.dueTime)) {
    const start = dueDateTime(item);
    const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60000);
    return { ...base, allDay: false, start, end };
  }
  return { ...base, allDay: true, startDate: item.due, endDate: addDays(item.due, 1) }; // end is exclusive
}

// ---------- Google Calendar ----------

export function googleCalendarUrl(ev) {
  const dates = ev.allDay
    ? `${compactDate(ev.startDate)}/${compactDate(ev.endDate)}`
    : `${utcStamp(ev.start)}/${utcStamp(ev.end)}`;
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(ev.title)}`
    + `&dates=${encodeURIComponent(dates)}`
    + `&details=${encodeURIComponent(ev.details)}`;
}

// ---------- Outlook (personal Outlook.com/Hotmail, or work/school Microsoft 365) ----------

/** account: 'personal' -> outlook.live.com, 'work' -> outlook.office.com */
export function outlookCalendarUrl(ev, account = 'personal') {
  const host = account === 'work' ? 'https://outlook.office.com' : 'https://outlook.live.com';
  const mobile = isMobileDevice();
  // The plain compose page doesn't open on phones; the deeplink path does.
  const path = mobile
    ? '/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent'
    : '/calendar/action/compose?rru=addevent';
  let start, end;
  if (ev.allDay) {
    start = ev.startDate;
    // Outlook on the web treats the all-day end as exclusive on desktop, inclusive on mobile
    end = mobile ? ev.startDate : ev.endDate;
  } else {
    start = utcIso(ev.start);
    end = utcIso(ev.end);
  }
  return host + path
    + `&startdt=${encodeURIComponent(start)}`
    + `&enddt=${encodeURIComponent(end)}`
    + (ev.allDay ? '&allday=true' : '')
    + `&subject=${encodeURIComponent(ev.title)}`
    + `&body=${encodeURIComponent(ev.details)}`;
}

// ---------- .ics (Apple Calendar, Outlook desktop, and any other calendar app) ----------

/** Escape text per RFC 5545. */
const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fold lines longer than 75 octets (RFC 5545 §3.1), without splitting a multi-byte character. */
function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const max = parts.length ? 74 : 75; // continuation lines start with a space
    if (size + n > max) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcs(events, calendarName = "Connor'sSimpleChecklists") {
  const stamp = utcStamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Connor'sSimpleChecklists//Tasks//EN",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(calendarName)}`
  ];
  for (const ev of events.filter(Boolean)) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(ev.startDate)}`, `DTEND;VALUE=DATE:${compactDate(ev.endDate)}`, 'TRANSP:TRANSPARENT');
    } else {
      lines.push(`DTSTART:${utcStamp(ev.start)}`, `DTEND:${utcStamp(ev.end)}`);
    }
    lines.push(`SUMMARY:${icsText(ev.title)}`, `DESCRIPTION:${icsText(ev.details)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** A safe file name from a title: "Beach Day" -> "beach-day.ics" */
export function icsFileName(title) {
  const slug = String(title || 'tasks').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${slug || 'tasks'}.ics`;
}

/**
 * Hand an .ics file to the device.
 *  - iPhone/iPad Safari: opening a text/calendar data URL shows the "Add to Calendar" sheet.
 *  - Everywhere else: download the file; opening it adds the event(s) to Apple Calendar,
 *    Outlook desktop, etc.
 */
export function downloadIcs(content, filename = 'tasks.ics') {
  if (isAppleMobile()) {
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
    return;
  }
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function openExternal(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
