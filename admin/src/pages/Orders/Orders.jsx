import React, {
  useCallback,
  useEffect,
  useState
} from 'react'

import './Orders.css'
import axios from 'axios'


const Orders = ({ url }) => {

  // ======================================================
  // BACKEND URL
  // ======================================================

  const backendUrl = (
    url ||
    import.meta.env.VITE_API_URL ||
    ""
  ).replace(/\/+$/, "")


  // ======================================================
  // STATES
  // ======================================================

  const [orders, setOrders] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [updatingOrder, setUpdatingOrder] =
    useState(null)


  // ======================================================
  // GET ADMIN TOKEN
  // ======================================================

  const getToken = () => {

    return localStorage.getItem(
      "token"
    )

  }


  // ======================================================
  // PRODUCT IMAGE URL
  // ======================================================

  const getImageUrl = (image) => {

    if (!image) {
      return ""
    }


    const imageValue =
      String(image).trim()


    if (
      imageValue.startsWith("http://") ||
      imageValue.startsWith("https://")
    ) {

      return imageValue

    }


    if (
      imageValue.startsWith("//")
    ) {

      return `https:${imageValue}`

    }


    return `${backendUrl}/images/${imageValue}`

  }


  // ======================================================
  // FETCH ALL ORDERS
  // ======================================================

  const fetchAllOrders =
    useCallback(async () => {

      const token =
        getToken()


      if (!token) {

        setLoading(false)

        setError(
          "Du måste vara inloggad som administratör."
        )

        return

      }


      if (!backendUrl) {

        setLoading(false)

        setError(
          "Backend-adressen saknas."
        )

        return

      }


      try {

        setLoading(true)

        setError("")


        const response =
          await axios.get(

            `${backendUrl}/api/order/list`,

            {
              headers: {
                token
              }
            }

          )


        if (
          response.data.success
        ) {

          setOrders(

            Array.isArray(
              response.data.data
            )
              ? response.data.data
              : []

          )

        } else {

          setOrders([])

          setError(
            response.data.message ||
            "Beställningarna kunde inte hämtas."
          )

        }


      } catch (error) {

        console.log(
          "Admin orders error:",
          error.response?.data ||
          error.message
        )


        setOrders([])


        if (
          error.response?.status === 401
        ) {

          setError(
            "Du måste logga in igen."
          )

        } else if (
          error.response?.status === 403
        ) {

          setError(
            "Du har inte administratörsbehörighet."
          )

        } else {

          setError(
            error.response?.data?.message ||
            "Något gick fel när beställningarna skulle hämtas."
          )

        }


      } finally {

        setLoading(false)

      }

    }, [backendUrl])


  // ======================================================
  // LOAD ORDERS
  // ======================================================

  useEffect(() => {

    fetchAllOrders()

  }, [fetchAllOrders])


  // ======================================================
  // UPDATE ORDER STATUS
  // ======================================================

  const updateStatus = async (
    orderId,
    status
  ) => {

    const token =
      getToken()


    if (!token) {

      setError(
        "Du måste vara inloggad som administratör."
      )

      return

    }


    if (!backendUrl) {

      setError(
        "Backend-adressen saknas."
      )

      return

    }


    try {

      setUpdatingOrder(
        orderId
      )


      const response =
        await axios.post(

          `${backendUrl}/api/order/status`,

          {
            orderId,
            status
          },

          {
            headers: {
              token
            }
          }

        )


      if (
        response.data.success
      ) {

        setOrders((prevOrders) =>

          prevOrders.map((order) =>

            order._id === orderId

              ? {
                  ...order,

                  status:
                    response.data.data?.status ||
                    status
                }

              : order

          )

        )

      } else {

        alert(
          response.data.message ||
          "Orderstatus kunde inte uppdateras."
        )

      }


    } catch (error) {

      console.log(
        "Update order status error:",
        error.response?.data ||
        error.message
      )


      if (
        error.response?.status === 401
      ) {

        alert(
          "Din inloggning har gått ut. Logga in igen."
        )

        return

      }


      if (
        error.response?.status === 403
      ) {

        alert(
          "Du har inte administratörsbehörighet."
        )

        return

      }


      alert(
        error.response?.data?.message ||
        "Något gick fel när orderstatus skulle uppdateras."
      )


    } finally {

      setUpdatingOrder(
        null
      )

    }

  }


  // ======================================================
  // FORMAT PRICE
  // ======================================================

  const formatPrice = (
    price
  ) => {

    const value =
      Number(
        price
      )


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
      ) + " kr"
    )

  }


  // ======================================================
  // FORMAT CREATED DATE
  // ======================================================

  const formatDate = (
    date
  ) => {

    if (!date) {

      return "Datum saknas"

    }


    const parsedDate =
      new Date(
        date
      )


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
        month: "short",
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
      new Date(
        date
      )


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
  // DELIVERY METHOD
  // ======================================================

  const getDeliveryMethod = (
    deliveryMethod
  ) => {

    /*
      Äldre beställningar skapades innan
      pickup / delivery infördes.

      Dessa behandlas som delivery eftersom
      de tidigare alltid hade leveransadress.
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
  // SHORT ORDER ID
  // ======================================================

  const getOrderNumber = (
    orderId
  ) => {

    if (!orderId) {

      return "-"

    }


    return (
      "#" +
      String(orderId)
        .slice(-8)
        .toUpperCase()
    )

  }


  // ======================================================
  // TOTAL PRODUCT QUANTITY
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
      (total, item) => {

        const quantity =
          Number(
            item.quantity
          )


        return (
          total +
          (
            Number.isFinite(quantity)
              ? quantity
              : 0
          )
        )

      },
      0
    )

  }


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return (

      <div className="orders">

        <div className="orders-loading">

          <div className="orders-loader">
          </div>

          <p>
            Hämtar beställningar...
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

      <div className="orders">

        <div className="orders-message">

          <h2>
            Kunde inte hämta beställningar
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={fetchAllOrders}
          >
            Försök igen
          </button>

        </div>

      </div>

    )

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <div className="orders">


      {/* ================================================ */}
      {/* HEADER */}
      {/* ================================================ */}

      <div className="orders-header">

        <div>

          <h1>
            Beställningar
          </h1>

          <p>
            Hantera kundernas beställningar.
          </p>

        </div>


        <div className="orders-header-right">

          <span className="orders-count">

            {orders.length}

            {" "}

            {
              orders.length === 1
                ? "beställning"
                : "beställningar"
            }

          </span>


          <button
            type="button"
            className="refresh-orders-button"
            onClick={fetchAllOrders}
          >
            Uppdatera
          </button>

        </div>

      </div>


      {/* ================================================ */}
      {/* NO ORDERS */}
      {/* ================================================ */}

      {orders.length === 0 ? (

        <div className="orders-empty">

          <div className="orders-empty-icon">
            📦
          </div>

          <h2>
            Inga beställningar ännu
          </h2>

          <p>
            När en kund gör en beställning
            kommer den att visas här.
          </p>

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
                className="admin-order-card"
                key={order._id}
              >


                {/* ====================================== */}
                {/* ORDER HEADER */}
                {/* ====================================== */}

                <div className="admin-order-header">


                  <div>

                    <span className="admin-order-label">
                      Ordernummer
                    </span>

                    <strong className="admin-order-number">

                      {getOrderNumber(
                        order._id
                      )}

                    </strong>

                  </div>


                  <div>

                    <span className="admin-order-label">
                      Beställd
                    </span>

                    <span>

                      {formatDate(
                        order.createdAt ||
                        order.date
                      )}

                    </span>

                  </div>


                  <div>

                    <span className="admin-order-label">
                      Betalning
                    </span>

                    <span
                      className={
                        order.payment
                          ? "admin-payment-paid"
                          : "admin-payment-unpaid"
                      }
                    >

                      {
                        order.payment
                          ? "Betald"
                          : "Ej betald"
                      }

                    </span>

                  </div>


                </div>


                {/* ====================================== */}
                {/* ORDER INFORMATION */}
                {/* ====================================== */}

                <div className="admin-order-fulfillment">


                  <div>

                    <span className="admin-order-label">
                      Mottagande
                    </span>

                    <strong
                      className={
                        `delivery-method-badge ${
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


                  <div>

                    <span className="admin-order-label">
                      Beställningstyp
                    </span>

                    <strong
                      className={
                        `fulfillment-badge ${
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


                  <div>

                    <span className="admin-order-label">
                      Önskat datum
                    </span>

                    <strong>

                      {formatRequestedDate(
                        order.requestedDate
                      )}

                    </strong>

                  </div>


                  <div>

                    <span className="admin-order-label">

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


                  <div>

                    <span className="admin-order-label">
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
                {/* STOCK WARNING */}
                {/* ====================================== */}

                {order.status ===
                  "Betalning mottagen - lagerkontroll krävs" && (

                  <div className="admin-stock-warning">

                    <strong>
                      ⚠ Lagerkontroll krävs
                    </strong>

                    <p>
                      Kunden har betalat men dagslagret
                      behöver kontrolleras innan ordern
                      bekräftas.
                    </p>

                  </div>

                )}


                {/* ====================================== */}
                {/* CUSTOMER + DELIVERY */}
                {/* ====================================== */}

                <div className="admin-order-customer">


                  <div className="admin-order-section">

                    <h3>
                      Kund
                    </h3>

                    <p>

                      {order.address?.firstName || ""}

                      {" "}

                      {order.address?.lastName || ""}

                    </p>

                    <p>
                      {order.address?.email || "-"}
                    </p>

                    <p>
                      {order.address?.phone || "-"}
                    </p>

                  </div>


                  {isPickup ? (

                    <div className="admin-order-section admin-pickup-section">

                      <h3>
                        Avhämtning
                      </h3>

                      <p>
                        Kunden hämtar beställningen.
                      </p>

                      <p>

                        <strong>
                          Datum:
                        </strong>

                        {" "}

                        {formatRequestedDate(
                          order.requestedDate
                        )}

                      </p>

                      <p>

                        <strong>
                          Tid:
                        </strong>

                        {" "}

                        {order.requestedTime ||
                          "Ej angivet"}

                      </p>

                    </div>

                  ) : (

                    <div className="admin-order-section">

                      <h3>
                        Leveransadress
                      </h3>

                      <p>
                        {order.address?.street || "-"}
                      </p>

                      <p>

                        {order.address?.zipcode || ""}

                        {" "}

                        {order.address?.city || ""}

                      </p>

                    </div>

                  )}


                </div>


                {/* ====================================== */}
                {/* PRODUCTS */}
                {/* ====================================== */}

                <div className="admin-order-products">


                  <h3>
                    Produkter
                  </h3>


                  {Array.isArray(
                    order.items
                  ) &&
                    order.items.map(
                      (item, index) => {

                        const quantity =
                          Number(
                            item.quantity || 0
                          )


                        const price =
                          Number(
                            item.price || 0
                          )


                        return (

                          <div
                            className="admin-order-product"
                            key={
                              item._id ||
                              `${order._id}-${index}`
                            }
                          >


                            {/* PRODUCT IMAGE */}

                            {item.image ? (

                              <img
                                src={
                                  getImageUrl(
                                    item.image
                                  )
                                }
                                alt={
                                  item.name ||
                                  "Produkt"
                                }
                              />

                            ) : (

                              <div className="admin-product-placeholder">
                                📦
                              </div>

                            )}


                            {/* PRODUCT INFO */}

                            <div className="admin-product-info">

                              <strong>

                                {item.name ||
                                  "Produkt"}

                              </strong>

                              <span>

                                {formatPrice(
                                  price
                                )}

                                {" / st"}

                              </span>

                            </div>


                            {/* QUANTITY */}

                            <div className="admin-product-quantity">

                              <span>
                                Antal
                              </span>

                              <strong>
                                {quantity}
                              </strong>

                            </div>


                            {/* PRODUCT TOTAL */}

                            <strong className="admin-product-total">

                              {formatPrice(
                                price *
                                quantity
                              )}

                            </strong>


                          </div>

                        )

                      }
                    )}


                </div>


                {/* ====================================== */}
                {/* TOTALS */}
                {/* ====================================== */}

                <div className="admin-order-summary">


                  <div>

                    <span>
                      Delsumma
                    </span>

                    <span>

                      {formatPrice(
                        order.subtotal
                      )}

                    </span>

                  </div>


                  <div>

                    <span>
                      Moms ({order.vatRate || 6}%)
                    </span>

                    <span>

                      {formatPrice(
                        order.vatAmount
                      )}

                    </span>

                  </div>


                  <div className="admin-order-total">

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
                {/* STATUS */}
                {/* ====================================== */}

                <div className="admin-order-footer">


                  <div className="admin-payment-method">

                    <span>
                      Betalningsmetod:
                    </span>

                    <strong>

                      {order.paymentMethod ||
                        "Stripe"}

                    </strong>

                  </div>


                  <div className="admin-status-control">

                    <label
                      htmlFor={
                        `status-${order._id}`
                      }
                    >
                      Orderstatus
                    </label>


                    <select

                      id={
                        `status-${order._id}`
                      }

                      value={
                        order.status ||
                        "Inväntar betalning"
                      }

                      disabled={
                        updatingOrder ===
                        order._id
                      }

                      onChange={(event) =>
                        updateStatus(
                          order._id,
                          event.target.value
                        )
                      }

                    >


                      <option value="Inväntar betalning">
                        Inväntar betalning
                      </option>


                      <option value="Betalning mottagen">
                        Betalning mottagen
                      </option>


                      <option value="Betalning mottagen - lagerkontroll krävs">
                        Betalning mottagen - lagerkontroll krävs
                      </option>


                      <option value="Beställning mottagen">
                        Beställning mottagen
                      </option>


                      <option value="Förbereds">
                        Förbereds
                      </option>


                      {isPickup && (

                        <option value="Redo för upphämtning">
                          Redo för upphämtning
                        </option>

                      )}


                      {isPickup && (

                        <option value="Upphämtad">
                          Upphämtad
                        </option>

                      )}


                      {!isPickup && (

                        <option value="På väg">
                          På väg
                        </option>

                      )}


                      {!isPickup && (

                        <option value="Levererad">
                          Levererad
                        </option>

                      )}


                      <option value="Avbruten">
                        Avbruten
                      </option>


                    </select>


                    {updatingOrder ===
                      order._id && (

                      <span className="status-saving">
                        Sparar...
                      </span>

                    )}


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


export default Orders