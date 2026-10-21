import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { auth } from './config/firebase';
import { getStore, cloud, local } from './services/checklistService';
import { contentOf } from './utils/checklist';
import AuthModal from './components/auth/AuthModal';
import ThemeSwitcher, { THEMES } from './components/ui/ThemeSwitcher';
import { ConfirmDialog } from './components/ui/Modal';
import Dashboard from './components/checklists/Dashboard';
import ChecklistView from './components/checklists/ChecklistView';
import ChecklistEditor from './components/checklists/ChecklistEditor';
import NewChecklistModal from './components/checklists/NewChecklistModal';
import ShareModal from './components/checklists/ShareModal';
import JoinModal from './components/checklists/JoinModal';

const THEME_KEY = 'csc.theme';
const IMPORT_DISMISSED_KEY = 'csc.importDismissed';

function readJoinParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      params.delete('join');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    }
    return code || '';
  } catch {
    return '';
  }
}

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'standard');
  const [user, setUser] = useState(null);
  const [nameOverride, setNameOverride] = useState('');
  const [authReady, setAuthReady] = useState(!auth); // guest mode is ready immediately
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [checklists, setChecklists] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [route, setRoute] = useState({ view: 'dashboard', id: null }); // dashboard | list | edit
  const [modal, setModal] = useState(() => {
    const code = readJoinParam();
    return code ? { type: 'join', code } : null;
  });
  const [toast, setToast] = useState('');
  const [importDismissed, setImportDismissed] = useState(() => {
    try { return !!localStorage.getItem(IMPORT_DISMISSED_KEY); } catch { return false; }
  });

  // Who's signed in, in the small shape the services use. Display name only – emails are never stored on lists.
  const me = useMemo(
    () => (user ? { uid: user.uid, name: (nameOverride || user.displayName || '').trim().slice(0, 60) || 'Member' } : null),
    [user, nameOverride]
  );
  const store = getStore(me);
  const canUseCodes = !!store.isCloud;

  // ---------- Auth ----------
  useEffect(() => {
    if (!auth) return undefined; // guest mode – Firebase not configured
    return onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      setNameOverride('');
      setAuthReady(true);
      if (!currentUser) return;
      try {
        const data = await cloud.getUserData(currentUser.uid);
        if (data?.theme && THEMES.some(t => t.id === data.theme)) applyTheme(data.theme, false);
      } catch (err) {
        console.error('Could not load settings:', err);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Live checklist feed ----------
  useEffect(() => {
    if (!authReady) return undefined;
    setLoaded(false);
    setLoadError('');
    return getStore(me).subscribeChecklists(
      me,
      lists => {
        setChecklists(lists);
        setLoaded(true);
      },
      err => {
        console.error('Checklist feed failed:', err);
        setLoaded(true);
        setLoadError('Could not load your checklists. Check your connection, and make sure firestore.rules has been deployed.');
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, me?.uid]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const fail = useCallback(err => {
    console.error(err);
    setToast(err?.message || 'Something went wrong.');
  }, []);

  // ---------- Theme ----------
  function applyTheme(newTheme, sync = true) {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try { localStorage.setItem(THEME_KEY, newTheme); } catch { /* storage unavailable */ }
    if (sync && me) cloud.saveUserData(me.uid, { theme: newTheme }).catch(err => console.error('Theme sync failed:', err));
  }

  // ---------- Checklist actions ----------
  const byId = id => checklists.find(c => c.id === id);
  const open = id => setRoute({ view: 'list', id });

  const handleCreate = async (data, openEditor) => {
    try {
      const id = await store.createChecklist(me, data);
      setModal(null);
      setRoute({ view: openEditor ? 'edit' : 'list', id });
    } catch (err) {
      fail(err);
    }
  };

  const handleUpdate = (id, patch) => store.updateChecklist(id, patch).catch(fail);
  const handleToggle = (id, itemId, value) => store.setItemChecked(id, itemId, value).catch(fail);
  const handleVersion = (c, variantId) => handleUpdate(c.id, { activeVariantId: variantId });

  const handleSaveEdits = async (c, patch) => {
    try {
      await store.updateChecklist(c.id, patch);
      if (canUseCodes && c.ownerId === me.uid && c.copyCode) {
        cloud.refreshCopySnapshot({ ...c, ...patch }).catch(err => console.error('Copy snapshot refresh failed:', err));
      }
      setRoute({ view: 'list', id: c.id });
      setToast('Checklist saved');
    } catch (err) {
      fail(err);
    }
  };

  const confirm = (opts, action) => setModal({ type: 'confirm', ...opts, action });

  const requestReset = c => {
    const count = Object.keys(c.checked).length;
    confirm(
      {
        title: 'Reset checklist?',
        message: `This unchecks ${count === 1 ? 'the 1 completed item' : `all ${count} completed items`} in “${c.title}”${c.members.length > 1 ? ' for everyone on this shared list' : ''}.`,
        confirmLabel: 'Reset'
      },
      async () => {
        await store.resetChecklist(c.id);
        setToast('Checklist reset');
      }
    );
  };

  const requestDelete = c =>
    confirm(
      {
        title: 'Delete checklist?',
        message: `“${c.title}” will be deleted${c.members.length > 1 ? ' for everyone it is shared with' : ''}. This can't be undone.`,
        confirmLabel: 'Delete',
        danger: true
      },
      async () => {
        await store.deleteChecklist(c.id, c);
        setRoute({ view: 'dashboard', id: null });
        setToast('Checklist deleted');
      }
    );

  const requestLeave = c =>
    confirm(
      { title: 'Leave shared checklist?', message: `You'll stop seeing “${c.title}”. ${c.ownerName || 'The owner'} can share it with you again.`, confirmLabel: 'Leave', danger: true },
      async () => {
        await cloud.leaveChecklist(c.id, me);
        setRoute({ view: 'dashboard', id: null });
        setToast('You left the checklist');
      }
    );

  const handleRedeem = async code => {
    const result = await cloud.redeemShareCode(code, me, checklists);
    setModal(null);
    setRoute({ view: 'list', id: result.checklistId });
    setToast(
      result.alreadyMember
        ? `You're already on “${result.title}”`
        : result.mode === 'live'
          ? `Joined “${result.title}” – you'll see each other's checks live`
          : `Added your own copy of “${result.title}”`
    );
  };

  // ---------- Guest lists -> account ----------
  const guestLists = useMemo(() => (canUseCodes && !importDismissed ? local.getAllLocal() : []), [canUseCodes, importDismissed, checklists.length]);

  const importGuestLists = async () => {
    try {
      for (const c of guestLists) await cloud.createChecklist(me, { ...contentOf(c), checked: c.checked });
      local.clearAllLocal();
      setToast(`Moved ${guestLists.length} checklist${guestLists.length === 1 ? '' : 's'} to your account`);
      setImportDismissed(true);
    } catch (err) {
      fail(err);
    }
  };

  const dismissImport = () => {
    try { localStorage.setItem(IMPORT_DISMISSED_KEY, '1'); } catch { /* ignore */ }
    setImportDismissed(true);
  };

  const importBanner = guestLists.length > 0 && (
    <div className="op-card p-4 flex flex-wrap items-center gap-3 justify-between">
      <p className="text-sm">
        You have <strong>{guestLists.length}</strong> checklist{guestLists.length === 1 ? '' : 's'} saved on this device from guest mode.
      </p>
      <div className="flex gap-2">
        <button onClick={dismissImport} className="op-btn-secondary px-3 py-1.5 text-sm font-semibold">Not now</button>
        <button onClick={importGuestLists} className="op-btn-primary px-3 py-1.5 text-sm font-bold">Move to my account</button>
      </div>
    </div>
  );

  // ---------- Render ----------
  const current = route.id ? byId(route.id) : null;
  const shareTarget = modal?.type === 'share' ? byId(modal.id) : null;

  let body;
  if (route.view !== 'dashboard' && !current) {
    body = (
      <div className="op-card p-8 text-center space-y-3">
        <p className="font-semibold">{loaded ? 'Opening checklist…' : 'Loading…'}</p>
        <p className="text-xs opacity-70">If it doesn't appear, it may have been deleted or you were removed from it.</p>
        <button onClick={() => setRoute({ view: 'dashboard', id: null })} className="op-btn-secondary px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1.5">
          <ArrowLeft size={15} /> All checklists
        </button>
      </div>
    );
  } else if (route.view === 'edit') {
    body = <ChecklistEditor key={current.id} checklist={current} onSave={patch => handleSaveEdits(current, patch)} onCancel={() => open(current.id)} />;
  } else if (route.view === 'list') {
    body = (
      <ChecklistView
        checklist={current}
        me={me}
        onBack={() => setRoute({ view: 'dashboard', id: null })}
        onEdit={id => setRoute({ view: 'edit', id })}
        onShare={id => setModal({ type: 'share', id })}
        onReset={requestReset}
        onDelete={requestDelete}
        onLeave={requestLeave}
        onToggleItem={handleToggle}
        onVersionChange={handleVersion}
        onUpdate={handleUpdate}
        notify={setToast}
      />
    );
  } else {
    body = (
      <Dashboard
        checklists={checklists}
        me={me}
        onOpen={open}
        onNew={() => setModal({ type: 'new' })}
        onJoin={() => setModal({ type: 'join', code: '' })}
        onReset={requestReset}
        onVersionChange={handleVersion}
        onToggleItem={handleToggle}
        onUpdate={handleUpdate}
        notify={setToast}
        banner={importBanner}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      {/* Header & Theme Selection */}
      <header className="op-header flex flex-wrap justify-between items-center gap-4 border-b border-gray-700 pb-4">
        <div>
          <h1 className="op-title text-2xl md:text-3xl font-extrabold tracking-tight">
            <button onClick={() => setRoute({ view: 'dashboard', id: null })} className="text-left">Connor'sSimpleChecklists</button>
          </h1>
          <p className="text-xs opacity-75">
            Interactive checklists · versions for every trip · share live or by text &amp; email
            {!me && ' · Guest mode: saved on this device'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ThemeSwitcher currentTheme={theme} setTheme={t => applyTheme(t)} />
          {me ? (
            <button
              onClick={() => auth && signOut(auth).then(() => setRoute({ view: 'dashboard', id: null }))}
              className="text-xs op-btn-secondary px-3 py-1.5 font-semibold"
            >
              Log Out ({me.name})
            </button>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="text-xs op-btn-primary px-3 py-1.5 rounded font-bold">
              Log In / Sign Up
            </button>
          )}
        </div>
      </header>

      {loadError && <div className="op-alert-error p-3 text-sm">{loadError}</div>}

      <main>{body}</main>

      {/* Modals */}
      {modal?.type === 'new' && <NewChecklistModal onCreate={handleCreate} onClose={() => setModal(null)} />}

      {modal?.type === 'join' && (
        <JoinModal
          initialCode={modal.code}
          canUseCodes={canUseCodes}
          onLogin={() => setIsAuthOpen(true)}
          onRedeem={handleRedeem}
          onClose={() => setModal(null)}
        />
      )}

      {shareTarget && (
        <ShareModal
          checklist={shareTarget}
          me={me}
          canUseCodes={canUseCodes}
          onCreateCode={async mode => {
            await cloud.createShareCode(shareTarget, mode, me);
            setToast(mode === 'live' ? 'Live share code is on' : 'Copy share code is on');
          }}
          onRevokeCode={async mode => {
            await cloud.revokeShareCode(shareTarget, mode);
            setToast('Share code turned off');
          }}
          onRemoveMember={uid => cloud.removeMember(shareTarget.id, uid)}
          onLogin={() => setIsAuthOpen(true)}
          notify={setToast}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'confirm' && (
        <ConfirmDialog
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          danger={modal.danger}
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            const action = modal.action;
            setModal(null);
            try {
              await action();
            } catch (err) {
              fail(err);
            }
          }}
        />
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onNameSet={setNameOverride} />

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 op-toast text-sm font-semibold" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
