import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import './Cart.css'
import './CartCustomizations.css'
import { StoreContext } from '../../context/StoreContext'

// ======================================================
// HELPERS
// ======================================================

const formatPrice = (amount) =>
  Number(amount).toLocaleString('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const getImageUrl = (image, url) => {
  const value = String(image || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `https:${value}`
  return `${url}/images/${value}`
}

// ======================================================
// CART
// ======================================================

const Cart = () => {
  const {
    cartItems = {},
    food_list = [],
    removeFromCart,
    removeFromCartCustomized,
    getCustomizedCartEntries,
    customizationCheckoutReady = false,
    getTotalCartAmount,
    getVatAmount,
    getTotalWithVat,
    vatRate = 0.06,
    url
  } = useContext(StoreContext)

  const navigate = useNavigate()

  // The ORIGINAL cart format is unchanged: { productId: quantity }.
  // These items must continue to work during the rollout.
  const normalEntries = food_list.flatMap((item) => {
    const quantity = Number(cartItems[item._id] || 0)
    const price = Number(item.price)

    if (!Number.isInteger(quantity) || quantity <= 0 ||
        !Number.isFinite(price) || price < 0) {
      return []
    }

    return [{
      cartKey: item._id,
      productId: item._id,
      name: item.name,
      image: item.image,
      price,
      quantity,
      isCustomized: false,
      invalidCustomization: false
    }]
  })

  // Customized lines are stored SEPARATELY by StoreContext, so the same
  // product can appear with different selections without mixing them.
  const customizedEntries = typeof getCustomizedCartEntries === 'function'
    ? getCustomizedCartEntries()
    : []

  const entries = [...normalEntries, ...customizedEntries]
  const hasCustomizedEntries = customizedEntries.length > 0
  const invalidCustomizedEntries = customizedEntries.some(
    (entry) => entry.invalidCustomization === true ||
      !Number.isFinite(Number(entry.price)) || Number(entry.price) < 0
  )

  // Existing totals are untouched for ordinary orders. The customized
  // amounts below are ONLY previews until the order/payment backend
  // recalculates every option from MongoDB.
  const normalSubtotal = getTotalCartAmount()
  const customizedSubtotal = customizedEntries.reduce((sum, entry) => {
    if (entry.invalidCustomization ||
        !Number.isFinite(Number(entry.price)) || entry.price === null) {
      return sum
    }
    return sum + Number(entry.price) * Number(entry.quantity)
  }, 0)

  const subtotal = Number((normalSubtotal + customizedSubtotal).toFixed(2))
  const vatAmount = hasCustomizedEntries
    ? Number((subtotal * vatRate).toFixed(2))
    : getVatAmount()
  const total = hasCustomizedEntries
    ? Number((subtotal + vatAmount).toFixed(2))
    : getTotalWithVat()

  // SAFETY: Never send customized products to an old checkout that ignores
  // options. The StoreContext switch remains OFF until the entire backend,
  // all payment methods and admin order screens have been updated/tested.
  const customizedCheckoutBlocked = hasCustomizedEntries && (
    customizationCheckoutReady !== true || invalidCustomizedEntries
  )
  const canCheckout = subtotal > 0 &&
    !customizedCheckoutBlocked && !invalidCustomizedEntries

  const removeOne = (entry) => {
    if (entry.isCustomized) {
      if (typeof removeFromCartCustomized === 'function') {
        removeFromCartCustomized(entry.cartKey)
      }
      return
    }
    removeFromCart(entry.productId)
  }

  return (
    <div className="cart">
      {/* ================================================== */}
      {/* PRODUCT LIST */}
      {/* ================================================== */}
      <div className="cart-items">
        <div className="cart-items-title mc-cart-column-headings">
          <p>Produkt</p>
          <p>Namn</p>
          <p>Pris</p>
          <p>Mängd</p>
          <p>Totalt</p>
          <p>Ta bort</p>
        </div>

        <hr />

        {entries.length === 0 && (
          <div className="mc-cart-empty">
            Din varukorg är tom. Utforska gärna våra maträtter och desserter!
          </div>
        )}

        {entries.map((entry) => {
          const validPrice = !entry.invalidCustomization &&
            entry.price !== null &&
            Number.isFinite(Number(entry.price)) && Number(entry.price) >= 0
          const price = validPrice ? Number(entry.price) : null
          const quantity = Number(entry.quantity)
          const rowTotal = validPrice ? price * quantity : null
          const imgSrc = getImageUrl(entry.image, url)

          return (
            <div key={entry.cartKey} className="cart-item-wrapper mc-cart-line">
              <div className="cart-items-title cart-items-item mc-cart-grid">
                <div className="mc-cart-cell--image">
                  {imgSrc ? (
                    <img src={imgSrc} alt={entry.name} loading="lazy" />
                  ) : (
                    <span className="mc-cart-no-image">Ingen bild</span>
                  )}
                </div>

                <div className="mc-cart-cell--name mc-cart-product-info">
                  <strong>{entry.name}</strong>
                  {entry.isCustomized && (
                    <>
                      <span className="mc-cart-custom-label">Anpassad produkt</span>

                      {!entry.invalidCustomization && (
                        <div className="mc-cart-choices">
                          {entry.removedIngredients?.length > 0 && (
                            <p>
                              <span className="mc-cart-choice-label">Utan:</span>{' '}
                              {entry.removedIngredients.join(', ')}
                            </p>
                          )}
                          {entry.extras?.length > 0 && (
                            <div>
                              <span className="mc-cart-choice-label">Extra:</span>
                              <ul>
                                {entry.extras.map((extra) => (
                                  <li key={extra.optionId}>
                                    {extra.quantity} × {extra.name}{' '}
                                    <span className="mc-cart-extra-price">
                                      (+{formatPrice(extra.price)} kr/st)
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <p className="mc-cart-cell--price">
                  <span className="mc-cart-mobile-label">Styckpris: </span>
                  {validPrice ? `${formatPrice(price)} kr` : '—'}
                </p>

                <p className="mc-cart-cell--quantity">
                  <span className="mc-cart-mobile-label">Antal: </span>
                  {quantity}
                </p>

                <p className="mc-cart-cell--total">
                  <span className="mc-cart-mobile-label">Radsumma: </span>
                  {rowTotal !== null ? `${formatPrice(rowTotal)} kr` : '—'}
                </p>

                <button
                  type="button"
                  className="cross mc-cart-cell--remove"
                  onClick={() => removeOne(entry)}
                  disabled={entry.isCustomized && typeof removeFromCartCustomized !== 'function'}
                  aria-label={`Ta bort en ${entry.name}${entry.isCustomized ? ' med valda anpassningar' : ''}`}
                  title="Ta bort en"
                >
                  ×
                </button>
              </div>

              {entry.invalidCustomization && (
                <p className="mc-cart-invalid" role="alert">
                  Den här anpassningen behöver göras om: {' '}
                  {entry.customizationError || 'Tillvalen är inte längre tillgängliga.'}
                  {' '}Ta bort raden och välj produkten på nytt.
                </p>
              )}
              <hr />
            </div>
          )
        })}
      </div>

      {/* ================================================== */}
      {/* TOTALS */}
      {/* ================================================== */}
      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Varukorg</h2>

          <div>
            <div className="cart-total-details">
              <p>Delsumma</p>
              <p>{invalidCustomizedEntries ? '—' : `${formatPrice(subtotal)} kr`}</p>
            </div>
            <hr />

            <div className="cart-total-details">
              <p>Moms (6%)</p>
              <p>{invalidCustomizedEntries ? '—' : `${formatPrice(vatAmount)} kr`}</p>
            </div>
            <hr />

            <div className="cart-total-details cart-grand-total">
              <b>Totalt</b>
              <b>{invalidCustomizedEntries ? '—' : `${formatPrice(total)} kr`}</b>
            </div>
          </div>

          {hasCustomizedEntries && !invalidCustomizedEntries && (
            <p className="mc-cart-estimate">
              Priserna för anpassade produkter är preliminära tills kassan
              kontrollerar dem mot det aktuella sortimentet.
            </p>
          )}

          {customizedCheckoutBlocked && (
            <p className="mc-cart-checkout-warning" role="status">
              {invalidCustomizedEntries
                ? 'Några anpassningar är inte längre giltiga. Ta bort de markerade raderna innan du fortsätter.'
                : 'Betalning för anpassade produkter aktiveras när hela kassan är uppdaterad. Du kan ta bort de anpassade raderna och beställa övriga produkter redan nu.'}
            </p>
          )}

          <button
            type="button"
            className="checkout-button"
            onClick={() => navigate('/order')}
            disabled={!canCheckout}
          >
            Till kassan
          </button>
        </div>
      </div>
    </div>
  )
}

export default Cart
