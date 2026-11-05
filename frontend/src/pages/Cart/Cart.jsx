
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

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

const getImageUrl = (image, url) => {
  const value = String(image || '').trim()

  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `https:${value}`

  const cleanUrl = String(url || '').replace(/\/+$/, '')
  const cleanImage = value.replace(/^\/+/, '')

  return `${cleanUrl}/images/${cleanImage}`
}

const MANILA_SOLO_PRICE = 249

const SOLO_GROUPS = [
  { key: 'mealId', label: 'Maträtt', icon: '🍛' },
  { key: 'dessertId', label: 'Dessert', icon: '🍰' },
  { key: 'drinkId', label: 'Dryck', icon: '🥤' }
]

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

    // Manila Solo
    manilaSolo,
    manilaSoloPrice = MANILA_SOLO_PRICE,
    removeManilaSolo,

    url
  } = useContext(StoreContext)

  const navigate = useNavigate()

  // ====================================================
  // NORMAL PRODUCTS
  // ====================================================

  const normalEntries = food_list.flatMap((item) => {
    const quantity = Number(cartItems[item._id] || 0)
    const price = Number(item.price)

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
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

  // ====================================================
  // CUSTOMIZED PRODUCTS
  // ====================================================

  const customizedEntries =
    typeof getCustomizedCartEntries === 'function'
      ? getCustomizedCartEntries()
      : []

  const entries = [
    ...normalEntries,
    ...customizedEntries
  ]

  const hasCustomizedEntries = customizedEntries.length > 0

  const invalidCustomizedEntries = customizedEntries.some(
    entry =>
      entry.invalidCustomization === true ||
      !Number.isFinite(Number(entry.price)) ||
      entry.price === null ||
      Number(entry.price) < 0
  )

  // ====================================================
  // MANILA SOLO
  // ====================================================

  const hasManilaSolo = Boolean(
    manilaSolo?.type === 'manila-solo'
  )

  // Presentera endast produkter från den aktuella
  // databaskatalogen. Saknade produkter markeras tydligt.
  const soloProducts = hasManilaSolo
    ? SOLO_GROUPS.map(group => {
        const productId = String(
          manilaSolo[group.key] || ''
        ).toLowerCase()

        const product = food_list.find(
          item =>
            String(item._id).toLowerCase() === productId
        )

        return {
          ...group,
          productId,
          product: product || null
        }
      })
    : []

  const soloHasMissingProducts =
    hasManilaSolo &&
    soloProducts.some(item => !item.product)

  const soloGrossPrice = hasManilaSolo
    ? Number(manilaSoloPrice)
    : 0

  const soloPriceIsValid =
    Number.isFinite(soloGrossPrice) &&
    soloGrossPrice === MANILA_SOLO_PRICE

  const soloValid =
    hasManilaSolo &&
    !soloHasMissingProducts &&
    soloPriceIsValid

  // ====================================================
  // NORMAL AND CUSTOMIZED TOTALS
  // ====================================================

  const normalSubtotal = getTotalCartAmount()

  const customizedSubtotal = customizedEntries.reduce(
    (sum, entry) => {
      if (
        entry.invalidCustomization ||
        entry.price === null ||
        !Number.isFinite(Number(entry.price))
      ) {
        return sum
      }

      return sum +
        Number(entry.price) * Number(entry.quantity)
    },
    0
  )

  const regularSubtotal = roundMoney(
    normalSubtotal + customizedSubtotal
  )

  const regularVat = hasCustomizedEntries
    ? roundMoney(regularSubtotal * vatRate)
    : getVatAmount()

  const regularTotal = hasCustomizedEntries
    ? roundMoney(regularSubtotal + regularVat)
    : getTotalWithVat()

  // ====================================================
  // MANILA SOLO VAT
  // ====================================================

  // Paketet marknadsförs som 249 kr inklusive moms.
  // Separat beräkning eftersom övriga produkter har
  // priser exklusive moms i befintliga StoreContext.
  //
  // Detta är en förhandsvisning. Backend är ansvarig
  // för den slutliga moms- och prisberäkningen.

  const soloSubtotal = soloValid
    ? roundMoney(soloGrossPrice / (1 + vatRate))
    : 0

  const soloVat = soloValid
    ? roundMoney(soloGrossPrice - soloSubtotal)
    : 0

  // ====================================================
  // COMBINED TOTALS
  // ====================================================

  const subtotal = roundMoney(
    regularSubtotal + soloSubtotal
  )

  const vatAmount = roundMoney(
    regularVat + soloVat
  )

  const total = roundMoney(
    regularTotal +
    (soloValid ? soloGrossPrice : 0)
  )

  const hasRegularEntries = entries.length > 0

  const hasMixedCart =
    hasManilaSolo && hasRegularEntries

  const isEmpty =
    entries.length === 0 && !hasManilaSolo

  // ====================================================
  // CHECKOUT SAFETY
  // ====================================================

  const customizedCheckoutBlocked =
    hasCustomizedEntries && (
      customizationCheckoutReady !== true ||
      invalidCustomizedEntries
    )

  // Manila Solo får ännu inte skickas till den
  // befintliga kassan. PlaceOrder måste först
  // stödja bundles och bekräfta priset från backend.
const manilaSoloCheckoutBlocked =
  hasManilaSolo && !import.meta.env.DEV
  const canCheckout =
    subtotal > 0 &&
    !customizedCheckoutBlocked &&
    !invalidCustomizedEntries &&
    !manilaSoloCheckoutBlocked

  // ====================================================
  // REMOVE PRODUCT
  // ====================================================

  const removeOne = (entry) => {
    if (entry.isCustomized) {
      if (
        typeof removeFromCartCustomized === 'function'
      ) {
        removeFromCartCustomized(entry.cartKey)
      }
      return
    }

    removeFromCart(entry.productId)
  }

  // ====================================================
  // REMOVE MANILA SOLO
  // ====================================================

  const removeSolo = () => {
    if (typeof removeManilaSolo === 'function') {
      removeManilaSolo()
    }
  }

  // ====================================================
  // JSX
  // ====================================================

  return (
    <div className="cart">

      {/* ============================================== */}
      {/* PRODUCT LIST */}
      {/* ============================================== */}

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

        {/* EMPTY CART */}

        {isEmpty && (
          <div className="mc-cart-empty">
            Din varukorg är tom. Utforska gärna våra
            maträtter och desserter!
          </div>
        )}

        {/* ============================================ */}
        {/* MANILA SOLO PACKAGE */}
        {/* ============================================ */}

        {hasManilaSolo && (
          <div className="cart-item-wrapper mc-cart-line">

            <div className="cart-items-title cart-items-item mc-cart-grid">

              {/* IMAGE / ICON */}

              <div className="mc-cart-cell--image">
                <span
                  className="mc-cart-solo-icon"
                  aria-hidden="true"
                >
                  🇵🇭
                </span>
              </div>

              {/* PACKAGE INFORMATION */}

              <div className="mc-cart-cell--name mc-cart-product-info">

                <strong>
                  Manila Solo 💜
                </strong>

                <span className="mc-cart-custom-label">
                  Komplett meny för en person
                </span>

                <div className="mc-cart-choices">
                  {soloProducts.map(item => (
                    <p key={item.key}>
                      <span className="mc-cart-choice-label">
                        {item.icon} {item.label}:
                      </span>{' '}
                      {item.product
                        ? item.product.name
                        : 'Produkten är inte längre tillgänglig'}
                    </p>
                  ))}
                </div>

              </div>

              {/* PRICE */}

              <p className="mc-cart-cell--price">
                <span className="mc-cart-mobile-label">
                  Styckpris:{' '}
                </span>

                {soloPriceIsValid
                  ? `${formatPrice(soloGrossPrice)} kr`
                  : '—'}
              </p>

              {/* QUANTITY */}

              <p className="mc-cart-cell--quantity">
                <span className="mc-cart-mobile-label">
                  Antal:{' '}
                </span>
                1
              </p>

              {/* TOTAL */}

              <p className="mc-cart-cell--total">
                <span className="mc-cart-mobile-label">
                  Radsumma:{' '}
                </span>

                {soloValid
                  ? `${formatPrice(soloGrossPrice)} kr`
                  : '—'}
              </p>

              {/* REMOVE */}

              <button
                type="button"
                className="cross mc-cart-cell--remove"
                onClick={removeSolo}
                disabled={
                  typeof removeManilaSolo !== 'function'
                }
                aria-label="Ta bort Manila Solo"
                title="Ta bort hela Manila Solo"
              >
                ×
              </button>

            </div>

            {soloHasMissingProducts && (
              <p
                className="mc-cart-invalid"
                role="alert"
              >
                En eller flera produkter i Manila Solo
                finns inte längre i sortimentet.
                Ta bort paketet och välj på nytt.
              </p>
            )}

            <hr />

          </div>
        )}

        {/* ============================================ */}
        {/* EXISTING CART ITEMS */}
        {/* ============================================ */}

        {entries.map(entry => {
          const validPrice =
            !entry.invalidCustomization &&
            entry.price !== null &&
            Number.isFinite(Number(entry.price)) &&
            Number(entry.price) >= 0

          const price = validPrice
            ? Number(entry.price)
            : null

          const quantity = Number(entry.quantity)

          const rowTotal = validPrice
            ? price * quantity
            : null

          const imgSrc = getImageUrl(
            entry.image,
            url
          )

          return (
            <div
              key={entry.cartKey}
              className="cart-item-wrapper mc-cart-line"
            >

              <div className="cart-items-title cart-items-item mc-cart-grid">

                {/* IMAGE */}

                <div className="mc-cart-cell--image">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={entry.name}
                      loading="lazy"
                    />
                  ) : (
                    <span className="mc-cart-no-image">
                      Ingen bild
                    </span>
                  )}
                </div>

                {/* PRODUCT NAME */}

                <div className="mc-cart-cell--name mc-cart-product-info">

                  <strong>{entry.name}</strong>

                  {entry.isCustomized && (
                    <>
                      <span className="mc-cart-custom-label">
                        Anpassad produkt
                      </span>

                      {!entry.invalidCustomization && (
                        <div className="mc-cart-choices">

                          {entry.removedIngredients?.length > 0 && (
                            <p>
                              <span className="mc-cart-choice-label">
                                Utan:
                              </span>{' '}
                              {entry.removedIngredients.join(', ')}
                            </p>
                          )}

                          {entry.extras?.length > 0 && (
                            <div>
                              <span className="mc-cart-choice-label">
                                Extra:
                              </span>

                              <ul>
                                {entry.extras.map(extra => (
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

                {/* PRICE */}

                <p className="mc-cart-cell--price">
                  <span className="mc-cart-mobile-label">
                    Styckpris:{' '}
                  </span>

                  {validPrice
                    ? `${formatPrice(price)} kr`
                    : '—'}
                </p>

                {/* QUANTITY */}

                <p className="mc-cart-cell--quantity">
                  <span className="mc-cart-mobile-label">
                    Antal:{' '}
                  </span>
                  {quantity}
                </p>

                {/* TOTAL */}

                <p className="mc-cart-cell--total">
                  <span className="mc-cart-mobile-label">
                    Radsumma:{' '}
                  </span>

                  {rowTotal !== null
                    ? `${formatPrice(rowTotal)} kr`
                    : '—'}
                </p>

                {/* REMOVE */}

                <button
                  type="button"
                  className="cross mc-cart-cell--remove"
                  onClick={() => removeOne(entry)}
                  disabled={
                    entry.isCustomized &&
                    typeof removeFromCartCustomized !== 'function'
                  }
                  aria-label={`Ta bort en ${entry.name}${entry.isCustomized
                    ? ' med valda anpassningar'
                    : ''}`}
                  title="Ta bort en"
                >
                  ×
                </button>

              </div>

              {/* INVALID CUSTOMIZATIONS */}

              {entry.invalidCustomization && (
                <p
                  className="mc-cart-invalid"
                  role="alert"
                >
                  Den här anpassningen behöver göras om:{' '}
                  {entry.customizationError ||
                    'Tillvalen är inte längre tillgängliga.'}
                  {' '}
                  Ta bort raden och välj produkten på nytt.
                </p>
              )}

              <hr />

            </div>
          )
        })}

      </div>

      {/* ============================================== */}
      {/* TOTALS */}
      {/* ============================================== */}

      <div className="cart-bottom">

        <div className="cart-total">

          <h2>Varukorg</h2>

          <div>

            {/* SUBTOTAL */}

            <div className="cart-total-details">
              <p>Delsumma</p>
              <p>
                {invalidCustomizedEntries ||
                  (hasManilaSolo && !soloValid)
                  ? '—'
                  : `${formatPrice(subtotal)} kr`}
              </p>
            </div>

            <hr />

            {/* VAT */}

            <div className="cart-total-details">
              <p>Moms (6%)</p>
              <p>
                {invalidCustomizedEntries ||
                  (hasManilaSolo && !soloValid)
                  ? '—'
                  : `${formatPrice(vatAmount)} kr`}
              </p>
            </div>

            <hr />

            {/* GRAND TOTAL */}

            <div className="cart-total-details cart-grand-total">
              <b>Totalt</b>
              <b>
                {invalidCustomizedEntries ||
                  (hasManilaSolo && !soloValid)
                  ? '—'
                  : `${formatPrice(total)} kr`}
              </b>
            </div>

          </div>

          {/* CUSTOMIZED PRODUCTS NOTE */}

          {hasCustomizedEntries &&
            !invalidCustomizedEntries && (
              <p className="mc-cart-estimate">
                Priserna för anpassade produkter är
                preliminära tills kassan kontrollerar dem
                mot det aktuella sortimentet.
              </p>
            )}

          {/* CUSTOMIZATION WARNING */}

          {customizedCheckoutBlocked && (
            <p
              className="mc-cart-checkout-warning"
              role="status"
            >
              {invalidCustomizedEntries
                ? 'Några anpassningar är inte längre giltiga. Ta bort de markerade raderna innan du fortsätter.'
                : 'Betalning för anpassade produkter aktiveras när hela kassan är uppdaterad.'}
            </p>
          )}

          {/* MANILA SOLO WARNING */}

          {hasManilaSolo && (
            <p
              className="mc-cart-checkout-warning"
              role="status"
            >
              {hasMixedCart
                ? 'Du har både Manila Solo och vanliga produkter i varukorgen. Denna kombination stöds inte ännu. Ta bort paketet för att beställa övriga produkter.'
                : soloHasMissingProducts || !soloPriceIsValid
                  ? 'Din Manila Solo behöver väljas om. Ta bort paketet och skapa en ny meny.'
                  : 'Din Manila Solo är sparad! Betalning av paketet aktiveras när kassan är färdigkopplad.'}
            </p>
          )}

          {/* CHECKOUT */}

          <button
            type="button"
            className="checkout-button"
            onClick={() => navigate('/order')}
            disabled={!canCheckout}
          >
            {hasManilaSolo
              ? 'Manila Solo – betalning öppnar snart'
              : 'Till kassan'}
          </button>

        </div>

      </div>

    </div>
  )
}

export default Cart
