// Guest-mode store: checklists live in this browser's localStorage.
// Exposes the same functions as dbService.js so the UI doesn't care which one it uses.
import { newId, normalizeChecklist, fromTemplate } from '../utils/checklist';
import { TEMPLATES } from '../data/templates';

const KEY = 'csc.checklists';
const SEEDED_KEY = 'csc.seeded';
const listeners = new Set();

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // storage full or unavailable – keep working in memory for this session
  }
  memory = map;
  emit();
}

let memory = null;
const current = () => memory ?? (memory = readAll());

function emit() {
  const list = Object.values(current()).map(normalizeChecklist);
  listeners.forEach(fn => fn(list));
}

/** First run only: add two starter lists so the dashboard isn't empty. */
function seedOnce() {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, '1');
  } catch {
    return;
  }
  if (Object.keys(current()).length) return;
  const map = {};
  for (const t of TEMPLATES.slice(0, 2)) {
    const id = newId('c');
    map[id] = { ...fromTemplate(t), id, ownerId: 'guest', ownerName: 'You', members: ['guest'], createdAt: Date.now(), updatedAt: Date.now() };
  }
  writeAll(map);
}

const mutate = (id, fn) => {
  const map = { ...current() };
  if (!map[id]) return;
  map[id] = { ...fn(map[id]), updatedAt: Date.now() };
  writeAll(map);
};

export const isCloud = false;

export function subscribeChecklists(_me, onChange) {
  seedOnce();
  listeners.add(onChange);
  onChange(Object.values(current()).map(normalizeChecklist));
  return () => listeners.delete(onChange);
}

export function getAllLocal() {
  return Object.values(readAll()).map(normalizeChecklist);
}

export function clearAllLocal() {
  writeAll({});
}

export async function createChecklist(_me, data) {
  const id = newId('c');
  const map = { ...current() };
  map[id] = { ...data, id, ownerId: 'guest', ownerName: 'You', members: ['guest'], checked: data.checked || {}, createdAt: Date.now(), updatedAt: Date.now() };
  writeAll(map);
  return id;
}

export async function updateChecklist(id, patch) {
  mutate(id, c => ({ ...c, ...patch }));
}

export async function setItemChecked(id, itemId, value) {
  mutate(id, c => {
    const checked = { ...(c.checked || {}) };
    if (value) checked[itemId] = true;
    else delete checked[itemId];
    return { ...c, checked };
  });
}

export async function resetChecklist(id) {
  mutate(id, c => ({ ...c, checked: {} }));
}

export async function deleteChecklist(id) {
  const map = { ...current() };
  delete map[id];
  writeAll(map);
}

// Keep other tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY) {
      memory = readAll();
      emit();
    }
  });
}
