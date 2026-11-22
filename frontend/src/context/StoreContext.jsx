import {
    createContext,
    useEffect,
    useRef,
    useState
} from "react";

import axios from "axios";
import { sanitizeRegularCart, pruneRegularCart } from "./cartIntegrity.js";
import {
    CUSTOMIZED_CART_STORAGE_KEY,
    MAX_CART_QUANTITY,
    sanitizeCustomizedCart,
    customizationKey,
    validateSelectionForProduct,
    buildCustomizedCartEntries
} from "./customizedCart";


export const StoreContext =
    createContext(null);


// ======================================================
// SETTINGS
// ======================================================

// 6% moms läggs ovanpå produktpriset
const VAT_RATE = 0.06;

// Samma maxgräns som backend
const MAX_ITEM_QUANTITY = MAX_CART_QUANTITY;

// Kundval aktiveras i utvecklingsläge eller via miljövariabel.
const CUSTOMIZED_CHECKOUT_READY =
    import.meta.env.DEV ||
    import.meta.env.VITE_CUSTOMIZED_CHECKOUT_READY === "true";

// Guest/local cart storage
const CART_STORAGE_KEY =
    "manilaCafeCart";


const MANILA_SOLO_STORAGE_KEY = "manilaCafeSolo";
const MANILA_SOLO_PRICE = 249;

// Fasta produkter i Manila Solo. Ändra INTE till dynamiska kundval.
const FIXED_SOLO_NAMES = {
    mealId: "chicken adobo",
    dessertId: "golden turon & ube ice cream",
    drinkId: "ube caramel twirl"
};

const normalizeSoloText = (value = "") =>
    String(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const isFixedSolo = (bundle, products) => {
    if (!bundle || !Array.isArray(products) || !products.length) return false;
    return Object.entries(FIXED_SOLO_NAMES).every(([key, name]) => {
        const product = products.find(item =>
            String(item?._id || "").toLowerCase() ===
            String(bundle[key] || "").toLowerCase()
        );
        return product && normalizeSoloText(product.name) === name &&
            product.available !== false && product.isAvailable !== false;
    });
};

const getStoredManilaSolo = () => {
    try {
        const raw = localStorage.getItem(
            MANILA_SOLO_STORAGE_KEY
        );

        if (!raw) return null;

        const parsed = JSON.parse(raw);

        if (
            !parsed ||
            parsed.type !== "manila-solo" ||
            !["mealId", "dessertId", "drinkId"].every(
                key =>
                    typeof parsed[key] === "string" &&
                    /^[a-f0-9]{24}$/i.test(parsed[key])
            )
        ) {
            return null;
        }

        const ids = [
            parsed.mealId,
            parsed.dessertId,
            parsed.drinkId
        ].map(id => id.toLowerCase());

        if (new Set(ids).size !== 3) return null;

        return {
            type: "manila-solo",
            mealId: ids[0],
            dessertId: ids[1],
            drinkId: ids[2]
        };
    } catch {
        return null;
    }
};



// ======================================================
// CLEAN CART DATA
// ======================================================

const sanitizeCart = sanitizeRegularCart;


// ======================================================
// READ LOCAL CART
// ======================================================

const getStoredCart = () => {

    try {

        const savedCart =
            localStorage.getItem(
                CART_STORAGE_KEY
            );


        if (!savedCart) {
            return {};
        }


        return sanitizeCart(
            JSON.parse(savedCart)
        );

    } catch (error) {

        console.error(
            "Could not read stored cart:",
            error
        );


        return {};

    }

};


// ======================================================
// READ SEPARATE CUSTOMIZED CART
// ======================================================

const getStoredCustomizedCart = () => {
    try {
        const raw = localStorage.getItem(CUSTOMIZED_CART_STORAGE_KEY);
        return raw ? sanitizeCustomizedCart(JSON.parse(raw)) : {};
    } catch (error) {
        console.error("Could not read customized cart:", error);
        return {};
    }
};


// ======================================================
// STORE CONTEXT PROVIDER
// ======================================================

const StoreContextProvider = (props) => {


    // ==================================================
    // BACKEND URL
    // ==================================================

    const url =
        import.meta.env.VITE_API_URL ||
        "http://localhost:4000";


    // ==================================================
    // STATES
    // ==================================================

    const [
        cartItems,
        setCartItems
    ] = useState(
        () => getStoredCart()
    );


    // Guards against late /api/cart/get responses restoring a cart after checkout.
    const cartMutationRef = useRef(0);

    // Separate line items: two versions of the same product are never merged
    // unless their selected ingredients and extra quantities are identical.
    // This does not change the existing cartItems object or backend cart API.
    const [customizedCartItems, setCustomizedCartItems] = useState(
        () => getStoredCustomizedCart()
    );

    const [
        food_list,
        setFoodList
    ] = useState([]);

    const [manilaSolo, setManilaSolo] = useState(
        () => getStoredManilaSolo()
    );



    const [
        token,
        setToken
    ] = useState("");


    // ==================================================
    // SAVE CART LOCALLY
    // ==================================================

    /*
        IMPORTANT:

        Varukorgen sparas lokalt oavsett om kunden är:

        - gäst
        - inloggad
        - har nätverksproblem
        - har en trasig session

        Kunden ska inte förlora sin varukorg.
    */

    useEffect(() => {

        try {

            localStorage.setItem(
                CART_STORAGE_KEY,
                JSON.stringify(
                    sanitizeCart(cartItems)
                )
            );

        } catch (error) {

            console.error(
                "Could not save cart:",
                error
            );

        }

    }, [cartItems]);


    // Keep customized selections separately in localStorage. Never store
    // customer-controlled prices: all display prices come from food_list.
    useEffect(() => {
        try {
            localStorage.setItem(
                CUSTOMIZED_CART_STORAGE_KEY,
                JSON.stringify(sanitizeCustomizedCart(customizedCartItems))
            );
        } catch (error) {
            console.error("Could not save customized cart:", error);
        }
    }, [customizedCartItems]);

    // Prepared for the next stages; not exposed to ProductPage yet.
    // It will only be enabled after Cart + server-side checkout integration.
    const addToCartCustomized = async (productId, selection) => {
        if (!CUSTOMIZED_CHECKOUT_READY) {
            return { success: false, message: "Anpassade köp aktiveras snart." };
        }

        try {
            const product = food_list.find(item => item._id === productId);
            const validated = validateSelectionForProduct(product, selection);
            const cartKey = customizationKey(productId, validated);

            // Read the latest local cart, avoiding stale event-handler state.
            const previous = getStoredCustomizedCart();
            const count = Number(previous[cartKey]?.quantity || 0);
            if (count >= MAX_ITEM_QUANTITY) {
                return { success: false, message: "Maxantalet har uppnåtts." };
            }
            const next = {
                ...previous,
                [cartKey]: {
                    productId,
                    removedIngredientIds: validated.removedIngredientIds,
                    extras: validated.extras,
                    quantity: count + 1
                }
            };

            // Persist before reporting success. Do NOT silently discard options.
            localStorage.setItem(
                CUSTOMIZED_CART_STORAGE_KEY,
                JSON.stringify(sanitizeCustomizedCart(next))
            );
            cartMutationRef.current += 1;
            setCustomizedCartItems(next);
            return { success: true, cartKey };
        } catch (error) {
            return {
                success: false,
                message: error?.message || "Kundvalen kunde inte sparas."
            };
        }
    };

    const removeFromCartCustomized = cartKey => {
        cartMutationRef.current += 1;
        setCustomizedCartItems(previous => {
            if (!previous[cartKey]) return previous;
            const next = { ...previous };
            if (next[cartKey].quantity > 1) {
                next[cartKey] = { ...next[cartKey], quantity: next[cartKey].quantity - 1 };
            } else {
                delete next[cartKey];
            }
            return next;
        });
    };

    const getCustomizedCartEntries = () =>
        buildCustomizedCartEntries(customizedCartItems, food_list);

    // Must also be called after a successful order when checkout is integrated.
    const clearCustomizedCart = () => {
        cartMutationRef.current += 1;
        setCustomizedCartItems({});
    };


    // ======================================================
    // MANILA SOLO — FAST MENY, INGA KUNDVAL
    // ======================================================

    // Rensa gamla valfria Solo-kombinationer när produktlistan laddats.
    useEffect(() => {
        if (!manilaSolo || !food_list.length) return;
        if (!isFixedSolo(manilaSolo, food_list)) {
            localStorage.removeItem(MANILA_SOLO_STORAGE_KEY);
            setManilaSolo(null);
        }
    }, [food_list, manilaSolo]);

    const addManilaSolo = (selection) => {
        try {
            if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
                throw new Error("Ogiltig meny.");
            }
            const required = Object.keys(FIXED_SOLO_NAMES);
            if (Object.keys(selection).length !== required.length ||
                required.some(key => typeof selection[key] !== "string" ||
                    !/^[a-f0-9]{24}$/i.test(selection[key]))) {
                throw new Error("Ogiltig Manila Solo.");
            }
            const bundle = {
                type: "manila-solo",
                mealId: selection.mealId.toLowerCase(),
                dessertId: selection.dessertId.toLowerCase(),
                drinkId: selection.drinkId.toLowerCase()
            };
            if (!isFixedSolo(bundle, food_list)) {
                throw new Error("Manila Solo innehåller endast Chicken Adobo, Golden Turon & Ube Ice Cream och Ube Caramel Twirl.");
            }
            if (Object.values(cartItems).some(q => Number(q) > 0) ||
                Object.values(customizedCartItems).some(item => Number(item?.quantity) > 0)) {
                throw new Error("Töm den vanliga varukorgen innan du lägger till Manila Solo.");
            }
            localStorage.setItem(MANILA_SOLO_STORAGE_KEY, JSON.stringify(bundle));
            cartMutationRef.current += 1;
            setManilaSolo(bundle);
            return { success: true, message: "Manila Solo har lagts till i varukorgen." };
        } catch (error) {
            return { success: false, message: error.message || "Kunde inte lägga till Manila Solo." };
        }
    };

    const removeManilaSolo = () => {
        try {
            localStorage.removeItem(
                MANILA_SOLO_STORAGE_KEY
            );
            cartMutationRef.current += 1;
            setManilaSolo(null);

            return { success: true };
        } catch {
            return {
                success: false,
                message: "Kunde inte ta bort Manila Solo."
            };
        }
    };

    
const getManilaSoloOrderPayload = () => {
    if (!isFixedSolo(manilaSolo, food_list)) return null;

    return {
        bundle: {
            type: "manila-solo",
            mealId: manilaSolo.mealId,
            dessertId: manilaSolo.dessertId,
            drinkId: manilaSolo.drinkId
        },
        items: [
            {
                itemId: manilaSolo.mealId,
                quantity: 1
            },
            {
                itemId: manilaSolo.dessertId,
                quantity: 1
            },
            {
                itemId: manilaSolo.drinkId,
                quantity: 1
            }
        ]
    };
};



    // Used only after /api/order/verify confirms payment.
    // Write storage immediately so a fast reload cannot resurrect an old cart.
    const clearPurchasedCart = () => {
        cartMutationRef.current += 1;
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(CUSTOMIZED_CART_STORAGE_KEY);
            localStorage.removeItem(MANILA_SOLO_STORAGE_KEY);
            // Other open tabs also need to forget a successfully purchased cart.
            localStorage.setItem("manilaCafeCartCheckoutClearedAt", String(Date.now()));
        } catch (error) {
            console.warn("Could not clear saved cart:", error);
        }
        setCartItems({});
        setCustomizedCartItems({});
        setManilaSolo(null);
    };

    // ==================================================
    // CLEAR INVALID SESSION
    // ==================================================

    const clearInvalidSession = () => {

        localStorage.removeItem(
            "token"
        );


        setToken("");

    };


    // ==================================================
    // HANDLE AUTH ERROR
    // ==================================================

    const handleAuthError = (
        error
    ) => {

        const status =
            error?.response?.status;


        if (status === 401) {

            console.warn(
                "Session invalid. Continuing as guest."
            );


            clearInvalidSession();


            return true;

        }


        return false;

    };


    // ==================================================
    // ADD TO CART
    // ==================================================

    const addToCart = async (
        itemId
    ) => {

        if (!itemId) {

            console.error(
                "addToCart called without itemId"
            );

            return;

        }


        const currentQuantity =
            Number(
                cartItems[itemId] || 0
            );


        // Same limit as backend
        if (
            currentQuantity >=
            MAX_ITEM_QUANTITY
        ) {

            return;

        }


        // ==================================================
        // ALWAYS UPDATE FRONTEND FIRST
        // ==================================================

        /*
            Detta är viktigt.

            Backend får INTE bestämma om kunden
            får använda sin varukorg.

            Cart fungerar lokalt även om:

            - servern ligger nere
            - nätverket bryts
            - token är gammal
            - användarkontot har tagits bort
        */

        cartMutationRef.current += 1;
        setCartItems((prev) => {

            const quantity =
                Number(
                    prev[itemId] || 0
                );


            return {

                ...prev,

                [itemId]:
                    Math.min(
                        quantity + 1,
                        MAX_ITEM_QUANTITY
                    )

            };

        });


        // ==================================================
        // GUEST
        // ==================================================

        if (!token) {

            return;

        }


        // ==================================================
        // SYNC LOGGED-IN CART WITH BACKEND
        // ==================================================

        try {

            const response =
                await axios.post(

                    `${url}/api/cart/add`,

                    {
                        itemId
                    },

                    {
                        headers: {
                            token
                        }
                    }

                );


            if (
                !response.data?.success
            ) {

                /*
                    IMPORTANT:

                    Do NOT remove product from
                    frontend cart.

                    Customer cart must continue
                    working.
                */

                console.warn(
                    "Backend cart add was not successful:",
                    response.data
                );

            }

        } catch (error) {

            // Invalid login/session
            if (
                handleAuthError(error)
            ) {

                /*
                    Product stays in cart.

                    Customer simply continues
                    as guest.
                */

                return;

            }


            /*
                Network/server error.

                Product STILL stays in cart.
            */

            console.error(
                "Add to cart sync failed:",
                error?.response?.status ||
                error.message,
                error?.response?.data || ""
            );

        }

    };


    // ==================================================
    // REMOVE FROM CART
    // ==================================================

    const removeFromCart = async (
        itemId
    ) => {

        if (!itemId) {

            console.error(
                "removeFromCart called without itemId"
            );

            return;

        }


        const currentQuantity =
            Number(
                cartItems[itemId] || 0
            );


        if (
            !Number.isFinite(
                currentQuantity
            ) ||
            currentQuantity <= 0
        ) {

            return;

        }


        // ==================================================
        // ALWAYS UPDATE FRONTEND FIRST
        // ==================================================

        cartMutationRef.current += 1;
        setCartItems((prev) => {

            const updatedCart = {
                ...prev
            };


            const quantity =
                Number(
                    updatedCart[itemId] || 0
                );


            if (quantity > 1) {

                updatedCart[itemId] =
                    quantity - 1;

            } else {

                delete updatedCart[itemId];

            }


            return updatedCart;

        });


        // ==================================================
        // GUEST
        // ==================================================

        if (!token) {

            return;

        }


        // ==================================================
        // SYNC WITH BACKEND
        // ==================================================

        try {

            const response =
                await axios.post(

                    `${url}/api/cart/remove`,

                    {
                        itemId
                    },

                    {
                        headers: {
                            token
                        }
                    }

                );


            if (
                !response.data?.success
            ) {

                /*
                    Do not restore old cart.

                    Customer's local cart
                    remains functional.
                */

                console.warn(
                    "Backend cart remove was not successful:",
                    response.data
                );

            }

        } catch (error) {

            if (
                handleAuthError(error)
            ) {

                return;

            }


            console.error(
                "Remove from cart sync failed:",
                error?.response?.status ||
                error.message,
                error?.response?.data || ""
            );

        }

    };


    // ==================================================
    // CALCULATE SUBTOTAL
    // ==================================================

    /*
        getTotalCartAmount()
        = subtotal EXCLUDING VAT
    */

    const getTotalCartAmount = () => {

        let subtotal = 0;


        for (
            const itemId in cartItems
        ) {

            const quantity =
                Number(
                    cartItems[itemId]
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity <= 0
            ) {

                continue;

            }


            const itemInfo =
                food_list.find(

                    (product) =>
                        product._id ===
                        itemId

                );


            if (!itemInfo) {

                continue;

            }


            const price =
                Number(
                    itemInfo.price
                );


            if (
                !Number.isFinite(
                    price
                ) ||
                price < 0
            ) {

                continue;

            }


            subtotal +=
                price * quantity;

        }


        return Number(
            subtotal.toFixed(2)
        );

    };


    // ==================================================
    // CALCULATE VAT
    // ==================================================

    const getVatAmount = () => {

        const subtotal =
            getTotalCartAmount();


        const vatAmount =
            subtotal * VAT_RATE;


        return Number(
            vatAmount.toFixed(2)
        );

    };


    // ==================================================
    // CALCULATE TOTAL INCLUDING VAT
    // ==================================================

    const getTotalWithVat = () => {

        const subtotal =
            getTotalCartAmount();


        const vatAmount =
            getVatAmount();


        const total =
            subtotal + vatAmount;


        return Number(
            total.toFixed(2)
        );

    };


    // ==================================================
    // FETCH PRODUCTS
    // ==================================================

    const fetchFoodList = async () => {

        try {

            const response =
                await axios.get(

                    `${url}/api/food/list`

                );


            if (
                response.data?.success
            ) {

                const products = Array.isArray(response.data.data)
                    ? response.data.data
                    : [];
                setFoodList(products);
                setCartItems(previous => {
                    const next = pruneRegularCart(previous, products);
                    return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
                });
                return products;

            }

        } catch (error) {

            /*
                Don't unnecessarily destroy
                already loaded product data.
            */

            console.error(
                "Failed to fetch food list:",
                error?.response?.status ||
                error.message
            );

        }

    };


    // ==================================================
    // LOAD LOGGED-IN USER CART
    // ==================================================

    const loadCartData = async (
        userToken,
        latestProducts = null
    ) => {
        const revisionAtStart = cartMutationRef.current;

        /*
            No token = guest.

            IMPORTANT:
            Do NOT clear local cart.
        */

        if (!userToken) {

            return;

        }


        try {

            const response =
                await axios.post(

                    `${url}/api/cart/get`,

                    {},

                    {
                        headers: {
                            token:
                                userToken
                        }
                    }

                );


            if (
                response.data?.success
            ) {

                const backendCart =
                    sanitizeCart(
                        response.data
                            .cartData || {}
                    );


                // The customer may have added items or completed checkout while this
                // request was pending. Never revive the older server snapshot.
                if (revisionAtStart !== cartMutationRef.current) return;
                // If the product request failed, do not erase a saved server
                // cart just because the catalog has not loaded yet.
                const catalog = Array.isArray(latestProducts)
                    ? latestProducts
                    : (food_list.length > 0 ? food_list : null);
                setCartItems(catalog ? pruneRegularCart(backendCart, catalog) : backendCart);

            }

        } catch (error) {

            const status =
                error?.response?.status;


            // ==================================================
            // INVALID / EXPIRED SESSION
            // ==================================================

            if (status === 401) {

                console.warn(
                    "Stored session is invalid. Continuing as guest."
                );


                /*
                    Remove broken token.

                    IMPORTANT:
                    Do NOT clear cartItems.
                */

                localStorage.removeItem(
                    "token"
                );


                setToken("");


                return;

            }


            /*
                Backend/network error.

                Keep existing local cart.
            */

            console.error(
                "Could not load backend cart:",
                status ||
                error.message
            );

        }

    };


    // ==================================================
    // LOAD WEBSITE DATA
    // ==================================================

    useEffect(() => {

        const loadData = async () => {

            const savedToken =
                localStorage.getItem(
                    "token"
                );


            if (savedToken) {

                setToken(
                    savedToken
                );

            }


            const latestProducts = await fetchFoodList();

            if (savedToken) {
                await loadCartData(savedToken, latestProducts);

            }

        };


        loadData();

    }, []);


    // Keep tabs consistent. Storage events fire only in the OTHER tabs.
    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === "manilaCafeCartCheckoutClearedAt") {
                cartMutationRef.current += 1;
                setCartItems({});
                setCustomizedCartItems({});
                setManilaSolo(null);
            } else if (event.key === CART_STORAGE_KEY) {
                cartMutationRef.current += 1;
                setCartItems(getStoredCart());
            } else if (event.key === CUSTOMIZED_CART_STORAGE_KEY) {
                cartMutationRef.current += 1;
                setCustomizedCartItems(getStoredCustomizedCart());
            } else if (event.key === MANILA_SOLO_STORAGE_KEY) {
                cartMutationRef.current += 1;
                setManilaSolo(getStoredManilaSolo());
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // Inventory can change while the customer is reading the menu.
    // Refresh on return to the tab; backend still validates stock at checkout.
    useEffect(() => {
        let lastRefresh = Date.now();
        const onReturn = () => {
            const now = Date.now();
            if (document.visibilityState !== "visible" || now - lastRefresh < 15000) return;
            lastRefresh = now;
            void fetchFoodList();
        };
        window.addEventListener("focus", onReturn);
        document.addEventListener("visibilitychange", onReturn);
        const interval = window.setInterval(onReturn, 60000);
        return () => {
            window.removeEventListener("focus", onReturn);
            document.removeEventListener("visibilitychange", onReturn);
            window.clearInterval(interval);
        };
    }, []);

    // ==================================================
    // CONTEXT VALUES
    // ==================================================

    
const contextValue = {

    // Products
    food_list,

    // Cart
    cartItems,
    setCartItems,
    clearPurchasedCart,
    addToCart,
    removeFromCart,

    // Phase 2 customized cart
    addToCartCustomized: CUSTOMIZED_CHECKOUT_READY
        ? addToCartCustomized
        : undefined,
    customizedCartItems,
    removeFromCartCustomized,
    getCustomizedCartEntries,
    clearCustomizedCart,
    customizationCheckoutReady: CUSTOMIZED_CHECKOUT_READY,

    // Manila Solo
    manilaSolo,
    manilaSoloPrice: MANILA_SOLO_PRICE,
    addManilaSolo,
    removeManilaSolo,
    getManilaSoloOrderPayload,

    // Price calculations
    getTotalCartAmount,
    getVatAmount,
    getTotalWithVat,
    vatRate: VAT_RATE,

    // Backend functions
    fetchFoodList,
    loadCartData,

    // Backend URL
    url,

    // Authentication
    token,
    setToken

};


    // ==================================================
    // PROVIDER
    // ==================================================

    return (

        <StoreContext.Provider
            value={
                contextValue
            }
        >

            {props.children}

        </StoreContext.Provider>

    );

};


export default StoreContextProvider;