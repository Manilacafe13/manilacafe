import React, { useContext, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import './ProductPage.css'
import './ProductCustomizations.css'

import { StoreContext } from '../../context/StoreContext'
import { assets } from '../../assets/assets'


// ======================================================
// CREATE URL SLUG
// ======================================================

const createSlug = (name = "") =>
  String(name)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")


// ======================================================
// PRODUCT SEO INFORMATION
// ======================================================

const productSeoInformation = {

  "mango-float": {
    title:
      "Mango Float i Göteborg | Manila Café",

    description:
      "Beställ Mango Float i Göteborg från Manila Café. En krämig filippinsk dessert med mango, grädde och Graham crackers för avhämtning eller leverans.",

    heading:
      "Mango Float i Göteborg",

    eyebrow:
      "FILIPPINSK MANGODESSERT",

    intro:
      "Upptäck Mango Float – en kall och krämig filippinsk dessert med tropisk mango, krämig fyllning och Graham crackers."
  },


  "ube-cake": {
    title:
      "Ube Cake i Göteborg | Manila Café",

    description:
      "Upptäck Ube Cake i Göteborg hos Manila Café. Filippinsk dessert med ube och tropiska smaker för avhämtning eller leverans.",

    heading:
      "Ube Cake i Göteborg",

    eyebrow:
      "FILIPPINSK UBE-DESSERT",

    intro:
      "Upptäck den lila favoriten ube. Vår Ube Cake kombinerar den karakteristiska smaken av ube med en krämig och söt dessertupplevelse."
  },


  "fruit-cup": {
    title:
      "Fruit Cup i Göteborg | Manila Café",

    description:
      "Beställ Fruit Cup i Göteborg från Manila Café. En kall och krämig fruktdessert inspirerad av filippinsk fruit salad.",

    heading:
      "Filipino Fruit Cup i Göteborg",

    eyebrow:
      "FILIPPINSK FRUKTDESSERT",

    intro:
      "Vår Fruit Cup är inspirerad av filippinsk fruit salad och kombinerar tropisk frukt med söta och krämiga smaker."
  },


  "banana-float": {
    title:
      "Banana Float i Göteborg | Manila Café",

    description:
      "Beställ Banana Float i Göteborg från Manila Café. En krämig dessert med banan och Graham crackers.",

    heading:
      "Banana Float i Göteborg",

    eyebrow:
      "KRÄMIG BANANDESSERT",

    intro:
      "Banana Float kombinerar banan med krämiga lager och Graham crackers till en kall och söt dessert."
  },


  "cinnamon-banana-float": {
    title:
      "Cinnamon Banana Float i Göteborg | Manila Café",

    description:
      "Beställ Cinnamon Banana Float i Göteborg från Manila Café. Krämig banandessert med Graham crackers och kanel.",

    heading:
      "Cinnamon Banana Float i Göteborg",

    eyebrow:
      "BANAN • KANEL • CREAMY",

    intro:
      "En krämig Banana Float med banan, Graham crackers och kanel."
  },


  "sinigang": {
    title:
      "Sinigang i Göteborg | Manila Café",

    description:
      "Beställ Sinigang i Göteborg från Manila Café. En klassisk filippinsk maträtt med en karakteristisk syrlig och smakrik buljong för avhämtning eller leverans.",

    heading:
      "Sinigang i Göteborg",

    eyebrow:
      "KLASSISK FILIPPINSK MATRÄTT",

    intro:
      "Upptäck Sinigang – en klassisk filippinsk maträtt känd för sin friska, syrliga och smakrika buljong."
  }

}


// ======================================================
// META TAG HELPER
// ======================================================

const setMetaTag = (
  selector,
  attribute,
  attributeValue,
  content
) => {

  let tag =
    document.querySelector(selector)

  if (!tag) {

    tag =
      document.createElement("meta")

    tag.setAttribute(
      attribute,
      attributeValue
    )

    document.head.appendChild(tag)
  }

  tag.setAttribute(
    "content",
    content
  )

  return tag
}


// ======================================================
// PRODUCT PAGE
// ======================================================

const ProductPage = () => {

  const { slug } = useParams()

  const location =
    useLocation()

  const {
    food_list = [],
    cartItems = {},
    addToCart,
    removeFromCart,
    // StoreContext exposes this only when the complete checkout is enabled.
    // Until then, users can see customer choices without risking incorrect orders.
    addToCartCustomized,
    url
  } = useContext(StoreContext)

  // Selected option IDs are kept separate from the old product counter.
  // This prevents accidental changes to existing regular cart items.
  const [removedIngredientIds, setRemovedIngredientIds] = useState([])
  const [extraQuantities, setExtraQuantities] = useState({})
  const [addingCustomizedItem, setAddingCustomizedItem] = useState(false)
  const [customizationMessage, setCustomizationMessage] = useState('')


  // ==================================================
  // PRODUCT TYPE / ROUTE
  // ==================================================

  const isMealRoute =
    location.pathname.startsWith("/matratt/")

  const productBasePath =
    isMealRoute
      ? "matratt"
      : "dessert"

  const productType =
    isMealRoute
      ? "maträtt"
      : "dessert"

  const productTypePlural =
    isMealRoute
      ? "maträtter"
      : "desserter"

  const productUrl =
    `https://www.manilacafe.se/${productBasePath}/${slug}`


  // ==================================================
  // FIND PRODUCT
  // ==================================================

  const product =
    food_list.find((item) => {

      const matchesSlug =
        createSlug(item.name) === slug

      const matchesType =
        isMealRoute
          ? item.category === "Maträtter"
          : item.category !== "Maträtter"

      return matchesSlug && matchesType
    })


  const seo =
    productSeoInformation[slug]


  // ==================================================
  // CUSTOMER CUSTOMIZATIONS (AVAILABLE OPTIONS ONLY)
  // ==================================================

  // Product configuration is returned by the public food list endpoint.
  // Prices are descriptive here; the backend must recalculate checkout totals.
  const customization = product?.customizations || {}
  const removableIngredients = Array.isArray(customization.removableIngredients)
    ? customization.removableIngredients.filter(option =>
        option && option._id && option.available !== false
      )
    : []

  const extras = Array.isArray(customization.extras)
    ? customization.extras.filter(option =>
        option &&
        option._id &&
        option.available !== false &&
        Number.isFinite(Number(option.price)) &&
        Number(option.price) >= 0
      )
    : []

  const showCustomizations = customization.enabled === true &&
    (removableIngredients.length > 0 || extras.length > 0)

  // Never send stale IDs if the product or available options have changed.
  const selectedRemovedIds = showCustomizations
    ? removableIngredients
        .filter(option => removedIngredientIds.includes(String(option._id)))
        .map(option => String(option._id))
    : []

  const selectedExtras = showCustomizations
    ? extras.map(option => {
        const maxQuantity = Math.max(
          1,
          Math.min(10, Number(option.maxQuantity) || 1)
        )
        const quantity = Math.min(
          maxQuantity,
          Math.max(0, Number(extraQuantities[String(option._id)]) || 0)
        )

        return {
          optionId: String(option._id),
          quantity: Math.floor(quantity),
          unitPrice: Number(option.price)
        }
      }).filter(option => option.quantity > 0)
    : []

  const hasSelectedCustomizations =
    selectedRemovedIds.length > 0 || selectedExtras.length > 0

  const customizationExtraTotal = selectedExtras.reduce(
    (sum, option) => sum + option.unitPrice * option.quantity,
    0
  )

  const customizedUnitTotal =
    Number(product?.price || 0) + customizationExtraTotal

  const formatPrice = value =>
    Number(value).toLocaleString('sv-SE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

  // Reset selections when the customer navigates to another product.
  useEffect(() => {
    setRemovedIngredientIds([])
    setExtraQuantities({})
    setCustomizationMessage('')
    setAddingCustomizedItem(false)
  }, [product?._id])

  const toggleRemoval = optionId => {
    setCustomizationMessage('')
    setRemovedIngredientIds(previous =>
      previous.includes(optionId)
        ? previous.filter(id => id !== optionId)
        : [...previous, optionId]
    )
  }

  const adjustExtraQuantity = (option, change) => {
    const optionId = String(option._id)
    const maxQuantity = Math.max(1, Math.min(10, Number(option.maxQuantity) || 1))
    setCustomizationMessage('')
    setExtraQuantities(previous => {
      const nextQuantity = Math.min(
        maxQuantity,
        Math.max(0, Number(previous[optionId] || 0) + change)
      )
      return { ...previous, [optionId]: nextQuantity }
    })
  }

  const clearCustomerSelections = () => {
    setRemovedIngredientIds([])
    setExtraQuantities({})
    setCustomizationMessage('')
  }

  // Never silently call addToCart(productId) when options are selected:
  // that would charge for an original product and lose the customer's choices.
  const addCustomizedItem = async () => {
    if (
      !product || !hasSelectedCustomizations ||
      typeof addToCartCustomized !== 'function' || addingCustomizedItem
    ) return

    setAddingCustomizedItem(true)
    setCustomizationMessage('')

    try {
      const result = await addToCartCustomized(product._id, {
        removedIngredientIds: selectedRemovedIds,
        extras: selectedExtras.map(({ optionId, quantity }) => ({
          optionId,
          quantity
        }))
      })

      // Do not claim success unless the cart explicitly confirms persistence.
      if (result?.success !== true) {
        throw new Error(result?.message || 'Varukorgen kunde inte bekräfta att kundvalen sparades.')
      }

      setCustomizationMessage('Din anpassade produkt har lagts i varukorgen.')
    } catch (error) {
      setCustomizationMessage(
        error?.message || 'Kunde inte lägga till den anpassade produkten.'
      )
    } finally {
      setAddingCustomizedItem(false)
    }
  }


  // ==================================================
  // IMAGE
  // ==================================================

  const getProductImage = () => {

    if (!product) {
      return ""
    }

    const imageValue =
      String(product.image || "").trim()

    if (
      imageValue.startsWith("https://") ||
      imageValue.startsWith("http://")
    ) {
      return imageValue
    }

    if (imageValue.startsWith("//")) {
      return `https:${imageValue}`
    }

    if (imageValue) {
      return `${url}/images/${imageValue}`
    }

    return assets.upload_area || ""
  }


  const imageUrl =
    getProductImage()


  // ==================================================
  // SEO + SOCIAL META
  // ==================================================

  useEffect(() => {

    if (!product) {
      return
    }


    const pageTitle =
      seo?.title ||
      `${product.name} i Göteborg | Manila Café`


    const pageDescription =
      seo?.description ||
      product.description ||
      `${product.name} från Manila Café. Upptäck filippinska ${productTypePlural} i Göteborg och beställ online.`


    // ==============================================
    // TITLE
    // ==============================================

    document.title =
      pageTitle


    // ==============================================
    // DESCRIPTION
    // ==============================================

    setMetaTag(
      'meta[name="description"]',
      "name",
      "description",
      pageDescription
    )


    // ==============================================
    // CANONICAL
    // ==============================================

    let canonical =
      document.querySelector(
        'link[rel="canonical"]'
      )

    if (!canonical) {

      canonical =
        document.createElement("link")

      canonical.setAttribute(
        "rel",
        "canonical"
      )

      document.head.appendChild(
        canonical
      )
    }

    canonical.setAttribute(
      "href",
      productUrl
    )


    // ==============================================
    // OPEN GRAPH
    // ==============================================

    setMetaTag(
      'meta[property="og:type"]',
      "property",
      "og:type",
      "website"
    )

    setMetaTag(
      'meta[property="og:title"]',
      "property",
      "og:title",
      pageTitle
    )

    setMetaTag(
      'meta[property="og:description"]',
      "property",
      "og:description",
      pageDescription
    )

    setMetaTag(
      'meta[property="og:url"]',
      "property",
      "og:url",
      productUrl
    )

    if (imageUrl) {

      setMetaTag(
        'meta[property="og:image"]',
        "property",
        "og:image",
        imageUrl
      )

      setMetaTag(
        'meta[property="og:image:alt"]',
        "property",
        "og:image:alt",
        `${product.name} – ${productType} från Manila Café i Göteborg`
      )
    }


    // ==============================================
    // TWITTER / SOCIAL CARD
    // ==============================================

    setMetaTag(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      "summary_large_image"
    )

    setMetaTag(
      'meta[name="twitter:title"]',
      "name",
      "twitter:title",
      pageTitle
    )

    setMetaTag(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      pageDescription
    )

    if (imageUrl) {

      setMetaTag(
        'meta[name="twitter:image"]',
        "name",
        "twitter:image",
        imageUrl
      )
    }


    // ==============================================
    // CLEANUP WHEN LEAVING PRODUCT PAGE
    // ==============================================

    return () => {

      const homeTitle =
        "Manila Café | Filippinska maträtter & desserter i Göteborg"


      const homeDescription =
        "Upptäck filippinska maträtter och desserter hos Manila Café i Göteborg. Beställ enkelt online för leverans eller avhämtning. Betala tryggt med kort eller Klarna."


      document.title =
        homeTitle


      const descriptionTag =
        document.querySelector(
          'meta[name="description"]'
        )

      descriptionTag?.setAttribute(
        "content",
        homeDescription
      )


      canonical?.setAttribute(
        "href",
        "https://www.manilacafe.se/"
      )


      const ogTitle =
        document.querySelector(
          'meta[property="og:title"]'
        )

      ogTitle?.setAttribute(
        "content",
        homeTitle
      )


      const ogDescription =
        document.querySelector(
          'meta[property="og:description"]'
        )

      ogDescription?.setAttribute(
        "content",
        homeDescription
      )


      const ogUrl =
        document.querySelector(
          'meta[property="og:url"]'
        )

      ogUrl?.setAttribute(
        "content",
        "https://www.manilacafe.se/"
      )


      const twitterTitle =
        document.querySelector(
          'meta[name="twitter:title"]'
        )

      twitterTitle?.setAttribute(
        "content",
        homeTitle
      )


      const twitterDescription =
        document.querySelector(
          'meta[name="twitter:description"]'
        )

      twitterDescription?.setAttribute(
        "content",
        homeDescription
      )
    }

  }, [
    product,
    seo,
    imageUrl,
    productUrl,
    productType,
    productTypePlural
  ])


  // ==================================================
  // PRODUCT STRUCTURED DATA
  // ==================================================

  useEffect(() => {

    if (!product) {
      return
    }


    const structuredData = {

      "@context":
        "https://schema.org",

      "@type":
        "Product",

      "@id":
        `${productUrl}#product`,

      name:
        product.name,

      description:
        seo?.description ||
        product.description ||
        `${product.name} från Manila Café`,

      url:
        productUrl,

      category:
        product.category,

      brand: {
        "@type":
          "Brand",

        name:
          "Manila Café"
      },

      offers: {
        "@type":
          "Offer",

        url:
          productUrl,

        priceCurrency:
          "SEK",

        price:
          String(product.price),

        seller: {
          "@type":
            "Organization",

          name:
            "Manila Café",

          url:
            "https://www.manilacafe.se/"
        }
      }
    }


    if (imageUrl) {

      structuredData.image = [
        imageUrl
      ]
    }


    const existingScript =
      document.getElementById(
        "product-structured-data"
      )

    if (existingScript) {
      existingScript.remove()
    }


    const script =
      document.createElement(
        "script"
      )

    script.type =
      "application/ld+json"

    script.id =
      "product-structured-data"

    script.textContent =
      JSON.stringify(
        structuredData
      )

    document.head.appendChild(
      script
    )


    return () => {

      const currentScript =
        document.getElementById(
          "product-structured-data"
        )

      if (currentScript) {
        currentScript.remove()
      }
    }

  }, [
    product,
    seo,
    imageUrl,
    productUrl
  ])


  // ==================================================
  // LOADING
  // ==================================================

  if (!food_list.length) {

    return (

      <main className="product-page">

        <div className="product-page-state">

          <p>
            Laddar produkt...
          </p>

        </div>

      </main>
    )
  }


  // ==================================================
  // NOT FOUND
  // ==================================================

  if (!product) {

    return (

      <main className="product-page">

        <div className="product-page-state">

          <span>
            MANILA CAFÉ
          </span>

          <h1>
            Produkten hittades inte
          </h1>

          <p>
            Produkten du letar efter verkar
            inte finnas just nu.
          </p>

          <Link
            to="/"
            className="product-page-back-button"
          >
            Se vårt sortiment
          </Link>

        </div>

      </main>
    )
  }


  // ==================================================
  // CART QUANTITY
  // ==================================================

  const quantity =
    cartItems[product._id] || 0


  // ==================================================
  // JSX
  // ==================================================

  return (

    <main className="product-page">


      {/* ========================================== */}
      {/* BREADCRUMB */}
      {/* ========================================== */}

      <nav
        className="product-breadcrumb"
        aria-label="Brödsmulor"
      >

        <Link to="/">
          Manila Café
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <Link to="/#food-display">
          {isMealRoute ? "Maträtter" : "Desserter"}
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span>
          {product.name}
        </span>

      </nav>


      {/* ========================================== */}
      {/* PRODUCT */}
      {/* ========================================== */}

      <section className="product-page-hero">


        {/* IMAGE */}

        <div className="product-page-image-wrapper">

          <img
            src={imageUrl}
            alt={`${product.name} – ${productType} från Manila Café i Göteborg`}
            className="product-page-image"
          />

        </div>


        {/* CONTENT */}

        <div className="product-page-content">

          <span className="product-page-eyebrow">

            {
              seo?.eyebrow ||
              (
                isMealRoute
                  ? "FILIPPINSK MATRÄTT • GÖTEBORG"
                  : "FILIPPINSK DESSERT • GÖTEBORG"
              )
            }

          </span>


          <h1>

            {
              seo?.heading ||
              `${product.name} i Göteborg`
            }

          </h1>


          <p className="product-page-intro">

            {
              seo?.intro ||
              product.description
            }

          </p>


          {
            product.description &&
            product.description !== seo?.intro && (

              <p className="product-page-description">
                {product.description}
              </p>
            )
          }


          {/* PRICE */}

          <div className="product-page-price">
            {product.price} kr
          </div>

          {/* ================================== */}
          {/* OPTIONAL CUSTOMER CUSTOMIZATIONS */}
          {/* ================================== */}

          {showCustomizations && (
            <section
              className="mc-product-customizations"
              aria-labelledby="mc-product-customizations-title"
            >
              <div className="mc-product-customizations-heading">
                <div>
                  <h2 id="mc-product-customizations-title">
                    Anpassa din beställning
                  </h2>
                  <p>Välj bort ingredienser eller lägg till något extra.</p>
                </div>
                {hasSelectedCustomizations && (
                  <button
                    type="button"
                    className="mc-product-reset"
                    onClick={clearCustomerSelections}
                  >
                    Återställ val
                  </button>
                )}
              </div>

              {removableIngredients.length > 0 && (
                <fieldset className="mc-product-choice-group">
                  <legend>Ta bort ingredienser</legend>
                  <p>Markera endast sådant du vill ha utan.</p>
                  <div className="mc-product-removals">
                    {removableIngredients.map(option => {
                      const id = String(option._id)
                      const checked = selectedRemovedIds.includes(id)

                      return (
                        <label className="mc-product-removable" key={id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRemoval(id)}
                          />
                          <span>Utan {option.name}</span>
                          <span className="mc-product-included-price">0 kr</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              {extras.length > 0 && (
                <fieldset className="mc-product-choice-group">
                  <legend>Lägg till extra</legend>
                  <p>Välj antal för varje tillval.</p>
                  <div className="mc-product-extras">
                    {extras.map(option => {
                      const id = String(option._id)
                      const maxQuantity = Math.max(
                        1, Math.min(10, Number(option.maxQuantity) || 1)
                      )
                      const count = Math.min(
                        maxQuantity, Math.max(0, Number(extraQuantities[id]) || 0)
                      )

                      return (
                        <div className="mc-product-extra" key={id}>
                          <div className="mc-product-extra-label">
                            <strong>{option.name}</strong>
                            <small>+{formatPrice(option.price)} kr/st</small>
                          </div>
                          <div className="mc-product-extra-counter">
                            <button
                              type="button"
                              onClick={() => adjustExtraQuantity(option, -1)}
                              disabled={count <= 0}
                              aria-label={`Minska antal ${option.name}`}
                            >
                              −
                            </button>
                            <output aria-label={`Antal ${option.name}`}>{count}</output>
                            <button
                              type="button"
                              onClick={() => adjustExtraQuantity(option, 1)}
                              disabled={count >= maxQuantity}
                              aria-label={`Öka antal ${option.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              <div className="mc-product-customization-total">
                <span>Pris per produkt med valda tillägg</span>
                <strong>{formatPrice(customizedUnitTotal)} kr</strong>
              </div>
              <p className="mc-product-customization-vat">
                Priser exklusive moms. Slutbelopp visas i kassan.
              </p>
              <p className="mc-product-customization-allergy">
                Att välja bort en ingrediens garanterar inte att maten är fri
                från spår av allergener. Kontakta oss vid allergier.
              </p>
            </section>
          )}


          {/* ================================== */}
          {/* CART */}
          {/* ================================== */}

          {showCustomizations && hasSelectedCustomizations ? (
            <div className="mc-product-custom-cart">
              <button
                type="button"
                className="product-page-cart-button mc-product-custom-add"
                disabled={
                  addingCustomizedItem ||
                  typeof addToCartCustomized !== 'function'
                }
                onClick={addCustomizedItem}
              >
                {addingCustomizedItem
                  ? 'Lägger till…'
                  : `Lägg anpassad produkt i varukorgen · ${formatPrice(customizedUnitTotal)} kr`}
              </button>

              {typeof addToCartCustomized !== 'function' && (
                <p className="mc-product-customization-warning" role="status">
                  Anpassade beställningar blir tillgängliga när varukorgen och
                  betalningen är uppdaterade. Avmarkera valen om du vill
                  beställa originalprodukten redan nu.
                </p>
              )}

              {customizationMessage && (
                <p className="mc-product-customization-notice" role="status">
                  {customizationMessage}
                </p>
              )}

              <Link to="/cart" className="product-page-view-cart">
                Visa varukorgen
              </Link>
            </div>
          ) : (
            quantity === 0
              ? (

                <button
                  type="button"
                  className="product-page-cart-button"
                  onClick={() =>
                    addToCart(
                      product._id
                    )
                  }
                >
                  Lägg i varukorgen
                </button>
              )
              : (

                <div className="product-page-cart-area">

                  <div className="product-page-counter">

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(
                          product._id
                        )
                      }
                      aria-label={`Minska antal ${product.name}`}
                    >
                      −
                    </button>


                    <span>
                      {quantity}
                    </span>


                    <button
                      type="button"
                      onClick={() =>
                        addToCart(
                          product._id
                        )
                      }
                      aria-label={`Lägg till en ${product.name}`}
                    >
                      +
                    </button>

                  </div>


                  <Link
                    to="/cart"
                    className="product-page-view-cart"
                  >
                    Visa varukorgen
                  </Link>

                </div>
              )
          )}


          {/* ================================== */}
          {/* SERVICE INFO */}
          {/* ================================== */}

          <div className="product-page-service-info">

            <span>
              ✓ Beställ online
            </span>

            <span>
              ✓ Avhämtning
            </span>

            <span>
              ✓ Leverans i Göteborg
            </span>

          </div>

        </div>

      </section>


      {/* ========================================== */}
      {/* DISCOVERY */}
      {/* ========================================== */}

      <section className="product-page-discovery">

        <span className="section-eyebrow">
          FILIPINO FOOD & DESSERTS
        </span>

        <h2>
          Upptäck fler filippinska smaker
          i Göteborg
        </h2>

        <p>
          Utforska Manila Cafés filippinska maträtter
          och desserter. Från klassiska rätter till
          mango, ube, kokos och andra filippinska
          favoriter finns det alltid något nytt att testa.
        </p>

        <Link
          to="/#food-display"
          className="product-page-more-link"
        >
          Se hela sortimentet →
        </Link>

      </section>

    </main>
  )
}


export default ProductPage
