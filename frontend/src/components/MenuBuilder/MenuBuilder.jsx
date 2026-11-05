
import React, {
  useContext,
  useMemo,
  useState
} from 'react'

import { Link } from 'react-router-dom'
import { StoreContext } from '../../context/StoreContext'
import './MenuBuilder.css'

// ======================================================
// MANILA SOLO — SETTINGS
// ======================================================

const SOLO_PRICE = 249

const DRINK_CATEGORIES = new Set([
  'coffee',
  'shakes',
  'kalla dryck'
])

const EXCLUDED_PRODUCT_NAMES = new Set([
  'large ube cake',
  'ube cake large',
  'stor ube cake',
  'ube cake stor',
  'ube cake large size'
])

const GROUPS = [
  {
    key: 'meal',
    title: 'Välj din maträtt',
    label: 'Maträtt',
    description: 'Välj en filippinsk maträtt.',
    icon: '🍛'
  },
  {
    key: 'dessert',
    title: 'Välj din dessert',
    label: 'Dessert',
    description: 'Välj något sött efter maten.',
    icon: '🍰'
  },
  {
    key: 'drink',
    title: 'Välj din dryck',
    label: 'Dryck',
    description: 'Välj en dryck till din meny.',
    icon: '🥤'
  }
]

const money = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK'
})

// ======================================================
// HELPERS
// ======================================================

const normalizeText = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const createSlug = (name = '') =>
  normalizeText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getProductGroup = (product) => {
  const category = normalizeText(product.category)

  if (category === 'matratter') {
    return 'meal'
  }

  if (DRINK_CATEGORIES.has(category)) {
    return 'drink'
  }

  return 'dessert'
}

const getProductPath = (product) => {
  const slug = createSlug(product.name)

  return getProductGroup(product) === 'meal'
    ? `/matratt/${slug}`
    : `/dessert/${slug}`
}

const getImageUrl = (image, baseUrl) => {
  const value = String(image || '').trim()

  if (!value) return ''

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  if (value.startsWith('//')) {
    return `https:${value}`
  }

  const cleanUrl = String(baseUrl || '').replace(/\/$/, '')
  const cleanImage = value.replace(/^\//, '')

  return `${cleanUrl}/images/${cleanImage}`
}

const isExcludedProduct = (product) =>
  EXCLUDED_PRODUCT_NAMES.has(
    normalizeText(product.name)
  )

// ======================================================
// MENU BUILDER
// ======================================================

const MenuBuilder = () => {
  const store = useContext(StoreContext)

  const {
    food_list = [],
    url = '',
    manilaSolo = null,
    addManilaSolo,
    removeManilaSolo
  } = store || {}

  // ====================================================
  // STATES
  // ====================================================

  const [isOpen, setIsOpen] = useState(false)

  const [selected, setSelected] = useState(() => ({
    meal: manilaSolo?.mealId || null,
    dessert: manilaSolo?.dessertId || null,
    drink: manilaSolo?.drinkId || null
  }))

  const [activeGroup, setActiveGroup] = useState('meal')

  const [message, setMessage] = useState(null)

  // ====================================================
  // AVAILABLE PRODUCTS
  // ====================================================

  const products = useMemo(() => {
    return food_list.filter((product) => {
      if (!product?._id) return false

      if (!String(product.name || '').trim()) {
        return false
      }

      const price = Number(product.price)

      if (!Number.isFinite(price) || price < 0) {
        return false
      }

      if (
        product.available === false ||
        product.isAvailable === false
      ) {
        return false
      }

      if (isExcludedProduct(product)) {
        return false
      }

      return true
    })
  }, [food_list])

  // ====================================================
  // GROUP PRODUCTS
  // ====================================================

  const groupedProducts = useMemo(() => ({
    meal: products.filter(
      product => getProductGroup(product) === 'meal'
    ),

    dessert: products.filter(
      product => getProductGroup(product) === 'dessert'
    ),

    drink: products.filter(
      product => getProductGroup(product) === 'drink'
    )
  }), [products])

  // ====================================================
  // SELECTED PRODUCTS
  // ====================================================

  const selectedProducts = useMemo(() => {
    const result = {}

    GROUPS.forEach(group => {
      const id = selected[group.key]

      result[group.key] =
        groupedProducts[group.key].find(
          product =>
            String(product._id).toLowerCase() ===
            String(id || '').toLowerCase()
        ) || null
    })

    return result
  }, [selected, groupedProducts])

  const selectedCount = GROUPS.filter(
    group => Boolean(selectedProducts[group.key])
  ).length

  const isComplete = selectedCount === 3

  const isSaved =
    isComplete &&
    Boolean(manilaSolo) &&
    String(manilaSolo.mealId) ===
      String(selected.meal) &&
    String(manilaSolo.dessertId) ===
      String(selected.dessert) &&
    String(manilaSolo.drinkId) ===
      String(selected.drink)

  // ====================================================
  // SELECT PRODUCT
  // ====================================================

  const selectProduct = (groupKey, productId) => {
    setMessage(null)

    setSelected(previous => ({
      ...previous,
      [groupKey]:
        previous[groupKey] === productId
          ? null
          : productId
    }))

    // Gå automatiskt vidare till nästa kategori
    // när ett nytt produktval har gjorts.
    const groupIndex = GROUPS.findIndex(
      group => group.key === groupKey
    )

    if (
      selected[groupKey] !== productId &&
      groupIndex >= 0 &&
      groupIndex < GROUPS.length - 1
    ) {
      setActiveGroup(GROUPS[groupIndex + 1].key)
    }
  }

  // ====================================================
  // CLEAR SELECTION
  // ====================================================

  const clearMenu = () => {
    setSelected({
      meal: null,
      dessert: null,
      drink: null
    })

    setActiveGroup('meal')
    setMessage(null)
  }

  // ====================================================
  // SAVE MANILA SOLO
  // ====================================================

  const handleSaveSolo = () => {
    setMessage(null)

    if (!isComplete) {
      setMessage({
        success: false,
        text: 'Välj en maträtt, en dessert och en dryck.'
      })
      return
    }

    if (typeof addManilaSolo !== 'function') {
      setMessage({
        success: false,
        text: 'Manila Solo är inte tillgänglig ännu.'
      })
      return
    }

    const result = addManilaSolo({
      mealId: String(selected.meal),
      dessertId: String(selected.dessert),
      drinkId: String(selected.drink)
    })

    if (!result?.success) {
      setMessage({
        success: false,
        text:
          result?.message ||
          'Kunde inte spara din Manila Solo.'
      })
      return
    }

    setMessage({
      success: true,
      text:
        'Din Manila Solo är sparad i varukorgen! 💜'
    })
  }

  // ====================================================
  // REMOVE SAVED MANILA SOLO
  // ====================================================

  const handleRemoveSolo = () => {
    if (typeof removeManilaSolo !== 'function') {
      return
    }

    const result = removeManilaSolo()

    if (result?.success) {
      clearMenu()

      setMessage({
        success: true,
        text: 'Din sparade Manila Solo har tagits bort.'
      })
    } else {
      setMessage({
        success: false,
        text:
          result?.message ||
          'Kunde inte ta bort din Manila Solo.'
      })
    }
  }

  // ====================================================
  // JSX
  // ====================================================

  return (
    <section
      className="mc-menu-builder"
      aria-labelledby="mc-menu-builder-title"
    >

      {/* INTRO */}

      <div className="mc-menu-builder__intro">

        <div className="mc-menu-builder__intro-copy">

          <span className="mc-menu-builder__eyebrow">
            MANILA CAFÉ 🇵🇭
          </span>

          <h2 id="mc-menu-builder-title">
            Build Your Manila Combo 💜
          </h2>

          <p>
            Skapa din egen filippinska meny.
            Välj en maträtt, en dessert och en dryck
            till ett och samma paketpris.
          </p>

        </div>

        <button
          type="button"
          className="mc-menu-builder__primary"
          aria-expanded={isOpen}
          aria-controls="mc-menu-builder-panel"
          onClick={() => setIsOpen(previous => !previous)}
        >
          {isOpen
            ? 'Stäng menybyggaren'
            : 'Bygg din Manila Solo 🇵🇭'}
        </button>

      </div>

      {/* BUILDER */}

      {isOpen && (
        <div
          className="mc-menu-builder__panel"
          id="mc-menu-builder-panel"
        >

          {/* HEADING */}

          <div className="mc-menu-builder__step-heading">

            <div>
              <span className="mc-menu-builder__eyebrow">
                MANILA SOLO
              </span>

              <h3>
                En komplett meny för en person
              </h3>

              <p>
                Välj exakt en maträtt, en dessert
                och en dryck.
              </p>
            </div>

            <span className="mc-menu-builder__selection-count">
              {money.format(SOLO_PRICE)}
            </span>

          </div>

          {/* PROGRESS */}

          <div className="mc-menu-builder__progress">
            <p>
              {isComplete
                ? '💜 Alla tre val är klara!'
                : `${selectedCount} av 3 val klara`}
            </p>
          </div>

          {/* CATEGORY FILTERS */}

          <div
            className="mc-menu-builder__filters"
            aria-label="Välj del av menyn"
          >

            {GROUPS.map(group => {
              const hasSelection = Boolean(
                selectedProducts[group.key]
              )

              return (
                <button
                  key={group.key}
                  type="button"
                  className={
                    activeGroup === group.key
                      ? 'is-active'
                      : ''
                  }
                  aria-pressed={
                    activeGroup === group.key
                  }
                  onClick={() => {
                    setActiveGroup(group.key)
                    setMessage(null)
                  }}
                >
                  {hasSelection ? '✓ ' : ''}
                  {group.icon} {group.label}
                </button>
              )
            })}

          </div>

          {/* ACTIVE CATEGORY */}

          {GROUPS.filter(
            group => group.key === activeGroup
          ).map(group => (
            <div key={group.key}>

              <div className="mc-menu-builder__step-heading">
                <div>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>

                <span className="mc-menu-builder__selection-count">
                  1 val
                </span>
              </div>

              {/* PRODUCTS */}

              <div className="mc-menu-builder__items">

                {groupedProducts[group.key].length === 0 && (
                  <p className="mc-menu-builder__empty">
                    Inga produkter finns tillgängliga
                    i den här kategorin just nu.
                  </p>
                )}

                {groupedProducts[group.key].map(product => {
                  const productId = String(product._id)

                  const isSelected =
                    selected[group.key] === productId

                  const imageUrl = getImageUrl(
                    product.image,
                    url
                  )

                  return (
                    <article
                      key={productId}
                      className={`mc-menu-builder__product ${
                        isSelected ? 'is-selected' : ''
                      }`}
                    >

                      {/* IMAGE */}

                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="mc-menu-builder__placeholder"
                          aria-hidden="true"
                        >
                          🇵🇭
                        </div>
                      )}

                      {/* PRODUCT INFO */}

                      <div className="mc-menu-builder__product-info">

                        <small className="mc-menu-builder__product-type">
                          {group.label}
                        </small>

                        <strong>{product.name}</strong>

                        <span>
                          Ordinarie pris:{' '}
                          {money.format(Number(product.price))}
                        </span>

                        <Link
                          className="mc-menu-builder__detail-link"
                          to={getProductPath(product)}
                        >
                          Ingredienser &amp; allergener
                        </Link>

                      </div>

                      {/* SELECT */}

                      <div className="mc-menu-builder__solo-action">

                        <button
                          type="button"
                          className={`mc-menu-builder__solo-select ${
                            isSelected ? 'is-selected' : ''
                          }`}
                          aria-pressed={isSelected}
                          onClick={() =>
                            selectProduct(
                              group.key,
                              productId
                            )
                          }
                        >
                          {isSelected
                            ? '✓ Vald'
                            : 'Välj produkt'}
                        </button>

                      </div>

                    </article>
                  )
                })}

              </div>

            </div>
          ))}

          {/* SUMMARY */}

          <div className="mc-menu-builder__summary">

            <div className="mc-menu-builder__summary-top">

              <div>
                <span className="mc-menu-builder__eyebrow">
                  DIN KOMBO
                </span>

                <h3>Din Manila Solo 🇵🇭</h3>
              </div>

              {selectedCount > 0 && (
                <button
                  type="button"
                  className="mc-menu-builder__clear"
                  onClick={clearMenu}
                >
                  Rensa val
                </button>
              )}

            </div>

            {/* SELECTED PRODUCTS */}

            <ul className="mc-menu-builder__selected-list">

              {GROUPS.map(group => {
                const product =
                  selectedProducts[group.key]

                return (
                  <li key={group.key}>
                    <span>
                      <strong>
                        {group.icon} {group.label}
                      </strong>

                      {' — '}

                      {product
                        ? product.name
                        : 'Inte vald ännu'}
                    </span>

                    <span>
                      {product ? '✓' : '—'}
                    </span>
                  </li>
                )
              })}

            </ul>

            {/* TOTAL */}

            <div className="mc-menu-builder__total">

              <div>
                <span>
                  Paketpris inklusive moms
                </span>

                <strong>
                  {money.format(SOLO_PRICE)}
                </strong>
              </div>

              <button
                type="button"
                className="mc-menu-builder__primary"
                disabled={!isComplete || isSaved}
                onClick={handleSaveSolo}
              >
                {!isComplete
                  ? `Välj alla 3 produkter (${selectedCount}/3)`
                  : isSaved
                    ? '✓ Manila Solo sparad'
                    : 'Spara min Manila Solo 💜'}
              </button>

            </div>

            {/* SAVED BUNDLE */}

            {manilaSolo && (
              <button
                type="button"
                className="mc-menu-builder__clear"
                onClick={handleRemoveSolo}
                style={{ marginTop: 15 }}
              >
                Ta bort sparad Manila Solo
              </button>
            )}

            {/* MESSAGE */}

            {message && (
              <p
                className="mc-menu-builder__note"
                role="status"
                style={{
                  color: message.success
                    ? '#247a50'
                    : '#a32946',
                  fontWeight: 700
                }}
              >
                {message.text}
              </p>
            )}

            <p className="mc-menu-builder__note">
              Din meny finns i varukorgen.
              Fortsätt till kassan när betalningen är tillgänglig.
            </p>

          </div>

        </div>
      )}

    </section>
  )
}

export default MenuBuilder
