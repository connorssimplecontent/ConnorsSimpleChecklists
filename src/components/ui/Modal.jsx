import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 op-backdrop flex items-start sm:items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto"
      onMouseDown={e => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`op-modal p-5 w-full my-6 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="op-modal-title text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded opacity-70 hover:opacity-100">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="op-btn-secondary px-4 py-2 text-sm font-semibold">Cancel</button>
        <button
          onClick={onConfirm}
          className="op-btn-primary px-4 py-2 text-sm font-bold"
          style={danger ? { background: 'var(--danger)' } : undefined}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function ProgressBar({ pct, complete, label }) {
  return (
    <div
      className={`op-progress ${complete ? 'is-complete' : ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
