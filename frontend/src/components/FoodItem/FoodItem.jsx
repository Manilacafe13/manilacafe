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


// ======================================================
// PORTIONSINFORMATION
// Visar vad kunden får vid beställning, utan att anta
// okända vikter, volymer eller antal tillbehör.
// ======================================================


const portionInformation = {

    // ==========================================
    // MATRÄTTER
    // ==========================================

    "siningang med räkor": {
        quantity: "5 stora räkor",
        contents:
            "Fem stora räkor i en syrlig filippinsk sinigang-buljong med grönsaker. Serveras med ris.",
        serving:
            "Rätten kan levereras kyld för att bevara kvaliteten. Värm tills maten är ordentligt genomvarm före servering."
    },

    "sinigang med räkor": {
        quantity: "5 stora räkor",
        contents:
            "Fem stora räkor i en syrlig filippinsk sinigang-buljong med grönsaker. Serveras med ris.",
        serving:
            "Värm tills maten är ordentligt genomvarm före servering."
    },

    "chicken adobo": {
        quantity: "4 kycklingklubbor",
        contents:
            "Fyra kycklingklubbor tillagade i vår klassiska adobosås med soja, vinäger och vitlök. Serveras med ris.",
        serving:
            "Värm kycklingen, såsen och riset ordentligt före servering tills allt är genomvarmt."
    },

    "pancit": {
    quantity: "5 medelstora räkor",
    contents:
        "Filippinska wokade nudlar med fem medelstora räkor, färska grönsaker och en smakrik sojabaserad sås.",
    serving:
        "Värm tills maten är ordentligt genomvarm före servering."
},

    // ==========================================
    // DESSERTER
    // ==========================================

    "mango float": {
        contents:
            "En portion Mango Float med färsk mango, krämig fyllning och lager av grahamskex.",
        serving:
            "Serveras väl kyld. Förvara i kylskåp fram till servering."
    },

    "apple crisp float": {
        contents:
            "En portion Apple Crisp Float med karamelliserade äpplen, kanel och krämiga lager.",
        serving:
            "Serveras kyld. För bästa smak och konsistens rekommenderar vi att desserten förvaras i kylskåp fram till servering."
    },

    "ube cake": {
        contents:
            "En portion Ube Cake med krämiga lager av ube och kokos.",
        serving:
            "Serveras kyld och bör förvaras i kylskåp fram till servering."
    },

    "fruit cup": {
        contents:
            "En bägare Fruit Cup med fruktblandning, kokos, ost och kondenserad mjölk.",
        serving:
            "Serveras väl kyld. Förvara i kylskåp fram till servering."
    },

    "golden turon & ube ice cream": {
        quantity: "3 turonrullar med ube-glass",
        contents:
            "Tre krispiga turonrullar fyllda med banan, serverade med skopor av ube-glass.",
        serving:
            "Värm gärna turon separat om den har svalnat under leveransen. Vi gör vårt bästa för att glassen ska behålla sin konsistens, men viss smältning kan förekomma under transporten."
    },

    "biscoff cinnamon banana float": {
        contents:
            "En portion Banana Float med banan, Biscoff-kex, kanel och krämig fyllning.",
        serving:
            "Serveras kyld. Förvara i kylskåp fram till servering."
    },

    // ==========================================
    // TAHO
    // ==========================================

    "taho": {
        contents:
            "En portion klassisk Taho med silkeslen tofu, sagopärlor och söt sirap."
    },

    "strawberry taho": {
        contents:
            "En portion Strawberry Taho med silkeslen tofu, sagopärlor och söt jordgubbssirap."
    },

    "apple taho": {
        contents:
            "En portion Apple Taho med silkeslen tofu, sagopärlor och söt äppelsirap."
    },

    // ==========================================
    // HALO-HALO & MANGO SAGO
    // ==========================================

    "halo-halo": {
        contents:
            "En portion Halo-halo med krossad is, sötad mjölk, filippinska tillbehör och ube-glass.",
        serving:
            "Blanda ingredienserna ordentligt före servering. Vi gör vårt bästa för att bevara dessertens temperatur och konsistens under leveransen, men viss smältning av is och glass kan förekomma."
    },

    "mango sago": {
        contents:
            "En portion Mango Sago med färsk mango, sagopärlor och en krämig mjölk- och kokosblandning.",
        serving:
            "Serveras väl kyld. Förvara i kylskåp fram till servering."
    },

    // ==========================================
    // BRÖD
    // ==========================================

    "pandesal": {
        quantity: "3 stycken",
        contents:
            "Tre klassiska filippinska pandesal med mjuk insida och lätt gyllene yta.",
        serving:
            "Bröden kan ha svalnat under leveransen. Värm gärna lätt före servering för en mjukare och nybakad känsla."
    },

    "ube pandesal med ost": {
        quantity: "4 stycken",
        contents:
            "Fyra mjuka Ube Pandesal med krämig ostfyllning.",
        serving:
            "Bröden kan ha svalnat under leveransen. Värm gärna i mikrovågsugn i cirka 20 sekunder före servering.",
        preparation:
            "Eftersom bröden tillagas färska kan tillagningen ta några timmar beroende på efterfrågan."
    },

    "ube pandesal": {
        quantity: "4 stycken",
        contents:
            "Fyra mjuka Ube Pandesal med krämig ostfyllning.",
        serving:
            "Bröden kan ha svalnat under leveransen. Värm gärna i mikrovågsugn i cirka 20 sekunder före servering.",
        preparation:
            "Eftersom bröden tillagas färska kan tillagningen ta några timmar beroende på efterfrågan."
    },

    // ==========================================
    // DRYCKER
    // ==========================================

    "ube caramel latte": {
        contents:
            "En kall Ube Caramel Latte med espresso, ube, mjölk, karamell och is.",
        serving:
            "Serveras kall. Vi gör vårt bästa för att drycken ska behålla sin temperatur under leveransen, men isen kan delvis smälta under transporten."
    }

}


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
    const [showPortionInfo, setShowPortionInfo] = useState(false)


    // ======================================================
    // PRODUCT TYPE
    // ======================================================

    const isMeal = category === "Maträtter"

    const productType = isMeal
        ? "filippinsk maträtt"
        : "filippinsk dessert"


    // ======================================================
    // INGREDIENTS & ALLERGENS
    // ======================================================

    const productInformation = {

    "siningang med räkor": {
        ingredients:
            "Räkor, syrlig sinigang-buljong, grönsaker och ris.",
        allergens:
            "Innehåller KRÄFTDJUR (räkor). Kontrollera även aktuell produktinformation för sinigang-mix och buljong.",
        extra:
            "Serveras med ris."
    },

    "sinigang med räkor": {
        ingredients:
            "Räkor, syrlig sinigang-buljong, grönsaker och ris.",
        allergens:
            "Innehåller KRÄFTDJUR (räkor). Kontrollera även aktuell produktinformation för sinigang-mix och buljong.",
        extra:
            "Serveras med ris."
    },

    "mango float": {
        ingredients:
            "Mango, kondenserad mjölk, grädde, Graham crackers och Philadelphia.",
        allergens:
            "Innehåller MJÖLK (mjölkprotein och laktos) och VETE (gluten). ",
        extra:
            "Innehåller mango."
    },

    "apple crisp float": {
        ingredients:
            "Äpple, kondenserad mjölk, grädde, Philadelphia, kex, kanel och karamelliserat äpple.",
        allergens:
            "Innehåller MJÖLK (mjölkprotein och laktosfri) och VETE (gluten).",
        extra:
            "Innehåller äpple och kanel."
    },

    "ube cake": {
        ingredients:
            "Gräddfil, strösocker, kokosflingor, Graham crackers, kokosgrädde, ube jam, Philadelphia, smör och salt.",
        allergens:
            "Innehåller MJÖLK (mjölkprotein och laktosfri) och VETE (gluten).",
        extra:
            "Innehåller kokos."
    },

    "fruit cup": {
        ingredients:
            "Eden cheese, Fiesta fruit cocktail, nata de coco, kokoskött, kokosgelé och kondenserad mjölk.",
        allergens:
            "Innehåller MJÖLK (mjölkprotein och laktos).",
        extra:
            "Innehåller blandad frukt och kokos. Kokosgelén innehåller inte gelatin från gris."
    },

    "golden turon & ube ice cream": {
        ingredients:
            "Banan, vårrulleark, socker och ube-glass.",
        allergens:
            "Innehåller VETE (gluten) och MJÖLK. Kontrollera aktuell produktinformation för ube-glass och vårrulleark.",
        extra:
            "Krispig filippinsk turon serverad med ube-glass."
    },

    "biscoff cinnamon banana float": {
        ingredients:
            "Banan, kondenserad mjölk, grädde, Philadelphia, Biscoff-kex och kanel.",
        allergens:
            "Innehåller MJÖLK (mjölkprotein och laktosfri) och VETE (gluten).",
        extra:
            "Innehåller banan och kanel."
    },


    "taho": {
        ingredients:
            "Silkestofu, söt sirap och sagopärlor.",
        allergens:
            "Innehåller SOJA.",
        extra:
            "Klassisk filippinsk dessert med silkeslen tofu och sagopärlor."
    },
    "strawberry taho": {
    ingredients:
        "Silkestofu, jordgubbssirap och sagopärlor.",

    allergens:
        "Innehåller SOJA.",

    extra:
        "En fruktig twist på den filippinska klassikern med silkeslen tofu, söt jordgubbssirap och mjuka sagopärlor."
},

"apple taho": {
    ingredients:
        "Silkestofu, äppelsirap och sagopärlor.",

    allergens:
        "Innehåller SOJA.",

    extra:
        "En frisk och fruktig variant av klassisk Taho med silkeslen tofu, söt äppelsirap och mjuka sagopärlor."
},
   "halo-halo": {
    ingredients:
        "Krossad is, sötad mjölk, nötgelé, sötade bönor, nata de coco, majs, jordgubbar och ube-glass.",

    allergens:
        "Innehåller MJÖLK. Kontrollera övriga ingredienser för eventuella ytterligare allergener.",

    extra:
        "En färgstark filippinsk klassiker med tropiska smaker, krämig mjölk, söta jordgubbar och majs, toppad med ube-glass. Blandas ihop innan den avnjuts."
},

"chicken adobo": {
    ingredients:
        "Kyckling, soja, vinäger, vitlök, lagerblad, svartpeppar och ris.",

    allergens:
        "Innehåller SOJA och kan innehålla VETE (gluten), beroende på vilken soja som används.",

    extra:
        "En klassisk filippinsk rätt med mör kyckling som tillagas i en smakrik sås av soja, vinäger och vitlök. En perfekt balans mellan sälta och syra, serverad med ris."
},

"ube pandesal": {
    ingredients:
        "Vetemjöl, mjölk, jäst, socker, smör, ägg, salt och ströbröd.",

    allergens:
        "Innehåller VETE (gluten), MJÖLK (laktos) och ÄGG.",

    extra:
        "Ett klassiskt filippinskt bröd med en mjuk och luftig insida och en lätt gyllene yta täckt av fina brödsmulor. Perfekt till frukost, som mellanmål eller tillsammans med en kopp kaffe."
},

"mango sago": {
    ingredients:
        "Färsk mango, sagopärlor (tapioka), kokosmjölk och sötad kondenserad mjölk.",

    allergens:
        "Innehåller MJÖLK. Kontrollera även övriga ingredienser för eventuella allergener.",

    extra:
        "En tropisk filippinsk dessert med söt, saftig mango och mjuka sagopärlor i en len och krämig mangoblandning. En perfekt balans mellan fruktig sötma och krämighet, serverad kall för en härligt uppfriskande smakupplevelse."
},

"pancit": {
    ingredients:
        "Nudlar, räkor, färska grönsaker, vitlök, lök och en smakrik filippinsk sås baserad på soja och kryddor.",

    allergens:
        "Innehåller SKALDJUR, SOJA och VETE. Kontrollera även övriga ingredienser för eventuella allergener.",

    extra:
        "Pancit är en älskad filippinsk nudelrätt som ofta serveras vid familjesammankomster och festliga tillfällen. Våra nudlar wokas tillsammans med saftiga räkor, krispiga grönsaker och en fyllig, smakrik sås. En härlig kombination av traditionella filippinska smaker som ger en autentisk smakupplevelse i varje tugga."
},

    
    // ==================================================
    // COFFEE
    // ==================================================

    "ube caramel latte": {
        ingredients:
            "Espresso, laktosfri mjölk, ube, karamellsås och is.",

        allergens:
            "Innehåller MJÖLK (mjölkprotein). Kontrollera även ubeproduktens och karamellsåsens allergener.",

        extra:
            "En kall kaffedryck med ube och karamell."
    },




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

    const portionInfo =
        portionInformation[normalizedName]


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

    const productPath =
        category === "Maträtter"
            ? `/matratt/${createSlug(name)}`
            : `/dessert/${createSlug(name)}`

    // ======================================================
    // JSX
    // ======================================================

    return (

        <article
            className="food-item"
            aria-labelledby={`food-title-${id}`}
        >

            {/* PRODUCT IMAGE */}

            <div className="food-item-img-container">

                <img
                    className="food-item-image"
                    src={imageUrl}
                    alt={`${name} – ${productType} från Manila Café`}
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


            {/* PRODUCT INFORMATION */}

            <div className="food-item-info">


                {/* CATEGORY */}

                {category && (

                    <span className="food-item-category">
                        {category}
                    </span>

                )}


                {/* PRODUCT NAME */}

                <div className="food-item-name-rating">

                    <h3 id={`food-title-${id}`}>

                        <Link
                            to={productPath}
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


                {/* PORTIONSINFORMATION */}

                {portionInfo && (

                    <div className="food-item-allergen-section">

                        <button
                            type="button"
                            className="food-item-allergen-button"
                            onClick={() =>
                                setShowPortionInfo(prev => !prev)
                            }
                            aria-expanded={showPortionInfo}
                            aria-controls={`portion-${id}`}
                        >
                            <span>Portionsinformation</span>

                            <span
                                className="food-item-allergen-icon"
                                aria-hidden="true"
                            >
                                {showPortionInfo ? "−" : "+"}
                            </span>
                        </button>

                        {showPortionInfo && (
                            <div
                                className="food-item-allergen-content"
                                id={`portion-${id}`}
                            >
                                {portionInfo.quantity && (
                                    <p>
                                        <strong>Antal:</strong>{" "}
                                        {portionInfo.quantity}
                                    </p>
                                )}

                                <p>
                                    <strong>Portionsinnehåll:</strong>{" "}
                                    {portionInfo.contents}
                                </p>

                                {portionInfo.serving && (
                                    <p>
                                        <strong>Servering:</strong>{" "}
                                        {portionInfo.serving}
                                    </p>
                                )}

                                {portionInfo.preparation && (
                                    <p>
                                        <strong>Tillagningstid:</strong>{" "}
                                        {portionInfo.preparation}
                                    </p>
                                )}
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