// Checklist model helpers shared by the cloud (Firestore) and guest (localStorage) stores.
//
// Checklist shape:
// {
//   id, ownerId, ownerName, title, emoji, description,
//   variants: [{ id, name }],                // the pre-established versions, e.g. 3/5/7 day
//   activeVariantId,                          // version currently shown (shared with collaborators)
//   items: [{ id, text, section, versions: { [variantId]: { qty: number|null } } }],
//                                             // an item appears in a version when that key exists
//   checked: { [itemId]: true },              // completed status (one map for all versions)
//   members: [uid], memberNames: { [uid]: name },
//   liveCode, copyCode,                       // active share codes (owner only)
//   createdAt, updatedAt                      // epoch millis
// }

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Short random id. Letters/digits only so it is safe inside Firestore field paths. */
export function newId(prefix = '') {
  let s = '';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) s += ID_CHARS[b % ID_CHARS.length];
  return prefix + s;
}

const toMillis = v => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : Date.now());

/** Fill in defaults so the UI never has to guard against missing fields. */
export function normalizeChecklist(raw = {}) {
  const variants = Array.isArray(raw.variants) && raw.variants.length ? raw.variants : [{ id: 'std', name: 'Standard' }];
  const activeVariantId = variants.some(v => v.id === raw.activeVariantId) ? raw.activeVariantId : variants[0].id;
  return {
    ...raw,
    title: raw.title || 'Untitled checklist',
    emoji: raw.emoji || '✅',
    description: raw.description || '',
    variants,
    activeVariantId,
    items: (raw.items || []).map(it => ({ section: '', versions: {}, ...it })),
    checked: raw.checked || {},
    members: raw.members || [],
    memberNames: raw.memberNames || {},
    liveCode: raw.liveCode || null,
    copyCode: raw.copyCode || null,
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt)
  };
}

/** Items that belong to a version, with that version's quantity attached. */
export function visibleItems(checklist, variantId = checklist.activeVariantId) {
  return checklist.items
    .filter(it => it.versions && it.versions[variantId])
    .map(it => ({ ...it, qty: it.versions[variantId].qty ?? null, done: !!checklist.checked[it.id] }));
}

export function progress(checklist, variantId = checklist.activeVariantId) {
  const items = visibleItems(checklist, variantId);
  const done = items.filter(i => i.done).length;
  const total = items.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, complete: total > 0 && done === total };
}

/** Group items by section, keeping first-seen order. Items with no section go under "". */
export function groupBySection(items) {
  const groups = new Map();
  for (const it of items) {
    const key = (it.section || '').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return [...groups.entries()].map(([section, list]) => ({ section, items: list }));
}

export function variantName(checklist, variantId = checklist.activeVariantId) {
  return checklist.variants.find(v => v.id === variantId)?.name || '';
}

/** Content fields only – what gets copied when a list is duplicated or shared as a copy. */
export function contentOf(checklist) {
  const { title, emoji, description, variants, activeVariantId, items } = checklist;
  return { title, emoji, description, variants, activeVariantId, items };
}

export function blankChecklist(title = 'New checklist', emoji = '✅') {
  const vid = newId('v');
  return {
    title,
    emoji,
    description: '',
    variants: [{ id: vid, name: 'Standard' }],
    activeVariantId: vid,
    items: [],
    checked: {}
  };
}

/** Make a checklist from a template in src/data/templates.js (fresh ids every time). */
export function fromTemplate(t) {
  const idMap = Object.fromEntries(t.variants.map(v => [v.key, newId('v')]));
  return {
    title: t.title,
    emoji: t.emoji,
    description: t.description || '',
    variants: t.variants.map(v => ({ id: idMap[v.key], name: v.name })),
    activeVariantId: idMap[t.variants[0].key],
    checked: {},
    items: t.items.map(([text, section, perVersion]) => ({
      id: newId('i'),
      text,
      section,
      versions: Object.fromEntries(
        Object.entries(perVersion).map(([key, qty]) => [idMap[key], { qty: qty === true ? null : qty }])
      )
    }))
  };
}

export const EMOJI_CHOICES = ['✅', '🧳', '🏖️', '🏕️', '🧹', '🛒', '🎒', '🚗', '✈️', '🏠', '🎉', '👶', '🐶', '💼', '🏋️', '🎄', '🍳', '🧺', '📚', '🛠️'];
