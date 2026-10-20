import React, { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, X, Save, ListPlus } from 'lucide-react';
import { newId, EMOJI_CHOICES } from '../../utils/checklist';

/**
 * Build or edit a checklist: title, emoji, versions, and per-version items/quantities.
 * Works on a local draft; nothing is saved until "Save changes".
 */
export default function ChecklistEditor({ checklist, onSave, onCancel }) {
  const [title, setTitle] = useState(checklist.title);
  const [emoji, setEmoji] = useState(checklist.emoji);
  const [description, setDescription] = useState(checklist.description);
  const [variants, setVariants] = useState(checklist.variants);
  const [items, setItems] = useState(checklist.items);
  const [newVersionName, setNewVersionName] = useState('');
  const [copyFrom, setCopyFrom] = useState(checklist.activeVariantId);
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [error, setError] = useState('');

  const sections = useMemo(() => [...new Set(items.map(i => (i.section || '').trim()).filter(Boolean))], [items]);
  const multi = variants.length > 1;

  // ---------- versions ----------
  const renameVariant = (id, name) => setVariants(vs => vs.map(v => (v.id === id ? { ...v, name } : v)));

  const removeVariant = id => {
    if (variants.length === 1) return;
    setVariants(vs => vs.filter(v => v.id !== id));
    setItems(its => its.map(it => {
      const { [id]: _drop, ...rest } = it.versions;
      return { ...it, versions: rest };
    }));
    if (copyFrom === id) setCopyFrom(variants.find(v => v.id !== id)?.id);
  };

  const addVariant = e => {
    e.preventDefault();
    const name = newVersionName.trim();
    if (!name) return;
    if (variants.length >= 12) { setError('A checklist can have up to 12 versions.'); return; }
    const id = newId('v');
    setVariants(vs => [...vs, { id, name: name.slice(0, 40) }]);
    // New version starts with the same items (and quantities) as the chosen version
    if (copyFrom) {
      setItems(its => its.map(it => (it.versions[copyFrom] ? { ...it, versions: { ...it.versions, [id]: { ...it.versions[copyFrom] } } } : it)));
    }
    setNewVersionName('');
  };

  // ---------- items ----------
  const updateItem = (id, patch) => setItems(its => its.map(it => (it.id === id ? { ...it, ...patch } : it)));

  const setInVersion = (item, vid, included) => {
    const versions = { ...item.versions };
    if (included) versions[vid] = { qty: null };
    else delete versions[vid];
    updateItem(item.id, { versions });
  };

  const setQty = (item, vid, raw) => {
    const n = parseInt(raw, 10);
    updateItem(item.id, { versions: { ...item.versions, [vid]: { qty: Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : null } } });
  };

  const move = (index, dir) => {
    const to = index + dir;
    if (to < 0 || to >= items.length) return;
    setItems(its => {
      const next = [...its];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const allVersions = () => Object.fromEntries(variants.map(v => [v.id, { qty: null }]));

  const addItem = () => {
    const section = items.length ? items[items.length - 1].section : '';
    setItems(its => [...its, { id: newId('i'), text: '', section, versions: allVersions() }]);
  };

  const addBulk = () => {
    let section = '';
    const added = [];
    for (const raw of bulk.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      // "Clothing:" on its own line starts a new section
      if (line.endsWith(':')) { section = line.slice(0, -1).trim(); continue; }
      added.push({ id: newId('i'), text: line.replace(/^[-*•☐☑]\s*/, '').slice(0, 200), section, versions: allVersions() });
    }
    setItems(its => [...its, ...added]);
    setBulk('');
    setShowBulk(false);
  };

  const save = () => {
    setError('');
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError('Give your checklist a name.'); return; }
    const cleanVariants = variants.map((v, i) => ({ ...v, name: v.name.trim() || `Version ${i + 1}` }));
    const cleanItems = items
      .map(it => ({ ...it, text: it.text.trim(), section: (it.section || '').trim() }))
      .filter(it => it.text);
    if (cleanItems.length > 500) { setError('A checklist can have up to 500 items.'); return; }
    const activeVariantId = cleanVariants.some(v => v.id === checklist.activeVariantId) ? checklist.activeVariantId : cleanVariants[0].id;
    onSave({ title: cleanTitle.slice(0, 120), emoji, description: description.trim().slice(0, 300), variants: cleanVariants, items: cleanItems, activeVariantId });
  };

  return (
    <div className="space-y-4">
      {/* Basics */}
      <div className="op-card p-4 md:p-5 space-y-4">
        <h2 className="op-heading text-xl">Edit checklist</h2>
        <div className="grid gap-3 md:grid-cols-[auto_1fr]">
          <div>
            <label className="text-xs font-bold uppercase block mb-1.5" htmlFor="emoji">Icon</label>
            <select id="emoji" value={emoji} onChange={e => setEmoji(e.target.value)} className="p-2 rounded border text-xl">
              {EMOJI_CHOICES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase block mb-1.5" htmlFor="title">Name</label>
            <input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} className="w-full p-2 rounded border font-semibold" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase block mb-1.5" htmlFor="desc">Description (optional)</label>
          <input id="desc" value={description} onChange={e => setDescription(e.target.value)} maxLength={300} className="w-full p-2 rounded border text-sm" />
        </div>
      </div>

      {/* Versions */}
      <div className="op-card p-4 md:p-5 space-y-3">
        <div>
          <h3 className="op-heading text-lg">Versions</h3>
          <p className="text-xs opacity-75 mt-1">
            Pre-set versions of the same list, like a 3, 5 or 7 day trip, or a full vs. partial beach day. Each item below picks which versions it's in and how many.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => (
            <div key={v.id} className="op-item flex items-center gap-1 pl-2 pr-1 py-1">
              <input
                value={v.name}
                onChange={e => renameVariant(v.id, e.target.value)}
                maxLength={40}
                className="bg-transparent border-0 px-1 py-0.5 text-sm font-semibold w-32"
                aria-label="Version name"
              />
              {multi && (
                <button onClick={() => removeVariant(v.id)} className="p-1 opacity-60 hover:opacity-100" aria-label={`Remove version ${v.name}`}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={addVariant} className="flex flex-wrap gap-2 items-center">
          <input
            value={newVersionName}
            onChange={e => setNewVersionName(e.target.value)}
            placeholder="New version name, e.g. 10-Day Trip"
            maxLength={40}
            className="flex-1 min-w-[12rem] p-2 rounded border text-sm"
          />
          <label className="text-xs font-semibold flex items-center gap-1.5">
            Start with items from
            <select value={copyFrom || ''} onChange={e => setCopyFrom(e.target.value)} className="p-1.5 rounded border text-xs">
              {variants.map(v => <option key={v.id} value={v.id}>{v.name || 'Untitled'}</option>)}
              <option value="">Nothing (empty)</option>
            </select>
          </label>
          <button type="submit" className="op-btn-secondary px-3 py-2 text-sm font-semibold inline-flex items-center gap-1" disabled={!newVersionName.trim()}>
            <Plus size={15} /> Add version
          </button>
        </form>
      </div>

      {/* Items */}
      <div className="op-card p-4 md:p-5 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="op-heading text-lg">Items ({items.length})</h3>
          <button onClick={() => setShowBulk(s => !s)} className="op-btn-secondary px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1.5">
            <ListPlus size={15} /> Paste a list
          </button>
        </div>

        {showBulk && (
          <div className="op-item p-3 space-y-2">
            <p className="text-xs opacity-80">One item per line. A line ending in a colon (e.g. <em>Toiletries:</em>) starts a section. Pasted items go into every version.</p>
            <textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={6} className="w-full p-2 rounded border text-sm" placeholder={'Clothing:\nShirts\nSocks\nToiletries:\nToothbrush'} />
            <button onClick={addBulk} disabled={!bulk.trim()} className="op-btn-primary px-3 py-1.5 text-sm font-bold">Add these items</button>
          </div>
        )}

        <datalist id="section-options">
          {sections.map(s => <option key={s} value={s} />)}
        </datalist>

        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={item.id} className="op-item p-3 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  value={item.text}
                  onChange={e => updateItem(item.id, { text: e.target.value })}
                  placeholder="Item"
                  maxLength={200}
                  className="flex-1 min-w-[10rem] p-2 rounded border text-sm font-medium"
                  aria-label="Item text"
                  autoFocus={!item.text && index === items.length - 1}
                />
                <input
                  value={item.section}
                  onChange={e => updateItem(item.id, { section: e.target.value })}
                  placeholder="Section"
                  list="section-options"
                  maxLength={60}
                  className="w-36 p-2 rounded border text-sm"
                  aria-label="Section"
                />
                <div className="flex gap-1">
                  <IconBtn label="Move up" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={15} /></IconBtn>
                  <IconBtn label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown size={15} /></IconBtn>
                  <IconBtn label="Delete item" onClick={() => setItems(its => its.filter(i => i.id !== item.id))}><Trash2 size={15} className="text-red-400" /></IconBtn>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => {
                  const inV = !!item.versions[v.id];
                  return (
                    <div key={v.id} className={`op-chip op-badge inline-flex items-center gap-1.5 px-2 py-1 text-xs ${inV ? '' : 'opacity-50'}`}>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input type="checkbox" checked={inV} onChange={e => setInVersion(item, v.id, e.target.checked)} />
                        {multi ? v.name || 'Untitled' : 'Quantity'}
                      </label>
                      {inV && (
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          inputMode="numeric"
                          value={item.versions[v.id].qty ?? ''}
                          onChange={e => setQty(item, v.id, e.target.value)}
                          placeholder="qty"
                          className="w-14 px-1.5 py-0.5 rounded border text-xs"
                          aria-label={`Quantity for ${v.name}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>

        <button onClick={addItem} className="op-btn-secondary w-full py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5">
          <Plus size={16} /> Add item
        </button>
      </div>

      {error && <div className="op-alert-error p-3 text-sm">{error}</div>}

      <div className="flex justify-end gap-2 sticky bottom-3 z-10">
        <button onClick={onCancel} className="op-btn-secondary px-4 py-2 text-sm font-semibold" style={{ background: 'var(--modal-bg, var(--card-bg))' }}>Cancel</button>
        <button onClick={save} className="op-btn-primary px-5 py-2 text-sm font-bold inline-flex items-center gap-1.5">
          <Save size={16} /> Save changes
        </button>
      </div>
    </div>
  );
}

function IconBtn({ label, children, ...props }) {
  return (
    <button aria-label={label} title={label} className="op-btn-secondary p-2 disabled:opacity-30" {...props}>
      {children}
    </button>
  );
}
