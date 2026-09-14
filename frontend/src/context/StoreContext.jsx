import {
    createContext,
    useEffect,
    useState
} from "react";

import axios from "axios";


export const StoreContext =
    createContext(null);


// ======================================================
// SETTINGS
// ======================================================

// 6% moms läggs ovanpå produktpriset
const VAT_RATE = 0.06;

// Samma maxgräns som backend
const MAX_ITEM_QUANTITY = 99;

// Guest/local cart storage
const CART_STORAGE_KEY =
    "manilaCafeCart";


// ======================================================
// CLEAN CART DATA
// ======================================================

const sanitizeCart = (cart) => {

    if (
        !cart ||
        typeof cart !== "object" ||
        Array.isArray(cart)
    ) {
        return {};
    }


    const cleanCart = {};


    for (
        const [itemId, value]
        of Object.entries(cart)
    ) {

        const quantity =
            Number(value);


        if (
            itemId &&
            Number.isFinite(quantity) &&
            quantity > 0
        ) {

            cleanCart[itemId] =
                Math.min(
                    Math.floor(quantity),
                    MAX_ITEM_QUANTITY
                );

        }

    }


    return cleanCart;

};


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


    const [
        food_list,
        setFoodList
    ] = useState([]);


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

                setFoodList(
                    Array.isArray(
                        response.data.data
                    )
                        ? response.data.data
                        : []
                );

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
        userToken
    ) => {

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


                setCartItems(
                    backendCart
                );

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


            await fetchFoodList();


            if (savedToken) {

                await loadCartData(
                    savedToken
                );

            }

        };


        loadData();

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

        addToCart,
        removeFromCart,

        // Price calculations
        getTotalCartAmount,
        getVatAmount,
        getTotalWithVat,

        vatRate:
            VAT_RATE,

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