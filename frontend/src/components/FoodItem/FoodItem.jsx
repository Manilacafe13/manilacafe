import React, { useContext, useState } from 'react'
import './FoodItem.css'
import './FoodItemCustomizations.css'

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
    category,
    customizations: cardCustomizations
}) => {

    const {
        cartItems = {},
        addToCart,
        removeFromCart,
        food_list = [],
        // Delas med ProductPage. Uteblir när betalsystemet inte är klar för kundval.
        addToCartCustomized,
        customizationCheckoutReady = false,
        url
    } = useContext(StoreContext)

    const [showAllergens, setShowAllergens] = useState(false)
    const [showPortionInfo, setShowPortionInfo] = useState(false)
    const [showCustomerChoices, setShowCustomerChoices] = useState(false)
    const [removedIngredientIds, setRemovedIngredientIds] = useState([])
    const [extraQuantities, setExtraQuantities] = useState({})
    const [addingCustomized, setAddingCustomized] = useState(false)
    const [customizationMessage, setCustomizationMessage] = useState('')


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


    // ======================================================
    // KUNDVAL PÅ PRODUKTKORT
    // Hämta alltid alternativ från samma offentliga produktdata
    // som ProductPage och från StoreContext (inte hårdkodade namn).
    // ======================================================

    const product = food_list.find(item =>
        [item._id, item.id, item.itemId].some(value =>
            value != null && String(value) === String(id)
        )
    ) || food_list.find(item =>
        String(item.name || '').trim().toLocaleLowerCase('sv-SE') ===
            String(name || '').trim().toLocaleLowerCase('sv-SE') &&
        String(item.category || '') === String(category || '')
    )
    const customizationSettings = product?.customizations ?? cardCustomizations ?? {}

    const removableIngredients = Array.isArray(customizationSettings.removableIngredients)
        ? customizationSettings.removableIngredients.filter(option =>
            option && option._id && option.available !== false && String(option.name || '').trim()
        )
        : []

    const extras = Array.isArray(customizationSettings.extras)
        ? customizationSettings.extras.filter(option =>
            option && option._id && option.available !== false &&
            String(option.name || '').trim() &&
            Number.isFinite(Number(option.price)) && Number(option.price) >= 0
        )
        : []

    const hasCustomerChoices = customizationSettings.enabled === true &&
        (removableIngredients.length > 0 || extras.length > 0)

    // Filtrera bort ändrade/inaktiverade alternativ innan de skickas.
    const selectedRemovedIds = hasCustomerChoices
        ? removableIngredients
            .filter(option => removedIngredientIds.includes(String(option._id)))
            .map(option => String(option._id))
        : []

    const selectedExtras = hasCustomerChoices
        ? extras.map(option => {
            const maxQuantity = Math.min(10, Math.max(1, Number(option.maxQuantity) || 1))
            const count = Math.min(maxQuantity, Math.max(0,
                Math.floor(Number(extraQuantities[String(option._id)]) || 0)
            ))
            return { optionId: String(option._id), quantity: count, unitPrice: Number(option.price) }
        }).filter(option => option.quantity > 0)
        : []

    const hasSelectedCustomizations = selectedRemovedIds.length > 0 || selectedExtras.length > 0
    const calculatedUnitPrice = Number(product?.price ?? price ?? 0) +
        selectedExtras.reduce((sum, option) => sum + option.unitPrice * option.quantity, 0)

    const money = value => Number(value || 0).toLocaleString('sv-SE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    })

    const toggleRemovedIngredient = optionId => {
        setCustomizationMessage('')
        setRemovedIngredientIds(previous => previous.includes(optionId)
            ? previous.filter(value => value !== optionId)
            : [...previous, optionId])
    }

    const changeExtraQuantity = (option, delta) => {
        setCustomizationMessage('')
        const optionId = String(option._id)
        const maxQuantity = Math.min(10, Math.max(1, Number(option.maxQuantity) || 1))
        setExtraQuantities(previous => ({
            ...previous,
            [optionId]: Math.max(0, Math.min(maxQuantity, Number(previous[optionId] || 0) + delta))
        }))
    }

    const clearSelections = () => {
        setRemovedIngredientIds([])
        setExtraQuantities({})
        setCustomizationMessage('')
    }

    const addCustomizedItem = async () => {
        // Säkerhetsgrind: skicka aldrig kundval som en vanlig orderrad.
        if (!hasCustomerChoices || !hasSelectedCustomizations ||
            customizationCheckoutReady !== true ||
            typeof addToCartCustomized !== 'function' || addingCustomized) return

        setAddingCustomized(true)
        setCustomizationMessage('')
        try {
            const result = await addToCartCustomized(id, {
                removedIngredientIds: selectedRemovedIds,
                extras: selectedExtras.map(({ optionId, quantity }) => ({ optionId, quantity }))
            })
            if (result?.success !== true) {
                throw new Error(result?.message || 'Det gick inte att spara kundvalen i varukorgen.')
            }
            clearSelections()
            setCustomizationMessage('Anpassningen har lagts i varukorgen.')
        } catch (error) {
            setCustomizationMessage(error?.message || 'Kunde inte lägga till anpassningen.')
        } finally {
            setAddingCustomized(false)
        }
    }

    // Den vanliga plusknappen får aldrig lägga in en oändrad produkt
    // om kunden redan markerat bortval/tillval.
    const addOriginalItem = () => {
        if (hasSelectedCustomizations) {
            setShowCustomerChoices(true)
            setCustomizationMessage('Återställ dina val för att lägga till originalet.')
            return
        }
        addToCart(id)
    }

    const productPath =
        category === "Maträtter"
            ? `/matratt/${createSlug(name)}`
            : `/dessert/${createSlug(name)}`

    // ======================================================
    // JSX
    // ======================================================

    return (

        <article
            className={`food-item${hasCustomerChoices ? " food-item--customizable" : ""}`}
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
                        onClick={addOriginalItem}
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
                            onClick={addOriginalItem}
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


                {/* KUNDANPASSNINGAR: synliga direkt på produktkortet när admin aktiverat dem. */}
                {hasCustomerChoices && (
                    <section className="mc-food-choices" aria-label={`Kundanpassningar för ${name}`}>
                        <button
                            type="button"
                            className="mc-food-choices-trigger"
                            aria-expanded={showCustomerChoices}
                            aria-controls={`mc-food-choices-${id}`}
                            onClick={() => setShowCustomerChoices(previous => !previous)}
                        >
                            <span className="mc-food-choices-trigger-title">
                                <strong>Vill du ta bort något eller lägga till extra?</strong>
                            </span>
                            <span className="mc-food-choices-trigger-icon" aria-hidden="true">{showCustomerChoices ? '−' : '+'}</span>
                        </button>

                        {showCustomerChoices && (
                            <div className="mc-food-choices-content" id={`mc-food-choices-${id}`}>
                                {removableIngredients.length > 0 && (
                                    <fieldset className="mc-food-choices-fieldset">
                                        <legend>Ta bort</legend>
                                        {removableIngredients.map(option => {
                                            const optionId = String(option._id)
                                            return (
                                                <label className="mc-food-choice-check" key={optionId}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRemovedIds.includes(optionId)}
                                                        onChange={() => toggleRemovedIngredient(optionId)}
                                                    />
                                                    <span>Utan {option.name}</span>
                                                </label>
                                            )
                                        })}
                                    </fieldset>
                                )}

                                {extras.length > 0 && (
                                    <fieldset className="mc-food-choices-fieldset">
                                        <legend>Lägg till</legend>
                                        {extras.map(option => {
                                            const optionId = String(option._id)
                                            const limit = Math.min(10, Math.max(1, Number(option.maxQuantity) || 1))
                                            const current = selectedExtras.find(value => value.optionId === optionId)?.quantity || 0
                                            return (
                                                <div className="mc-food-choice-extra" key={optionId}>
                                                    <div className="mc-food-choice-extra-label">
                                                        <strong>{option.name}</strong>
                                                        <small>+{money(option.price)} kr/st</small>
                                                    </div>
                                                    <div className="mc-food-choice-extra-controls">
                                                        <button type="button" disabled={current <= 0}
                                                            aria-label={`Minska ${option.name}`}
                                                            onClick={() => changeExtraQuantity(option, -1)}>−</button>
                                                        <output aria-label={`Antal ${option.name}`}>{current}</output>
                                                        <button type="button" disabled={current >= limit}
                                                            aria-label={`Öka ${option.name}`}
                                                            onClick={() => changeExtraQuantity(option, 1)}>+</button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </fieldset>
                                )}

                                {selectedExtras.length > 0 && (
                                    <div className="mc-food-choices-total">
                                        <span>Pris med extra</span>
                                        <strong>{money(calculatedUnitPrice)} kr</strong>
                                    </div>
                                )}
                                <p className="mc-food-choices-allergens">
                                    Bortval garanterar inte att maten är fri från allergener.
                                </p>

                                {hasSelectedCustomizations && (
                                    <div className="mc-food-choices-actions">
                                        <button type="button" className="mc-food-choices-add"
                                            disabled={addingCustomized || customizationCheckoutReady !== true || typeof addToCartCustomized !== 'function'}
                                            onClick={addCustomizedItem}>
                                            {addingCustomized ? 'Lägger till…' : 'Lägg till med val'}
                                        </button>
                                        <button type="button" className="mc-food-choices-reset"
                                            onClick={clearSelections}>Rensa</button>
                                    </div>
                                )}

                                {hasSelectedCustomizations && (
                                    customizationCheckoutReady !== true || typeof addToCartCustomized !== 'function'
                                ) && (
                                    <p className="mc-food-choices-warning" role="status">
                                        Anpassade köp är inte aktiverade ännu.
                                    </p>
                                )}
                                {customizationMessage && (
                                    <p className="mc-food-choices-message" role="status">{customizationMessage}</p>
                                )}
                            </div>
                        )}
                    </section>
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