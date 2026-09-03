import React, {
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import './MyOrders.css'

import {
  useNavigate
} from 'react-router-dom'

import {
  StoreContext
} from '../../context/StoreContext'

import axios from 'axios'


const MyOrders = () => {

  const {
    url,
    token
  } = useContext(StoreContext)


  const navigate =
    useNavigate()


  const [orders, setOrders] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")


  // ======================================================
  // FETCH USER ORDERS
  // ======================================================

  const fetchOrders =
    useCallback(async () => {

      if (!token) {

        setOrders([])
        setLoading(false)

        setError(
          "Du måste vara inloggad för att se dina beställningar."
        )

        return
      }


      try {

        setLoading(true)
        setError("")


        const response =
          await axios.post(

            `${url}/api/order/userorders`,

            {},

            {
              headers: {
                token
              }
            }

          )


        if (response.data.success) {

          const orderData =
            Array.isArray(response.data.data)
              ? response.data.data
              : []


          setOrders(orderData)

        } else {

          setOrders([])

          setError(
            response.data.message ||
            "Kunde inte hämta dina beställningar."
          )

        }


      } catch (error) {




        setOrders([])


        if (
          error.response?.status === 401
        ) {

          setError(
            "Din inloggning har gått ut. Logga in igen."
          )

        } else {

          setError(
            error.response?.data?.message ||
            "Något gick fel när dina beställningar skulle hämtas."
          )

        }


      } finally {

        setLoading(false)

      }

    }, [
      token,
      url
    ])


  // ======================================================
  // LOAD ORDERS
  // ======================================================

  useEffect(() => {

    fetchOrders()

  }, [fetchOrders])


  // ======================================================
  // FORMAT ORDER DATE
  // ======================================================

  const formatDate = (
    date
  ) => {

    if (!date) {

      return "Datum saknas"

    }


    const parsedDate =
      new Date(date)


    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {

      return "Datum saknas"

    }


    return parsedDate.toLocaleString(
      "sv-SE",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    )

  }


  // ======================================================
  // FORMAT REQUESTED DATE
  // ======================================================

  const formatRequestedDate = (
    date
  ) => {

    if (!date) {

      return "Ej angivet"

    }


    const parsedDate =
      new Date(date)


    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {

      return "Ej angivet"

    }


    return parsedDate.toLocaleDateString(
      "sv-SE",
      {
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    )

  }


  // ======================================================
  // FORMAT PRICE
  // ======================================================

  const formatPrice = (
    price
  ) => {

    const value =
      Number(price)


    if (
      !Number.isFinite(value)
    ) {

      return "0,00 kr"

    }


    return (
      value.toLocaleString(
        "sv-SE",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      ) +
      " kr"
    )

  }


  // ======================================================
  // DELIVERY METHOD
  // ======================================================

  const getDeliveryMethod = (
    deliveryMethod
  ) => {

    /*
      Äldre beställningar skapades
      innan pickup / delivery infördes.

      De hade leveransadress och
      behandlas därför som delivery.
    */

    if (
      deliveryMethod === "pickup"
    ) {

      return "pickup"

    }


    return "delivery"

  }


  // ======================================================
  // DELIVERY METHOD LABEL
  // ======================================================

  const getDeliveryMethodLabel = (
    deliveryMethod
  ) => {

    if (
      getDeliveryMethod(
        deliveryMethod
      ) === "pickup"
    ) {

      return "Avhämtning"

    }


    return "Leverans"

  }


  // ======================================================
  // DELIVERY METHOD CLASS
  // ======================================================

  const getDeliveryMethodClass = (
    deliveryMethod
  ) => {

    if (
      getDeliveryMethod(
        deliveryMethod
      ) === "pickup"
    ) {

      return "pickup"

    }


    return "delivery"

  }


  // ======================================================
  // FULFILLMENT LABEL
  // ======================================================

  const getFulfillmentLabel = (
    fulfillmentType
  ) => {

    switch (
      fulfillmentType
    ) {

      case "same-day":

        return "Idag"


      case "next-day":

        return "Imorgon"


      case "large-order":

        return "Större beställning"


      default:

        return "Ej angivet"

    }

  }


  // ======================================================
  // FULFILLMENT CLASS
  // ======================================================

  const getFulfillmentClass = (
    fulfillmentType
  ) => {

    switch (
      fulfillmentType
    ) {

      case "same-day":

        return "same-day"


      case "next-day":

        return "next-day"


      case "large-order":

        return "large-order"


      default:

        return ""

    }

  }


  // ======================================================
  // TOTAL QUANTITY
  // ======================================================

  const getTotalQuantity = (
    items
  ) => {

    if (
      !Array.isArray(items)
    ) {

      return 0

    }


    return items.reduce(
      (
        total,
        item
      ) => {

        const quantity =
          Number(
            item.quantity
          )


        if (
          !Number.isFinite(
            quantity
          )
        ) {

          return total

        }


        return (
          total +
          quantity
        )

      },
      0
    )

  }


  // ======================================================
  // STATUS CLASS
  // ======================================================

  const getStatusClass = (
    status
  ) => {

    const normalizedStatus =
      String(
        status || ""
      ).toLowerCase()


    if (
      normalizedStatus.includes(
        "lagerkontroll"
      )
    ) {

      return "status-warning"

    }


    if (
      normalizedStatus.includes(
        "avbruten"
      )
    ) {

      return "status-cancelled"

    }


    if (
      normalizedStatus.includes(
        "levererad"
      ) ||
      normalizedStatus.includes(
        "upphämtad"
      ) ||
      normalizedStatus.includes(
        "klar"
      ) ||
      normalizedStatus.includes(
        "redo"
      )
    ) {

      return "status-completed"

    }


    if (
      normalizedStatus.includes(
        "mottagen"
      ) ||
      normalizedStatus.includes(
        "betald"
      )
    ) {

      return "status-success"

    }


    return "status-processing"

  }


  // ======================================================
  // CUSTOMER STATUS TEXT
  // ======================================================

  const getStatusText = (
    status
  ) => {

    if (
      status ===
      "Betalning mottagen - lagerkontroll krävs"
    ) {

      return "Betalning mottagen"

    }


    return (
      status ||
      "Behandlas"
    )

  }


  // ======================================================
  // ORDER NUMBER
  // ======================================================

  const getOrderNumber = (
    orderId
  ) => {

    if (!orderId) {

      return "Okänd order"

    }


    return (
      `#${String(orderId)
        .slice(-8)
        .toUpperCase()}`
    )

  }


  // ======================================================
  // NOT LOGGED IN
  // ======================================================

  if (
    !token &&
    !loading
  ) {

    return (

      <div className="my-orders">

        <div className="my-orders-message">

          <h2>
            Mina beställningar
          </h2>

          <p>
            Du måste vara inloggad för att
            se dina beställningar.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
          >
            Till startsidan
          </button>

        </div>

      </div>

    )

  }


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return (

      <div className="my-orders">

        <div className="orders-loading">

          <div className="orders-loader">
          </div>

          <p>
            Hämtar dina beställningar...
          </p>

        </div>

      </div>

    )

  }


  // ======================================================
  // ERROR
  // ======================================================

  if (error) {

    return (

      <div className="my-orders">

        <div className="my-orders-message error-message">

          <h2>
            Något gick fel
          </h2>

          <p>
            {error}
          </p>


          <div className="my-orders-error-actions">

            {token && (

              <button
                type="button"
                onClick={fetchOrders}
              >
                Försök igen
              </button>

            )}


            <button
              type="button"
              onClick={() =>
                navigate("/")
              }
            >
              Till startsidan
            </button>

          </div>

        </div>

      </div>

    )

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <div className="my-orders">


      {/* ================================================ */}
      {/* HEADER */}
      {/* ================================================ */}

      <div className="my-orders-header">


        <div>

          <h1>
            Mina beställningar
          </h1>

          <p>
            Här kan du se dina aktuella
            och tidigare beställningar.
          </p>

        </div>


        {orders.length > 0 && (

          <button
            type="button"
            className="refresh-orders"
            onClick={fetchOrders}
          >
            Uppdatera
          </button>

        )}


      </div>


      {/* ================================================ */}
      {/* NO ORDERS */}
      {/* ================================================ */}

      {orders.length === 0 ? (

        <div className="no-orders">

          <div className="no-orders-icon">
            📦
          </div>

          <h2>
            Du har inga beställningar ännu
          </h2>

          <p>
            När du har lagt och betalat
            en beställning kommer den att
            visas här.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
          >
            Utforska menyn
          </button>

        </div>

      ) : (

        <div className="orders-list">


          {orders.map((order) => {

            const deliveryMethod =
              getDeliveryMethod(
                order.deliveryMethod
              )


            const isPickup =
              deliveryMethod === "pickup"


            return (

              <div
                className="order-card"
                key={order._id}
              >


                {/* ====================================== */}
                {/* ORDER HEADER */}
                {/* ====================================== */}

                <div className="order-card-header">


                  <div>

                    <p className="order-label">
                      Ordernummer
                    </p>

                    <p className="order-id">

                      {getOrderNumber(
                        order._id
                      )}

                    </p>

                  </div>


                  <div className="order-date">

                    <p className="order-label">
                      Beställd
                    </p>

                    <p>

                      {formatDate(
                        order.createdAt ||
                        order.date
                      )}

                    </p>

                  </div>


                  <span
                    className={
                      `order-status ${getStatusClass(
                        order.status
                      )}`
                    }
                  >

                    {getStatusText(
                      order.status
                    )}

                  </span>


                </div>


                {/* ====================================== */}
                {/* DELIVERY / FULFILLMENT */}
                {/* ====================================== */}

                <div className="order-fulfillment">


                  {/* DELIVERY METHOD */}

                  <div className="order-fulfillment-item">

                    <span className="order-label">
                      Mottagande
                    </span>

                    <strong
                      className={
                        `order-delivery-method-badge ${
                          getDeliveryMethodClass(
                            order.deliveryMethod
                          )
                        }`
                      }
                    >

                      {getDeliveryMethodLabel(
                        order.deliveryMethod
                      )}

                    </strong>

                  </div>


                  {/* ORDER TYPE */}

                  <div className="order-fulfillment-item">

                    <span className="order-label">
                      Beställning
                    </span>

                    <strong
                      className={
                        `order-fulfillment-badge ${
                          getFulfillmentClass(
                            order.fulfillmentType
                          )
                        }`
                      }
                    >

                      {getFulfillmentLabel(
                        order.fulfillmentType
                      )}

                    </strong>

                  </div>


                  {/* DATE */}

                  <div className="order-fulfillment-item">

                    <span className="order-label">
                      Datum
                    </span>

                    <strong>

                      {formatRequestedDate(
                        order.requestedDate
                      )}

                    </strong>

                  </div>


                  {/* TIME */}

                  <div className="order-fulfillment-item">

                    <span className="order-label">

                      {
                        isPickup
                          ? "Tid för avhämtning"
                          : "Tid för leverans"
                      }

                    </span>

                    <strong>

                      {order.requestedTime ||
                        "Ej angivet"}

                    </strong>

                  </div>


                  {/* QUANTITY */}

                  <div className="order-fulfillment-item">

                    <span className="order-label">
                      Antal produkter
                    </span>

                    <strong>

                      {getTotalQuantity(
                        order.items
                      )}

                    </strong>

                  </div>


                </div>


                {/* ====================================== */}
                {/* DELIVERY / PICKUP DETAILS */}
                {/* ====================================== */}

                {isPickup ? (

                  <div className="order-method-information pickup-information">

                    <strong>
                      Avhämtning
                    </strong>

                    <p>
                      Du hämtar själv din beställning.
                    </p>

                    <span>

                      {formatRequestedDate(
                        order.requestedDate
                      )}

                      {" • "}

                      {order.requestedTime ||
                        "Tid ej angiven"}

                    </span>

                  </div>

                ) : (

                  <div className="order-method-information delivery-information">

                    <strong>
                      Leverans
                    </strong>

                    <p>
                      Beställningen levereras till:
                    </p>

                    <span>

                      {order.address?.street ||
                        "Adress saknas"}

                    </span>

                    <span>

                      {order.address?.zipcode || ""}

                      {" "}

                      {order.address?.city || ""}

                    </span>

                  </div>

                )}


                {/* ====================================== */}
                {/* STOCK NOTICE */}
                {/* ====================================== */}

                {order.status ===
                  "Betalning mottagen - lagerkontroll krävs" && (

                  <div className="order-stock-notice">

                    <strong>
                      Din betalning är mottagen
                    </strong>

                    <p>
                      Vi kontrollerar tillgängligheten
                      för din beställning och uppdaterar
                      orderstatusen så snart den är
                      bekräftad.
                    </p>

                  </div>

                )}


                {/* ====================================== */}
                {/* PRODUCTS */}
                {/* ====================================== */}

                <div className="order-products">


                  {Array.isArray(
                    order.items
                  ) &&
                    order.items.map(
                      (
                        item,
                        index
                      ) => {

                        const quantity =
                          Number(
                            item.quantity || 0
                          )


                        const price =
                          Number(
                            item.price || 0
                          )


                        const productTotal =
                          price *
                          quantity


                        return (

                          <div
                            className="order-product"
                            key={
                              item._id ||
                              `${order._id}-${index}`
                            }
                          >


                            {/* IMAGE */}

                            {item.image ? (

                              <img
                                src={
                                  `${url}/images/${item.image}`
                                }
                                alt={
                                  item.name ||
                                  "Produkt"
                                }
                              />

                            ) : (

                              <div className="order-product-placeholder">
                                📦
                              </div>

                            )}


                            {/* PRODUCT INFO */}

                            <div className="order-product-info">

                              <h3>

                                {item.name ||
                                  "Produkt"}

                              </h3>

                              <p>
                                Antal: {quantity}
                              </p>

                              <p className="order-unit-price">

                                {formatPrice(
                                  price
                                )}

                                {" / st"}

                              </p>

                            </div>


                            {/* TOTAL */}

                            <p className="order-product-price">

                              {formatPrice(
                                productTotal
                              )}

                            </p>


                          </div>

                        )

                      }
                    )}


                </div>


                {/* ====================================== */}
                {/* ORDER SUMMARY */}
                {/* ====================================== */}

                <div className="order-summary">


                  <div className="order-summary-row">

                    <span>
                      Delsumma
                    </span>

                    <span>

                      {formatPrice(
                        order.subtotal
                      )}

                    </span>

                  </div>


                  <div className="order-summary-row">

                    <span>
                      Moms ({order.vatRate || 6}%)
                    </span>

                    <span>

                      {formatPrice(
                        order.vatAmount
                      )}

                    </span>

                  </div>


                  <div className="order-summary-row order-total">

                    <strong>
                      Totalt
                    </strong>

                    <strong>

                      {formatPrice(
                        order.amount
                      )}

                    </strong>

                  </div>


                </div>


                {/* ====================================== */}
                {/* PAYMENT INFORMATION */}
                {/* ====================================== */}

                <div className="order-footer">


                  <div>

                    <span className="order-footer-label">
                      Betalning
                    </span>

                    <span
                      className={
                        order.payment
                          ? "payment-paid"
                          : "payment-unpaid"
                      }
                    >

                      {
                        order.payment
                          ? "Betald"
                          : "Ej betald"
                      }

                    </span>

                  </div>


                  <div>

                    <span className="order-footer-label">
                      Betalningsmetod
                    </span>

                    <span>

                      {order.paymentMethod ||
                        "Stripe"}

                    </span>

                  </div>


                </div>


              </div>

            )

          })}


        </div>

      )}


    </div>

  )

}


export default MyOrders