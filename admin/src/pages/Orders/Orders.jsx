import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import './Orders.css'
import './OrdersCustomizations.css'
import './OrdersKitchen.css'

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
const stockholmDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date)
const requestedDay = order => {
  const d = new Date(order.requestedDate)
  return Number.isNaN(d.getTime()) ? '' : stockholmDay(d)
}
const dateKind = order => {
  const d = requestedDay(order)
  if (!d) return 'DATUM SAKNAS'
  const today = stockholmDay()
  const tomorrow = new Date(`${today}T12:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (d < today) return 'FÖRSENAD'
  if (d === today) return 'IDAG'
  if (d === tomorrow.toISOString().slice(0,10)) return 'IMORGON'
  return 'KOMMANDE'
}
const orderPriority = order => {
  const d = requestedDay(order)
  const time = /^\d{2}:\d{2}/.exec(String(order.requestedTime || ''))?.[0] || '23:59'
  return d ? `${d}T${time}` : '9999-12-31T23:59'
}
const kitchenUnits = order => (Array.isArray(order.items) ? order.items : [])
  .flatMap((item, row) => Array.from({length: Number(item.quantity || 0)}, (_, unit) => ({
    key: `${row}:${unit}`, item, unit: unit + 1, quantity: Number(item.quantity || 0)
  })))
const kitchenReady = order => {
  const units = kitchenUnits(order)
  const checked = new Set(order.kitchenProgress?.checkedUnits || [])
  return units.length > 0 && units.every(unit => checked.has(unit.key)) &&
    checked.size === units.length && order.kitchenProgress?.packed === true
}

const totalQuantity = (items) =>
  (Array.isArray(items) ? items : []).reduce((total, item) => total + Number(item.quantity || 0), 0)

// ======================================================
// FAS 2: KUNDVAL FRÅN SPARAD ORDER (INTE FRÅN PRODUKTKATALOGEN)
// ======================================================
// Dessa är ögonblicksbilder från orderModel.js. Vi visar därför exakt
// de namn, antal och priser som sparades när ordern skapades, även om
// ett tillval senare byter namn eller försvinner från menyn.
// Paket lagras separat i order.bundles. Produktpositionerna finns redan i order.items.
// Visa paketet tydligt, men räkna aldrig produkterna en gång till.
const getOrderBundles = (order) =>
  (Array.isArray(order?.bundles) ? order.bundles : [])
    .filter(bundle => bundle?.type === 'manila-solo' && bundle?.bundleKey)

const getBundleProductNames = (bundle) =>
  (Array.isArray(bundle?.products) ? bundle.products : [])
    .map(product => String(product?.name || '').trim())
    .filter(Boolean)

const getCustomerChoices = (item) => {
  const raw = item?.customizations
  const removedIngredients = (Array.isArray(raw?.removedIngredients)
    ? raw.removedIngredients : [])
    .filter(option => typeof option?.name === 'string' && option.name.trim())

  const extras = (Array.isArray(raw?.extras) ? raw.extras : [])
    .filter(option => typeof option?.name === 'string' && option.name.trim())

  return {
    removedIngredients,
    extras,
    hasChoices: removedIngredients.length > 0 || extras.length > 0
  }
}

const getCustomerChoicePreview = (item) => {
  const { removedIngredients, extras } = getCustomerChoices(item)
  return [
    ...removedIngredients.map(option => `Utan ${option.name}`),
    ...extras.map(option => {
      const count = Number(option.quantity)
      const quantityLabel = Number.isInteger(count) && count > 0 ? `${count} × ` : ''
      return `Extra ${quantityLabel}${option.name}`
    })
  ].join(' · ')
}

// Lägg kundens faktiska matönskemål före receptet, inte bakom en tooltip.
const OrderCustomerChoices = ({ item }) => {
  const { removedIngredients, extras, hasChoices } = getCustomerChoices(item)
  if (!hasChoices) return null

  const portions = Number(item.quantity)
  return (
    <section className="mc-order-customer-choices" aria-label="Kundens produktanpassningar">
      <div className="mc-order-customer-choices-heading">
        <strong>⚠ Kundens ändringar</strong>
        <small>Gäller per portion</small>
      </div>
      {removedIngredients.length > 0 && (
        <div className="mc-order-choices-group mc-order-choices-group--remove">
          <strong>TA BORT – SKA INTE INGÅ</strong>
          <ul>
            {removedIngredients.map((option, index) => (
              <li key={String(option.optionId || index)}>
                <span aria-hidden="true">−</span> Utan {option.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {extras.length > 0 && (
        <div className="mc-order-choices-group mc-order-choices-group--extra">
          <strong>LÄGG TILL – PER PORTION</strong>
          <ul>
            {extras.map((option, index) => {
              const count = Number(option.quantity)
              const validCount = Number.isInteger(count) && count > 0
              const price = Number(option.price)
              const validPrice = option.price !== null && option.price !== undefined &&
                Number.isFinite(price) && price >= 0
              return (
                <li key={String(option.optionId || index)}>
                  <span aria-hidden="true">+</span>
                  {validCount ? `${count} × ` : ''}{option.name}
                  {validPrice && <small>({formatMoney(price)} / st, exkl. moms)</small>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {Number.isInteger(portions) && portions > 1 && (
        <p className="mc-order-choices-portions">
          Samma anpassningar gäller alla {portions} portioner på den här raden.
        </p>
      )}
    </section>
  )
}

// Recept hämtas separat från den skyddade admin-endpointen, aldrig via kundens orderdata.
// API-avtal för nästa steg: GET /api/kitchen-recipe/list
// { success: true, data: [{ foodId, name, ingredients: [{ name, amount, unit }], steps: [string] }] }
const recipeId = (value) => String(value?._id || value || '').trim()
const normalizeName = (value) => String(value || '').trim().toLocaleLowerCase('sv-SE')

const findRecipeForItem = (item, recipes) => {
  const itemIds = [
    item.foodId, item.productId, item.food?._id,
    item.product?._id, item.id, item._id
  ].map(recipeId).filter(Boolean)

  const byId = recipes.find(recipe =>
    itemIds.includes(recipeId(recipe.foodId || recipe.productId || recipe.food?._id))
  )
  if (byId) return byId

  // Reserv för äldre orderrader som enbart innehåller produktnamn.
  return recipes.find(recipe => normalizeName(recipe.name) === normalizeName(item.name)) || null
}

const ingredientLabel = (ingredient) => {
  if (typeof ingredient === 'string') return ingredient
  if (!ingredient || typeof ingredient !== 'object') return ''
  return [ingredient.amount ?? ingredient.quantity, ingredient.unit, ingredient.name]
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
    .join(' ')
}

const recipeSteps = (recipe) => {
  if (Array.isArray(recipe?.steps)) {
    return recipe.steps.map(step => typeof step === 'string' ? step : (step?.text || '')).filter(Boolean)
  }
  if (typeof recipe?.instructions === 'string') {
    return recipe.instructions.split(/\n+/).map(step => step.trim()).filter(Boolean)
  }
  return []
}

const Orders = ({ url }) => {
  const backendUrl = (
    url || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')
  ).replace(/\/+$/, '')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingOrder, setUpdatingOrder] = useState(null)
  const [updatingKitchen, setUpdatingKitchen] = useState(null)
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('requested')
  const [expandedId, setExpandedId] = useState(null)
  const [kitchenOrderId, setKitchenOrderId] = useState(null)
  const [kitchenRecipes, setKitchenRecipes] = useState([])
  const [kitchenLoading, setKitchenLoading] = useState(false)
  const [kitchenLoaded, setKitchenLoaded] = useState(false)
  const [kitchenError, setKitchenError] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  // Spara betalningsstatus, inte bara ID. En order kan skapas före Stripe-betalningen.
  const knownPaymentsRef = useRef(new Map())
  const initializedRef = useRef(false)
  const fetchingRef = useRef(false)
  const mountedRef = useRef(false)
  const soundEnabledRef = useRef(false)
  const audioContextRef = useRef(null)
  const fetchingRecipesRef = useRef(false)

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

  const fetchKitchenRecipes = useCallback(async () => {
    if (fetchingRecipesRef.current) return
    const token = localStorage.getItem('token')
    if (!token || !backendUrl) {
      setKitchenError('Logga in som administratör för att se recepten.')
      return
    }

    fetchingRecipesRef.current = true
    setKitchenLoading(true)
    setKitchenError('')

    try {
      const response = await axios.get(`${backendUrl}/api/kitchen-recipe/list`, {
        headers: { token, Authorization: `Bearer ${token}` }
      })
      if (!response.data?.success || !Array.isArray(response.data.data)) {
        throw new Error(response.data?.message || 'Recepten kunde inte hämtas.')
      }
      if (mountedRef.current) {
        setKitchenRecipes(response.data.data)
        setKitchenLoaded(true)
      }
    } catch (err) {
      if (mountedRef.current) {
        setKitchenError(err.response?.status === 404
          ? 'Receptfunktionen behöver kopplas till backend. Vi gör det i nästa steg.'
          : (err.response?.data?.message || err.message || 'Recepten kunde inte hämtas.'))
      }
    } finally {
      fetchingRecipesRef.current = false
      if (mountedRef.current) setKitchenLoading(false)
    }
  }, [backendUrl])

  const toggleKitchen = (orderId) => {
    if (kitchenOrderId === orderId) {
      setKitchenOrderId(null)
      return
    }
    setKitchenOrderId(orderId)
    if (!kitchenLoaded) void fetchKitchenRecipes()
  }

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

  const updateKitchen = async (order, action, unitKey) => {
    if (updatingKitchen) return
    const token = localStorage.getItem('token')
    if (!token || !backendUrl) return toast.error('Logga in igen för att spara checklistan.')
    setUpdatingKitchen(order._id)
    try {
      const response = await axios.patch(`${backendUrl}/api/order/kitchen/${order._id}`,
        { action, unitKey, expectedVersion: Number(order.kitchenProgress?.version || 0) },
        { headers: { token, Authorization: `Bearer ${token}` } })
      if (!response.data?.success) throw new Error(response.data?.message || 'Kunde inte spara.')
      setOrders(previous => previous.map(o => o._id === order._id ? response.data.data : o))
    } catch (error) {
      const latest = error.response?.data?.data
      if (latest?._id) setOrders(previous => previous.map(o => o._id === latest._id ? latest : o))
      toast.error(error.response?.data?.message || error.message || 'Checklistan kunde inte sparas.')
      void fetchAllOrders()
    } finally {
      setUpdatingKitchen(null)
    }
  }

  const updateStatus = async (orderId, status) => {
    const token = localStorage.getItem('token')
    if (!token || !backendUrl || updatingOrder) return
    if (['Redo för upphämtning', 'På väg', 'Upphämtad', 'Levererad'].includes(status)) {
      const order = orders.find(o => o._id === orderId)
      if (!order || !kitchenReady(order)) return toast.error('Bocka av och packa alla produkter först.')
    }
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
      setKitchenOrderId(null)
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
        ...getOrderBundles(order).flatMap(bundle => [
          bundle.name, 'Manila Solo', ...getBundleProductNames(bundle)
        ]),
        ...(Array.isArray(order.items) ? order.items.flatMap(item => {
          const choices = getCustomerChoices(item)
          return [item.name, ...choices.removedIngredients.map(option => option.name),
            ...choices.extras.map(option => option.name)]
        }) : [])]
        .some(value => String(value || '').toLocaleLowerCase('sv-SE').includes(term))
    })
    .sort((a, b) => sort === 'requested'
      ? orderPriority(a).localeCompare(orderPriority(b)) || new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
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
            onClick={() => { setTab(item.id); setExpandedId(null); setKitchenOrderId(null) }} aria-pressed={tab === item.id}>
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
            const bundles = getOrderBundles(order)
            const pickup = isPickupOrder(order)
            const expanded = expandedId === order._id
            const kitchenOpen = kitchenOrderId === order._id
            const group = getGroup(order)
            const units = kitchenUnits(order)
            const checked = new Set(order.kitchenProgress?.checkedUnits || [])
            const checkedCount = units.filter(unit => checked.has(unit.key)).length
            const ready = kitchenReady(order)
            const kitchenBusy = updatingKitchen === order._id
            const canPrepare = group === 'active' && order.status !== 'Betalning mottagen - lagerkontroll krävs'
            const dayLabel = dateKind(order)
            const statusOptions = [
              'Beställning mottagen', 'Förbereds',
              ...(pickup ? ['Redo för upphämtning', 'Upphämtad'] : ['På väg', 'Levererad']),
              'Avbruten'
            ]
            const currentStatus = order.status || 'Inväntar betalning'
            const hasCustomerChoices = (Array.isArray(order.items) ? order.items : [])
              .some(item => getCustomerChoices(item).hasChoices)
            return (
              <article className={`mc-order-card mc-order-card--${group} mc-kitchen-card ${dayLabel === 'FÖRSENAD' ? 'mc-kitchen-overdue' : ''}`} key={order._id}>
                <div className="mc-kitchen-banner">
                  <strong className={`mc-kitchen-date mc-kitchen-date--${dayLabel === 'IDAG' || dayLabel === 'FÖRSENAD' ? 'urgent' : 'normal'}`}>
                    {dayLabel}
                  </strong>
                  <span><strong>{formatDay(order.requestedDate)}</strong> · <strong>{order.requestedTime || 'TID SAKNAS'}</strong></span>
                  <span>{pickup ? '📍 HÄMTAS' : '🚗 LEVERERAS'}</span>
                </div>
                <div className="mc-order-top">
                  <div><span className="mc-order-kicker">ORDER</span><h2>{orderNumber(order._id)}</h2></div>
                  <span className={`mc-order-state mc-order-state--${group}`}>{currentStatus}</span>
                </div>
                <div className="mc-order-primary">
                  <strong>{orderName(order)}</strong>
                  <span>{units.length} enheter · {order.items?.length || 0} produktrader · {dayLabel === 'IMORGON' ? 'Lägre prioritet' : dayLabel === 'IDAG' ? 'Prioritera efter tidsintervall' : 'Kontrollera datum'}</span>
                </div>
                {bundles.map(bundle => (
                  <div key={bundle.bundleKey} style={{ padding: '12px 14px', margin: '12px 0', border: '1px solid #e6d9f5', borderRadius: 12, background: '#f9f5ff' }}>
                    <strong>🇵🇭 {bundle.name || 'Manila Solo'} · {Number(bundle.quantity || 1)} paket</strong>
                    <div style={{ fontSize: 13, marginTop: 5 }}>
                      {getBundleProductNames(bundle).join(' + ') || 'Paketprodukter saknas i orderns ögonblicksbild'}
                    </div>
                    <small>Paketpris: {formatMoney(bundle.priceIncludingVat)} inkl. moms</small>
                  </div>
                ))}
                {hasCustomerChoices && (
                  <p className="mc-order-choices-notice">
                    ⚠ Anpassad beställning – kontrollera kundvalen innan du lagar maten.
                  </p>
                )}
                <section className="mc-kitchen-checklist" aria-label={`Checklista för ${orderNumber(order._id)}`}>
                  <div className="mc-kitchen-progress-title">
                    <strong>Produkter klara</strong><strong>{checkedCount} / {units.length}</strong>
                  </div>
                  <div className="mc-kitchen-progress" role="progressbar" aria-valuenow={checkedCount}
                    aria-valuemin="0" aria-valuemax={units.length}>
                    <div style={{ width: `${units.length ? checkedCount / units.length * 100 : 0}%` }} />
                  </div>
                  {units.map(({key, item, unit, quantity}) => (
                    <label key={key} className={`mc-kitchen-unit ${checked.has(key) ? 'is-done' : ''}`}>
                      <div className="mc-kitchen-unit-copy">
                        <strong>{item.name || 'Produkt'}{item.flavor ? ` – ${item.flavor}` : ''}</strong>
                        <small>Enhet {unit} av {quantity}</small>
                        {item.bundleKey && <small className="mc-kitchen-bundle">Ingår i Manila Solo</small>}
                        {getCustomerChoices(item).hasChoices && <span className="mc-kitchen-important">⚠ {getCustomerChoicePreview(item)}</span>}
                      </div>
                      <span className="mc-kitchen-unit-check">
                        <input type="checkbox" checked={checked.has(key)} disabled={!canPrepare || kitchenBusy}
                          onChange={event => void updateKitchen(order, event.target.checked ? 'check' : 'uncheck', key)} />
                        <span>{checked.has(key) ? 'KLAR' : 'KLAR?'}</span>
                      </span>
                    </label>
                  ))}
                  {canPrepare && <div className="mc-kitchen-pack">
                    <label>
                      <input type="checkbox" checked={Boolean(order.kitchenProgress?.packed)}
                        disabled={kitchenBusy || checkedCount !== units.length || !units.length}
                        onChange={event => void updateKitchen(order, event.target.checked ? 'pack' : 'unpack')} />
                      <strong>PACKNING KONTROLLERAD</strong>
                    </label>
                    <small>{ready ? '✓ Alla produkter är klara och packade' : 'Avpricka alla enheter och kontrollera sedan packningen.'}</small>
                  </div>}
                  {!canPrepare && group === 'active' && <p className="mc-order-warning">⚠ Lagerkontroll krävs innan checklistan kan användas.</p>}
                </section>
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
                  <button type="button" className="mc-order-details-button" onClick={() => {
                     setExpandedId(expanded ? null : order._id)
                     setKitchenOrderId(null)
                   }}
                    aria-expanded={expanded} aria-controls={`mc-order-details-${order._id}`}>
                    {expanded ? 'Dölj detaljer ↑' : 'Visa detaljer ↓'}
                  </button>
                  {group === 'active' && (
                    <button type="button" className="mc-order-finish-button" disabled={updatingOrder === order._id || !ready}
                      onClick={() => void updateStatus(order._id, pickup ? 'Upphämtad' : 'Levererad')}>
                      {updatingOrder === order._id ? 'Sparar…' : ready ? 'Avsluta & arkivera' : 'Packning krävs före avslut'}
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
                    {bundles.length > 0 && (
                      <section aria-label="Beställda menyer" style={{ marginBottom: 18 }}>
                        <h3>🍽️ Färdiga menyer</h3>
                        {bundles.map(bundle => (
                          <div key={bundle.bundleKey} style={{ padding: 14, borderRadius: 12, border: '1px solid #e6d9f5' }}>
                            <strong>{Number(bundle.quantity || 1)} × {bundle.name || 'Manila Solo'}</strong>
                            <ul>
                              {getBundleProductNames(bundle).map((name, index) => (
                                <li key={`${bundle.bundleKey}-${index}`}>{name}</li>
                              ))}
                            </ul>
                            <span>Paketpris inkl. moms: {formatMoney(bundle.priceIncludingVat)}</span>
                          </div>
                        ))}
                        <small>Produkterna redovisas även nedan för kök och recept. Paketet räknas inte dubbelt i totalsumman.</small>
                      </section>
                    )}
                    <section className="mc-order-detail-products">
                      <h3>Produkter · {totalQuantity(order.items)} st</h3>
                      {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
                        <div className="mc-order-product" key={`${order._id}-detail-${index}`}>
                          {item.image ? <img src={getImageUrl(item.image)} alt="" loading="lazy" /> : <span className="mc-order-image-placeholder">📦</span>}
                          <div className="mc-order-product-content">
                            <strong>{item.name || 'Produkt'}{item.flavor ? ` – ${item.flavor}` : ''}</strong>
                            {bundles.some(bundle => bundle.bundleKey === item.bundleKey) && (
                              <small style={{ color: '#7544a5', fontWeight: 700 }}>Ingår i Manila Solo</small>
                            )}
                            <span>{Number(item.quantity || 0)} st × {formatMoney(item.price)} (exkl. moms, paketandel)</span>
                            <OrderCustomerChoices item={item} />
                          </div>
                          <strong>{formatMoney(Number(item.quantity || 0) * Number(item.price || 0))}</strong>
                        </div>
                      ))}
                     </section>

                     {/* Avsiktligt stängd som standard: recept visas bara när personalen väljer det. */}
                     <section className="mc-order-kitchen" aria-label="Interna recept">
                       <button type="button" className="mc-order-kitchen-toggle"
                         onClick={() => toggleKitchen(order._id)}
                         aria-expanded={kitchenOpen}
                         aria-controls={`mc-order-kitchen-${order._id}`}>
                         <span className="mc-order-kitchen-toggle-label">📖 Ingredienser & tillagning</span>
                         <span aria-hidden="true">{kitchenOpen ? '−' : '+'}</span>
                       </button>

                       {kitchenOpen && (
                         <div className="mc-order-kitchen-body" id={`mc-order-kitchen-${order._id}`}>
                           {hasCustomerChoices && (
                             <div className="mc-order-kitchen-customer-summary">
                               <h3>⚠ Kundens ändringar – kontrollera före tillagning</h3>
                               {(Array.isArray(order.items) ? order.items : []).map((item, index) =>
                                 getCustomerChoices(item).hasChoices ? (
                                   <div className="mc-order-kitchen-choice-line" key={`${order._id}-choices-${index}`}>
                                     <strong>{Number(item.quantity || 0)} × {item.name || 'Produkt'}</strong>
                                     <OrderCustomerChoices item={item} />
                                   </div>
                                 ) : null
                               )}
                             </div>
                           )}
                           {kitchenLoading ? (
                             <p className="mc-order-kitchen-info">Hämtar recepten…</p>
                           ) : kitchenError ? (
                             <div className="mc-order-kitchen-info" role="status">
                               <p>{kitchenError}</p>
                               <button type="button" onClick={() => void fetchKitchenRecipes()}>Försök igen</button>
                             </div>
                           ) : (
                             <div className="mc-order-kitchen-recipes">
                               {(Array.isArray(order.items) ? order.items : []).map((item, index) => {
                                 const recipe = findRecipeForItem(item, kitchenRecipes)
                                 const ingredients = Array.isArray(recipe?.ingredients)
                                   ? recipe.ingredients.map(ingredientLabel).filter(Boolean)
                                   : []
                                 const steps = recipeSteps(recipe)
                                 return (
                                   <section className="mc-order-kitchen-product" key={`${order._id}-recipe-${index}`}>
                                     <div className="mc-order-kitchen-product-title">
                                       <strong>{item.name || 'Produkt'}{item.flavor ? ` – ${item.flavor}` : ''}</strong>
                                       <span>{Number(item.quantity || 0)} st</span>
                                     </div>
                                     {!recipe ? (
                                       <p className="mc-order-kitchen-info">Inget recept har lagts in för den här produkten ännu.</p>
                                     ) : (
                                       <div className="mc-order-kitchen-columns">
                                         <div>
                                           <h4>Ingredienser</h4>
                                           {ingredients.length ? (
                                             <ul>{ingredients.map((ingredient, i) => <li key={i}>{ingredient}</li>)}</ul>
                                           ) : <p className="mc-order-kitchen-info">Inga ingredienser registrerade.</p>}
                                         </div>
                                         <div>
                                           <h4>Tillagning</h4>
                                           {steps.length ? (
                                             <ol>{steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
                                           ) : <p className="mc-order-kitchen-info">Ingen tillagning registrerad.</p>}
                                         </div>
                                       </div>
                                     )}
                                   </section>
                                 )
                               })}
                             </div>
                           )}
                         </div>
                       )}
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
