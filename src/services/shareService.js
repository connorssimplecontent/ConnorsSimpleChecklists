// Sharing helpers: share codes, plus sending a checklist by text message or email.
import { visibleItems, groupBySection, variantName } from '../utils/checklist';

// No 0/O, 1/I/L so codes are easy to read out loud or type from a text
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateShareCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

export function normalizeShareCode(raw = '') {
  return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

/** Show codes as ABC-123 for readability. */
export const formatShareCode = code => (code && code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code || '');

export function appUrl() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/?$/, '/');
  if (typeof window === 'undefined') return '';
  return window.location.origin + window.location.pathname;
}

export const joinLink = code => `${appUrl()}?join=${encodeURIComponent(code)}`;

/**
 * Plain-text version of a checklist for texts and emails.
 * options: { variantId, onlyRemaining, showStatus, code, codeMode }
 */
export function checklistAsText(checklist, options = {}) {
  const { variantId = checklist.activeVariantId, onlyRemaining = false, showStatus = true, code = '', codeMode = '' } = options;
  const version = checklist.variants.length > 1 ? ` (${variantName(checklist, variantId)})` : '';
  let items = visibleItems(checklist, variantId);
  if (onlyRemaining) items = items.filter(i => !i.done);

  const lines = [`${checklist.emoji} ${checklist.title}${version}`];
  if (!items.length) lines.push('', onlyRemaining ? 'Everything is done!' : '(no items yet)');

  for (const group of groupBySection(items)) {
    lines.push('');
    if (group.section) lines.push(group.section.toUpperCase());
    for (const it of group.items) {
      const box = showStatus ? (it.done ? '☑ ' : '☐ ') : '• ';
      const qty = it.qty ? ` (x${it.qty})` : '';
      lines.push(`${box}${it.text}${qty}`);
    }
  }

  if (code) {
    lines.push('');
    lines.push(
      codeMode === 'live'
        ? `Check items off with me in Connor'sSimpleChecklists – share code ${formatShareCode(code)}:`
        : `Get your own copy in Connor'sSimpleChecklists – share code ${formatShareCode(code)}:`
    );
    lines.push(joinLink(code));
  } else {
    lines.push('', "– sent from Connor'sSimpleChecklists");
  }
  return lines.join('\n');
}

/** sms: link that opens the phone's Messages app with the text filled in. `?&body=` works on iOS and Android. */
export const smsHref = body => `sms:?&body=${encodeURIComponent(body)}`;

export const mailtoHref = (subject, body) =>
  `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const canNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export async function nativeShare(title, text) {
  try {
    await navigator.share({ title, text });
    return true;
  } catch {
    return false; // user cancelled
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / insecure origins
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
