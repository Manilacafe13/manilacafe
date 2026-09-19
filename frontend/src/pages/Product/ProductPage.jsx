import React, {
    useContext,
    useEffect
} from 'react'

import {
    Link,
    useParams
} from 'react-router-dom'

import './ProductPage.css'

import {
    StoreContext
} from '../../context/StoreContext'

import {
    assets
} from '../../assets/assets'


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

    const {
        slug
    } = useParams()


    const {
        food_list = [],
        cartItems = {},
        addToCart,
        removeFromCart,
        url
    } = useContext(StoreContext)


    // ==================================================
    // FIND PRODUCT
    // ==================================================

    const product =
        food_list.find(
            item =>
                createSlug(item.name) === slug
        )


    const seo =
        productSeoInformation[slug]


    // ==================================================
    // IMAGE
    // ==================================================

    const getProductImage = () => {

        if (!product) {
            return ""
        }


        const imageValue =
            String(
                product.image || ""
            ).trim()


        if (
            imageValue.startsWith("https://") ||
            imageValue.startsWith("http://")
        ) {

            return imageValue

        }


        if (
            imageValue.startsWith("//")
        ) {

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


        const productUrl =
            `https://www.manilacafe.se/dessert/${slug}`


        const pageTitle =
            seo?.title ||
            `${product.name} i Göteborg | Manila Café`


        const pageDescription =
            seo?.description ||
            product.description ||
            `${product.name} från Manila Café. Upptäck filippinska desserter i Göteborg och beställ online.`


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
                `${product.name} – Manila Café Göteborg`
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

            document.title =
                "Manila Café | Filippinska desserter i Göteborg"


            const descriptionTag =
                document.querySelector(
                    'meta[name="description"]'
                )


            descriptionTag?.setAttribute(
                "content",
                "Beställ filippinska desserter i Göteborg från Manila Café. Upptäck Mango Float, Ube Cake, Fruit Cup och andra filippinska favoriter."
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
                "Manila Café | Filippinska desserter i Göteborg"
            )


            const ogDescription =
                document.querySelector(
                    'meta[property="og:description"]'
                )


            ogDescription?.setAttribute(
                "content",
                "Upptäck filippinska desserter i Göteborg från Manila Café."
            )


            const ogUrl =
                document.querySelector(
                    'meta[property="og:url"]'
                )


            ogUrl?.setAttribute(
                "content",
                "https://www.manilacafe.se/"
            )

        }

    }, [
        product,
        seo,
        slug,
        imageUrl
    ])


    // ==================================================
    // PRODUCT STRUCTURED DATA
    // ==================================================

    useEffect(() => {

        if (!product) {
            return
        }


        const productUrl =
            `https://www.manilacafe.se/dessert/${slug}`


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


        // Only add image when one exists

        if (imageUrl) {

            structuredData.image = [
                imageUrl
            ]

        }


        // Remove old product schema

        const existingScript =
            document.getElementById(
                "product-structured-data"
            )


        if (existingScript) {

            existingScript.remove()

        }


        // Create new product schema

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


        // Remove when leaving page

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
        slug,
        imageUrl
    ])


    // ==================================================
    // LOADING
    // ==================================================

    if (!food_list.length) {

        return (

            <main className="product-page">

                <div className="product-page-state">

                    <p>
                        Laddar dessert...
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
                        Desserten hittades inte
                    </h1>


                    <p>
                        Produkten du letar efter verkar
                        inte finnas just nu.
                    </p>


                    <Link
                        to="/"
                        className="product-page-back-button"
                    >
                        Se våra desserter
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
                    Desserter
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
                        alt={`${product.name} – dessert från Manila Café i Göteborg`}
                        className="product-page-image"
                    />

                </div>


                {/* CONTENT */}

                <div className="product-page-content">


                    <span className="product-page-eyebrow">

                        {
                            seo?.eyebrow ||
                            "MANILA CAFÉ • GÖTEBORG"
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

                                {
                                    product.description
                                }

                            </p>

                        )
                    }


                    {/* PRICE */}

                    <div className="product-page-price">

                        {product.price} kr

                    </div>


                    {/* ================================== */}
                    {/* CART */}
                    {/* ================================== */}

                    {
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
                    }


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
                    FILIPINO DESSERTS
                </span>


                <h2>
                    Upptäck fler filippinska desserter
                    i Göteborg
                </h2>


                <p>
                    Upptäck Manila Cafés filippinska
                    desserter och tropiska sötsaker.
                    Från mango och ube till kokos,
                    frukt och klassiska Filipino-smaker
                    finns det alltid något nytt att testa.
                </p>


                <Link
                    to="/#food-display"
                    className="product-page-more-link"
                >
                    Se alla desserter →
                </Link>


            </section>


        </main>

    )

}


export default ProductPage