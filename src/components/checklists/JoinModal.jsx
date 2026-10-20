import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import Modal from '../ui/Modal';
import { formatShareCode, normalizeShareCode } from '../../services/shareService';

/** Enter a share code from another user: joins a live list or adds your own copy. */
export default function JoinModal({ initialCode = '', canUseCodes, onLogin, onRedeem, onClose }) {
  const [code, setCode] = useState(formatShareCode(normalizeShareCode(initialCode)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onRedeem(normalizeShareCode(code));
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Join with a share code" onClose={onClose}>
      {canUseCodes ? (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm opacity-85">
            Enter the code someone sent you. A <strong>live</strong> code adds you to their checklist so you check items off together.
            A <strong>copy</strong> code gives you your own separate version.
          </p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABC-234"
            className="w-full p-3 rounded border op-code text-2xl text-center"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Share code"
          />
          {error && <div className="op-alert-error p-3 text-sm">{error}</div>}
          <button type="submit" disabled={busy || normalizeShareCode(code).length < 6} className="op-btn-primary w-full py-2.5 font-bold inline-flex items-center justify-center gap-2">
            <KeyRound size={16} /> {busy ? 'Checking code…' : 'Use code'}
          </button>
        </form>
      ) : (
        <div className="space-y-4 text-sm">
          <p>Share codes connect you with other people using the app, so you need to be signed in.</p>
          {initialCode && <p>Your code <span className="op-code">{formatShareCode(normalizeShareCode(initialCode))}</span> will be ready after you sign in.</p>}
          <button onClick={onLogin} className="op-btn-primary w-full py-2.5 font-bold">Log In / Sign Up</button>
        </div>
      )}
    </Modal>
  );
}
