import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ManilaChat.css';

// Compatible with the existing Vite environment and old conversation tokens.
const API = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') + '/api/chat';
const STORAGE = 'manilacafe_chat_v1';
const TOPICS = [
  ['order', '🛒 Beställning'], ['delivery', '🚗 Leverans'], ['pickup', '📍 Avhämtning'],
  ['payment', '💳 Betalning'], ['menu', '🍰 Meny och produkter'],
  ['allergy', '⚠️ Allergener'], ['discount', '🏷️ Rabattkod'],
  ['website', '🛠️ Hemsidan'], ['complaint', '💬 Reklamation'], ['other', '❓ Annat'],
];
const QUICK = [
  ['🚗 Leveransområden', 'Vilka områden levererar ni till?'],
  ['📍 Avhämtning', 'Var hämtar jag min beställning?'],
  ['🕙 Öppettider', 'Vilka öppettider har ni?'],
  ['🍰 Menyn', 'Var hittar jag menyn och priserna?'],
];
const getStored = () => { try { return JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch { return null; } };
async function request(path, method = 'GET', body, token) {
  const response = await fetch(API + path, { method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'X-Chat-Token': token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Kunde inte kontakta kundservicen.');
  return data;
}

export default function ManilaChat() {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState(getStored);
  const [customer, setCustomer] = useState({ name: '', phone: '', category: '', firstMessage: '' });
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('bot');
  const [availability, setAvailability] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const refreshAvailability = useCallback(async () => {
    try { const data = await request('/availability'); setAvailability(data); }
    catch { setAvailability(null); setError('Kunde inte kontrollera öppettiderna. Försök igen om en stund.'); }
  }, []);
  useEffect(() => {
    if (!expanded) return;
    void refreshAvailability();
    const t = setInterval(refreshAvailability, 30000);
    return () => clearInterval(t);
  }, [expanded, refreshAvailability]);
  useEffect(() => {
    if (!expanded || !session?.id || !session?.token) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await request(`/conversations/${session.id}`, 'GET', null, session.token);
        if (active) { setMessages(data.messages || []); setStatus(data.status); setAvailability(data.availability); setError(''); }
      } catch (err) {
        if (!active) return;
        if (/åtkomst|hittad/i.test(err.message)) { localStorage.removeItem(STORAGE); setSession(null); setMessages([]); }
        else setError(err.message);
      }
    };
    void poll(); const interval = setInterval(poll, 7000);
    return () => { active = false; clearInterval(interval); };
  }, [expanded, session]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, expanded]);

  async function begin(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const data = await request('/start', 'POST', customer);
      const next = { id: data.id, token: data.token };
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setSession(next); setStatus(data.status); setMessages(data.messages || []); setAvailability(data.availability);
      setCustomer(p => ({ ...p, firstMessage: '' }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function send(text) {
    const content = text.trim();
    if (!content || !session || busy || status === 'closed') return;
    setBusy(true); setError('');
    try {
      const data = await request(`/conversations/${session.id}/messages`, 'POST', { text: content }, session.token);
      setDraft(''); setStatus(data.status); setMessages(data.messages || []); setAvailability(data.availability);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function handoff() {
    if (!session || busy || status === 'closed') return;
    setBusy(true); setError('');
    try {
      const data = await request(`/conversations/${session.id}/handoff`, 'POST', {}, session.token);
      setMessages(data.messages || []); setStatus(data.status);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function newConversation() {
    localStorage.removeItem(STORAGE); setSession(null); setMessages([]); setStatus('bot'); setDraft(''); setError('');
  }
  const isOpen = availability?.isOpen;
  const title = availability === null ? 'Kontrollerar öppettider' : isOpen ? 'Chatt öppen • 10–23' : 'Stängt • lämna meddelande';

  return <div className="manila-chat-v2-root">
    <button className="mc2-launch" type="button" onClick={() => setExpanded(x => !x)}
      aria-label={expanded ? 'Stäng kundservice' : 'Öppna Manila Café kundservice'} aria-expanded={expanded}>
      {expanded ? '×' : '💬'}
    </button>
    {expanded && <section className="mc2-panel" role="dialog" aria-label="Manila Café kundservice">
      <header className="mc2-header">
        <div className="mc2-brand"><span className="mc2-logo">M</span><div><strong>Manila Café</strong><small><span className={'mc2-dot ' + (isOpen ? 'online' : '')} />{title}</small></div></div>
        <button type="button" aria-label="Stäng" className="mc2-close" onClick={() => setExpanded(false)}>×</button>
      </header>
      {!session ? <div className="mc2-prechat">
        <div className="mc2-intro"><strong>{availability === null ? 'Välkommen 💜' : isOpen ? 'Hej, hur kan vi hjälpa dig? 💜' : 'Lämna ett meddelande 💜'}</strong>
          <p>{isOpen ? 'Vi hjälper dig med din beställning, leverans eller frågor om menyn.' : 'Livechatten är öppen alla dagar 10.00–23.00. Skriv till oss så återkommer vi under öppettiderna.'}</p>
        </div>
        <form onSubmit={begin} className="mc2-form">
          <label>Namn <span>*</span><input required minLength={2} maxLength={80} autoComplete="name" placeholder="Ditt namn" value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} /></label>
          <label>Telefonnummer <span>*</span><input required type="tel" autoComplete="tel" inputMode="tel" placeholder="070 123 45 67" value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} /></label>
          <label>Vad gäller ditt ärende? <span>*</span><select required value={customer.category} onChange={e => setCustomer(p => ({ ...p, category: e.target.value }))}><option value="" disabled>Välj ett ämne...</option>{TOPICS.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
          <label>Hur kan vi hjälpa dig? <span>*</span><textarea required rows={3} maxLength={1000} placeholder="Beskriv gärna din fråga..." value={customer.firstMessage} onChange={e => setCustomer(p => ({ ...p, firstMessage: e.target.value }))} /></label>
          <p className="mc2-privacy">Vi använder dina uppgifter för att hantera och följa upp ditt ärende. Läs vår <a href="/integritet" target="_blank" rel="noreferrer">integritetspolicy</a>.</p>
          {error && <p className="mc2-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy || availability === null} className="mc2-primary">{busy ? 'Skickar...' : isOpen ? 'Starta konversation' : 'Skicka meddelande'}</button>
        </form>
      </div> : <>
        {!isOpen && availability && <p className="mc2-offline-banner">🌙 Livechatten är stängd. Vi svarar när vi är tillbaka, alla dagar 10.00–23.00.</p>}
        <div className="mc2-messages" role="log" aria-live="polite">
          {(messages || []).map((m, i) => <div key={m._id || i} className={'mc2-message mc2-' + m.role}><span>{m.role === 'customer' ? 'Du' : m.role === 'staff' ? 'Manila Café' : 'Automatiskt svar'}</span><p>{m.text}</p></div>)}
          <div ref={endRef} />
        </div>
        {status === 'closed' ? <div className="mc2-bottom"><p>Den här konversationen är avslutad.</p><button type="button" className="mc2-primary" onClick={newConversation}>Starta nytt ärende</button></div> : <div className="mc2-bottom">
          {isOpen && status === 'bot' && <div className="mc2-quick">{QUICK.map(([label, val]) => <button disabled={busy} type="button" key={label} onClick={() => void send(val)}>{label}</button>)}</div>}
          {isOpen && status === 'bot' && <button className="mc2-human" type="button" disabled={busy} onClick={() => void handoff()}>🙋 Jag vill prata med personal</button>}
          {status === 'needs_staff' && <p className="mc2-waiting">💜 Ditt ärende väntar på svar från personalen.</p>}
          <form className="mc2-send" onSubmit={e => { e.preventDefault(); void send(draft); }}>
            <textarea rows={2} maxLength={1000} aria-label="Ditt meddelande" placeholder={isOpen ? 'Skriv ett meddelande...' : 'Lägg till mer information...'} value={draft} onChange={e => setDraft(e.target.value)} />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Skicka meddelande">➤</button>
          </form>
          {error && <p className="mc2-error" role="alert">{error}</p>}
          <button type="button" className="mc2-new" onClick={newConversation}>Starta ett annat ärende</button>
        </div>}
      </>}
    </section>}
  </div>;
}
