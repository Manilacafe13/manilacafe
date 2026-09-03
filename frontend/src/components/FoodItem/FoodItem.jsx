import React, { useContext, useState } from 'react'
import './FoodItem.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'


const FoodItem = ({
    id,
    name,
    price,
    description,
    image
}) => {

    const {
        cartItems = {},
        addToCart,
        removeFromCart,
        url
    } = useContext(StoreContext)

    const [showAllergens, setShowAllergens] =
        useState(false)


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

        "banana float": {
            ingredients:
                "Banan, kondenserad mjölk, grädde, Graham crackers, Philadelphia och kanel.",
            allergens:
                "Innehåller MJÖLK (mjölkprotein och laktos) och VETE (gluten).",
            extra:
                "Innehåller banan och kanel."
        },

        "fruit salad": {
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
        }

    }


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


        if (
            imageValue.startsWith("//")
        ) {

            return `https:${imageValue}`

        }


        return `${url}/images/${imageValue}`

    }


    const imageUrl =
        getImageUrl()


    // ======================================================
    // JSX
    // ======================================================

    return (

        <div className="food-item">


            {/* PRODUCT IMAGE */}

            <div className="food-item-img-container">

                <img
                    className="food-item-image"
                    src={imageUrl}
                    alt={name || "Produkt"}
                    loading="lazy"
                />


                {!cartItems[id] ? (

                    <img
                        className="add"
                        onClick={() =>
                            addToCart(id)
                        }
                        src={assets.add_icon_white}
                        alt="Lägg till"
                    />

                ) : (

                    <div className="food-item-counter">

                        <img
                            onClick={() =>
                                removeFromCart(id)
                            }
                            src={assets.remove_icon_red}
                            alt="Ta bort"
                        />


                        <p>
                            {cartItems[id]}
                        </p>


                        <img
                            onClick={() =>
                                addToCart(id)
                            }
                            src={assets.add_icon_green}
                            alt="Lägg till"
                        />

                    </div>

                )}

            </div>


            {/* PRODUCT INFO */}

            <div className="food-item-info">

                <div className="food-item-name-rating">

                    <p>
                        {name}
                    </p>

                    <img
                        src={assets.rating_starts}
                        alt="Betyg"
                    />

                </div>


                <p className="food-item-desc">
                    {description}
                </p>


                {productInfo && (

                    <div className="food-item-allergen-section">

                        <button
                            type="button"
                            className="food-item-allergen-button"
                            onClick={() =>
                                setShowAllergens(
                                    (prev) => !prev
                                )
                            }
                            aria-expanded={showAllergens}
                        >
                            Ingredienser & allergener

                            <span>
                                {showAllergens ? "−" : "+"}
                            </span>
                        </button>


                        {showAllergens && (

                            <div className="food-item-allergen-content">

                                <p>
                                    <strong>
                                        Ingredienser:
                                    </strong>{" "}
                                    {productInfo.ingredients}
                                </p>


                                <p>
                                    <strong>
                                        Allergener:
                                    </strong>{" "}
                                    {productInfo.allergens}
                                </p>


                                <p>
                                    <strong>
                                        Övrig information:
                                    </strong>{" "}
                                    {productInfo.extra}
                                </p>

                            </div>

                        )}

                    </div>

                )}


                <p className="food-item-price">
                    {price}kr
                </p>

            </div>

        </div>

    )
}


export default FoodItem