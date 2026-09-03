import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const StoreContext = createContext(null);


// ======================================================
// VAT / MOMS
// ======================================================

// 6% moms läggs ovanpå produktpriset
const VAT_RATE = 0.06;


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

    const [cartItems, setCartItems] = useState({});

    const [food_list, setFoodList] = useState([]);

    const [token, setToken] = useState("");


    // ==================================================
    // ADD TO CART
    // ==================================================

    const addToCart = async (itemId) => {

        if (!itemId) {
            return;
        }


        // Save old cart in case backend fails
        const previousCart = {
            ...cartItems
        };


        // Optimistic update
        setCartItems((prev) => ({

            ...prev,

            [itemId]:
                prev[itemId]
                    ? Number(prev[itemId]) + 1
                    : 1

        }));


        // Guest user
        if (!token) {
            return;
        }


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


            if (response.data.success) {

                // Backend becomes source of truth
                if (response.data.cartData) {

                    setCartItems(
                        response.data.cartData
                    );

                }

            } else {

                // Restore old cart
                setCartItems(
                    previousCart
                );

            }

        } catch {

            // Restore old cart if request fails
            setCartItems(
                previousCart
            );

        }

    };


    // ==================================================
    // REMOVE FROM CART
    // ==================================================

    const removeFromCart = async (itemId) => {

        if (!itemId) {
            return;
        }


        const previousCart = {
            ...cartItems
        };


        // Optimistic frontend update
        setCartItems((prev) => {

            const updatedCart = {
                ...prev
            };


            if (!updatedCart[itemId]) {

                return updatedCart;

            }


            if (
                Number(updatedCart[itemId]) > 1
            ) {

                updatedCart[itemId] =
                    Number(
                        updatedCart[itemId]
                    ) - 1;

            } else {

                delete updatedCart[itemId];

            }


            return updatedCart;

        });


        // Guest user
        if (!token) {
            return;
        }


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


            if (response.data.success) {

                if (response.data.cartData) {

                    setCartItems(
                        response.data.cartData
                    );

                }

            } else {

                // Restore old cart
                setCartItems(
                    previousCart
                );

            }

        } catch {

            // Restore old cart
            setCartItems(
                previousCart
            );

        }

    };


    // ==================================================
    // CALCULATE SUBTOTAL
    // ==================================================

    /*
        IMPORTANT:

        getTotalCartAmount()
        = subtotal EXCLUDING VAT

        Example:

        Products = 100 kr

        getTotalCartAmount()
        returns 100
    */

    const getTotalCartAmount = () => {

        let subtotal = 0;


        for (const itemId in cartItems) {

            const quantity =
                Number(
                    cartItems[itemId]
                );


            if (
                !Number.isFinite(quantity) ||
                quantity <= 0
            ) {

                continue;

            }


            const itemInfo =
                food_list.find(

                    (product) =>
                        product._id === itemId

                );


            if (!itemInfo) {
                continue;
            }


            const price =
                Number(
                    itemInfo.price
                );


            if (
                !Number.isFinite(price) ||
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
    // CALCULATE 6% VAT
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
    // CALCULATE FINAL TOTAL
    // ==================================================

    /*
        Example:

        Subtotal: 100 kr
        VAT 6%:      6 kr
        ----------------
        Total:     106 kr
    */

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


            if (response.data.success) {

                setFoodList(
                    response.data.data || []
                );

            }

        } catch {

            setFoodList([]);

        }

    };


    // ==================================================
    // LOAD USER CART
    // ==================================================

    const loadCartData = async (userToken) => {

        if (!userToken) {

            setCartItems({});

            return;

        }


        try {

            const response =
                await axios.post(

                    `${url}/api/cart/get`,

                    {},

                    {
                        headers: {
                            token: userToken
                        }
                    }

                );


            if (response.data.success) {

                setCartItems(
                    response.data.cartData || {}
                );

            } else {

                setCartItems({});

            }

        } catch {

            setCartItems({});

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

        // 0.06
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
            value={contextValue}
        >

            {props.children}

        </StoreContext.Provider>

    );

};


export default StoreContextProvider;