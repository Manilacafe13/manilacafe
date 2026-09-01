import React, { useContext } from 'react'
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


    // ======================================================
    // PRODUCT IMAGE URL
    // ======================================================

    const getImageUrl = () => {

        const imageValue =
            String(image || "").trim()


        // No image
        if (!imageValue) {

            return assets.upload_area || ""

        }


        // Cloudinary / external image
        if (
            imageValue.startsWith("https://") ||
            imageValue.startsWith("http://")
        ) {

            return imageValue

        }


        // Protocol-relative external URL
        if (
            imageValue.startsWith("//")
        ) {

            return `https:${imageValue}`

        }


        // Old local backend image
        return `${url}/images/${imageValue}`

    }


    const imageUrl =
        getImageUrl()


    // ======================================================
    // JSX
    // ======================================================

    return (

        <div className="food-item">


            {/* ============================================== */}
            {/* PRODUCT IMAGE */}
            {/* ============================================== */}

            <div className="food-item-img-container">

                <img
                    className="food-item-image"
                    src={imageUrl}
                    alt={name || "Produkt"}
                    loading="lazy"
                />


                {/* ========================================== */}
                {/* ADD TO CART */}
                {/* ========================================== */}

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


                        {/* REMOVE */}

                        <img
                            onClick={() =>
                                removeFromCart(id)
                            }
                            src={assets.remove_icon_red}
                            alt="Ta bort"
                        />


                        {/* QUANTITY */}

                        <p>
                            {cartItems[id]}
                        </p>


                        {/* ADD */}

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


            {/* ============================================== */}
            {/* PRODUCT INFO */}
            {/* ============================================== */}

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


                <p className="food-item-price">
                    {price}kr
                </p>


            </div>

        </div>

    )
}


export default FoodItem