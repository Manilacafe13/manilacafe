import React, { useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StoreContext } from '../../context/StoreContext'
import './MenuBuilder.css'

// Fast meny: kundval är avstängda.
// OBS: paketpriset måste också vara 249 kr i StoreContext och backend.
const SOLO_PRICE = 249
const FIXED_ITEMS = [
  { key: 'meal', label: 'Maträtt', name: 'Pancit', icon: '🍜', aliases: ['pancit'] },
  { key: 'dessert', label: 'Dessert', name: 'Golden Turon & Ube Ice Cream', icon: '🍌', aliases: ['golden turon & ube ice cream'] },
  { key: 'drink', label: 'Dryck', name: 'Ube Caramel Twirl', icon: '🥤', aliases: ['ube caramel twirl'] }
]

const formatPrice = new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' })
const normalize = (text = '') => String(text).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const slug = (text = '') => normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const imageUrl = (image, baseUrl) => {
  const value = String(image || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `https:${value}`
  return `${String(baseUrl || '').replace(/\/$/, '')}/images/${value.replace(/^\//, '')}`
}

const MenuBuilder = () => {
  const { food_list = [], url = '', manilaSolo = null, addManilaSolo, removeManilaSolo } = useContext(StoreContext) || {}
  const [message, setMessage] = useState(null)

  const items = useMemo(() => FIXED_ITEMS.map(item => {
    const product = food_list.find(p =>
      p?._id && item.aliases.includes(normalize(p.name)) &&
      Number.isFinite(Number(p.price)) && Number(p.price) >= 0 &&
      p.available !== false && p.isAvailable !== false
    )
    return { ...item, product: product || null }
  }), [food_list])

  const isAvailable = items.every(item => item.product)
  const selectedIds = isAvailable ? {
    mealId: String(items[0].product._id),
    dessertId: String(items[1].product._id),
    drinkId: String(items[2].product._id)
  } : null
  const isSaved = Boolean(manilaSolo && selectedIds &&
    String(manilaSolo.mealId) === selectedIds.mealId &&
    String(manilaSolo.dessertId) === selectedIds.dessertId &&
    String(manilaSolo.drinkId) === selectedIds.drinkId)
  const hasAnotherSolo = Boolean(manilaSolo && !isSaved)

  const handleAdd = () => {
    setMessage(null)
    if (!selectedIds || typeof addManilaSolo !== 'function') {
      setMessage({ success: false, text: 'Menyn är inte tillgänglig just nu.' })
      return
    }
    // Befintligt API tar tre produkt-ID:n. Ingen kund får välja produkterna.
    const result = addManilaSolo(selectedIds)
    setMessage(result?.success
      ? { success: true, text: 'Manila Solo har lagts till i varukorgen! 💜' }
      : { success: false, text: result?.message || 'Kunde inte lägga till menyn.' })
  }

  const handleRemove = () => {
    if (typeof removeManilaSolo !== 'function') return
    const result = removeManilaSolo()
    setMessage(result?.success
      ? { success: true, text: 'Manila Solo har tagits bort från varukorgen.' }
      : { success: false, text: result?.message || 'Kunde inte ta bort menyn.' })
  }

  return (
    <section className="mc-menu-builder" aria-labelledby="mc-menu-builder-title">
      <div className="mc-menu-builder__intro">
        <div className="mc-menu-builder__intro-copy">
          <span className="mc-menu-builder__eyebrow">MANILA CAFÉ 🇵🇭</span>
          <h2 id="mc-menu-builder-title">Manila Menyer 💜</h2>
          <p>Våra favoriter samlade i färdiga menyer. Välj din meny och lägg den direkt i varukorgen!</p>
        </div>
      </div>

      <div className="mc-menu-builder__panel">
        <div className="mc-menu-builder__step-heading">
          <div>
            <span className="mc-menu-builder__eyebrow">FÄRDIG MENY</span>
            <h3>Manila Solo 🇵🇭</h3>
            <p>Smakrik Pancit, krispig Golden Turon & Ube Ice Cream och len Ube Caramel Twirl – en komplett måltid utan krångliga val.</p>
          </div>
          <span className="mc-menu-builder__selection-count">{formatPrice.format(SOLO_PRICE)}</span>
        </div>

        <div className="mc-menu-builder__items">
          {items.map(({ key, label, name, icon, product }) => (
            <article className="mc-menu-builder__product" key={key}>
              {product && imageUrl(product.image, url) ? (
                <img src={imageUrl(product.image, url)} alt={name} loading="lazy" />
              ) : (
                <div className="mc-menu-builder__placeholder" aria-hidden="true">{icon}</div>
              )}
              <div className="mc-menu-builder__product-info">
                <small className="mc-menu-builder__product-type">{icon} {label}</small>
                <strong>{name}</strong>
                {product ? (
                  <Link className="mc-menu-builder__detail-link"
                    to={key === 'meal' ? `/matratt/${slug(product.name)}` : `/dessert/${slug(product.name)}`}>
                    Ingredienser &amp; allergener
                  </Link>
                ) : (
                  <span>Tillfälligt otillgänglig</span>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mc-menu-builder__summary">
          <div className="mc-menu-builder__total">
            <div>
              <span>Paketpris inklusive moms</span>
              <strong>{formatPrice.format(SOLO_PRICE)}</strong>
            </div>
            <button type="button" className="mc-menu-builder__primary"
              disabled={!isAvailable || isSaved || hasAnotherSolo}
              onClick={handleAdd}>
              {!isAvailable ? 'Tillfälligt slut' : isSaved ? '✓ Tillagd i varukorgen' : hasAnotherSolo ? 'En annan Manila Solo finns i varukorgen' : 'Lägg i varukorgen 🛒'}
            </button>
          </div>
          {isSaved && <>
            <button type="button" className="mc-menu-builder__clear" onClick={handleRemove}>Ta bort Manila Solo</button>
            <Link className="mc-menu-builder__cart-link" to="/cart">🛒 Visa varukorgen</Link>
          </>}
          {hasAnotherSolo && <Link className="mc-menu-builder__cart-link" to="/cart">Visa varukorgen och ta bort den tidigare kombon</Link>}
          {message && <p className="mc-menu-builder__note" role="status" style={{ color: message.success ? '#247a50' : '#a32946', fontWeight: 700 }}>{message.text}</p>}
        </div>
      </div>
    </section>
  )
}

export default MenuBuilder
