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

const FREE_DELIVERY_THRESHOLD = 600


// ======================================================
// DELIVERY ZONES
// ======================================================

const DELIVERY_ZONES = {

  frolunda: {
    id: "frolunda",
    label: "Frölunda",
    fee: 0
  },

  west: {
    id: "west",
    label: "Västra Göteborg",
    fee: 39
  },

  central: {
    id: "central",
    label: "Centrala Göteborg",
    fee: 59
  },

  hisingen: {
    id: "hisingen",
    label: "Hisingen / Norra Göteborg",
    fee: 59
  },

  south: {
    id: "south",
    label: "Södra Göteborg / Mölndal",
    fee: 79
  },

  east: {
    id: "east",
    label: "Östra Göteborg",
    fee: 79
  },

  northeast: {
    id: "northeast",
    label: "Nordöstra Göteborg / Angered",
    fee: 99
  },

  partilleLerum: {
    id: "partille-lerum",
    label: "Partille / Lerum",
    fee: 99
  },

  lindome: {
    id: "lindome",
    label: "Lindome",
    fee: 99
  },

  kungsbacka: {
    id: "kungsbacka",
    label: "Kungsbacka / Hede",
    fee: 109
  },

  grabo: {
    id: "grabo",
    label: "Gråbo",
    fee: 109
  }

}


// ======================================================
// NORMALIZE LOCATION
// ======================================================

const normalizeLocationText = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")


const normalizeZipcode = (value = "") =>
  String(value)
    .replace(/\D/g, "")
    .slice(0, 5)


// ======================================================
// GRÅBO POSTNUMMER
// ======================================================

const GRABO_ZIPCODES = [
  "44304",
  "44311",
  "44312",
  "44313",
  "44314",
  "44315",
  "44340",
  "44341",
  "44342",
  "44343",
  "44370",
  "44371",
  "44372",
  "44373"
]


// ======================================================
// GET DELIVERY ZONE
// ======================================================

const getDeliveryZone = ({
  city = "",
  zipcode = ""
}) => {

  const normalizedCity =
    normalizeLocationText(city)

  const normalizedZip =
    normalizeZipcode(zipcode)


  // Vänta tills kunden skrivit ett komplett postnummer.
  // Exempel: 415 05 -> 41505
  if (normalizedZip.length !== 5) {
    return null
  }


  // ====================================================
  // FRÖLUNDA — GRATIS
  // ====================================================

  if (
    normalizedZip.startsWith("421")
  ) {
    return DELIVERY_ZONES.frolunda
  }


  // ====================================================
  // GRÅBO — 109 KR
  //
  // Måste kontrolleras före övriga 443-nummer.
  // ====================================================

  if (
    GRABO_ZIPCODES.includes(normalizedZip)
  ) {
    return DELIVERY_ZONES.grabo
  }


  // ====================================================
  // KUNGSBACKA / HEDE — 109 KR
  // ====================================================

  if (
    normalizedZip.startsWith("434")
  ) {
    return DELIVERY_ZONES.kungsbacka
  }


  // ====================================================
  // LINDOME — 99 KR
  // ====================================================

  if (
    normalizedZip.startsWith("437")
  ) {
    return DELIVERY_ZONES.lindome
  }


  // ====================================================
  // PARTILLE — 99 KR
  // ====================================================

  if (
    normalizedZip.startsWith("433")
  ) {
    return DELIVERY_ZONES.partilleLerum
  }


  // ====================================================
  // LERUM / STENKULLEN / JONSERED — 99 KR
  //
  // Gråbo har redan fångats ovan.
  // ====================================================

  if (
    normalizedZip.startsWith("443")
  ) {
    return DELIVERY_ZONES.partilleLerum
  }


  // ====================================================
  // HISINGEN / NORRA GÖTEBORG — 59 KR
  // ====================================================

  const hisingenPrefixes = [
    "417",
    "418",
    "422",
    "423",
    "425"
  ]

  if (
    hisingenPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.hisingen
  }


  // ====================================================
  // NORDÖSTRA GÖTEBORG / ANGERED — 99 KR
  // ====================================================

  if (
    normalizedZip.startsWith("424")
  ) {
    return DELIVERY_ZONES.northeast
  }


  // ====================================================
  // SÖDRA GÖTEBORG / MÖLNDAL — 79 KR
  // ====================================================

  const southPrefixes = [
    "427",
    "428",
    "431",
    "436"
  ]

  if (
    southPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.south
  }


  // ====================================================
  // ÖSTRA GÖTEBORG — 79 KR
  //
  // 415 ska alltså INTE längre bli 39 kr.
  // ====================================================

  const eastPrefixes = [
    "415",
    "416"
  ]

  if (
    eastPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.east
  }


  // ====================================================
  // CENTRALA GÖTEBORG — 59 KR
  // ====================================================

  const centralPrefixes = [
    "411",
    "412",
    "413"
  ]

  if (
    centralPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.central
  }


  // ====================================================
  // VÄSTRA GÖTEBORG — 39 KR
  // ====================================================

  const westPrefixes = [
    "414",
    "426"
  ]

  if (
    westPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.west
  }


  // ====================================================
  // CITY FALLBACK
  //
  // Endast för tydliga ortsnamn.
  // Använd INTE "goteborg" eftersom det kan vara
  // vilken Göteborgszon som helst.
  // ====================================================

  if (
    normalizedCity.includes("grabo")
  ) {
    return DELIVERY_ZONES.grabo
  }


  if (
    normalizedCity.includes("kungsbacka") ||
    normalizedCity.includes("hede")
  ) {
    return DELIVERY_ZONES.kungsbacka
  }


  if (
    normalizedCity.includes("lindome")
  ) {
    return DELIVERY_ZONES.lindome
  }


  if (
    normalizedCity.includes("partille") ||
    normalizedCity.includes("savedalen") ||
    normalizedCity.includes("lerum") ||
    normalizedCity.includes("jonsered") ||
    normalizedCity.includes("stenkullen")
  ) {
    return DELIVERY_ZONES.partilleLerum
  }


  if (
    normalizedCity.includes("hisingen") ||
    normalizedCity.includes("hisings backa") ||
    normalizedCity.includes("backa") ||
    normalizedCity.includes("torslanda") ||
    normalizedCity.includes("hisings karra") ||
    normalizedCity.includes("karra") ||
    normalizedCity.includes("tuve") ||
    normalizedCity.includes("save")
  ) {
    return DELIVERY_ZONES.hisingen
  }


  if (
    normalizedCity.includes("angered") ||
    normalizedCity.includes("gunnilse") ||
    normalizedCity.includes("olofstorp")
  ) {
    return DELIVERY_ZONES.northeast
  }


  // ====================================================
  // OUTSIDE DELIVERY AREA
  // ====================================================

  return false
}






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

    useState("")





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
  // DELIVERY PRICE
  // ======================================================

  const deliveryZone =
    useMemo(() => {

      if (
        deliveryMethod !== "delivery"
      ) {
        return null
      }

      return getDeliveryZone({
        city: data.city,
        zipcode: data.zipcode
      })

    }, [
      deliveryMethod,
      data.city,
      data.zipcode
    ])


  const deliveryAddressStarted =
    Boolean(
      data.city.trim() ||
      data.zipcode.trim()
    )


  const deliveryAddressComplete =
    Boolean(
      data.street.trim() &&
      data.city.trim() &&
      normalizeZipcode(data.zipcode).length === 5
    )


  const isDeliveryAreaSupported =
    deliveryMethod !== "delivery" ||
    deliveryZone === null ||
    Boolean(deliveryZone)


  const qualifiesForFreeDelivery =
    total >= FREE_DELIVERY_THRESHOLD


  const deliveryFee =
    useMemo(() => {

      if (
        deliveryMethod !== "delivery"
      ) {
        return 0
      }

      if (
        !deliveryZone
      ) {
        return 0
      }

      if (
        qualifiesForFreeDelivery
      ) {
        return 0
      }

      return Number(
        deliveryZone.fee || 0
      )

    }, [
      deliveryMethod,
      deliveryZone,
      qualifiesForFreeDelivery
    ])


  const checkoutTotal =
    total + deliveryFee


  const amountUntilFreeDelivery =
    Math.max(
      0,
      FREE_DELIVERY_THRESHOLD - total
    )






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

  // CLOSED DAY HELPERS

  // ======================================================



  const isClosedDay = (dateString) => {

    if (!dateString) return false



    const date = new Date(`${dateString}T12:00:00`)

    const day = date.getDay()



    // Monday + Tuesday

    return day === 1 || day === 2

  }



  const isTodayClosed = isClosedDay(getTodayDate())

  const isTomorrowClosed = isClosedDay(getTomorrowDate())



  // ======================================================

  // OPENING HOURS / AVAILABLE TIME SLOTS

  // ======================================================



  const getAvailableTimeSlots = () => {



    const requestedDate =

      getRequestedDate()





    if (!requestedDate) {

      return []

    }





    // T12:00 förhindrar problem runt midnatt / timezone

    const date =

      new Date(`${requestedDate}T12:00:00`)





    const day =

      date.getDay()





    // JavaScript:

    // 0 = söndag

    // 1 = måndag

    // 2 = tisdag

    // 3 = onsdag

    // 4 = torsdag

    // 5 = fredag

    // 6 = lördag





    // ==================================================

    // MONDAY - CLOSED

    // ==================================================

    // Monday + Tuesday - closed

    if (day === 1 || day === 2) {

      return []

    }





    // ==================================================

    // FRIDAY + SATURDAY

    // 16:00 - 23:00

    // ==================================================



    if (day === 5 || day === 6) {



      return [

        "16:00-17:00",

        "17:00-18:00",

        "18:00-19:00",

        "19:00-20:00",

        "20:00-21:00",

        "21:00-22:00",

        "22:00-23:00"

      ]



    }





    // ==================================================

    // TUESDAY - THURSDAY + SUNDAY

    // 15:00 - 21:00

    // ==================================================



    return [

      "15:00-16:00",

      "16:00-17:00",

      "17:00-18:00",

      "18:00-19:00",

      "19:00-20:00",

      "20:00-21:00"

    ]



  }



  useEffect(() => {



    setRequestedTime("")



  }, [

    fulfillmentType,

    largeOrderDate

  ])





  const availableTimeSlots =

    getAvailableTimeSlots()





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



      alert(

        "Fyll i namn, e-post och telefonnummer."

      )



      return



    }





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

      !/^[0-9+\s()\\-]+$/.test(phone) ||

      phoneDigits.length < 7 ||

      phoneDigits.length > 15

    ) {



      alert(

        "Ange ett giltigt telefonnummer."

      )



      return



    }

    // ==================================================

    // CHECK DELIVERY ADDRESS

    // ==================================================



    if (deliveryMethod === "delivery") {



      if (

        !data.street.trim() ||

        !data.city.trim() ||

        !data.zipcode.trim()

      ) {



        alert(

          "Fyll i fullständig leveransadress."

        )



        return



      }





      if (

        data.street.trim().length >

        MAX_STREET_LENGTH ||

        data.city.trim().length >

        MAX_CITY_LENGTH ||

        data.zipcode.trim().length >

        MAX_ZIPCODE_LENGTH

      ) {



        alert(

          "Leveransadressen innehåller för långa uppgifter."

        )



        return



      }



    

    if (
      normalizeZipcode(data.zipcode).length !== 5
    ) {
      alert(
        "Ange ett giltigt femsiffrigt postnummer."
      )
      return
    }

    if (
      !deliveryZone
    ) {
      alert(
        "Vi levererar tyvärr inte till den här adressen ännu. Vårt leveransområde sträcker sig upp till Gråbo."
      )
      return
    }

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



      if (isClosedDay(largeOrderDate)) {

        alert("Manila Café har stängt på måndagar och tisdagar. Välj ett annat datum.")

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
      // DELIVERY PRICE / ZONE
      // ================================================

      deliveryFee:
        deliveryMethod === "delivery"
          ? deliveryFee
          : 0,

      deliveryZone:
        deliveryMethod === "delivery" && deliveryZone
          ? deliveryZone.id
          : "",

      deliveryZoneLabel:
        deliveryMethod === "delivery" && deliveryZone
          ? deliveryZone.label
          : "",

      // ================================================

        // FULFILLMENT

        // ================================================



        fulfillmentType,



        requestedDate:

          getRequestedDate(),



        requestedTime



      }











      // ==================================================

      // SEND ORDER

      // ==================================================



      const response =

        await axios.post(



          `${url}/api/order/place`,



          orderData,



          {

            headers:

              token

                ? { token }

                : {}

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

            maxLength={MAX_FIRST_NAME_LENGTH}

            required

          />





          <input

            name="lastName"

            onChange={onChangeHandler}

            value={data.lastName}

            type="text"

            placeholder="Efternamn"

            autoComplete="family-name"

            maxLength={MAX_LAST_NAME_LENGTH}

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

          maxLength={MAX_EMAIL_LENGTH}

          required

        />





        <input

          name="phone"

          onChange={onChangeHandler}

          value={data.phone}

          type="tel"

          placeholder="Telefonnummer"

          autoComplete="tel"

          maxLength={MAX_PHONE_LENGTH}

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

                `delivery-method-option ${deliveryMethod === "pickup"

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

                `delivery-method-option ${deliveryMethod === "delivery"

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





        {deliveryMethod === "delivery" && (



          <>



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



            <div className="delivery-price-feedback">

              {!deliveryAddressStarted ? (

                <p className="delivery-description">
                  Fyll i stad och postnummer så räknar vi ut leveransavgiften automatiskt.
                </p>

              ) : deliveryZone === false ? (

                <p className="delivery-description">
                  Vi levererar tyvärr inte till den här adressen ännu.
                  Vårt leveransområde sträcker sig upp till Gråbo.
                </p>

              ) : deliveryZone ? (

                <p className="delivery-description">
                  <strong>{deliveryZone.label}</strong>
                  {" • "}
                  {
                    qualifiesForFreeDelivery
                      ? "Fri leverans"
                      : deliveryZone.fee === 0
                        ? "Fri leverans"
                        : `${deliveryZone.fee} kr leverans`
                  }
                </p>

              ) : (

                <p className="delivery-description">
                  Fortsätt fylla i adressen för att se leveransavgiften.
                </p>

              )}

            </div>



          </>



        )}
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

                `delivery-option ${fulfillmentType === "same-day"

                  ? "active"

                  : ""

                } ${!sameDayAvailable ||

                  isLargeOrder ||

                  isTodayClosed

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

                  fulfillmentType === "same-day"

                }

                disabled={

                  !sameDayAvailable ||

                  isLargeOrder ||

                  isTodayClosed

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

                    isTodayClosed

                      ? "Stängt idag"

                      : sameDayAvailable

                        ? "Finns tillgängligt idag"

                        : "Inte tillgängligt idag"

                  }

                </span>



              </div>



            </label>





            {/* NEXT DAY */}



            <label

              className={

                `delivery-option ${fulfillmentType === "next-day"

                  ? "active"

                  : ""

                } ${isLargeOrder ||

                  isTomorrowClosed

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

                  isLargeOrder ||

                  isTomorrowClosed

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

                  {isTomorrowClosed

                    ? "Stängt imorgon"

                    : "Vårt vanligaste alternativ"}

                </span>



              </div>



            </label>





            {/* LARGE ORDER */}



            <label

              className={

                `delivery-option ${fulfillmentType === "large-order"

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

              disabled={

                availableTimeSlots.length === 0

              }

            >



              <option value="">

  {!getRequestedDate()

    ? "Välj datum först"

    : isClosedDay(getRequestedDate())

      ? "Stängt detta datum"

      : availableTimeSlots.length === 0

        ? "Ingen tid tillgänglig"

        : "Välj tid"}

</option>





              {availableTimeSlots.map(

                (timeSlot) => (



                  <option

                    key={timeSlot}

                    value={timeSlot}

                  >

                    {timeSlot.replace("-", " – ")}

                  </option>



                )

              )}



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





          

          {deliveryMethod === "delivery" && (

            <div className="checkout-delivery-summary">

              <div className="checkout-summary-item">
                <p>Leveranszon</p>
                <strong>
                  {
                    deliveryZone
                      ? deliveryZone.label
                      : deliveryZone === false
                        ? "Utanför leveransområdet"
                        : "Fyll i adress"
                  }
                </strong>
              </div>

              <div className="checkout-summary-item">
                <p>Leveransavgift</p>
                <strong>
                  {
                    deliveryZone
                      ? deliveryFee === 0
                        ? "Gratis"
                        : `${deliveryFee.toFixed(2)} kr`
                      : "—"
                  }
                </strong>

                {
                  deliveryZone &&
                  !qualifiesForFreeDelivery &&
                  deliveryZone.fee > 0 &&
                  amountUntilFreeDelivery > 0 && (
                    <span>
                      {amountUntilFreeDelivery.toFixed(2)} kr kvar till fri leverans
                    </span>
                  )
                }

                {
                  deliveryZone &&
                  qualifiesForFreeDelivery && (
                    <span>
                      Du har fri leverans
                    </span>
                  )
                }
              </div>

            </div>

          )}

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





            

            {deliveryMethod === "delivery" && (
              <>
                <div className="cart-total-details">
                  <p>Leverans</p>
                  <p>
                    {
                      deliveryZone
                        ? deliveryFee === 0
                          ? "Gratis"
                          : `${deliveryFee.toFixed(2)} kr`
                        : "—"
                    }
                  </p>
                </div>
                <hr />
              </>
            )}

            <div className="cart-total-details">



              <b>

                Totalt

              </b>



              <b>

                {checkoutTotal.toFixed(2)} kr

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
              isLoading ||
              (
                deliveryMethod === "delivery" &&
                (
                  !deliveryAddressComplete ||
                  !isDeliveryAreaSupported ||
                  !deliveryZone
                )
              )
            }



          >



            {

              isLoading

                ? "Skapar betalning..."

                : `Till betalning – ${checkoutTotal.toFixed(2)} kr`

            }



          </button>





        </div>





      </div>





    </form>



  )



}





export default PlaceOrder