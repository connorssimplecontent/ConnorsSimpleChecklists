// Cloud store (Firestore). Same function names as localStore.js.
//
// Collections:
//   /users/{uid}          private settings (theme)
//   /checklists/{id}      a checklist; everyone in `members` sees it live
//   /shareCodes/{CODE}    a share code -> { checklistId, mode: 'live' | 'copy', ... }
//                         'live' codes add the person to the same list (concurrent).
//                         'copy' codes hold a snapshot the person gets as their own list.
import { db } from '../config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  deleteField,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { normalizeChecklist, contentOf } from '../utils/checklist';
import { generateShareCode, normalizeShareCode } from './shareService';

const LISTS = 'checklists';
const CODES = 'shareCodes';

export const isCloud = true;

// Firestore rejects `undefined` values – strip them (and any functions) before writing.
function clean(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

// ---------- User settings ----------

export async function saveUserData(userId, userData) {
  if (!userId || !db) return;
  await setDoc(doc(db, 'users', userId), { ...clean(userData), updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getUserData(userId) {
  if (!userId || !db) return null;
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? snap.data() : null;
}

// ---------- Checklists ----------

/** Live feed of every checklist this user owns or was added to. Returns an unsubscribe function. */
export function subscribeChecklists(me, onChange, onError) {
  if (!db || !me) return () => {};
  const q = query(collection(db, LISTS), where('members', 'array-contains', me.uid));
  return onSnapshot(
    q,
    snap => onChange(snap.docs.map(d => normalizeChecklist({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }))),
    err => onError?.(err)
  );
}

export async function createChecklist(me, data) {
  const ref = doc(collection(db, LISTS));
  await setDoc(ref, {
    ...clean(contentOf(data)),
    checked: clean(data.checked || {}),
    ownerId: me.uid,
    ownerName: me.name,
    members: [me.uid],
    memberNames: { [me.uid]: me.name },
    liveCode: null,
    copyCode: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateChecklist(id, patch) {
  await updateDoc(doc(db, LISTS, id), { ...clean(patch), updatedAt: serverTimestamp() });
}

/** Field-level write so two people checking items at the same time never overwrite each other. */
export async function setItemChecked(id, itemId, value) {
  await updateDoc(doc(db, LISTS, id), {
    [`checked.${itemId}`]: value ? true : deleteField(),
    updatedAt: serverTimestamp()
  });
}

export async function resetChecklist(id) {
  await updateDoc(doc(db, LISTS, id), { checked: {}, updatedAt: serverTimestamp() });
}

export async function deleteChecklist(id, checklist) {
  // Turn off any share codes first so they stop resolving
  for (const code of [checklist?.liveCode, checklist?.copyCode].filter(Boolean)) {
    await deleteDoc(doc(db, CODES, code)).catch(() => {});
  }
  await deleteDoc(doc(db, LISTS, id));
}

/** A collaborator removes themselves from a shared list. */
export async function leaveChecklist(id, me) {
  await updateDoc(doc(db, LISTS, id), {
    members: arrayRemove(me.uid),
    [`memberNames.${me.uid}`]: deleteField()
  });
}

/** Owner removes a collaborator. */
export async function removeMember(id, uid) {
  await updateDoc(doc(db, LISTS, id), {
    members: arrayRemove(uid),
    [`memberNames.${uid}`]: deleteField(),
    updatedAt: serverTimestamp()
  });
}

// ---------- Share codes ----------

/**
 * Create (or replace) the list's live or copy share code. Owner only.
 * Returns the new code.
 */
export async function createShareCode(checklist, mode, me) {
  let code = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    code = generateShareCode();
    const existing = await getDoc(doc(db, CODES, code));
    if (!existing.exists()) break;
  }
  const payload = {
    checklistId: checklist.id,
    ownerId: me.uid,
    ownerName: me.name,
    mode,
    title: checklist.title,
    emoji: checklist.emoji,
    createdAt: serverTimestamp(),
    ...(mode === 'copy' ? { snapshot: clean(contentOf(checklist)) } : {})
  };
  await setDoc(doc(db, CODES, code), payload);

  const field = mode === 'live' ? 'liveCode' : 'copyCode';
  const previous = checklist[field];
  await updateDoc(doc(db, LISTS, checklist.id), { [field]: code, updatedAt: serverTimestamp() });
  if (previous && previous !== code) await deleteDoc(doc(db, CODES, previous)).catch(() => {});
  return code;
}

/** Turn a code off. People who already joined a live list stay on it (remove them separately). */
export async function revokeShareCode(checklist, mode) {
  const field = mode === 'live' ? 'liveCode' : 'copyCode';
  const code = checklist[field];
  if (code) await deleteDoc(doc(db, CODES, code)).catch(() => {});
  await updateDoc(doc(db, LISTS, checklist.id), { [field]: null, updatedAt: serverTimestamp() });
}

/** Keep a copy code's snapshot in step with the owner's latest edits. */
export async function refreshCopySnapshot(checklist) {
  if (!checklist.copyCode) return;
  await updateDoc(doc(db, CODES, checklist.copyCode), {
    snapshot: clean(contentOf(checklist)),
    title: checklist.title,
    emoji: checklist.emoji
  });
}

/** Look up a code without using it (to show what it is before joining). */
export async function lookupShareCode(rawCode) {
  const code = normalizeShareCode(rawCode);
  if (!code) throw new Error('Enter a share code.');
  const snap = await getDoc(doc(db, CODES, code));
  if (!snap.exists()) throw new Error('That code was not found, or the owner turned it off.');
  return { code, ...snap.data() };
}

/**
 * Use a share code.
 *  - live: adds you to the same checklist (everyone sees the same checks in real time)
 *  - copy: creates your own separate checklist from the shared snapshot
 */
export async function redeemShareCode(rawCode, me, myChecklists = []) {
  const info = await lookupShareCode(rawCode);

  if (info.mode === 'live') {
    if (myChecklists.some(c => c.id === info.checklistId)) {
      return { mode: 'live', checklistId: info.checklistId, title: info.title, alreadyMember: true };
    }
    try {
      await updateDoc(doc(db, LISTS, info.checklistId), {
        members: arrayUnion(me.uid),
        [`memberNames.${me.uid}`]: me.name,
        joinCode: info.code
      });
    } catch (err) {
      console.error('Join failed:', err);
      throw new Error('Could not join that checklist. The code may have been turned off or the list deleted.');
    }
    return { mode: 'live', checklistId: info.checklistId, title: info.title };
  }

  const snapshot = info.snapshot || {};
  const checklistId = await createChecklist(me, {
    ...snapshot,
    description: snapshot.description || `Copied from ${info.ownerName || 'a friend'}`,
    checked: {}
  });
  return { mode: 'copy', checklistId, title: info.title };
}
