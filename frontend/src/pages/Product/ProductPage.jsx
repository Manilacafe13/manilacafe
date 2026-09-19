import React, { useContext, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import './ProductPage.css'

import { StoreContext } from '../../context/StoreContext'
import { assets } from '../../assets/assets'


const createSlug = (name = "") =>
    String(name)
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")


const productSeoInformation = {
    "mango-float": {
        title: "Mango Float i Göteborg | Manila Café",
        description:
            "Beställ Mango Float i Göteborg från Manila Café. En krämig filippinsk dessert med mango, grädde och Graham crackers för avhämtning eller leverans.",
        heading: "Mango Float i Göteborg",
        eyebrow: "FILIPPINSK MANGODESSERT",
        intro:
            "Upptäck Mango Float – en kall och krämig filippinsk dessert med tropisk mango, krämig fyllning och Graham crackers."
    },

    "ube-cake": {
        title: "Ube Cake i Göteborg | Manila Café",
        description:
            "Upptäck Ube Cake i Göteborg hos Manila Café. Filippinsk dessert med ube och tropiska smaker för avhämtning eller leverans.",
        heading: "Ube Cake i Göteborg",
        eyebrow: "FILIPPINSK UBE-DESSERT",
        intro:
            "Upptäck den lila favoriten ube. Vår Ube Cake kombinerar den karakteristiska smaken av ube med en krämig och söt dessertupplevelse."
    },

    "fruit-cup": {
        title: "Fruit Cup i Göteborg | Manila Café",
        description:
            "Beställ Fruit Cup i Göteborg från Manila Café. En kall och krämig fruktdessert inspirerad av filippinsk fruit salad.",
        heading: "Filipino Fruit Cup i Göteborg",
        eyebrow: "FILIPPINSK FRUKTDESSERT",
        intro:
            "Vår Fruit Cup är inspirerad av filippinsk fruit salad och kombinerar tropisk frukt med söta och krämiga smaker."
    },

    "taho": {
        title: "Taho i Göteborg | Manila Café",
        description:
            "Upptäck Taho i Göteborg hos Manila Café. En klassisk filippinsk favorit med silkeslen tofu, söt sirap och sagopärlor.",
        heading: "Taho i Göteborg",
        eyebrow: "KLASSISK FILIPPINSK FAVORIT",
        intro:
            "Taho är en klassisk filippinsk favorit med silkeslen tofu, söt sirap och sagopärlor."
    },

    "banana-float": {
        title: "Banana Float i Göteborg | Manila Café",
        description:
            "Beställ Banana Float i Göteborg från Manila Café. En krämig dessert med banan och Graham crackers.",
        heading: "Banana Float i Göteborg",
        eyebrow: "KRÄMIG BANANDESSERT",
        intro:
            "Banana Float kombinerar banan med krämiga lager och Graham crackers till en kall och söt dessert."
    },

    "cinnamon-banana-float": {
        title: "Cinnamon Banana Float i Göteborg | Manila Café",
        description:
            "Beställ Cinnamon Banana Float i Göteborg från Manila Café. Krämig banandessert med Graham crackers och kanel.",
        heading: "Cinnamon Banana Float i Göteborg",
        eyebrow: "BANAN • KANEL • CREAMY",
        intro:
            "En krämig Banana Float med banan, Graham crackers och kanel."
    }
}


const ProductPage = () => {

    const { slug } = useParams()

    const {
        food_list = [],
        cartItems = {},
        addToCart,
        removeFromCart,
        url
    } = useContext(StoreContext)


    const product = food_list.find(
        item => createSlug(item.name) === slug
    )

    const seo = productSeoInformation[slug]


    /* =========================
       SEO
    ========================= */

    useEffect(() => {

        if (!product) return

        const pageTitle =
            seo?.title ||
            `${product.name} i Göteborg | Manila Café`

        const pageDescription =
            seo?.description ||
            `${product.name} från Manila Café. Upptäck filippinska desserter i Göteborg och beställ online.`


        document.title = pageTitle


        let descriptionTag =
            document.querySelector('meta[name="description"]')

        if (!descriptionTag) {
            descriptionTag = document.createElement("meta")
            descriptionTag.setAttribute("name", "description")
            document.head.appendChild(descriptionTag)
        }

        descriptionTag.setAttribute(
            "content",
            pageDescription
        )


        let canonical =
            document.querySelector('link[rel="canonical"]')

        if (!canonical) {
            canonical = document.createElement("link")
            canonical.setAttribute("rel", "canonical")
            document.head.appendChild(canonical)
        }

        canonical.setAttribute(
            "href",
            `https://www.manilacafe.se/dessert/${slug}`
        )


        return () => {

            document.title =
                "Manila Café | Filippinska desserter i Göteborg"

            descriptionTag?.setAttribute(
                "content",
                "Beställ filippinska desserter i Göteborg från Manila Café. Upptäck Mango Float, Ube Cake, Fruit Cup och andra filippinska favoriter."
            )

            canonical?.setAttribute(
                "href",
                "https://www.manilacafe.se/"
            )
        }

    }, [product, seo, slug])


    /* =========================
       LOADING
    ========================= */

    if (!food_list.length) {
        return (
            <main className="product-page">
                <div className="product-page-state">
                    <p>Laddar dessert...</p>
                </div>
            </main>
        )
    }


    /* =========================
       NOT FOUND
    ========================= */

    if (!product) {
        return (
            <main className="product-page">

                <div className="product-page-state">

                    <span>MANILA CAFÉ</span>

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


    /* =========================
       IMAGE
    ========================= */

    const imageValue =
        String(product.image || "").trim()

    let imageUrl = assets.upload_area || ""

    if (
        imageValue.startsWith("https://") ||
        imageValue.startsWith("http://")
    ) {
        imageUrl = imageValue
    }

    else if (imageValue.startsWith("//")) {
        imageUrl = `https:${imageValue}`
    }

    else if (imageValue) {
        imageUrl = `${url}/images/${imageValue}`
    }


    const quantity =
        cartItems[product._id] || 0


    return (

        <main className="product-page">

            {/* BREADCRUMB */}

            <nav
                className="product-breadcrumb"
                aria-label="Brödsmulor"
            >

                <Link to="/">
                    Manila Café
                </Link>

                <span aria-hidden="true">/</span>

                <Link to="/#food-display">
                    Desserter
                </Link>

                <span aria-hidden="true">/</span>

                <span>
                    {product.name}
                </span>

            </nav>


            {/* PRODUCT */}

            <section className="product-page-hero">

                <div className="product-page-image-wrapper">

                    <img
                        src={imageUrl}
                        alt={`${product.name} – dessert från Manila Café i Göteborg`}
                        className="product-page-image"
                    />

                </div>


                <div className="product-page-content">

                    <span className="product-page-eyebrow">
                        {seo?.eyebrow ||
                            "MANILA CAFÉ • GÖTEBORG"}
                    </span>


                    <h1>
                        {seo?.heading ||
                            `${product.name} i Göteborg`}
                    </h1>


                    <p className="product-page-intro">
                        {seo?.intro ||
                            product.description}
                    </p>


                    {product.description &&
                        product.description !== seo?.intro && (

                            <p className="product-page-description">
                                {product.description}
                            </p>

                        )}


                    <div className="product-page-price">
                        {product.price} kr
                    </div>


                    {/* CART */}

                    {quantity === 0 ? (

                        <button
                            type="button"
                            className="product-page-cart-button"
                            onClick={() =>
                                addToCart(product._id)
                            }
                        >
                            Lägg i varukorgen
                        </button>

                    ) : (

                        <div className="product-page-cart-area">

                            <div className="product-page-counter">

                                <button
                                    type="button"
                                    onClick={() =>
                                        removeFromCart(product._id)
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
                                        addToCart(product._id)
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

                    )}


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


            {/* SEO / DISCOVERY */}

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
                    to="/"
                    className="product-page-more-link"
                >
                    Se alla desserter →
                </Link>

            </section>

        </main>

    )
}


export default ProductPage