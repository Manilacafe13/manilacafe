// Manila Café – visar antalet betalda och pågående beställningar i adminmenyn.
// Samma indelning som Orders.jsx: Levererad/Upphämtad = arkiv;
// Avbruten = avbrutet; obetald = väntar betalning.
import React, { useEffect, useState } from 'react';

const COMPLETED = new Set(['Levererad', 'Upphämtad']);
const POLL_MS = 8000;

const isActiveOrder = (order) => Boolean(
  order &&
  !COMPLETED.has(order.status) &&
  order.status !== 'Avbruten' &&
  order.kitchenPaused !== true &&
  order.payment === true
);

export default function OrdersActiveCount() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let alive = true;
    let fetching = false;
    const controller = new AbortController();
    const base = (
      import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV ? 'http://localhost:4000' : '')
    ).replace(/\/+$/, '');

    const refresh = async () => {
      if (fetching || !alive) return;
      const token = localStorage.getItem('token');
      if (!token || !base) {
        if (alive) setCount(null);
        return;
      }
      fetching = true;
      try {
        const response = await fetch(`${base}/api/order/list`, {
          method: 'GET',
          headers: { token, Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Order API svarade ${response.status}`);
        const payload = await response.json();
        if (!payload?.success || !Array.isArray(payload.data)) {
          throw new Error('Ogiltigt ordersvar');
        }
        if (alive) setCount(payload.data.filter(isActiveOrder).length);
      } catch (error) {
        // Visa aldrig felaktigt 0 om servern inte går att nå.
        if (alive && !controller.signal.aborted) setCount(null);
      } finally {
        fetching = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    window.addEventListener('focus', refresh);
    window.addEventListener('manilacafe:orders-updated', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('manilacafe:orders-updated', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const label = count === null
    ? 'Kan inte hämta antal aktiva beställningar'
    : `${count} aktiva beställningar`;

  return (
    <span
      className="manila-orders-menu-count"
      role="status"
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginLeft: 8, minWidth: 23, height: 23, padding: '0 7px',
        boxSizing: 'border-box', borderRadius: 999,
        background: count === null ? '#6b7280' : '#7950ab', color: '#fff',
        fontWeight: 700, fontSize: 12, lineHeight: 1, flexShrink: 0,
      }}
    >
      {count === null ? '–' : count}
    </span>
  );
}
