import React, { useMemo, useState } from 'react';
import { MessageSquare, Mail, Copy, Share2, Radio, CopyPlus, X, Users } from 'lucide-react';
import Modal from '../ui/Modal';
import {
  checklistAsText,
  smsHref,
  mailtoHref,
  copyText,
  canNativeShare,
  nativeShare,
  formatShareCode,
  joinLink
} from '../../services/shareService';
import { variantName } from '../../utils/checklist';

const MODES = {
  live: {
    icon: Radio,
    title: 'Live (shared list)',
    blurb: 'Everyone with the code works on this same checklist. Checks, resets and edits show up for everyone in real time.'
  },
  copy: {
    icon: CopyPlus,
    title: 'Copy (separate list)',
    blurb: 'People get their own copy of this checklist with nothing checked. Their changes don’t affect yours.'
  }
};

export default function ShareModal({ checklist, me, canUseCodes, onCreateCode, onRevokeCode, onRemoveMember, onLogin, notify, onClose }) {
  const [tab, setTab] = useState('app');
  const isOwner = !me || checklist.ownerId === me.uid;

  return (
    <Modal title={`Share “${checklist.title}”`} onClose={onClose} wide>
      <div className="op-segment inline-flex p-1 gap-1 mb-4" role="tablist">
        {[['app', 'With app users'], ['send', 'Text or email']].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-sm font-bold ${tab === id ? 'op-btn-primary' : 'opacity-75'}`}
            style={{ borderRadius: 'var(--btn-radius)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'app' ? (
        <AppShare
          checklist={checklist}
          me={me}
          isOwner={isOwner}
          canUseCodes={canUseCodes}
          onCreateCode={onCreateCode}
          onRevokeCode={onRevokeCode}
          onRemoveMember={onRemoveMember}
          onLogin={onLogin}
          notify={notify}
          goSend={() => setTab('send')}
        />
      ) : (
        <SendShare checklist={checklist} notify={notify} />
      )}
    </Modal>
  );
}

function AppShare({ checklist, me, isOwner, canUseCodes, onCreateCode, onRevokeCode, onRemoveMember, onLogin, notify, goSend }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  if (!canUseCodes) {
    return (
      <div className="space-y-3 text-sm">
        <p>Sign in to share this checklist with other people who use the app. You'll get a share code they can enter to join your list live or get their own copy.</p>
        <p className="opacity-80">You can still send it as a text or email without signing in.</p>
        <button onClick={onLogin} className="op-btn-primary px-4 py-2 font-bold">Log In / Sign Up</button>
      </div>
    );
  }

  const run = async (key, fn) => {
    setError('');
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const others = checklist.members.filter(uid => uid !== checklist.ownerId);

  return (
    <div className="space-y-4">
      {!isOwner && (
        <p className="text-sm op-item p-3">
          Only the owner ({checklist.ownerName || 'the person who shared it'}) can create share codes for this list.
          {checklist.liveCode ? '' : ' You can still send it by text or email.'}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {['live', 'copy'].map(mode => {
          const { icon: Icon, title, blurb } = MODES[mode];
          const code = checklist[mode === 'live' ? 'liveCode' : 'copyCode'];
          if (!isOwner && !(mode === 'live' && code)) return null;
          return (
            <div key={mode} className="op-item p-4 flex flex-col gap-3">
              <div>
                <div className="font-bold inline-flex items-center gap-1.5"><Icon size={16} /> {title}</div>
                <p className="text-xs opacity-80 mt-1">{blurb}</p>
              </div>
              {code ? (
                <>
                  <div className="text-center py-2">
                    <div className="op-code text-3xl">{formatShareCode(code)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => notify((await copyText(joinLink(code))) ? 'Join link copied' : 'Could not copy')}
                      className="op-btn-secondary flex-1 px-3 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <Copy size={13} /> Copy link
                    </button>
                    <button onClick={goSend} className="op-btn-secondary flex-1 px-3 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1">
                      <MessageSquare size={13} /> Text / email it
                    </button>
                  </div>
                  {isOwner && (
                    <div className="flex gap-2 text-xs">
                      <button disabled={!!busy} onClick={() => run(mode + 'new', () => onCreateCode(mode))} className="underline opacity-80">New code</button>
                      <span className="opacity-40">·</span>
                      <button disabled={!!busy} onClick={() => run(mode + 'off', () => onRevokeCode(mode))} className="underline text-red-400">Turn off</button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  disabled={!!busy}
                  onClick={() => run(mode, () => onCreateCode(mode))}
                  className="op-btn-primary mt-auto px-3 py-2 text-sm font-bold"
                >
                  {busy === mode ? 'Creating…' : 'Create share code'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="op-alert-error p-3 text-sm">{error}</div>}

      <div>
        <h3 className="op-section-label mb-2 inline-flex items-center gap-1.5"><Users size={13} /> People on this list</h3>
        <ul className="space-y-1.5">
          {[checklist.ownerId, ...others].map(uid => (
            <li key={uid} className="op-item px-3 py-2 flex items-center justify-between text-sm">
              <span>
                {uid === me?.uid ? 'You' : checklist.memberNames[uid] || 'Member'}
                {uid === checklist.ownerId && <span className="opacity-60"> · owner</span>}
              </span>
              {isOwner && uid !== checklist.ownerId && (
                <button
                  onClick={() => run('rm' + uid, () => onRemoveMember(uid))}
                  className="p-1 opacity-70 hover:opacity-100"
                  aria-label={`Remove ${checklist.memberNames[uid] || 'member'}`}
                  title="Remove from list"
                >
                  <X size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!others.length && <p className="text-xs opacity-70 mt-2">Nobody else yet. Create a live code and send it to them.</p>}
      </div>
    </div>
  );
}

function SendShare({ checklist, notify }) {
  const codeChoices = [
    checklist.liveCode && { value: 'live', label: `Live code (${formatShareCode(checklist.liveCode)}) – check off together` },
    checklist.copyCode && { value: 'copy', label: `Copy code (${formatShareCode(checklist.copyCode)}) – they get their own` }
  ].filter(Boolean);

  const [variantId, setVariantId] = useState(checklist.activeVariantId);
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [codeMode, setCodeMode] = useState(codeChoices[0]?.value || '');

  const code = codeMode === 'live' ? checklist.liveCode : codeMode === 'copy' ? checklist.copyCode : '';
  const body = useMemo(
    () => checklistAsText(checklist, { variantId, onlyRemaining, showStatus, code, codeMode }),
    [checklist, variantId, onlyRemaining, showStatus, code, codeMode]
  );
  const subject = `${checklist.title}${checklist.variants.length > 1 ? ` (${variantName(checklist, variantId)})` : ''}`;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {checklist.variants.length > 1 && (
          <label className="font-semibold flex flex-col gap-1 min-w-0">
            <span className="text-xs uppercase">Version</span>
            <select value={variantId} onChange={e => setVariantId(e.target.value)} className="w-full min-w-0 p-2 rounded border">
              {checklist.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
        )}
        <label className="font-semibold flex flex-col gap-1 min-w-0">
          <span className="text-xs uppercase">Include share code</span>
          <select value={codeMode} onChange={e => setCodeMode(e.target.value)} className="w-full min-w-0 p-2 rounded border" disabled={!codeChoices.length}>
            <option value="">{codeChoices.length ? 'No code – just the list' : 'No codes yet (create one in “With app users”)'}</option>
            {codeChoices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={onlyRemaining} onChange={e => setOnlyRemaining(e.target.checked)} /> Only items not done yet</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showStatus} onChange={e => setShowStatus(e.target.checked)} /> Show ☑ / ☐ status</label>
      </div>

      <textarea readOnly value={body} rows={10} className="w-full p-3 rounded border text-sm font-mono" aria-label="Message preview" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <a href={smsHref(body)} className="op-btn-primary px-3 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1.5">
          <MessageSquare size={16} /> Text
        </a>
        <a href={mailtoHref(subject, body)} className="op-btn-primary px-3 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1.5">
          <Mail size={16} /> Email
        </a>
        <button
          onClick={async () => notify((await copyText(body)) ? 'Checklist copied – paste it anywhere' : 'Could not copy')}
          className="op-btn-secondary px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <Copy size={16} /> Copy
        </button>
        {canNativeShare() ? (
          <button onClick={() => nativeShare(subject, body)} className="op-btn-secondary px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5">
            <Share2 size={16} /> More…
          </button>
        ) : <span />}
      </div>
      <p className="text-xs opacity-70">Text opens your phone's Messages app and Email opens your mail app, with the checklist filled in. You pick who to send it to.</p>
    </div>
  );
}
