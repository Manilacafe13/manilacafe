import React, { useEffect, useState } from 'react';
import './ManilaChat.css';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api/chat';
const STORAGE = 'manilacafe_chat_v1';
const OPTIONS = [
  ['🚗 Leverans','Levererar ni till mig?'],
  ['🍰 Meny','Vad rekommenderar ni?'],
  ['🙋 Prata med personal','__handoff__'],
];
const REASONS = [
  ['delivery_cost','Leveransen kostar för mycket'],['product_info','Jag saknar produktinformation'],
  ['price','Priset känns högt'],['payment','Problem med betalningen'],
  ['just_browsing','Jag tittar bara'],['other','Annat']
];

async function request(path, method = 'GET', payload, token) {
  const res = await fetch(API + path, {
    method,
    headers: { ...(payload ? {'Content-Type':'application/json'} : {}), ...(token ? {'X-Chat-Token':token} : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Kunde inte ansluta till chatten.');
  return data;
}
export default function ManilaChat() {
  const [open,setOpen] = useState(false);
  const [session,setSession] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch { return null; } });
  const [messages,setMessages] = useState([]);
  const [status,setStatus] = useState('bot');
  const [input,setInput] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [feedback,setFeedback] = useState(false);
  const [feedbackSent,setFeedbackSent] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    let active = true;
    const refresh = async () => {
      try {
        const data = await request(`/conversations/${session.id}`, 'GET', null, session.token);
        if (active) { setMessages(data.messages || []); setStatus(data.status); setError(''); }
      } catch (err) {
        if (!active) return;
        if (/åtkomst|hittad/i.test(err.message)) { localStorage.removeItem(STORAGE); setSession(null); }
        setError(err.message);
      }
    };
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => { active = false; clearInterval(interval); };
  }, [open,session]);

  async function start() {
    if (session) return session;
    const data = await request('/start','POST',{});
    const next = {id:data.id,token:data.token};
    localStorage.setItem(STORAGE,JSON.stringify(next));
    setSession(next); setMessages(data.messages || []); setStatus(data.status);
    return next;
  }
  async function send(text) {
    const msg = text.trim(); if (!msg || busy) return;
    setBusy(true); setError('');
    try {
      const s = await start();
      const handoff = msg === '__handoff__';
      const data = await request(`/conversations/${s.id}/${handoff ? 'handoff':'messages'}`,'POST',handoff?{}:{text:msg},s.token);
      setMessages(data.messages); setStatus(data.status); setInput('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function submitFeedback(reason) {
    setBusy(true);setError('');
    try { const s = await start(); await request(`/conversations/${s.id}/feedback`,'POST',{reason},s.token); setFeedbackSent(true); }
    catch (err) {setError(err.message);} finally {setBusy(false);}
  }
  return <div className="manila-chat-root">
    {open && <section className="manila-chat-panel" role="dialog" aria-label="Manila Café livechatt">
      <header className="manila-chat-header"><div><strong>💜 Manila Café</strong><small>{status==='needs_staff'?'Väntar på personal':status==='staff'?'Personalen hjälper dig': 'Automatisk hjälp • Personal vid behov'}</small></div><button aria-label="Stäng chatten" onClick={()=>setOpen(false)}>×</button></header>
      <div className="manila-chat-messages" role="log" aria-live="polite">
        {messages.length===0 && <p className="manila-chat-bot">Hej hej! 💜 Välkommen till Manila Café! Vad kan jag hjälpa dig med?</p>}
        {messages.map((m,i)=><p key={m._id || i} className={'manila-chat-'+(m.role==='customer'?'customer':'bot')}>{m.text}</p>)}
        {!messages.some(m=>m.role==='customer') && <div className="manila-chat-options">{OPTIONS.map(([label,value])=><button key={value} type="button" disabled={busy} onClick={()=>send(value)}>{label}</button>)}</div>}
        {feedback && !feedbackSent && <div className="manila-chat-feedback"><strong>Vad hindrade dig från att beställa?</strong>{REASONS.map(([value,label])=><button disabled={busy} key={value} onClick={()=>submitFeedback(value)}>{label}</button>)}</div>}
        {feedbackSent && <p className="manila-chat-bot">Tack! 💜 Din feedback hjälper oss att bli bättre.</p>}
      </div>
      {error && <p className="manila-chat-error" role="alert">{error}</p>}
      <form className="manila-chat-compose" onSubmit={e=>{e.preventDefault();send(input);}}><input aria-label="Ditt meddelande" placeholder="Skriv ditt meddelande..." maxLength={1000} value={input} onChange={e=>setInput(e.target.value)} /><button disabled={busy||!input.trim()} aria-label="Skicka" type="submit">➤</button></form>
      <footer className="manila-chat-footer"><button type="button" onClick={()=>send('__handoff__')} disabled={busy||status==='needs_staff'}>Prata med personal</button><button type="button" onClick={()=>setFeedback(v=>!v)} disabled={feedbackSent}>Ge feedback</button></footer>
    </section>}
    <button type="button" className="manila-chat-launch" aria-label={open?'Stäng Manila Café chatten':'Öppna Manila Café chatten'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'×':'💬'}</button>
  </div>;
}
