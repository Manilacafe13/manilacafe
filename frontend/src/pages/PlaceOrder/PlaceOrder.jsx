import React, {
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

import './PlaceOrder.css'
import { StoreContext } from '../../context/StoreContext'
import axios from 'axios'


const MAX_ITEM_QUANTITY = 99
const MAX_FIRST_NAME_LENGTH = 80
const MAX_LAST_NAME_LENGTH = 80
const MAX_EMAIL_LENGTH = 254
const MAX_PHONE_LENGTH = 30
const MAX_STREET_LENGTH = 150
const MAX_CITY_LENGTH = 100
const MAX_ZIPCODE_LENGTH = 20


const PlaceOrder = () => {


  const {
    getTotalCartAmount,
    getVatAmount,
    getTotalWithVat,
    token,
    cartItems,
    food_list,
    url
  } = useContext(StoreContext)




  // ======================================================
  // CUSTOMER DATA
  // ======================================================

  const [data, setData] = useState({

    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    zipcode: "",
    phone: ""

  })


  // ======================================================
  // DELIVERY METHOD
  // ======================================================

  /*
    pickup
    = kunden hämtar beställningen

    delivery
    = beställningen levereras
  */

  const [deliveryMethod, setDeliveryMethod] =
    useState("delivery")


  // ======================================================
  // DELIVERY / FULFILLMENT
  // ======================================================

  const [fulfillmentType, setFulfillmentType] =
    useState("next-day")


  const [requestedTime, setRequestedTime] =
    useState("16:00-17:00")


  const [largeOrderDate, setLargeOrderDate] =
    useState("")


  const [isLoading, setIsLoading] =
    useState(false)


  // ======================================================
  // FORM INPUT
  // ======================================================

  const onChangeHandler = (event) => {

    const {
      name,
      value
    } = event.target


    setData((prev) => ({

      ...prev,

      [name]:
        value

    }))

  }


  // ======================================================
  // TOTALS
  // ======================================================

  const subtotal =
    getTotalCartAmount()


  const vatAmount =
    getVatAmount()


  const total =
    getTotalWithVat()


  // ======================================================
  // TOTAL PRODUCT QUANTITY
  // ======================================================

  const totalQuantity =
    useMemo(() => {

      return Object.values(
        cartItems || {}
      ).reduce(
        (sum, quantity) => {

          const value =
            Number(quantity)


          return (
            sum +
            (
              Number.isFinite(value)
                ? value
                : 0
            )
          )

        },
        0
      )

    }, [cartItems])


  // ======================================================
  // LARGE ORDER
  // ======================================================

  const isLargeOrder =
    totalQuantity >= 10


  // ======================================================
  // SAME-DAY STOCK CHECK
  // ======================================================

  const sameDayAvailable =
    useMemo(() => {

      if (
        !cartItems ||
        Object.keys(cartItems).length === 0
      ) {

        return false

      }


      for (
        const [itemId, quantityValue]
        of Object.entries(cartItems)
      ) {

        const quantity =
          Number(quantityValue)


        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {

          continue

        }


        const product =
          food_list.find(
            (item) =>
              item._id === itemId
          )


        if (!product) {

          return false

        }


        const stock =
          Number(
            product.sameDayStock || 0
          )


        if (
          !Number.isFinite(stock) ||
          stock < quantity
        ) {

          return false

        }

      }


      return true

    }, [
      cartItems,
      food_list
    ])


  // ======================================================
  // FORCE LARGE ORDER FOR 10+ PRODUCTS
  // ======================================================

  useEffect(() => {

    if (isLargeOrder) {

      setFulfillmentType(
        "large-order"
      )

    }

  }, [isLargeOrder])


  // ======================================================
  // FALL BACK IF SAME-DAY BECOMES UNAVAILABLE
  // ======================================================

  useEffect(() => {

    if (
      fulfillmentType === "same-day" &&
      !sameDayAvailable
    ) {

      setFulfillmentType(
        "next-day"
      )

    }

  }, [
    sameDayAvailable,
    fulfillmentType
  ])


  // ======================================================
  // DATE HELPERS
  // ======================================================

  const formatLocalDate = (date) => {

    const year =
      date.getFullYear()


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      )


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      )


    return `${year}-${month}-${day}`

  }


  const getTodayDate = () => {

    return formatLocalDate(
      new Date()
    )

  }


  const getTomorrowDate = () => {

    const tomorrow =
      new Date()


    tomorrow.setDate(
      tomorrow.getDate() + 1
    )


    return formatLocalDate(
      tomorrow
    )

  }


  const getMinimumLargeOrderDate = () => {

    const minimumDate =
      new Date()


    minimumDate.setDate(
      minimumDate.getDate() + 2
    )


    return formatLocalDate(
      minimumDate
    )

  }


  // ======================================================
  // REQUESTED DATE
  // ======================================================

  const getRequestedDate = () => {

    if (
      fulfillmentType === "same-day"
    ) {

      return getTodayDate()

    }


    if (
      fulfillmentType === "next-day"
    ) {

      return getTomorrowDate()

    }


    return largeOrderDate

  }


  // ======================================================
  // FULFILLMENT LABEL
  // ======================================================

  const getFulfillmentLabel = () => {

    if (
      fulfillmentType === "same-day"
    ) {

      return "Idag"

    }


    if (
      fulfillmentType === "next-day"
    ) {

      return "Imorgon"

    }


    return "Större beställning"

  }


  // ======================================================
  // DELIVERY METHOD LABEL
  // ======================================================

  const getDeliveryMethodLabel = () => {

    if (
      deliveryMethod === "pickup"
    ) {

      return "Avhämtning"

    }


    return "Leverans"

  }


  // ======================================================
  // PLACE ORDER
  // ======================================================

  const placeOrder = async (event) => {

    event.preventDefault()


    if (isLoading) {

      return

    }


    // ==================================================
    // CHECK LOGIN
    // ==================================================

    if (!token) {

      alert(
        "Du måste logga in innan du kan lägga en beställning."
      )

      return

    }


    // ==================================================
    // CHECK CART
    // ==================================================

    if (
      !cartItems ||
      Object.keys(cartItems).length === 0 ||
      subtotal <= 0
    ) {

      alert(
        "Din varukorg är tom."
      )

      return

    }


    // ==================================================
    // CHECK CUSTOMER INFORMATION
    // ==================================================

    if (
      !data.firstName.trim() ||
      !data.lastName.trim() ||
      !data.email.trim() ||
      !data.phone.trim()
    ) {


    if (
  data.firstName.trim().length >
    MAX_FIRST_NAME_LENGTH ||
  data.lastName.trim().length >
    MAX_LAST_NAME_LENGTH
) {

  alert(
    "Förnamn eller efternamn är för långt."
  )

  return
}


if (
  data.email.trim().length >
  MAX_EMAIL_LENGTH
) {

  alert(
    "E-postadressen är för lång."
  )

  return
}


const phone =
  data.phone.trim()

const phoneDigits =
  phone.replace(/\D/g, "")


if (
  phone.length >
    MAX_PHONE_LENGTH ||
  !/^[0-9+\s()\-]+$/.test(phone) ||
  phoneDigits.length < 7 ||
  phoneDigits.length > 15
) {

  alert(
    "Ange ett giltigt telefonnummer."
  )

  return
}
      alert(
        "Fyll i namn, e-post och telefonnummer."
      )

      return

    }


    // ==================================================
    // CHECK DELIVERY ADDRESS
    // ==================================================

    if (
      deliveryMethod === "delivery" &&
      (
        !data.street.trim() ||
        !data.city.trim() ||
        !data.zipcode.trim()
      )
    ) {

      if (
  deliveryMethod === "delivery" &&
  (
    data.street.trim().length >
      MAX_STREET_LENGTH ||
    data.city.trim().length >
      MAX_CITY_LENGTH ||
    data.zipcode.trim().length >
      MAX_ZIPCODE_LENGTH
  )
) {

  alert(
    "Leveransadressen innehåller för långa uppgifter."
  )

  return
}

      alert(
        "Fyll i fullständig leveransadress."
      )

      return

    }


    // ==================================================
    // SAME-DAY CHECK
    // ==================================================

    if (
      fulfillmentType === "same-day" &&
      !sameDayAvailable
    ) {

      alert(
        "Alla produkter i din beställning finns inte tillgängliga idag. Välj imorgon istället."
      )

      return

    }


    // ==================================================
    // LARGE ORDER DATE CHECK
    // ==================================================

    if (
      fulfillmentType === "large-order"
    ) {

      if (!largeOrderDate) {

        alert(
          "Välj ett datum för din större beställning."
        )

        return

      }


      if (
        largeOrderDate <
        getMinimumLargeOrderDate()
      ) {

        alert(
          "Större beställningar måste göras minst 48 timmar i förväg."
        )

        return

      }

    }


    // ==================================================
    // TIME CHECK
    // ==================================================

    if (!requestedTime) {

      alert(
        "Välj en tid för din beställning."
      )

      return

    }


    try {

      setIsLoading(true)


      // ==================================================
      // CREATE ORDER ITEMS FROM CART
      // ==================================================

      const orderItems =
        Object.entries(cartItems)

          .filter(
            ([itemId, quantity]) =>
              itemId &&
              Number(quantity) > 0
          )

          .map(
            ([itemId, quantity]) => ({

              itemId,

              quantity:
                Number(quantity)

            })
          )


      // ==================================================
      // CHECK ORDER ITEMS
      // ==================================================

      if (
        orderItems.length === 0
      ) {

        alert(
          "Din varukorg är tom."
        )

        return

      }


      const invalidItem =
  orderItems.find(
    (item) =>
      !Number.isInteger(
        item.quantity
      ) ||
      item.quantity <= 0 ||
      item.quantity >
        MAX_ITEM_QUANTITY
  )


      if (invalidItem) {

        console.log(
          "Invalid order item:",
          invalidItem
        )


        alert(
          "Ett fel uppstod med antalet produkter i varukorgen."
        )

        return

      }


      // ==================================================
      // ORDER DATA
      // ==================================================

      const orderData = {

        // ================================================
        // CUSTOMER / ADDRESS
        // ================================================

        address: {

          firstName:
            data.firstName.trim(),

          lastName:
            data.lastName.trim(),

          email:
            data.email
              .trim()
              .toLowerCase(),

          phone:
            data.phone.trim(),


          // Endast relevanta vid leverans
          street:
            deliveryMethod === "delivery"
              ? data.street.trim()
              : "",

          city:
            deliveryMethod === "delivery"
              ? data.city.trim()
              : "",

          zipcode:
            deliveryMethod === "delivery"
              ? data.zipcode.trim()
              : ""

        },


        // ================================================
        // PRODUCTS
        // ================================================

        items:
          orderItems,


        // ================================================
        // PICKUP / DELIVERY
        // ================================================

        deliveryMethod,


        // ================================================
        // FULFILLMENT
        // ================================================

        fulfillmentType,

        requestedDate:
          getRequestedDate(),

        requestedTime

      }


      console.log(
        "Order sent to backend:",
        orderData
      )


      // ==================================================
      // SEND ORDER
      // ==================================================

      const response =
        await axios.post(

          `${url}/api/order/place`,

          orderData,

          {
            headers: {
              token
            }
          }

        )


      // ==================================================
      // STRIPE
      // ==================================================

      if (
        response.data.success
      ) {

        const sessionUrl =
          response.data.session_url


        if (!sessionUrl) {

          alert(
            "Betalningslänken kunde inte skapas."
          )

          return

        }


        window.location.replace(
          sessionUrl
        )


        return

      }


      alert(
        response.data.message ||
        "Beställningen kunde inte skapas."
      )


    } catch (error) {

      console.log(
        "Order error:",
        error.response?.data ||
        error.message
      )


      alert(
        error.response?.data?.message ||
        "Något gick fel när beställningen skulle skapas."
      )


    } finally {

      setIsLoading(false)

    }

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <form
      className="place-order"
      onSubmit={placeOrder}
    >


      {/* ================================================ */}
      {/* LEFT */}
      {/* ================================================ */}

      <div className="place-order-left">


        {/* ============================================== */}
        {/* CUSTOMER INFORMATION */}
        {/* ============================================== */}

        <p className="title">
          Dina uppgifter
        </p>


        <div className="Alternativ">


          <input
            name="firstName"
            onChange={onChangeHandler}
            value={data.firstName}
            type="text"
            placeholder="Förnamn"
            autoComplete="given-name"
            required
          />


          <input
            name="lastName"
            onChange={onChangeHandler}
            value={data.lastName}
            type="text"
            placeholder="Efternamn"
            autoComplete="family-name"
            required
          />


        </div>


        <input
          name="email"
          onChange={onChangeHandler}
          value={data.email}
          type="email"
          placeholder="E-post"
          autoComplete="email"
          required
        />


        <input
          name="phone"
          onChange={onChangeHandler}
          value={data.phone}
          type="tel"
          placeholder="Telefonnummer"
          autoComplete="tel"
          required
        />


        {/* ============================================== */}
        {/* PICKUP / DELIVERY */}
        {/* ============================================== */}

        <div className="delivery-method-section">


          <p className="delivery-title">
            Hur vill du få din beställning?
          </p>


          <p className="delivery-description">
            Välj avhämtning eller leverans.
          </p>


          <div className="delivery-method-options">


            {/* PICKUP */}

            <label
              className={
                `delivery-method-option ${
                  deliveryMethod === "pickup"
                    ? "active"
                    : ""
                }`
              }
            >

              <input
                type="radio"
                name="deliveryMethod"
                value="pickup"
                checked={
                  deliveryMethod ===
                  "pickup"
                }
                onChange={(event) =>
                  setDeliveryMethod(
                    event.target.value
                  )
                }
              />


              <div>

                <strong>
                  Avhämtning
                </strong>

                <span>
                  Hämta din beställning hos oss
                </span>

              </div>

            </label>


            {/* DELIVERY */}

            <label
              className={
                `delivery-method-option ${
                  deliveryMethod === "delivery"
                    ? "active"
                    : ""
                }`
              }
            >

              <input
                type="radio"
                name="deliveryMethod"
                value="delivery"
                checked={
                  deliveryMethod ===
                  "delivery"
                }
                onChange={(event) =>
                  setDeliveryMethod(
                    event.target.value
                  )
                }
              />


              <div>

                <strong>
                  Leverans
                </strong>

                <span>
                  Få beställningen levererad till din adress
                </span>

              </div>

            </label>


          </div>


        </div>


        <input
  name="street"
  onChange={onChangeHandler}
  value={data.street}
  type="text"
  placeholder="Gatuadress"
  autoComplete="street-address"
  maxLength={MAX_STREET_LENGTH}
  required
/>


<div className="Alternativ">


  <input
    name="city"
    onChange={onChangeHandler}
    value={data.city}
    type="text"
    placeholder="Stad"
    autoComplete="address-level2"
    maxLength={MAX_CITY_LENGTH}
    required
  />


  <input
    name="zipcode"
    onChange={onChangeHandler}
    value={data.zipcode}
    type="text"
    placeholder="Postnummer"
    autoComplete="postal-code"
    maxLength={MAX_ZIPCODE_LENGTH}
    required
  />


</div>

        {/* ============================================== */}
        {/* FULFILLMENT */}
        {/* ============================================== */}

        <div className="delivery-section">


          <p className="delivery-title">
            När vill du ha din beställning?
          </p>


          <p className="delivery-description">
            Välj det alternativ som passar dig bäst.
          </p>


          <div className="delivery-options">


            {/* SAME DAY */}

            <label
              className={
                `delivery-option ${
                  fulfillmentType === "same-day"
                    ? "active"
                    : ""
                } ${
                  !sameDayAvailable ||
                  isLargeOrder
                    ? "disabled"
                    : ""
                }`
              }
            >

              <input
                type="radio"
                name="fulfillmentType"
                value="same-day"
                checked={
                  fulfillmentType ===
                  "same-day"
                }
                disabled={
                  !sameDayAvailable ||
                  isLargeOrder
                }
                onChange={(event) =>
                  setFulfillmentType(
                    event.target.value
                  )
                }
              />


              <div>

                <strong>
                  Idag
                </strong>

                <span>

                  {
                    sameDayAvailable
                      ? "Finns tillgängligt idag"
                      : "Inte tillgängligt idag"
                  }

                </span>

              </div>

            </label>


            {/* NEXT DAY */}

            <label
              className={
                `delivery-option ${
                  fulfillmentType === "next-day"
                    ? "active"
                    : ""
                } ${
                  isLargeOrder
                    ? "disabled"
                    : ""
                }`
              }
            >

              <input
                type="radio"
                name="fulfillmentType"
                value="next-day"
                checked={
                  fulfillmentType ===
                  "next-day"
                }
                disabled={
                  isLargeOrder
                }
                onChange={(event) =>
                  setFulfillmentType(
                    event.target.value
                  )
                }
              />


              <div>

                <strong>
                  Imorgon
                </strong>

                <span>
                  Vårt vanligaste alternativ
                </span>

              </div>

            </label>


            {/* LARGE ORDER */}

            <label
              className={
                `delivery-option ${
                  fulfillmentType === "large-order"
                    ? "active"
                    : ""
                }`
              }
            >

              <input
                type="radio"
                name="fulfillmentType"
                value="large-order"
                checked={
                  fulfillmentType ===
                  "large-order"
                }
                onChange={(event) =>
                  setFulfillmentType(
                    event.target.value
                  )
                }
              />


              <div>

                <strong>
                  Större beställning
                </strong>

                <span>
                  Minst 48 timmar i förväg
                </span>

              </div>

            </label>


          </div>


          {/* ============================================ */}
          {/* LARGE ORDER NOTICE */}
          {/* ============================================ */}

          {isLargeOrder && (

            <div className="large-order-notice">

              Din varukorg innehåller
              {" "}

              <strong>
                {totalQuantity} produkter
              </strong>

              .

              Större beställningar kräver
              minst 48 timmars framförhållning.

            </div>

          )}


          {/* ============================================ */}
          {/* LARGE ORDER DATE */}
          {/* ============================================ */}

          {fulfillmentType ===
            "large-order" && (

            <div className="delivery-date-field">

              <label>
                Välj datum
              </label>

              <input
                type="date"
                value={largeOrderDate}
                min={
                  getMinimumLargeOrderDate()
                }
                onChange={(event) =>
                  setLargeOrderDate(
                    event.target.value
                  )
                }
                required
              />

            </div>

          )}


          {/* ============================================ */}
          {/* TIME */}
          {/* ============================================ */}

          <div className="delivery-time-field">

            <label>

              {
                deliveryMethod === "pickup"
                  ? "Välj tid för avhämtning"
                  : "Välj tid för leverans"
              }

            </label>


            <select
              value={requestedTime}
              onChange={(event) =>
                setRequestedTime(
                  event.target.value
                )
              }
              required
            >

              <option value="15:00-16:00">
                15:00 – 16:00
              </option>

              <option value="16:00-17:00">
                16:00 – 17:00
              </option>

              <option value="17:00-18:00">
                17:00 – 18:00
              </option>

              <option value="18:00-19:00">
                18:00 – 19:00
              </option>

            </select>

          </div>


        </div>


      </div>


      {/* ================================================ */}
      {/* RIGHT */}
      {/* ================================================ */}

      <div className="place-order-right">


        <div className="cart-total">


          <h2>
            Din beställning
          </h2>


          {/* ============================================ */}
          {/* ORDER SUMMARY */}
          {/* ============================================ */}

          <div className="checkout-delivery-summary">


            <div className="checkout-summary-item">

              <p>
                Mottagande
              </p>

              <strong>
                {getDeliveryMethodLabel()}
              </strong>

            </div>


            <div className="checkout-summary-item">

              <p>
                När
              </p>

              <strong>
                {getFulfillmentLabel()}
              </strong>

              {getRequestedDate() && (

                <span>

                  {getRequestedDate()}

                  {" • "}

                  {requestedTime}

                </span>

              )}

            </div>


          </div>


          {/* ============================================ */}
          {/* TOTALS */}
          {/* ============================================ */}

          <div>


            <div className="cart-total-details">

              <p>
                Delsumma
              </p>

              <p>
                {subtotal.toFixed(2)} kr
              </p>

            </div>


            <hr />


            <div className="cart-total-details">

              <p>
                Moms (6%)
              </p>

              <p>
                {vatAmount.toFixed(2)} kr
              </p>

            </div>


            <hr />


            <div className="cart-total-details">

              <b>
                Totalt
              </b>

              <b>
                {total.toFixed(2)} kr
              </b>

            </div>


          </div>


          {/* ============================================ */}
          {/* PAYMENT */}
          {/* ============================================ */}

          <button

            type="submit"

            disabled={
              subtotal <= 0 ||
              isLoading
            }

          >

            {
              isLoading
                ? "Skapar betalning..."
                : `Till betalning – ${total.toFixed(2)} kr`
            }

          </button>


        </div>


      </div>


    </form>

  )

}


export default PlaceOrder