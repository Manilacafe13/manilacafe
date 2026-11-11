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
// PRODUKTINFORMATION – ingredienser och portion tillsammans
// Bekräfta allergener/antal mot faktiskt recept före publicering.
// Uppgifter som saknas anges tydligt, de hittas inte på.
// ======================================================

const normalizeProductName = (value = '') =>
    String(value).trim().toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')

const productDetails = {
    // MATRÄTTER
    'sinigang med räkor': {
        ingredients: 'Räkor, sinigang-buljong, grönsaker och ris.',
        allergens: 'Innehåller KRÄFTDJUR (räkor). Övriga allergener i sinigang-mix och buljong måste kontrolleras mot de produkter som används.',
        extra: 'Syrlig filippinsk soppa som serveras med ris.',
        portion: { quantity: '5 stora räkor', contents: 'En portion sinigang med fem stora räkor, grönsaker, buljong och ris.', serving: 'Om rätten levereras kyld: förvara kallt och värm tills allt är ordentligt genomvarmt.' }
    },
    'chicken adobo': {
        ingredients: 'Kyckling, soja, vinäger, vitlök, lagerblad, svartpeppar och ris.',
        allergens: 'Innehåller SOJA. Kan innehålla VETE (gluten), beroende på vilken soja som används; kontrollera förpackningen.',
        extra: 'Filippinsk kycklingadobo i smakrik sås med ris.',
        portion: { quantity: '4 kycklingklubbor', contents: 'Fyra kycklingklubbor med adobosås och ris.', serving: 'Om rätten behöver värmas: värm kyckling och ris tills de är ordentligt genomvarma.' }
    },
    pancit: {
        ingredients: 'Nudlar, räkor, grönsaker, vitlök, lök och sojabaserad sås med kryddor.',
        allergens: 'Innehåller KRÄFTDJUR (räkor) och SOJA. VETE (gluten) kan ingå i nudlar eller soja; kontrollera produkternas innehåll.',
        extra: 'Filippinska wokade nudlar med räkor och grönsaker.',
        portion: { quantity: '5 medelstora räkor', contents: 'En portion wokade nudlar med fem räkor, grönsaker och sås.', serving: 'Värm vid behov tills rätten är ordentligt genomvarm.' }
    },

    // DESSERTER
    'mango float': {
        ingredients: 'Mango, grädde, sötad kondenserad mjölk, färskost (Philadelphia) och grahamskex.',
        allergens: 'Innehåller MJÖLK och VETE (gluten). Kontrollera grahamskexens och färskostens förpackningar för övriga allergener.',
        extra: 'Kall dessert med lager av mango, kräm och kex.',
        portion: { contents: 'En portion Mango Float med mango, krämig fyllning och grahamskex.', serving: 'Serveras kyld. Förvara i kylskåp fram till servering.' }
    },
    'apple crisp float': {
        ingredients: 'Äpple, sötad kondenserad mjölk, grädde, färskost, kex, kanel och karamelliserat äpple.',
        allergens: 'Innehåller MJÖLK. Kexen kan innehålla VETE (gluten); kontrollera förpackningarna.',
        extra: 'Kyld äppeldessert med krämiga lager och kanel.',
        portion: { contents: 'En portion Apple Crisp Float med äpple, kanel, kex och krämiga lager.', serving: 'Serveras kyld och förvaras i kylskåp.' }
    },
    'ube cake': {
        ingredients: 'Gräddfil, socker, kokosflingor, grahamskex, kokosgrädde, ube-sylt, färskost (Philadelphia), smör och salt.',
        allergens: 'Innehåller MJÖLK och VETE (gluten). Kontrollera även grahamskex, ube-sylt och övriga förpackningar.',
        extra: 'Kylskåpsdessert med ube och kokos.',
        portion: { contents: 'En portion Ube Cake med krämiga lager av ube och kokos.', serving: 'Serveras kyld och förvaras i kylskåp.' }
    },
    'fruit cup': {
        ingredients: 'Fruktcocktail, ost (Eden cheese), nata de coco, kokoskött, kokosgelé och sötad kondenserad mjölk.',
        allergens: 'Innehåller MJÖLK. Kontrollera fruktcocktail, kokosgelé och övriga förpackade ingredienser.',
        extra: 'Fruktbägare med filippinska tillbehör. Geléns innehåll bör kontrolleras mot aktuell förpackning.',
        portion: { contents: 'En bägare fruktblandning med kokos, ost och kondenserad mjölk.', serving: 'Serveras väl kyld och förvaras i kylskåp.' }
    },
    'golden turon & ube ice cream': {
        ingredients: 'Banan, vårrulleark, socker och ube-glass.',
        allergens: 'Vårrulleark kan innehålla VETE (gluten) och ube-glass kan innehålla MJÖLK. Bekräfta exakta allergener mot aktuella förpackningar.',
        extra: 'Krispig filippinsk turon med ube-glass.',
        // Antalet rullar har varierat i tidigare uppgifter och ska verifieras innan publicering.
        portion: { contents: 'En portion krispiga turonrullar med bananfyllning, serverade med ube-glass.', serving: 'Värm vid behov turon separat. Glassen bör hållas fryst fram till servering.' }
    },
    'biscoff cinnamon banana float': {
        ingredients: 'Banan, sötad kondenserad mjölk, grädde, färskost, Biscoff-kex och kanel.',
        allergens: 'Innehåller MJÖLK och VETE (gluten). Biscoff-kex innehåller även SOJA; kontrollera aktuell förpackning.',
        extra: 'Krämig banandessert med Biscoff och kanel.',
        portion: { contents: 'En portion Banana Float med banan, Biscoff-kex, kanel och kräm.', serving: 'Serveras kyld och förvaras i kylskåp.' }
    },

    // TAHO
    taho: {
        ingredients: 'Silkestofu, sagopärlor och söt sirap.',
        allergens: 'Innehåller SOJA. Kontrollera även sirapens ingredienser.',
        extra: 'Klassisk filippinsk taho.',
        portion: { contents: 'En portion mjuk tofu med sagopärlor och sirap.', serving: 'Serveras enligt aktuell serveringsinformation. Kontakta oss om förvaring vid senare konsumtion.' }
    },
    'strawberry taho': {
        ingredients: 'Silkestofu, sagopärlor och jordgubbssirap.',
        allergens: 'Innehåller SOJA. Kontrollera jordgubbssirapens ingredienser.',
        extra: 'Taho med jordgubbssmak.',
        portion: { contents: 'En portion silkeslen tofu, sagopärlor och jordgubbssirap.', serving: 'Serveras enligt aktuell serveringsinformation.' }
    },
    'apple taho': {
        ingredients: 'Silkestofu, sagopärlor och äppelsirap.',
        allergens: 'Innehåller SOJA. Kontrollera äppelsirapens ingredienser.',
        extra: 'Taho med äppelsmak.',
        portion: { contents: 'En portion silkeslen tofu, sagopärlor och äppelsirap.', serving: 'Serveras enligt aktuell serveringsinformation.' }
    },

    // HALO-HALO OCH SAGO
    'halo-halo': {
        ingredients: 'Krossad is, sötad mjölk, gelé, sötade bönor, nata de coco, majs, jordgubbar och ube-glass.',
        allergens: 'Innehåller MJÖLK om mjölk och ube-glass används enligt receptet. Kontrollera gelé, glass och samtliga övriga tillbehör för ytterligare allergener.',
        extra: 'Filippinsk isdessert med flera tillbehör.',
        portion: { contents: 'En portion krossad is med mjölk, frukt, gelé, bönor, majs och ube-glass.', serving: 'Serveras kall och bör avnjutas direkt efter tillredning.' }
    },
    'mango sago': {
        ingredients: 'Mango, sagopärlor (tapioka), kokosmjölk och sötad kondenserad mjölk.',
        allergens: 'Innehåller MJÖLK. Kontrollera övriga ingrediensförpackningar.',
        extra: 'Krämig dessert med mango och sagopärlor.',
        portion: { contents: 'En portion Mango Sago med mango, tapiokapärlor och krämig mjölk- och kokosblandning.', serving: 'Serveras väl kyld och förvaras i kylskåp.' }
    },
    'choco sago': {
        ingredients: 'Mjölk, vispgrädde, kakao, mörk choklad, sagopärlor (tapioka), sötad kondenserad mjölk, browniebitar och chokladsås.',
        allergens: 'Innehåller MJÖLK. Brownie och choklad kan innehålla VETE (gluten), ÄGG och SOJA; dessa måste kontrolleras mot använda produkter.',
        extra: 'Krämig chokladdessert med sago och browniebitar.',
        portion: { contents: 'En portion Choco Sago med sagopärlor, chokladkräm, browniebitar och chokladsås.', serving: 'Serveras väl kyld och förvaras i kylskåp.' }
    },
    'strawberry sago': {
        ingredients: 'Mjölk, jordgubbar, sagopärlor (tapioka) och sötad kondenserad mjölk.',
        allergens: 'Innehåller MJÖLK. Kontrollera övriga ingrediensförpackningar.',
        extra: 'Krämig jordgubbsdessert med sagopärlor.',
        portion: { contents: 'En portion Strawberry Sago med jordgubbar, sagopärlor och krämig mjölkblandning.', serving: 'Serveras väl kyld och förvaras i kylskåp.' }
    },
    'ube sago': {
        ingredients: 'Mjölk, ube (lila jams), ube-extrakt, sagopärlor (tapioka) och sötad kondenserad mjölk.',
        allergens: 'Innehåller MJÖLK. Kontrollera ube-extrakt och övriga ingrediensförpackningar.',
        extra: 'Krämig dessert med ube och sagopärlor.',
        portion: { contents: 'En portion Ube Sago med sagopärlor och krämig ubeblandning.', serving: 'Serveras väl kyld och förvaras i kylskåp.' }
    },

    // BRÖD
    pandesal: {
        // Fullständigt recept saknas i underlaget. Visa inte en påhittad ingredienslista.
        ingredients: 'Fullständig ingredienslista behöver bekräftas mot aktuellt recept.',
        allergens: 'Allergenuppgifter behöver bekräftas innan beställning. Kontakta oss för fullständig information.',
        extra: 'Klassiskt filippinskt bröd.',
        portion: { quantity: '3 stycken', contents: 'Tre klassiska pandesal.', serving: 'Värm gärna lätt före servering.' }
    },
    'ube pandesal': {
        ingredients: 'Vetemjöl, mjölk, jäst, socker, olja, ägg, salt, ube-extrakt, ströbröd, ube-fyllning och ost.',
        allergens: 'Innehåller VETE (gluten), MJÖLK och ÄGG. Kontrollera ost, ube-fyllning, ströbröd och ube-extrakt för ytterligare allergener.',
        extra: 'Mjuka ube-bröd med fyllning.',
        portion: { quantity: '3 stycken', contents: 'Tre mjuka Ube Pandesal med ube- och ostfyllning.', serving: 'Värm gärna kort före servering.', preparation: 'Tillagas färska; beställningen kan kräva extra förberedelsetid.' }
    },

    // DRYCKER
    'ube caramel latte': {
        ingredients: 'Espresso, laktosfri mjölk, ube, karamellsås och is.',
        allergens: 'Innehåller MJÖLK (mjölkprotein), även om mjölken är laktosfri. Kontrollera ube- och karamellprodukternas innehåll.',
        extra: 'Kall kaffedryck med ube och karamell.',
        portion: { contents: 'En Ube Caramel Latte med espresso, mjölk, ube, karamell och is.', serving: 'Serveras kall. Is kan smälta under leverans.' }
    },
    'passion paradise': {
        ingredients: 'Passionsfrukt och is. Fullständigt recept behöver bekräftas.',
        allergens: 'Fullständig allergeninformation behöver bekräftas mot aktuellt recept. Kontakta oss före beställning vid allergi.',
        extra: 'Tropisk passionsfruktsdryck.',
        portion: { contents: 'En portion Passion Paradise, serverad kall.', serving: 'Serveras kyld. Is kan smälta under leverans.' }
    },
    'strawberry biscoff bliss': {
        ingredients: 'Jordgubbar och Biscoff-kex. Övriga ingredienser behöver bekräftas mot receptet.',
        allergens: 'Biscoff-kex innehåller VETE (gluten) och SOJA. Eventuell MJÖLK och ytterligare allergener behöver kontrolleras mot hela receptet.',
        extra: 'Krämig jordgubbsdryck med Biscoff.',
        portion: { contents: 'En portion Strawberry Biscoff Bliss med jordgubbs- och Biscoffsmak.', serving: 'Serveras kall.' }
    },
    'mango pineapple sunshine': {
        ingredients: 'Mango, ananas och is. Fullständigt recept behöver bekräftas.',
        allergens: 'Fullständig allergeninformation behöver bekräftas mot aktuellt recept. Kontakta oss före beställning vid allergi.',
        extra: 'Tropisk dryck med mango och ananas.',
        portion: { contents: 'En portion Mango Pineapple Sunshine med mango- och ananassmak.', serving: 'Serveras kyld. Is kan smälta under leverans.' }
    },
    'ube caramel twirl': {
        ingredients: 'Mjölk, ube, karamellsås och is.',
        allergens: 'Innehåller MJÖLK. Kontrollera ubeproduktens och karamellsåsens förpackningar för ytterligare allergener.',
        extra: 'Kall, kaffefri dryck med ube och karamell.',
        portion: { contents: 'En Ube Caramel Twirl med mjölk, ube, karamell och is.', serving: 'Serveras kall. Is kan smälta under leverans.' }
    }
}

// Alternativa namn i admin ska visa samma information.
const productAliases = {
    'siningang med räkor': 'sinigang med räkor',
    'ube pandesal med ost': 'ube pandesal',
    'passion fruit': 'passion paradise',
    'strawberry biscoff shake': 'strawberry biscoff bliss',
    'mango pinapple sun': 'mango pineapple sunshine'
}

// Fallback gör att även nytillagda produkter får båda sektionerna,
// utan att okända ingredienser/allergener anges som fakta.
const getProductDetails = (name) => {
    const normalized = normalizeProductName(name)
    const alias = Object.entries(productAliases).find(([name]) => normalizeProductName(name) === normalized)?.[1]
    const key = normalizeProductName(alias || normalized)
    const matched = Object.entries(productDetails).find(([name]) => normalizeProductName(name) === key)?.[1]
    return matched || {
        ingredients: 'Fullständig ingredienslista behöver bekräftas. Kontakta oss före beställning.',
        allergens: 'Allergeninformation behöver bekräftas mot aktuellt recept. Kontakta oss före beställning vid allergi.',
        extra: 'Vi hjälper dig gärna med mer information om produkten.',
        portion: {
            contents: `En portion ${String(name || 'av produkten')} enligt aktuell meny. Exakt mängd behöver bekräftas.`,
            serving: 'Kontakta oss för serverings- och förvaringsråd.'
        }
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


    // Samma källa styr både ingredienser och portionsinformation.
    const details = getProductDetails(name)
    const productInfo = details
    const portionInfo = details.portion


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