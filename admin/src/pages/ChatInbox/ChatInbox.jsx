import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ChatInbox.css';

const CATEGORIES = [
  ['order', 'Beställning'], ['delivery', 'Leverans'], ['pickup', 'Avhämtning'],
  ['payment', 'Betalning'], ['menu', 'Meny och produkter'], ['allergy', 'Allergener'],
  ['discount', 'Rabattkod'], ['website', 'Hemsidan/tekniskt fel'],
  ['complaint', 'Reklamation'], ['other', 'Annat'],
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES);
const RESOLUTIONS = [
  ['resolved', 'Löst'], ['follow_up', 'Uppföljning behövs'],
  ['unresolved', 'Ej löst'], ['sale', 'Ledde till köp'], ['not_applicable', 'Ej angivet'],
];
const STATUS_LABELS = { bot: 'Automatiska svar', needs_staff: 'Väntar på personal', staff: 'Personal hanterar', closed: 'Avslutad' };
const QUICK = [
  ['Hälsning', 'Hej! 💜 Tack för att du hör av dig till Manila Café. Hur kan vi hjälpa dig?'],
  ['Ordernummer', 'Skulle du kunna skicka ditt ordernummer och kort beskriva vad som hänt? 💜'],
  ['Avhämtning', 'Avhämtning sker på Mandolingatan 13 i Västra Frölunda. 💜'],
  ['Återkoppling', 'Tack för informationen! 💜 Vi undersöker detta och återkommer så snart vi har ett svar.'],
];
const dateLabel = d => d ? new Date(d).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '';
const escapeSearch = v => String(v || '').toLocaleLowerCase('sv-SE');

export default function ChatInbox({ apiBase = '', authenticatedFetch }) {
  const [conversations, setConversations] = useState([]);
  const [insights, setInsights] = useState(null);
  const [chosenId, setChosenId] = useState(null);
  const [filter, setFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [form, setForm] = useState({ category: '', resolution: 'not_applicable', internalNote: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [availability, setAvailability] = useState(null);
  const soundRef = useRef(null);
  const knownRef = useRef(new Set());
  const initializedRef = useRef(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);
  const threadRef = useRef(null);

  const api = useCallback(async (path, options = {}) => {
    if (typeof authenticatedFetch !== 'function') throw new Error('Admininloggning måste vara aktiverad.');
    const response = await authenticatedFetch(apiBase.replace(/\/+$/, '') + '/api/chat/staff' + path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || 'Begäran misslyckades.');
    return data;
  }, [apiBase, authenticatedFetch]);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const [rows, stats, hoursResponse] = await Promise.all([
        api('/conversations'), api('/insights'),
        fetch(apiBase.replace(/\/+$/, '') + '/api/chat/availability', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      ]);
      if (!mountedRef.current) return;
      const list = Array.isArray(rows) ? rows : [];
      const nextKnown = new Set();
      let newMessages = 0;
      for (const c of list) for (const [index, m] of (c.messages || []).entries()) {
        if (m.role !== 'customer') continue;
        const key = c._id + ':' + (m._id || index);
        nextKnown.add(key);
        if (initializedRef.current && !knownRef.current.has(key)) newMessages++;
      }
      knownRef.current = nextKnown; initializedRef.current = true;
      setConversations(list); setInsights(stats); setAvailability(hoursResponse);
      if (newMessages > 0 && soundRef.current) {
        try { soundRef.current.currentTime = 0; await soundRef.current.play(); } catch { /* Browser may block playback. */ }
      }
    } catch (err) { if (mountedRef.current) setError(err.message); }
    finally { fetchingRef.current = false; if (mountedRef.current) setLoading(false); }
  }, [api, apiBase]);

  useEffect(() => {
    mountedRef.current = true; void refresh();
    const t = setInterval(refresh, 7000);
    return () => { mountedRef.current = false; clearInterval(t); soundRef.current?.pause(); };
  }, [refresh]);

  const visible = useMemo(() => conversations.filter(c => {
    if (filter === 'active' && (c.archivedAt || c.status === 'closed')) return false;
    if (filter === 'pending' && (c.archivedAt || c.status !== 'needs_staff')) return false;
    if (filter === 'closed' && (c.archivedAt || c.status !== 'closed')) return false;
    if (filter === 'archived' && !c.archivedAt) return false;
    if (filter === 'all') { /* no status filter */ }
    if (categoryFilter !== 'all' && c.category !== categoryFilter && c.customerCategory !== categoryFilter) return false;
    const needle = escapeSearch(search.trim());
    if (needle && ![c.customerName, c.customerPhone, c._id, c.category, c.internalNote].some(v => escapeSearch(v).includes(needle))) return false;
    return true;
  }), [conversations, filter, categoryFilter, search]);
  const current = visible.find(c => c._id === chosenId) || visible[0] || null;
  const currentId = current?._id;
  const count = current?.messages?.length || 0;
  useEffect(() => {
    const c = conversations.find(x => x._id === currentId);
    if (c) setForm({ category: c.category || '', resolution: c.resolution || 'not_applicable', internalNote: c.internalNote || '' });
    setReply(''); setNotice('');
  }, [currentId]); // Intentionally preserve unsaved edits across polling.
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [currentId, count]);

  async function toggleSound() {
    if (soundEnabled) { soundRef.current?.pause(); soundRef.current = null; setSoundEnabled(false); return; }
    try {
      const audio = new Audio('/sounds/chat-pling.wav'); audio.volume = 0.6;
      await audio.play(); soundRef.current = audio; setSoundEnabled(true); setError('');
    } catch { setError('Kunde inte spela chattljudet. Kontrollera webbläsarens ljudbehörigheter.'); }
  }
  async function sendReply(event) {
    event.preventDefault(); if (!current || !reply.trim() || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/conversations/${current._id}/reply`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: reply.trim() }) });
      setReply(''); setNotice('Svaret har skickats.'); await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function patch(changes, success) {
    if (!current || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/conversations/${current._id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      // Update the list straight after the server confirms the archive.
      // The background refresh remains the source of truth.
      setConversations(prev => prev.map(c => c._id === current._id
        ? { ...c, status: result.status, archivedAt: result.archivedAt, category: result.category }
        : c));
      window.dispatchEvent(new Event('manilacafe:chat-updated'));
      setNotice(success); await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function save() { void patch(form, 'Ärendet har uppdaterats.'); }
  function archive() {
    if (!form.category) { setError('Välj en problemkategori innan du arkiverar.'); return; }
    void patch({ ...form, archived: true }, 'Ärendet är arkiverat och kategoriserat.');
  }
  const stats = [
    ['Aktiva', insights?.active], ['Väntar på svar', insights?.needsStaff],
    ['Arkiverade', insights?.archived], ['Snitt till första svar (min)', insights?.averageFirstReplyMinutes],
  ];

  return <main className="mc-inbox-v2">
    <header className="mci-header"><div><h1>💜 Kundservice & ärenden</h1><p>Hantera frågor, kategorisera problem och hitta förbättringsmöjligheter.</p></div>
      <div className="mci-header-actions"><span className={'mci-hours ' + (availability?.isOpen ? 'on' : '')}>{availability?.isOpen ? '● Livechatt öppen' : '● Livechatt stängd'}</span>
        <button type="button" onClick={toggleSound}>{soundEnabled ? '🔊 Ljud på' : '🔔 Aktivera ljud'}</button>
        <button type="button" onClick={() => void refresh()}>↻ Uppdatera</button></div></header>
    {error && <p className="mci-error" role="alert">{error}</p>}
    {notice && <p className="mci-success" role="status">{notice}</p>}
    <div className="mci-stats">{stats.map(([label, value]) => <div key={label}><strong>{value ?? '—'}</strong><span>{label}</span></div>)}</div>
    <div className="mci-layout">
      <aside className="mci-list"><div className="mci-filters"><h2>Inkorg <span className="mci-active-badge" aria-label={`${insights?.active ?? 0} aktiva chattar`}>{insights?.active ?? 0}</span></h2>
        <input aria-label="Sök kund, telefon eller ärende" placeholder="Sök namn, nummer eller ärende" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="mci-filter-row"><select aria-label="Filtrera ärenden" value={filter} onChange={e => { setFilter(e.target.value); setChosenId(null); }}>
          <option value="active">Aktiva</option><option value="pending">Väntar på svar</option><option value="closed">Avslutade</option><option value="archived">Arkiv</option><option value="all">Alla</option>
        </select><select aria-label="Filtrera kategori" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setChosenId(null); }}><option value="all">Alla kategorier</option>{CATEGORIES.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></div>
      </div><div className="mci-list-scroll">{loading && <p className="mci-muted">Laddar…</p>}{!loading && visible.length === 0 && <p className="mci-muted">Inga ärenden matchar filtret.</p>}
        {visible.map(c => <button type="button" key={c._id} className={'mci-conversation ' + (current?._id === c._id ? 'selected' : '')} onClick={() => setChosenId(c._id)}>
          <div><strong>{c.customerName || 'Okänd kund'}</strong><small>{dateLabel(c.lastMessageAt)}</small></div>
          <span>{c.archivedAt ? 'Arkiverad' : STATUS_LABELS[c.status] || 'Okänd status'} · {CATEGORY_LABELS[c.category || c.customerCategory] || 'Okänt ärende'}</span>
          <p>{(c.messages || []).at(-1)?.text?.slice(0, 95) || 'Inget meddelande'}</p>
        </button>)}</div></aside>
      <section className="mci-thread-panel">{!current ? <div className="mci-empty">Välj ett ärende för att läsa konversationen.</div> : <>
        <div className="mci-thread-heading"><div><h2>{current.customerName || 'Okänd kund'}</h2>
          <p><a href={current.customerPhone ? `tel:${current.customerPhone}` : undefined}>{current.customerPhone || 'Telefonnummer saknas (äldre ärende)'}</a> · {dateLabel(current.createdAt)}</p>
          <p>Kundens val: {CATEGORY_LABELS[current.customerCategory] || 'Ej angivet'}</p></div>
          <span className="mci-status">{current.archivedAt ? 'Arkiverat' : STATUS_LABELS[current.status]}</span></div>
        <div className="mci-actions">
          {current.archivedAt ? <button type="button" disabled={busy} onClick={() => void patch({ archived: false }, 'Ärendet har återöppnats.')}>↩ Återöppna</button> : <>
            {current.status !== 'staff' && <button type="button" disabled={busy} onClick={() => void patch({ status: 'staff' }, 'Du har tagit över ärendet.')}>🙋 Ta över</button>}
            {current.status !== 'closed' && <button type="button" disabled={busy} onClick={() => void patch({ status: 'closed' }, 'Ärendet har avslutats.')}>✓ Avsluta</button>}
            {current.status === 'closed' && <button type="button" disabled={busy} onClick={() => void patch({ status: 'needs_staff' }, 'Ärendet har öppnats igen.')}>↩ Återöppna</button>}
          </>}
        </div>
        <div ref={threadRef} className="mci-thread" role="log">{(current.messages || []).map((m, i) => <div key={m._id || i} className={'mci-msg ' + m.role}><small>{m.role === 'customer' ? current.customerName || 'Kund' : m.role === 'staff' ? 'Personal' : 'Automatiskt svar'} · {dateLabel(m.at)}</small><p>{m.text}</p></div>)}</div>
        <div className="mci-reply">
          <div className="mci-templates">{QUICK.map(([label, content]) => <button type="button" key={label} disabled={busy || current.status === 'closed' || Boolean(current.archivedAt)} onClick={() => setReply(content)}>{label}</button>)}</div>
          <form onSubmit={sendReply}><textarea rows={2} maxLength={1000} value={reply} onChange={e => setReply(e.target.value)} placeholder="Skriv ett svar till kunden..." disabled={busy || current.status === 'closed' || Boolean(current.archivedAt) || !availability?.isOpen} />
            <button type="submit" disabled={busy || !reply.trim() || current.status === 'closed' || Boolean(current.archivedAt) || !availability?.isOpen}>Skicka</button></form>
          {!availability?.isOpen && <p className="mci-hint">Livechatten öppnar kl. 10.00. Ärendet ligger kvar tills ni svarar.</p>}
        </div>
      </>}</section>
      <aside className="mci-details">{current && <><h2>Ärendehantering</h2><p className="mci-hint">Klassificera orsaken innan du arkiverar. Dessa uppgifter syns bara i admin.</p>
        <label>Problemkategori <span>*</span><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}><option value="">Välj kategori...</option>{CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Resultat<select value={form.resolution} onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))}>{RESOLUTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Intern anteckning<textarea rows={5} maxLength={1500} placeholder="Vad orsakade problemet? Hur löste vi det? Vad kan förbättras?" value={form.internalNote} onChange={e => setForm(p => ({ ...p, internalNote: e.target.value }))}/></label>
        <button type="button" disabled={busy} onClick={save} className="mci-save">Spara uppgifter</button>
        {!current.archivedAt && <button type="button" disabled={busy} onClick={archive} className="mci-archive">📁 Avsluta & arkivera</button>}
        {current.archivedAt && <p className="mci-hint">Arkiverat {dateLabel(current.archivedAt)}</p>}
      </>}</aside>
    </div>
    <section className="mci-analytics"><h2>Vilka problem återkommer?</h2><p>Fördelning av personalens kategorisering. Nya ärenden räknas efter att ni har valt en kategori.</p>
      <div className="mci-category-grid">{CATEGORIES.map(([id, label]) => <div key={id}><span>{label}</span><strong>{insights?.categories?.[id] || 0}</strong></div>)}</div>
    </section>
  </main>;
}
