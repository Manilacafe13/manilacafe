import React, { useContext, useState } from 'react'
import './FoodItem.css'

import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import { Link } from 'react-router-dom'


const createSlug = (name = "") =>
    String(name)
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

const FoodItem = ({
    id,
    name,
    price,
    description,
    image,
    category
}) => {

    const {
        cartItems = {},
        addToCart,
        removeFromCart,
        url
    } = useContext(StoreContext)

    const [showAllergens, setShowAllergens] = useState(false)


    // ======================================================
    // INGREDIENTS & ALLERGENS
    // ======================================================

    const productInformation = {

        "mango float": {
            ingredients:
                "Mango, kondenserad mjölk, grädde, Graham crackers och Philadelphia.",
            allergens:
                "Innehåller MJÖLK (mjölkprotein och laktos) och VETE (gluten).",
            extra:
                "Innehåller mango."
        },

        "cinnamon banana float": {
            ingredients:
                "Banan, kondenserad mjölk, grädde, Graham crackers, Philadelphia och kanel.",
            allergens:
                "Innehåller MJÖLK (mjölkprotein och laktos) och VETE (gluten).",
            extra:
                "Innehåller banan och kanel."
        },

        "banana float": {
            ingredients:
                "Banan, kondenserad mjölk, grädde, Graham crackers, Philadelphia och kanel.",
            allergens:
                "Innehåller MJÖLK (mjölkprotein och laktos) och VETE (gluten).",
            extra:
                "Innehåller banan och kanel."
        },

        "fruit cup": {
            ingredients:
                "Eden cheese, Fiesta fruit cocktail, nata de coco, kokoskött, kokosgelé och kondenserad mjölk.",
            allergens:
                "Innehåller MJÖLK (mjölkprotein och laktos).",
            extra:
                "Innehåller blandad frukt och kokos. Kokosgelén innehåller inte gelatin från gris."
        },

        "ube cake": {
            ingredients:
                "Gräddfil, strösocker, kokosflingor, Graham crackers, kokosgrädde, ube jam, Philadelphia, smör och salt.",
            allergens:
                "Innehåller MJÖLK (mjölkprotein och laktos) och VETE (gluten).",
            extra:
                "Innehåller kokos."
        },

        "taho": {
            ingredients:
                "Silkestofu, söt sirap och sagopärlor.",
            allergens:
                "Kontrollera aktuell produktinformation vid beställning.",
            extra:
                "Klassisk filippinsk dessert med silkeslen tofu och sagopärlor."
        }

    }


    // ======================================================
    // NORMALIZE PRODUCT NAME
    // ======================================================

    const normalizedName =
        String(name || "")
            .trim()
            .toLowerCase()


    const productInfo =
        productInformation[normalizedName]


    // ======================================================
    // PRODUCT IMAGE URL
    // ======================================================

    const getImageUrl = () => {

        const imageValue =
            String(image || "").trim()


        if (!imageValue) {
            return assets.upload_area || ""
        }


        if (
            imageValue.startsWith("https://") ||
            imageValue.startsWith("http://")
        ) {
            return imageValue
        }


        if (imageValue.startsWith("//")) {
            return `https:${imageValue}`
        }


        return `${url}/images/${imageValue}`
    }


    const imageUrl = getImageUrl()

    const quantity = cartItems[id] || 0


    // ======================================================
    // JSX
    // ======================================================

    return (

        <article
            className="food-item"
            aria-labelledby={`food-title-${id}`}
        >

            {/* =================================================
                PRODUCT IMAGE
            ================================================= */}

            <div className="food-item-img-container">

                <img
                    className="food-item-image"
                    src={imageUrl}
                    alt={`${name} – filippinsk dessert från Manila Café`}
                    loading="lazy"
                    decoding="async"
                />


                {/* ADD TO CART */}

                {quantity === 0 ? (

                    <button
                        type="button"
                        className="food-item-add-button"
                        onClick={() => addToCart(id)}
                        aria-label={`Lägg till ${name} i varukorgen`}
                    >

                        <img
                            src={assets.add_icon_white}
                            alt=""
                            aria-hidden="true"
                        />

                    </button>

                ) : (

                    <div
                        className="food-item-counter"
                        aria-label={`${quantity} ${name} i varukorgen`}
                    >

                        <button
                            type="button"
                            className="food-item-counter-button"
                            onClick={() => removeFromCart(id)}
                            aria-label={`Minska antal ${name}`}
                        >

                            <img
                                src={assets.remove_icon_red}
                                alt=""
                                aria-hidden="true"
                            />

                        </button>


                        <span
                            className="food-item-quantity"
                            aria-live="polite"
                        >
                            {quantity}
                        </span>


                        <button
                            type="button"
                            className="food-item-counter-button"
                            onClick={() => addToCart(id)}
                            aria-label={`Lägg till en ${name}`}
                        >

                            <img
                                src={assets.add_icon_green}
                                alt=""
                                aria-hidden="true"
                            />

                        </button>

                    </div>

                )}

            </div>


            {/* =================================================
                PRODUCT INFORMATION
            ================================================= */}

            <div className="food-item-info">


                {/* CATEGORY */}

                {category && (

                    <span className="food-item-category">
                        {category}
                    </span>

                )}


                {/* =================================================
    PRODUCT NAME
================================================= */}

                <div className="food-item-name-rating">

                    <h3 id={`food-title-${id}`}>
                        <Link
                            to={`/dessert/${createSlug(name)}`}
                            className="food-item-product-link"
                            aria-label={`Läs mer om ${name}`}
                        >
                            {name}
                        </Link>
                    </h3>

                </div>


                {/* DESCRIPTION */}

                <p className="food-item-desc">
                    {description}
                </p>


                {/* INGREDIENTS & ALLERGENS */}

                {productInfo && (

                    <div className="food-item-allergen-section">

                        <button
                            type="button"
                            className="food-item-allergen-button"
                            onClick={() =>
                                setShowAllergens(prev => !prev)
                            }
                            aria-expanded={showAllergens}
                            aria-controls={`allergens-${id}`}
                        >

                            <span>
                                Ingredienser & allergener
                            </span>

                            <span
                                className="food-item-allergen-icon"
                                aria-hidden="true"
                            >
                                {showAllergens ? "−" : "+"}
                            </span>

                        </button>


                        {showAllergens && (

                            <div
                                className="food-item-allergen-content"
                                id={`allergens-${id}`}
                            >

                                <p>
                                    <strong>Ingredienser:</strong>{" "}
                                    {productInfo.ingredients}
                                </p>

                                <p>
                                    <strong>Allergener:</strong>{" "}
                                    {productInfo.allergens}
                                </p>

                                <p>
                                    <strong>Övrig information:</strong>{" "}
                                    {productInfo.extra}
                                </p>

                            </div>

                        )}

                    </div>

                )}


                {/* BOTTOM */}

                <div className="food-item-bottom">

                    <p
                        className="food-item-price"
                        aria-label={`Pris ${price} kronor`}
                    >
                        {price} kr
                    </p>


                    {quantity > 0 && (

                        <span className="food-item-in-cart">
                            {quantity} i varukorgen
                        </span>

                    )}

                </div>

            </div>

        </article>

    )
}


export default FoodItem