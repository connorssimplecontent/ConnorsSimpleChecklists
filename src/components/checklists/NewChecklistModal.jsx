import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../ui/Modal';
import { TEMPLATES } from '../../data/templates';
import { blankChecklist, fromTemplate, EMOJI_CHOICES } from '../../utils/checklist';

export default function NewChecklistModal({ onCreate, onClose }) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✅');
  const [busy, setBusy] = useState(false);

  const create = async (data, openEditor) => {
    setBusy(true);
    try {
      await onCreate(data, openEditor);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="New checklist" onClose={onClose} wide>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (title.trim()) create(blankChecklist(title.trim().slice(0, 120), emoji), true);
        }}
        className="op-item p-3 flex flex-wrap gap-2 items-center mb-5"
      >
        <select value={emoji} onChange={e => setEmoji(e.target.value)} className="p-2 rounded border text-lg" aria-label="Icon">
          {EMOJI_CHOICES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Name a blank checklist…"
          maxLength={120}
          className="flex-1 min-w-[10rem] p-2 rounded border"
          autoFocus
        />
        <button type="submit" disabled={!title.trim() || busy} className="op-btn-primary px-4 py-2 text-sm font-bold inline-flex items-center gap-1">
          <Plus size={16} /> Create
        </button>
      </form>

      <h3 className="op-section-label mb-2">Or start from a template</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            disabled={busy}
            onClick={() => create(fromTemplate(t), false)}
            className="op-item p-3 text-left flex gap-3 items-start"
          >
            <span className="op-emoji" aria-hidden="true">{t.emoji}</span>
            <span className="min-w-0">
              <span className="font-bold block">{t.title}</span>
              <span className="text-xs opacity-80 block mt-0.5">{t.description}</span>
              <span className="flex flex-wrap gap-1 mt-2">
                {t.variants.map(v => (
                  <span key={v.key} className="op-badge op-chip px-2 py-0.5 text-[11px] font-semibold">{v.name}</span>
                ))}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
