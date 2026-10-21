import React, {
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import './PlaceOrder.css'
import './PlaceOrderSimplified.css'
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
    fee: 49
  },
  east: {
    id: "east",
    label: "Östra Göteborg",
    fee: 69
  },
  northeast: {
    id: "northeast",
    label: "Nordöstra Göteborg / Angered",
    fee: 79
  },
  partilleLerum: {
    id: "partille-lerum",
    label: "Partille / Lerum",
    fee: 109
  },
  lindome: {
    id: "lindome",
    label: "Lindome",
    fee: 109
  },
  kungsbacka: {
    id: "kungsbacka",
    label: "Kungsbacka / Hede",
    fee: 130
  },
  grabo: {
    id: "grabo",
    label: "Gråbo",
    fee: 150
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
  const [isLoading, setIsLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState("")
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [discountError, setDiscountError] = useState("")
  const [discountChecking, setDiscountChecking] = useState(false)
  // Customers see only one checkout step at a time.
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [stepError, setStepError] = useState("")
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
  // Rabattförhandsvisning. Backend beräknar alltid slutpriset på nytt.
  const productDiscount = appliedDiscount?.code === discountCode.trim().toUpperCase()
    ? Math.min(total, appliedDiscount.amount)
    : 0
  const discountedProductTotal = Math.max(0, total - productDiscount)
  const discountedVat = Math.round((discountedProductTotal * 6 / 106) * 100) / 100

  const applyDiscount = async () => {
    const code = discountCode.trim().toUpperCase()
    if (!code) {
      setDiscountError("Ange en rabattkod.")
      setAppliedDiscount(null)
      return
    }
    setDiscountChecking(true)
    setDiscountError("")
    setAppliedDiscount(null)
    try {
      const response = await axios.post(`${url}/api/discount/validate`, {
        code,
        subtotal: total
      })
      const result = response.data
      const rawAmount = result.discountAmount ?? result.discount?.discountAmount ?? result.discount?.amount
      const amount = Number(rawAmount)
      if (result.success && rawAmount != null && Number.isFinite(amount) && amount >= 0) {
        setAppliedDiscount({ code, amount })
      } else {
        setDiscountError(result.message || "Rabatten kunde inte beräknas.")
      }
    } catch (error) {
      setDiscountError(error.response?.data?.message || "Rabattkoden kunde inte kontrolleras.")
    } finally {
      setDiscountChecking(false)
    }
  }

  useEffect(() => {
    setAppliedDiscount(null)
    setDiscountError("")
  }, [total])

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
    discountedProductTotal >= FREE_DELIVERY_THRESHOLD
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
    discountedProductTotal + deliveryFee
  const amountUntilFreeDelivery =
    Math.max(
      0,
      FREE_DELIVERY_THRESHOLD - discountedProductTotal
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
  const isClosedDay = () => {
  return false
}

  const isTodayClosed = isClosedDay(getTodayDate())
  const isTomorrowClosed = isClosedDay(getTomorrowDate())

  // Avoid starting on a disabled "tomorrow" choice when we're closed.
  useEffect(() => {
    if (isLargeOrder) return
    if (fulfillmentType === "next-day" && isTomorrowClosed) {
      setFulfillmentType(sameDayAvailable && !isTodayClosed ? "same-day" : "large-order")
    } else if (fulfillmentType === "same-day" && isTodayClosed) {
      setFulfillmentType(isTomorrowClosed ? "large-order" : "next-day")
    }
  }, [fulfillmentType, isLargeOrder, isTomorrowClosed, isTodayClosed, sameDayAvailable])
  // ======================================================
// OPENING HOURS / AVAILABLE TIME SLOTS
// MONDAY - SUNDAY: 10:00 - 23:00
// ======================================================

const getAvailableTimeSlots = () => {
  const requestedDate = getRequestedDate()

  if (!requestedDate) {
    return []
  }

  // Same opening hours every day
  return [
    "10:00-11:00",
    "11:00-12:00",
    "12:00-13:00",
    "13:00-14:00",
    "14:00-15:00",
    "15:00-16:00",
    "16:00-17:00",
    "17:00-18:00",
    "18:00-19:00",
    "19:00-20:00",
    "20:00-21:00",
    "21:00-22:00",
    "22:00-23:00"
  ]
}
  useEffect(() => {
    setRequestedTime("")
  }, [
    fulfillmentType,
    largeOrderDate
  ])
  const availableTimeSlots = getAvailableTimeSlots().filter((slot) => {
    if (getRequestedDate() !== getTodayDate()) return true
    const [hour, minute] = slot.split("-")[0].split(":").map(Number)
    const slotStart = new Date()
    slotStart.setHours(hour, minute, 0, 0)
    return slotStart > new Date()
  })
  const continueToContact = () => {
    if (!getRequestedDate()) {
      setStepError("Välj först ett datum.")
      return
    }
    if (isClosedDay(getRequestedDate())) {
      setStepError("Vi har stängt måndagar och tisdagar. Välj ett annat datum.")
      return
    }
    if (!requestedTime || !availableTimeSlots.includes(requestedTime)) {
      setStepError("Välj ett tillgängligt tidsintervall.")
      return
    }
    setStepError("")
    setCheckoutStep(3)
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
    if (discountCode.trim() && appliedDiscount?.code !== discountCode.trim().toUpperCase()) {
      alert("Kontrollera rabattkoden med knappen Använd kod, eller ta bort den.")
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
      !/^[0-9+\s()\-]+$/.test(phone) ||
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
    if (!requestedTime || !availableTimeSlots.includes(requestedTime)) {
      alert("Välj ett tillgängligt tidsintervall för din beställning.")
      setCheckoutStep(2)
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
        requestedTime,
        discountCode: appliedDiscount?.code === discountCode.trim().toUpperCase()
          ? appliedDiscount.code
          : undefined
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
  // SIMPLIFIED CHECKOUT: method > date/time > details/payment
  // ======================================================
  const cartPreview = Object.entries(cartItems || {})
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([itemId, quantity]) => ({
      id: itemId,
      quantity: Number(quantity),
      name: food_list.find((item) => item._id === itemId)?.name || "Produkt"
    }))

  const prettyTime = (time) => time ? time.replace("-", "–") : "Inte vald"
  const canPay = subtotal > 0 && !isLoading && Boolean(requestedTime) &&
    Boolean(getRequestedDate()) && availableTimeSlots.includes(requestedTime) &&
    (deliveryMethod !== "delivery" || (deliveryAddressComplete && Boolean(deliveryZone)))

  return (
    <form className="manila-checkout" onSubmit={placeOrder}>
      <header className="mc-head">
        <span className="mc-kicker">MANILA CAFÉ</span>
        <h1>Slutför din beställning</h1>
        <p>Tre enkla steg, sedan är dina favoriter på väg.</p>
      </header>

      <nav className="mc-progress" aria-label="Beställningssteg">
        {[
          { number: 1, label: "Leveranssätt" },
          { number: 2, label: "Datum & tid" },
          { number: 3, label: "Betalning" }
        ].map(({ number, label }) => (
          <div className={`mc-progress-item ${number === checkoutStep ? "is-current" : ""} ${number < checkoutStep ? "is-done" : ""}`} key={number} aria-current={checkoutStep === number ? "step" : undefined}>
            <span className="mc-progress-number">{number < checkoutStep ? "✓" : number}</span>
            <span>{label}</span>
          </div>
        ))}
      </nav>

      <div className="mc-layout">
        <main className="mc-panel">
          {checkoutStep === 1 && (
            <section aria-labelledby="mc-step1">
              <span className="mc-eyebrow">Steg 1 av 3</span>
              <h2 id="mc-step1">Hur vill du få din beställning?</h2>
              <p className="mc-muted">Välj det alternativ som passar dig bäst.</p>
              <div className="mc-options mc-method-options">
                <label className={`mc-option ${deliveryMethod === "pickup" ? "selected" : ""}`}>
                  <input type="radio" name="deliveryMethod" value="pickup" checked={deliveryMethod === "pickup"} onChange={() => setDeliveryMethod("pickup")} />
                  <span className="mc-option-icon" aria-hidden="true">🏠</span>
                  <span className="mc-option-text"><strong>Hämta själv</strong><small>Upphämtning i Frölunda · Gratis</small></span>
                  <span className="mc-option-check" aria-hidden="true">✓</span>
                </label>
                <label className={`mc-option ${deliveryMethod === "delivery" ? "selected" : ""}`}>
                  <input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === "delivery"} onChange={() => setDeliveryMethod("delivery")} />
                  <span className="mc-option-icon" aria-hidden="true">🚗</span>
                  <span className="mc-option-text"><strong>Få hemleverans</strong><small>Leveransavgift beräknas utifrån adress</small></span>
                  <span className="mc-option-check" aria-hidden="true">✓</span>
                </label>
              </div>
              <button type="button" className="mc-primary" disabled={subtotal <= 0} onClick={() => { setStepError(""); setCheckoutStep(2); }}>
                Fortsätt till datum och tid <span aria-hidden="true">→</span>
              </button>
            </section>
          )}

          {checkoutStep === 2 && (
            <section aria-labelledby="mc-step2">
              <span className="mc-eyebrow">Steg 2 av 3</span>
              <h2 id="mc-step2">När passar det dig?</h2>
              <p className="mc-muted">Välj dag och tidsintervall för {deliveryMethod === "pickup" ? "upphämtning" : "leverans"}.</p>
              <div className="mc-date-options">
                <label className={`mc-date-pill ${fulfillmentType === "same-day" ? "selected" : ""} ${(!sameDayAvailable || isLargeOrder || isTodayClosed) ? "disabled" : ""}`}>
                  <input type="radio" name="fulfillmentType" value="same-day" checked={fulfillmentType === "same-day"} disabled={!sameDayAvailable || isLargeOrder || isTodayClosed} onChange={() => { setFulfillmentType("same-day"); setStepError("") }} />
                  <strong>Idag</strong>
                  <small>{isTodayClosed ? "Stängt" : !sameDayAvailable ? "Ej i lager" : isLargeOrder ? "Endast för mindre beställningar" : "Snabbast"}</small>
                </label>
                <label className={`mc-date-pill ${fulfillmentType === "next-day" ? "selected" : ""} ${(isLargeOrder || isTomorrowClosed) ? "disabled" : ""}`}>
                  <input type="radio" name="fulfillmentType" value="next-day" checked={fulfillmentType === "next-day"} disabled={isLargeOrder || isTomorrowClosed} onChange={() => { setFulfillmentType("next-day"); setStepError("") }} />
                  <strong>Imorgon</strong>
                  <small>{isTomorrowClosed ? "Stängt" : isLargeOrder ? "Minst 48 timmar krävs" : "Nästa dag"}</small>
                </label>
                <label className={`mc-date-pill ${fulfillmentType === "large-order" ? "selected" : ""}`}>
                  <input type="radio" name="fulfillmentType" value="large-order" checked={fulfillmentType === "large-order"} onChange={() => { setFulfillmentType("large-order"); setStepError("") }} />
                  <strong>Annat datum</strong>
                  <small>Minst 2 dagar framåt</small>
                </label>
              </div>
              {isLargeOrder && (
                <p className="mc-hint">Din beställning innehåller {totalQuantity} produkter. Större beställningar behöver minst 48 timmars framförhållning.</p>
              )}
              {fulfillmentType === "large-order" && (
                <div className="mc-field">
                  <label htmlFor="mc-order-date">Datum</label>
                  <input id="mc-order-date" type="date" value={largeOrderDate} min={getMinimumLargeOrderDate()} onChange={(e) => { setLargeOrderDate(e.target.value); setStepError("") }} />
                  {isClosedDay(largeOrderDate) && <p className="mc-error" role="status">Stängt detta datum. Välj onsdag–söndag.</p>}
                </div>
              )}
              <div className="mc-field">
                <label htmlFor="mc-order-time">Tidsintervall</label>
                <select id="mc-order-time" value={requestedTime} disabled={!getRequestedDate() || availableTimeSlots.length === 0} onChange={(e) => { setRequestedTime(e.target.value); setStepError("") }}>
                  <option value="">{!getRequestedDate() ? "Välj datum först" : isClosedDay(getRequestedDate()) ? "Stängt denna dag" : availableTimeSlots.length === 0 ? "Inga tider kvar" : "Välj en tid"}</option>
                  {availableTimeSlots.map((slot) => <option key={slot} value={slot}>{prettyTime(slot)}</option>)}
                </select>
              </div>
              {stepError && <p className="mc-error" role="alert">{stepError}</p>}
              <div className="mc-actions">
                <button type="button" className="mc-secondary" onClick={() => { setStepError(""); setCheckoutStep(1) }}>← Tillbaka</button>
                <button type="button" className="mc-primary" onClick={continueToContact}>Fortsätt <span aria-hidden="true">→</span></button>
              </div>
            </section>
          )}

          {checkoutStep === 3 && (
            <section aria-labelledby="mc-step3">
              <span className="mc-eyebrow">Steg 3 av 3</span>
              <h2 id="mc-step3">Nästan klart!</h2>
              <p className="mc-muted">Fyll i dina uppgifter för orderbekräftelsen. Du behöver inget konto.</p>
              <div className="mc-fields mc-two-columns">
                <div className="mc-field"><label htmlFor="mc-first">Förnamn</label><input id="mc-first" type="text" name="firstName" placeholder="Förnamn" value={data.firstName} onChange={onChangeHandler} autoComplete="given-name" maxLength={MAX_FIRST_NAME_LENGTH} required /></div>
                <div className="mc-field"><label htmlFor="mc-last">Efternamn</label><input id="mc-last" type="text" name="lastName" placeholder="Efternamn" value={data.lastName} onChange={onChangeHandler} autoComplete="family-name" maxLength={MAX_LAST_NAME_LENGTH} required /></div>
                <div className="mc-field"><label htmlFor="mc-email">E-postadress</label><input id="mc-email" type="email" name="email" placeholder="namn@exempel.se" value={data.email} onChange={onChangeHandler} autoComplete="email" maxLength={MAX_EMAIL_LENGTH} required /></div>
                <div className="mc-field"><label htmlFor="mc-phone">Telefonnummer</label><input id="mc-phone" type="tel" name="phone" placeholder="07X XXX XX XX" value={data.phone} onChange={onChangeHandler} autoComplete="tel" maxLength={MAX_PHONE_LENGTH} required /></div>
              </div>
              {deliveryMethod === "delivery" && (
                <div className="mc-address">
                  <h3>Leveransadress</h3>
                  <div className="mc-fields">
                    <div className="mc-field"><label htmlFor="mc-street">Gatuadress</label><input id="mc-street" name="street" type="text" value={data.street} onChange={onChangeHandler} autoComplete="street-address" maxLength={MAX_STREET_LENGTH} placeholder="Gata och nummer" required /></div>
                    <div className="mc-two-columns">
                      <div className="mc-field"><label htmlFor="mc-zip">Postnummer</label><input id="mc-zip" name="zipcode" type="text" inputMode="numeric" value={data.zipcode} onChange={onChangeHandler} autoComplete="postal-code" maxLength={MAX_ZIPCODE_LENGTH} placeholder="421 00" required /></div>
                      <div className="mc-field"><label htmlFor="mc-city">Ort</label><input id="mc-city" name="city" type="text" value={data.city} onChange={onChangeHandler} autoComplete="address-level2" maxLength={MAX_CITY_LENGTH} placeholder="Göteborg" required /></div>
                    </div>
                  </div>
                  {deliveryZone === false ? (
                    <p className="mc-error" role="status">Tyvärr levererar vi inte till denna adress ännu. Välj en annan adress eller gå tillbaka och välj upphämtning.</p>
                  ) : deliveryZone ? (
                    <p className="mc-hint" role="status">{deliveryZone.label} · {deliveryFee === 0 ? "Fri leverans" : `Leverans ${deliveryFee.toFixed(0)} kr`}</p>
                  ) : (
                    <p className="mc-hint">Ange ett giltigt postnummer så visas leveransavgiften.</p>
                  )}
                </div>
              )}
              <div className="mc-field">
                <label htmlFor="mc-discount">Rabattkod (valfritt)</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    id="mc-discount"
                    type="text"
                    value={discountCode}
                    maxLength={50}
                    placeholder="Ange rabattkod"
                    autoComplete="off"
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase())
                      setAppliedDiscount(null)
                      setDiscountError("")
                    }}
                    style={{ flex: "1 1 170px" }}
                  />
                  <button type="button" className="mc-secondary" disabled={discountChecking || isLoading || !discountCode.trim()} onClick={applyDiscount}>
                    {discountChecking ? "Kontrollerar…" : "Använd kod"}
                  </button>
                </div>
                {discountError && <p className="mc-error" role="alert">{discountError}</p>}
                {appliedDiscount && <p className="mc-hint" role="status">Rabattkod {appliedDiscount.code} tillagd. Slutpriset bekräftas vid betalningen.</p>}
              </div>
              <div className="mc-reassurance">🔒 Säker betalning via Stripe · Ingen inloggning krävs</div>
              <div className="mc-actions">
                <button type="button" className="mc-secondary" onClick={() => setCheckoutStep(2)}>← Tillbaka</button>
                <button type="submit" className="mc-primary" disabled={!canPay || discountChecking}>
                  {isLoading ? "Öppnar betalningen…" : `Betala ${checkoutTotal.toFixed(2)} kr`} <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>
          )}
        </main>

        <aside className="mc-summary" aria-label="Din orderöversikt">
          <div className="mc-summary-head">
            <h2>Din beställning</h2>
            <span>{totalQuantity} {totalQuantity === 1 ? "produkt" : "produkter"}</span>
          </div>
          <div className="mc-product-list">
            {cartPreview.map((item) => (
              <div key={item.id} className="mc-product-item">
                <span>{item.quantity} × {item.name}</span>
              </div>
            ))}
            {cartPreview.length === 0 && <p>Din varukorg är tom.</p>}
          </div>
          <div className="mc-summary-lines">
            <div><span>Leveranssätt</span><strong>{getDeliveryMethodLabel()}</strong></div>
            <div><span>Dag</span><strong>{getRequestedDate() || "Välj datum"}</strong></div>
            <div><span>Tid</span><strong>{prettyTime(requestedTime)}</strong></div>
          </div>
          <div className="mc-price-lines">
            <div><span>Varor (inkl. moms)</span><strong>{total.toFixed(2)} kr</strong></div>
            {productDiscount > 0 && <div><span>Rabatt ({appliedDiscount.code})</span><strong>−{productDiscount.toFixed(2)} kr</strong></div>}
            <div><span>Varav moms (6 %)</span><span>{(productDiscount > 0 ? discountedVat : vatAmount).toFixed(2)} kr</span></div>
            {deliveryMethod === "delivery" && <div><span>Leverans</span><strong>{deliveryZone ? (deliveryFee === 0 ? "Gratis" : `${deliveryFee.toFixed(2)} kr`) : "Beräknas vid adress"}</strong></div>}
          </div>
          <div className="mc-summary-total"><span>Totalt</span><strong>{checkoutTotal.toFixed(2)} kr</strong></div>
          {deliveryMethod === "delivery" && deliveryZone && !qualifiesForFreeDelivery && amountUntilFreeDelivery > 0 && (
            <p className="mc-free-delivery">{amountUntilFreeDelivery.toFixed(0)} kr kvar till fri leverans</p>
          )}
          <p className="mc-summary-note">Inga dolda avgifter. Du ser alltid totalen innan betalning.</p>
                </aside>
      </div>

      {/* MOBILE CHECKOUT PAYMENT BAR */}

      {checkoutStep === 3 && (
        <div className="mc-mobile-paybar">

          <div className="mc-mobile-paybar-total">
            <span>Totalt inkl. moms</span>
            <strong>{checkoutTotal.toFixed(2)} kr</strong>
          </div>

          <button
            type="submit"
            className="mc-primary"
            disabled={!canPay || discountChecking}
          >
            {isLoading ? "Öppnar betalningen…" : "Betala nu →"}
          </button>

        </div>
      )}

    </form>
  )
}
export default PlaceOrder
