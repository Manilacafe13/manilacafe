// Manila Café chat active count – excludes archived and closed conversations.
import React, { useCallback, useEffect, useState } from 'react';

export default function ChatActiveCount() {
  const [active, setActive] = useState(0);
  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setActive(0); return; }
    const base = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')).replace(/\/+$/, '');
    try {
      const response = await fetch(`${base}/api/chat/staff/queue-count`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (!response.ok) return;
      const data = await response.json();
      if (Number.isInteger(data.active) && data.active >= 0) setActive(data.active);
    } catch { /* Keep previous value if the server is temporarily unavailable. */ }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 7000);
    window.addEventListener('manilacafe:chat-updated', refresh);
    return () => { clearInterval(timer); window.removeEventListener('manilacafe:chat-updated', refresh); };
  }, [refresh]);
  return <span aria-label={`${active} aktiva chattar`} title={`${active} aktiva chattar`}
    style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth:22,
      height:22, borderRadius:999, marginLeft:8, padding:'0 6px',
      background:'#7950ab', color:'#fff', fontSize:12, fontWeight:700 }}>
    {active}
  </span>;
}
