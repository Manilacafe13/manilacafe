import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import './Orders.css'

// Terminal status är vårt arkiv: ordern ligger kvar i MongoDB och i kundhistoriken.
const COMPLETED = new Set(['Levererad', 'Upphämtad'])
const POLL_MS = 15000
const TABS = [
  { id: 'active', title: 'Pågående' },
  { id: 'pending', title: 'Väntar betalning' },
  { id: 'completed', title: 'Arkiv' },
  { id: 'cancelled', title: 'Avbrutna' }
]

const getGroup = (order) => {
  if (COMPLETED.has(order.status)) return 'completed'
  if (order.status === 'Avbruten') return 'cancelled'
  if (order.payment !== true) return 'pending'
  return 'active'
}

const orderNumber = (id) => `#${String(id || '').slice(-8).toUpperCase()}`
const orderName = (order) =>
  [order.address?.firstName, order.address?.lastName].filter(Boolean).join(' ') || 'Kund utan namn'
const isPickupOrder = (order) => order.deliveryMethod === 'pickup'
const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`
const formatDateTime = (value) => {
  if (!value) return 'Datum saknas'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Datum saknas'
  return date.toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
const formatDay = (value) => {
  if (!value) return 'Datum saknas'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Datum saknas'
  return date.toLocaleDateString('sv-SE', {
    timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short', year: 'numeric'
  })
}
const orderPriority = (order) => {
  const day = order.requestedDate
  const time = String(order.requestedTime || '23:59').slice(0, 5)
  if (!day) return Number.MAX_SAFE_INTEGER
  const value = new Date(`${String(day).slice(0, 10)}T${/^\d{2}:\d{2}$/.test(time) ? time : '23:59'}:00`).getTime()
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}
const totalQuantity = (items) =>
  (Array.isArray(items) ? items : []).reduce((total, item) => total + Number(item.quantity || 0), 0)

const Orders = ({ url }) => {
  const backendUrl = (
    url || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')
  ).replace(/\/+$/, '')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingOrder, setUpdatingOrder] = useState(null)
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('requested')
  const [expandedId, setExpandedId] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  // Spara betalningsstatus, inte bara ID. En order kan skapas före Stripe-betalningen.
  const knownPaymentsRef = useRef(new Map())
  const initializedRef = useRef(false)
  const fetchingRef = useRef(false)
  const mountedRef = useRef(false)
  const soundEnabledRef = useRef(false)
  const audioContextRef = useRef(null)

  const playChime = useCallback(async () => {
    const context = audioContextRef.current
    if (!context || !soundEnabledRef.current) return
    try {
      if (context.state === 'suspended') await context.resume()
      const start = context.currentTime + 0.03
      ;[740, 980, 1175].forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const begin = start + index * 0.22
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.001, begin)
        gain.gain.exponentialRampToValueAtTime(0.13, begin + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.001, begin + 0.19)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(begin)
        oscillator.stop(begin + 0.2)
      })
    } catch {
      // Webbläsarens ljudpolicy kan blockera ljud i bakgrunden.
      console.warn('Orderljudet kunde inte spelas. Aktivera ljud igen i adminpanelen.')
    }
  }, [])

  const toggleSound = async () => {
    if (soundEnabledRef.current) {
      soundEnabledRef.current = false
      setSoundEnabled(false)
      return
    }
    try {
      const Context = window.AudioContext || window.webkitAudioContext
      if (!Context) throw new Error('Ljud stöds inte av webbläsaren')
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new Context()
      }
      // Måste ske direkt efter ett klick för att uppfylla webbläsarens ljudregler.
      await audioContextRef.current.resume()
      soundEnabledRef.current = true
      setSoundEnabled(true)
      await playChime() // Bekräftar ljudnivån direkt.
      toast.success('Ordersignal aktiverad')
    } catch {
      toast.error('Ljud kunde inte aktiveras i den här webbläsaren.')
    }
  }

  const fetchAllOrders = useCallback(async () => {
    if (fetchingRef.current) return
    const token = localStorage.getItem('token')
    if (!token || !backendUrl) {
      setError(!token ? 'Du behöver logga in som administratör.' : 'Backend-adressen saknas.')
      setLoading(false)
      return
    }
    fetchingRef.current = true
    try {
      const response = await axios.get(`${backendUrl}/api/order/list`, {
        headers: { token, Authorization: `Bearer ${token}` }
      })
      if (!response.data?.success) throw new Error(response.data?.message || 'Orderlistan kunde inte hämtas.')
      const incoming = Array.isArray(response.data.data) ? response.data.data : []

      if (initializedRef.current) {
        const justPaid = incoming.filter(order =>
          order?._id && order.payment === true && knownPaymentsRef.current.get(order._id) !== true
        )
        if (justPaid.length) {
          toast.success(
            justPaid.length === 1
              ? `Ny betald beställning ${orderNumber(justPaid[0]._id)}!`
              : `${justPaid.length} nya betalda beställningar!`,
            { autoClose: 10000, toastId: `new-paid-${justPaid.map(o => o._id).join('-')}` }
          )
          void playChime()
        }
      }

      knownPaymentsRef.current = new Map(incoming.filter(order => order?._id).map(order => [order._id, order.payment === true]))
      initializedRef.current = true
      if (mountedRef.current) {
        setOrders(incoming)
        setLastChecked(new Date())
        setError('')
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.response?.data?.message || err.message || 'Kunde inte hämta beställningar.')
      }
    } finally {
      fetchingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [backendUrl, playChime])

  useEffect(() => {
    mountedRef.current = true
    void fetchAllOrders()
    const interval = window.setInterval(() => { void fetchAllOrders() }, POLL_MS)
    return () => {
      mountedRef.current = false
      window.clearInterval(interval)
      soundEnabledRef.current = false
      // Inget ljud ska fortsätta när ordersidan lämnas.
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close().catch(() => {})
      }
      audioContextRef.current = null
    }
  }, [fetchAllOrders])

  const updateStatus = async (orderId, status) => {
    const token = localStorage.getItem('token')
    if (!token || !backendUrl || updatingOrder) return
    if (status === 'Avbruten' && !window.confirm('Avbryta beställningen? Den blir kvar under Avbrutna.')) return
    if (COMPLETED.has(status) && !window.confirm('Bekräfta att beställningen är färdig och överlämnad? Den flyttas till Arkiv.')) return
    setUpdatingOrder(orderId)
    try {
      const response = await axios.post(`${backendUrl}/api/order/status`, { orderId, status }, {
        headers: { token, Authorization: `Bearer ${token}` }
      })
      if (!response.data?.success) throw new Error(response.data?.message || 'Orderstatus kunde inte sparas.')
      setOrders(previous => previous.map(order =>
        order._id === orderId ? { ...order, status: response.data.data?.status || status } : order
      ))
      setExpandedId(current => current === orderId ? null : current)
      toast.success(COMPLETED.has(status) ? 'Ordern är klar och finns nu i Arkiv.' : 'Orderstatus uppdaterad.')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Orderstatus kunde inte sparas.')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const getImageUrl = (image) => {
    const value = String(image || '').trim()
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    if (value.startsWith('//')) return `https:${value}`
    return `${backendUrl}/images/${value}`
  }

  const counts = { active: 0, pending: 0, completed: 0, cancelled: 0 }
  orders.forEach(order => { counts[getGroup(order)] += 1 })

  const visibleOrders = orders
    .filter(order => getGroup(order) === tab)
    .filter(order => {
      const term = query.toLocaleLowerCase('sv-SE').trim()
      if (!term) return true
      return [orderNumber(order._id), orderName(order), order.address?.email,
        order.address?.phone, order.address?.street,
        ...(Array.isArray(order.items) ? order.items.map(item => item.name) : [])]
        .some(value => String(value || '').toLocaleLowerCase('sv-SE').includes(term))
    })
    .sort((a, b) => sort === 'requested'
      ? orderPriority(a) - orderPriority(b) || new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
      : new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))

  return (
    <main className="orders mc-orders">
      <header className="mc-orders-header">
        <div>
          <p className="mc-orders-eyebrow">MANILA CAFÉ · ADMIN</p>
          <h1>Beställningar</h1>
          <p>Fånga upp nya ordrar och håll isär det som ska förberedas.</p>
        </div>
        <div className="mc-orders-actions">
          <button type="button" className={`mc-orders-sound ${soundEnabled ? 'is-on' : ''}`} onClick={toggleSound}
            aria-pressed={soundEnabled}>
            {soundEnabled ? '🔊 Ljud på' : '🔇 Aktivera ordersignal'}
          </button>
          <button type="button" className="mc-orders-refresh" onClick={() => void fetchAllOrders()}>↻ Uppdatera</button>
        </div>
      </header>

      <p className="mc-orders-hint">
        {soundEnabled
          ? 'Ordersignalen spelas när en ny betald order upptäcks. Ha sidan öppen för att höra den.'
          : 'Klicka på ”Aktivera ordersignal” för att tillåta ljud i webbläsaren.'}
        {lastChecked && <span> Senast kontrollerad: {lastChecked.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>}
      </p>

      <section className="mc-orders-counts" aria-label="Orderstatusöversikt">
        {TABS.map(item => (
          <button type="button" key={item.id} className={`mc-orders-stat ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => { setTab(item.id); setExpandedId(null) }} aria-pressed={tab === item.id}>
            <strong>{counts[item.id]}</strong><span>{item.title}</span>
          </button>
        ))}
      </section>

      <div className="mc-orders-tools">
        <label className="mc-orders-search">
          <span>Sök bland {TABS.find(item => item.id === tab)?.title.toLowerCase()}</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Ordernummer, kund, telefon eller produkt…" />
        </label>
        <label className="mc-orders-sort">
          <span>Sortera</span>
          <select value={sort} onChange={event => setSort(event.target.value)}>
            <option value="requested">Önskad leverans-/hämtningstid</option>
            <option value="newest">Senaste beställning</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="mc-orders-error" role="alert">
          {error} <button type="button" onClick={() => void fetchAllOrders()}>Försök igen</button>
        </div>
      )}

      {loading ? (
        <div className="mc-orders-empty">Hämtar beställningar…</div>
      ) : visibleOrders.length === 0 ? (
        <div className="mc-orders-empty">
          <strong>{query ? 'Inga matchande beställningar' : tab === 'active' ? 'Inga pågående beställningar' : 'Inga beställningar i den här vyn'}</strong>
          <p>{tab === 'completed' ? 'Levererade och upphämtade ordrar sparas här automatiskt.' : 'Nya beställningar kontrolleras automatiskt var 15:e sekund.'}</p>
        </div>
      ) : (
        <div className="mc-orders-grid">
          {visibleOrders.map(order => {
            const pickup = isPickupOrder(order)
            const expanded = expandedId === order._id
            const group = getGroup(order)
            const statusOptions = [
              'Beställning mottagen', 'Förbereds',
              ...(pickup ? ['Redo för upphämtning', 'Upphämtad'] : ['På väg', 'Levererad']),
              'Avbruten'
            ]
            const currentStatus = order.status || 'Inväntar betalning'
            return (
              <article className={`mc-order-card mc-order-card--${group}`} key={order._id}>
                <div className="mc-order-top">
                  <div><span className="mc-order-kicker">ORDER</span><h2>{orderNumber(order._id)}</h2></div>
                  <span className={`mc-order-state mc-order-state--${group}`}>{currentStatus}</span>
                </div>
                <div className="mc-order-primary">
                  <strong>{orderName(order)}</strong>
                  <span>{pickup ? '📍 Avhämtning' : '🚗 Leverans'} · {formatDay(order.requestedDate)} · {order.requestedTime || 'Tid saknas'}</span>
                </div>
                <div className="mc-order-summary-items">
                  {(Array.isArray(order.items) ? order.items : []).slice(0, 2).map((item, index) => (
                    <span key={`${order._id}-${index}`}>{Number(item.quantity || 0)} × {item.name || 'Produkt'}{item.flavor ? ` (${item.flavor})` : ''}</span>
                  ))}
                  {(order.items?.length || 0) > 2 && <small>+ {order.items.length - 2} fler produktrader</small>}
                </div>
                <div className="mc-order-price-row">
                  <span className={order.payment ? 'mc-order-paid' : 'mc-order-unpaid'}>
                    {order.payment ? '✓ Betald' : 'Väntar på betalning'}
                  </span>
                  <strong>{formatMoney(order.amount)}</strong>
                </div>
                {currentStatus === 'Betalning mottagen - lagerkontroll krävs' && (
                  <div className="mc-order-warning">⚠ Lagerkontroll krävs innan ordern bekräftas.</div>
                )}

                <div className="mc-order-buttons">
                  <button type="button" className="mc-order-details-button" onClick={() => setExpandedId(expanded ? null : order._id)}
                    aria-expanded={expanded} aria-controls={`mc-order-details-${order._id}`}>
                    {expanded ? 'Dölj detaljer ↑' : 'Visa detaljer ↓'}
                  </button>
                  {group === 'active' && (
                    <button type="button" className="mc-order-finish-button" disabled={updatingOrder === order._id}
                      onClick={() => void updateStatus(order._id, pickup ? 'Upphämtad' : 'Levererad')}>
                      {updatingOrder === order._id ? 'Sparar…' : 'Avsluta & arkivera'}
                    </button>
                  )}
                </div>

                {expanded && (
                  <div className="mc-order-details" id={`mc-order-details-${order._id}`}>
                    <div className="mc-order-detail-grid">
                      <section>
                        <h3>Kund</h3>
                        <p>{orderName(order)}</p>
                        <p>{order.address?.email || 'E-post saknas'}</p>
                        <p>{order.address?.phone || 'Telefon saknas'}</p>
                      </section>
                      <section>
                        <h3>{pickup ? 'Avhämtning' : 'Leveransadress'}</h3>
                        {pickup ? <p>Kunden hämtar sin beställning.</p> : (
                          <><p>{order.address?.street || '-'}</p><p>{order.address?.zipcode || ''} {order.address?.city || ''}</p></>
                        )}
                        <p>{formatDay(order.requestedDate)} · {order.requestedTime || 'Tid saknas'}</p>
                        <p>Beställd: {formatDateTime(order.createdAt || order.date)}</p>
                        <p>Typ: {({ 'same-day': 'Idag', 'next-day': 'Imorgon', 'large-order': 'Större beställning' })[order.fulfillmentType] || 'Ej angivet'}</p>
                      </section>
                    </div>
                    <section className="mc-order-detail-products">
                      <h3>Produkter · {totalQuantity(order.items)} st</h3>
                      {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
                        <div className="mc-order-product" key={`${order._id}-detail-${index}`}>
                          {item.image ? <img src={getImageUrl(item.image)} alt="" loading="lazy" /> : <span className="mc-order-image-placeholder">📦</span>}
                          <div><strong>{item.name || 'Produkt'}{item.flavor ? ` – ${item.flavor}` : ''}</strong>
                            <span>{Number(item.quantity || 0)} st × {formatMoney(item.price)}</span></div>
                          <strong>{formatMoney(Number(item.quantity || 0) * Number(item.price || 0))}</strong>
                        </div>
                      ))}
                    </section>
                    <div className="mc-order-totals">
                      <span>Delsumma <strong>{formatMoney(order.subtotal)}</strong></span>
                      <span>Moms ({order.vatRate ?? 6} %) <strong>{formatMoney(order.vatAmount)}</strong></span>
                      <span>Totalt <strong>{formatMoney(order.amount)}</strong></span>
                    </div>
                    <div className="mc-order-status-editor">
                      <label htmlFor={`mc-status-${order._id}`}>Ändra orderstatus</label>
                      <select id={`mc-status-${order._id}`} value={currentStatus}
                        disabled={updatingOrder === order._id}
                        onChange={event => void updateStatus(order._id, event.target.value)}>
                        {!statusOptions.includes(currentStatus) && <option value={currentStatus}>{currentStatus}</option>}
                        {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <small>Betalningsmetod: {order.paymentMethod || 'Stripe'}</small>
                      {group === 'completed' && <small>Ordern finns kvar i MongoDB som historik.</small>}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default Orders
