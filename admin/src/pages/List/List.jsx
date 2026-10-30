// Manila Café admin: intern receptredigerare för produkter.
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import './List.css'
import './ListCustomizations.css'
import axios from "axios"
import { toast } from "react-toastify"

const MAX_SAME_DAY_STOCK = 10000
const MAX_CUSTOMIZATION_OPTIONS = 30
const MAX_OPTION_NAME_LENGTH = 100
const MAX_EXTRA_QUANTITY = 10
const MAX_PRICE = 100000


const List = () => {

  const url = (
  import.meta.env.VITE_API_URL ||
  (
    import.meta.env.DEV
      ? "http://localhost:4000"
      : ""
  )
).replace(/\/+$/, "")

  const [list, setList] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [removingId, setRemovingId] =
    useState(null)

  const [updatingStockId, setUpdatingStockId] =
    useState(null)

  const [stockValues, setStockValues] =
    useState({})

  // ==============================================
  // KUNDVAL / PRODUKTANPASSNINGAR
  // ==============================================
  // Detta är kundsynliga alternativ, aldrig interna köksrecept.
  const [customizationProductId, setCustomizationProductId] = useState(null)
  const [customizationsEnabled, setCustomizationsEnabled] = useState(false)
  const [removableIngredients, setRemovableIngredients] = useState([])
  const [extraOptions, setExtraOptions] = useState([])
  const [customizationSaving, setCustomizationSaving] = useState(false)
  const [customizationError, setCustomizationError] = useState('')
  const customizationFieldKeyRef = useRef(0)

  const customizationProduct =
    list.find(item => item._id === customizationProductId) || null

  const createRemovableIngredient = (option = {}) => ({
    _key: ++customizationFieldKeyRef.current,
    ...(option._id ? { _id: String(option._id) } : {}),
    name: String(option.name ?? ''),
    available: option.available !== false
  })

  const createExtraOption = (option = {}) => ({
    _key: ++customizationFieldKeyRef.current,
    ...(option._id ? { _id: String(option._id) } : {}),
    name: String(option.name ?? ''),
    price: option.price == null ? '' : String(option.price),
    maxQuantity: option.maxQuantity == null ? '1' : String(option.maxQuantity),
    available: option.available !== false
  })

  const openCustomizations = product => {
    if (customizationSaving || recipeSaving) return
    // Endast en redigerare visas åt gången.
    if (recipeProductId) closeRecipe()
    const customization = product.customizations || {}
    setCustomizationProductId(product._id)
    setCustomizationsEnabled(customization.enabled === true)
    setRemovableIngredients(
      (Array.isArray(customization.removableIngredients)
        ? customization.removableIngredients : []).map(createRemovableIngredient)
    )
    setExtraOptions(
      (Array.isArray(customization.extras)
        ? customization.extras : []).map(createExtraOption)
    )
    setCustomizationError('')
  }

  const closeCustomizations = () => {
    if (customizationSaving) return
    setCustomizationProductId(null)
    setCustomizationError('')
  }

  const updateRemovableIngredient = (key, field, value) => {
    setRemovableIngredients(previous => previous.map(row =>
      row._key === key ? { ...row, [field]: value } : row
    ))
  }

  const updateExtraOption = (key, field, value) => {
    setExtraOptions(previous => previous.map(row =>
      row._key === key ? { ...row, [field]: value } : row
    ))
  }

  const validateNames = (items, label) => {
    const names = new Set()
    for (const row of items) {
      const name = row.name.trim()
      if (!name || name.length > MAX_OPTION_NAME_LENGTH) {
        throw new Error(`${label}: ange ett namn (högst ${MAX_OPTION_NAME_LENGTH} tecken).`)
      }
      const key = name.toLocaleLowerCase('sv')
      if (names.has(key)) throw new Error(`${label}: namnet ${name} förekommer flera gånger.`)
      names.add(key)
    }
  }

  const saveCustomizations = async event => {
    event.preventDefault()
    if (!customizationProductId || customizationSaving) return
    setCustomizationError('')

    let customizations
    try {
      if (removableIngredients.length > MAX_CUSTOMIZATION_OPTIONS ||
          extraOptions.length > MAX_CUSTOMIZATION_OPTIONS) {
        throw new Error(`Högst ${MAX_CUSTOMIZATION_OPTIONS} alternativ i varje grupp.`)
      }
      validateNames(removableIngredients, 'Ingredienser')
      validateNames(extraOptions, 'Tillval')

      const extras = extraOptions.map(row => {
        const priceText = row.price.trim().replace(',', '.')
        const price = Number(priceText)
        const maxQuantity = Number(row.maxQuantity)
        if (!priceText || !/^(?:\d+)(?:\.\d{1,2})?$/.test(priceText) ||
            !Number.isFinite(price) || price > MAX_PRICE) {
          throw new Error(`Ange ett giltigt pris (0–${MAX_PRICE} kr, max två decimaler) för ${row.name}.`)
        }
        if (!Number.isInteger(maxQuantity) || maxQuantity < 1 || maxQuantity > MAX_EXTRA_QUANTITY) {
          throw new Error(`Maxantal för ${row.name} måste vara 1–${MAX_EXTRA_QUANTITY}.`)
        }
        return {
          ...(row._id ? { _id: row._id } : {}),
          name: row.name.trim(),
          available: row.available,
          price,
          maxQuantity
        }
      })

      customizations = {
        enabled: customizationsEnabled,
        removableIngredients: removableIngredients.map(row => ({
          ...(row._id ? { _id: row._id } : {}),
          name: row.name.trim(),
          available: row.available
        })),
        extras
      }
    } catch (error) {
      setCustomizationError(error.message)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setCustomizationError('Du behöver logga in som administratör.')
      return
    }

    try {
      setCustomizationSaving(true)
      const response = await axios.post(`${url}/api/food/customizations`, {
        id: customizationProductId,
        customizations
      }, {
        headers: { token, Authorization: `Bearer ${token}` }
      })

      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.message || 'Alternativen kunde inte sparas.')
      }

      // Kontrollera att backend faktiskt sparade kundvalen.
      // En gammal foodModel.js kan tyst ignorera okända fält i Mongoose.
      const savedProduct = response.data.data
      const savedChoices = savedProduct.customizations
      if (!savedChoices ||
          savedChoices.enabled !== customizations.enabled ||
          !Array.isArray(savedChoices.removableIngredients) ||
          !Array.isArray(savedChoices.extras) ||
          savedChoices.removableIngredients.length !== customizations.removableIngredients.length ||
          savedChoices.extras.length !== customizations.extras.length ||
          [...savedChoices.removableIngredients, ...savedChoices.extras]
            .some(option => !option._id)) {
        throw new Error('Backend sparade inte kundvalen. Kontrollera backend/models/foodModel.js och starta om backend.')
      }
      setList(previous => previous.map(item =>
        item._id === savedProduct._id ? savedProduct : item
      ))
      toast.success('Kundvalen har sparats.')
      setCustomizationProductId(null)
      setCustomizationError('')
    } catch (error) {
      setCustomizationError(error.response?.status === 404
        ? 'Anpassnings-API:t hittades inte. Kontrollera att backend är publicerad.'
        : error.response?.status === 401
          ? 'Inloggningen har gått ut. Logga in igen.'
          : error.response?.status === 403
            ? 'Du saknar administratörsbehörighet.'
            : error.response?.data?.message || error.message || 'Kundvalen kunde inte sparas.')
    } finally {
      setCustomizationSaving(false)
    }
  }

  useEffect(() => {
    if (!customizationProductId) return
    const onEscape = event => {
      if (event.key === 'Escape' && !customizationSaving) closeCustomizations()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [customizationProductId, customizationSaving])

  // Recept är interna och hämtas endast från adminskyddad endpoint.
  const [recipeProductId, setRecipeProductId] = useState(null)
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [recipeSteps, setRecipeSteps] = useState([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeSaving, setRecipeSaving] = useState(false)
  const [recipeError, setRecipeError] = useState('')
  const recipeRequestRef = useRef(0)
  const recipeFieldKeyRef = useRef(0)

  const recipeProduct = list.find(item => item._id === recipeProductId) || null

  const newIngredient = (entry = {}) => ({
    _key: ++recipeFieldKeyRef.current,
    name: String(entry.name || ''),
    amount: String(entry.amount || ''),
    unit: String(entry.unit || '')
  })

  const newStep = (text = '') => ({
    _key: ++recipeFieldKeyRef.current,
    text: String(text)
  })

  const closeRecipe = () => {
    if (recipeSaving) return
    recipeRequestRef.current += 1
    setRecipeProductId(null)
    setRecipeError('')
  }

  const openRecipe = async (product) => {
    if (customizationSaving) return
    if (customizationProductId) closeCustomizations()
    const requestId = ++recipeRequestRef.current
    setRecipeProductId(product._id)
    setRecipeIngredients([newIngredient()])
    setRecipeSteps([newStep()])
    setRecipeError('')
    setRecipeLoading(true)

    const token = localStorage.getItem('token')
    if (!token) {
      setRecipeError('Du behöver logga in som administratör.')
      setRecipeLoading(false)
      return
    }

    try {
      const response = await axios.get(`${url}/api/kitchen-recipe/list`, {
        headers: { token, Authorization: `Bearer ${token}` }
      })
      if (!response.data?.success || !Array.isArray(response.data.data)) {
        throw new Error(response.data?.message || 'Recepten kunde inte hämtas.')
      }

      // Ignorera gamla svar ifall användaren hunnit byta eller stänga redigeraren.
      if (requestId !== recipeRequestRef.current) return
      const existing = response.data.data.find(recipe =>
        String(recipe.foodId?._id || recipe.foodId || '') === String(product._id)
      )

      setRecipeIngredients(existing?.ingredients?.length
        ? existing.ingredients.map(newIngredient)
        : [newIngredient()])
      setRecipeSteps(existing?.steps?.length
        ? existing.steps.map(step => newStep(typeof step === 'string' ? step : step?.text || ''))
        : [newStep()])
    } catch (error) {
      if (requestId !== recipeRequestRef.current) return
      setRecipeError(error.response?.status === 404
        ? 'Recept-API:t hittades inte. Kontrollera att backend är publicerad.'
        : (error.response?.data?.message || error.message || 'Recepten kunde inte hämtas.'))
    } finally {
      if (requestId === recipeRequestRef.current) setRecipeLoading(false)
    }
  }

  const updateRecipeIngredient = (key, field, value) => {
    setRecipeIngredients(previous => previous.map(entry =>
      entry._key === key ? { ...entry, [field]: value } : entry
    ))
  }

  const updateRecipeStep = (key, value) => {
    setRecipeSteps(previous => previous.map(step =>
      step._key === key ? { ...step, text: value } : step
    ))
  }

  const saveRecipe = async (event) => {
    event.preventDefault()
    if (!recipeProductId || recipeSaving || recipeLoading || recipeError) return

    const ingredients = recipeIngredients.map(({ name, amount, unit }) => ({
      name: name.trim(), amount: amount.trim(), unit: unit.trim()
    })).filter(entry => entry.name || entry.amount || entry.unit)

    if (ingredients.some(entry => !entry.name)) {
      toast.error('Fyll i namnet på varje ingrediens som har en mängd eller enhet.')
      return
    }

    const steps = recipeSteps.map(step => step.text.trim()).filter(Boolean)
    if (!ingredients.length && !steps.length) {
      toast.error('Skriv minst en ingrediens eller ett tillagningssteg.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Du behöver logga in som administratör.')
      return
    }

    setRecipeSaving(true)
    try {
      const response = await axios.post(`${url}/api/kitchen-recipe/save`, {
        foodId: recipeProductId, ingredients, steps
      }, {
        headers: { token, Authorization: `Bearer ${token}` }
      })
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Receptet kunde inte sparas.')
      }
      toast.success('Receptet har sparats.')
      recipeRequestRef.current += 1
      setRecipeProductId(null)
      setRecipeError('')
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Receptet kunde inte sparas.')
    } finally {
      setRecipeSaving(false)
    }
  }

  useEffect(() => {
    if (!recipeProductId) return
    const onEscape = event => {
      if (event.key === 'Escape') closeRecipe()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [recipeProductId, recipeSaving])


  // ======================================================
  // GET PRODUCT IMAGE URL
  // ======================================================

  const getImageUrl = (image) => {

    if (!image) {
      return ""
    }


    // Cloudinary / external image
    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {

      return image

    }


    // Old local backend image
    return `${url}/images/${image}`

  }


  // ======================================================
  // FETCH FOOD LIST
  // ======================================================

  const fetchList = useCallback(async () => {

    try {

      setLoading(true)


      const response =
        await axios.get(
          `${url}/api/food/list`
        )


      if (response.data.success) {

        const foods =
          Array.isArray(response.data.data)
            ? response.data.data
            : []


        setList(
          foods
        )


        // ==================================================
        // CREATE STOCK VALUES
        // ==================================================

        const initialStock =
          {}


        foods.forEach((item) => {

          initialStock[item._id] =
            Number(
              item.sameDayStock || 0
            )

        })


        setStockValues(
          initialStock
        )


      } else {

        setList([])


        toast.error(
          response.data.message ||
          "Kunde inte hämta produkter."
        )

      }


    } catch (error) {



      setList([])


      toast.error(
        error.response?.data?.message ||
        "Något gick fel när produkterna skulle hämtas."
      )


    } finally {

      setLoading(false)

    }

  }, [url])


  // ======================================================
  // STOCK INPUT
  // ======================================================

  const handleStockChange = (
    foodId,
    value
  ) => {

    setStockValues((prev) => ({

      ...prev,

      [foodId]:
        value

    }))

  }


  // ======================================================
  // UPDATE SAME-DAY STOCK
  // ======================================================

  const updateStock = async (
    foodId
  ) => {

    if (
      !foodId ||
      updatingStockId
    ) {

      return

    }


    const token =
      localStorage.getItem(
        "token"
      )


    if (!token) {

      toast.error(
        "Du måste logga in som administratör."
      )

      return

    }


    const stock =
      Number(
        stockValues[foodId]
      )


    if (
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > MAX_SAME_DAY_STOCK
    ) {

      toast.error(
        `Dagslagret måste vara ett heltal mellan 0 och ${MAX_SAME_DAY_STOCK}.`
      )

      return

    }


    try {

      setUpdatingStockId(
        foodId
      )


      const response =
        await axios.post(

          `${url}/api/food/stock`,

          {
            id:
              foodId,

            sameDayStock:
              stock
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

        toast.success(
          response.data.message ||
          "Dagslagret har uppdaterats."
        )


        setList((prevList) =>

          prevList.map((item) =>

            item._id === foodId

              ? {
                  ...item,

                  sameDayStock:
                    stock
                }

              : item

          )

        )


      } else {

        toast.error(
          response.data.message ||
          "Dagslagret kunde inte uppdateras."
        )

      }


    } catch (error) {



      if (
        error.response?.status === 401
      ) {

        toast.error(
          "Din inloggning har gått ut. Logga in igen."
        )

        return

      }


      if (
        error.response?.status === 403
      ) {

        toast.error(
          "Du har inte administratörsbehörighet."
        )

        return

      }


      toast.error(
        error.response?.data?.message ||
        "Något gick fel när dagslagret skulle uppdateras."
      )


    } finally {

      setUpdatingStockId(
        null
      )

    }

  }


  // ======================================================
  // REMOVE FOOD
  // ======================================================

  const removeFood = async (
    foodId
  ) => {

    if (
      !foodId ||
      removingId
    ) {

      return

    }


    const token =
      localStorage.getItem(
        "token"
      )


    if (!token) {

      toast.error(
        "Du måste logga in som administratör."
      )

      return

    }


    const confirmed =
      window.confirm(
        "Är du säker på att du vill ta bort produkten?"
      )


    if (!confirmed) {

      return

    }


    try {

      setRemovingId(
        foodId
      )


      const response =
        await axios.post(

          `${url}/api/food/remove`,

          {
            id:
              foodId
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

        toast.success(
          response.data.message ||
          "Produkten har tagits bort."
        )


        setList((prevList) =>

          prevList.filter(
            (item) =>
              item._id !== foodId
          )

        )


        setStockValues((prev) => {

          const updated =
            {
              ...prev
            }


          delete updated[
            foodId
          ]


          return updated

        })


      } else {

        toast.error(
          response.data.message ||
          "Produkten kunde inte tas bort."
        )

      }


    } catch (error) {



      if (
        error.response?.status === 401
      ) {

        toast.error(
          "Din inloggning har gått ut. Logga in igen."
        )

        return

      }


      if (
        error.response?.status === 403
      ) {

        toast.error(
          "Du har inte administratörsbehörighet."
        )

        return

      }


      toast.error(
        error.response?.data?.message ||
        "Något gick fel när produkten skulle tas bort."
      )


    } finally {

      setRemovingId(
        null
      )

    }

  }


  // ======================================================
  // LOAD PRODUCTS
  // ======================================================

  useEffect(() => {

    fetchList()

  }, [fetchList])


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return (

      <div className="list flex-col">

        <p className="list-title">
          Alla produkter
        </p>

        <div className="list-loading">
          Hämtar produkter...
        </div>

      </div>

    )

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <div className="list flex-col">


      {/* ================================================ */}
      {/* HEADER */}
      {/* ================================================ */}

      <div className="list-header">


        <div>

          <p className="list-title">
            Alla produkter
          </p>

          <span className="list-count">

            {list.length}

            {" "}

            {
              list.length === 1
                ? "produkt"
                : "produkter"
            }

          </span>

        </div>


        <button
          type="button"
          className="list-refresh-button"
          onClick={fetchList}
        >
          Uppdatera
        </button>


      </div>


      {/* ================================================ */}
      {/* TABLE */}
      {/* ================================================ */}

      <div className="list-table">


        {/* HEADER */}

        <div className="list-table-format title">

          <b>
            Bild
          </b>

          <b>
            Namn
          </b>

          <b>
            Kategori
          </b>

          <b>
            Pris
          </b>

          <b>
            Dagslager
          </b>

          <b>
            Åtgärd
          </b>

        </div>


        {/* ============================================== */}
        {/* EMPTY */}
        {/* ============================================== */}

        {list.length === 0 ? (

          <div className="list-empty">

            <p>
              Inga produkter hittades.
            </p>

          </div>

        ) : (

          list.map((item) => (

            <div
              key={item._id}
              className="list-table-format"
            >


              {/* ======================================== */}
              {/* IMAGE */}
              {/* ======================================== */}

              {item.image ? (

                <img
                  src={getImageUrl(item.image)}
                  alt={item.name}
                />

              ) : (

                <div className="list-image-placeholder">
                  Ingen bild
                </div>

              )}


              {/* ======================================== */}
              {/* NAME */}
              {/* ======================================== */}

              <p className="list-product-name">

                {item.name}

              </p>


              {/* ======================================== */}
              {/* CATEGORY */}
              {/* ======================================== */}

              <p>

                {item.category}

              </p>


              {/* ======================================== */}
              {/* PRICE */}
              {/* ======================================== */}

              <p>

                {
                  Number(
                    item.price || 0
                  ).toFixed(2)
                }

                {" kr"}

              </p>


              {/* ======================================== */}
              {/* SAME-DAY STOCK */}
              {/* ======================================== */}

              <div className="stock-control">


                <input

                  type="number"

                  min="0"

                  max={MAX_SAME_DAY_STOCK}

                  step="1"

                  value={
                    stockValues[
                      item._id
                    ] ?? 0
                  }

                  onChange={(event) =>
                    handleStockChange(
                      item._id,
                      event.target.value
                    )
                  }

                />


                <button

                  type="button"

                  className="save-stock-button"

                  disabled={
                    updatingStockId ===
                    item._id
                  }

                  onClick={() =>
                    updateStock(
                      item._id
                    )
                  }

                >

                  {
                    updatingStockId ===
                    item._id

                      ? "..."

                      : "Spara"
                  }

                </button>


              </div>


              {/* RECEPT OCH PRODUKTÅTGÄRDER */}
              <div className="list-item-actions">
                <button
                  type="button"
                  className="mc-customization-button"
                  onClick={() => openCustomizations(item)}
                  aria-label={`Redigera kundval för ${item.name}`}
                  disabled={customizationSaving}
                >
                  ⚙️ Kundval
                </button>

                <button
                  type="button"
                  className="list-recipe-button"
                  onClick={() => void openRecipe(item)}
                  aria-label={`Redigera internt recept för ${item.name}`}
                >
                  📖 Recept
                </button>

                <button
                  type="button"
                  className="delete-food-button"
                  aria-label={`Ta bort ${item.name}`}
                  disabled={removingId === item._id}
                  onClick={() => removeFood(item._id)}
                >
                  {removingId === item._id ? '…' : '×'}
                </button>
              </div>


            </div>

          ))

        )}


      </div>

      {/* Separat redigerare för kundsynliga produktanpassningar. */}
      {customizationProduct && (
        <div className="mc-customization-overlay" onMouseDown={event => {
          if (event.target === event.currentTarget) closeCustomizations()
        }}>
          <section
            className="mc-customization-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mc-customization-title"
          >
            <div className="mc-customization-header">
              <div>
                <span className="mc-customization-eyebrow">KUNDANPASSNINGAR</span>
                <h2 id="mc-customization-title">{customizationProduct.name}</h2>
                <p>Bestäm vad kunden får välja bort eller lägga till.</p>
              </div>
              <button
                type="button"
                className="mc-customization-close"
                onClick={closeCustomizations}
                disabled={customizationSaving}
                aria-label="Stäng kundval"
              >×</button>
            </div>

            <form className="mc-customization-form" onSubmit={saveCustomizations}>
              <div className="mc-customization-scroll">
                <label className="mc-customization-switch">
                  <input
                    type="checkbox"
                    checked={customizationsEnabled}
                    onChange={event => setCustomizationsEnabled(event.target.checked)}
                    disabled={customizationSaving}
                  />
                  <span>
                    <strong>Aktivera kundanpassningar</strong>
                    <small>Avstängt = alternativen visas inte för kunden.</small>
                  </span>
                </label>

                <section className="mc-customization-section">
                  <div className="mc-customization-section-header">
                    <div>
                      <h3>Välj bort ingredienser</h3>
                      <p>Lista endast sådant som går att ta bort ur denna produkt.</p>
                    </div>
                    <span>{removableIngredients.length}/{MAX_CUSTOMIZATION_OPTIONS}</span>
                  </div>
                  {removableIngredients.map((ingredient, index) => (
                    <div className="mc-customization-option" key={ingredient._key}>
                      <span className="mc-customization-index">{index + 1}</span>
                      <label className="mc-customization-name">
                        <span>Ingrediens</span>
                        <input
                          type="text"
                          value={ingredient.name}
                          placeholder="T.ex. majs"
                          maxLength={MAX_OPTION_NAME_LENGTH}
                          onChange={event => updateRemovableIngredient(ingredient._key, 'name', event.target.value)}
                          disabled={customizationSaving}
                        />
                      </label>
                      <label className="mc-customization-available">
                        <input
                          type="checkbox"
                          checked={ingredient.available}
                          onChange={event => updateRemovableIngredient(ingredient._key, 'available', event.target.checked)}
                          disabled={customizationSaving}
                        />
                        <span>Valbar</span>
                      </label>
                      <button
                        type="button"
                        className="mc-customization-remove"
                        aria-label={`Ta bort ingrediensval ${index + 1}`}
                        disabled={customizationSaving}
                        onClick={() => setRemovableIngredients(previous => previous.filter(row => row._key !== ingredient._key))}
                      >×</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mc-customization-add"
                    onClick={() => setRemovableIngredients(previous => [...previous, createRemovableIngredient()])}
                    disabled={customizationSaving || removableIngredients.length >= MAX_CUSTOMIZATION_OPTIONS}
                  >+ Lägg till ingrediensval</button>
                </section>

                <section className="mc-customization-section">
                  <div className="mc-customization-section-header">
                    <div>
                      <h3>Extra tillval</h3>
                      <p>Priser anges exklusive moms. Maxantal gäller per produkt.</p>
                    </div>
                    <span>{extraOptions.length}/{MAX_CUSTOMIZATION_OPTIONS}</span>
                  </div>
                  {extraOptions.map((extra, index) => (
                    <div className="mc-customization-option mc-customization-option--extra" key={extra._key}>
                      <span className="mc-customization-index">{index + 1}</span>
                      <label className="mc-customization-name">
                        <span>Tillval</span>
                        <input
                          type="text"
                          value={extra.name}
                          maxLength={MAX_OPTION_NAME_LENGTH}
                          placeholder="T.ex. extra mango"
                          onChange={event => updateExtraOption(extra._key, 'name', event.target.value)}
                          disabled={customizationSaving}
                        />
                      </label>
                      <label className="mc-customization-price">
                        <span>Pris (kr)</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={extra.price}
                          placeholder="15,00"
                          onChange={event => updateExtraOption(extra._key, 'price', event.target.value)}
                          disabled={customizationSaving}
                        />
                      </label>
                      <label className="mc-customization-quantity">
                        <span>Maxantal</span>
                        <input
                          type="number"
                          min="1"
                          max={MAX_EXTRA_QUANTITY}
                          step="1"
                          value={extra.maxQuantity}
                          onChange={event => updateExtraOption(extra._key, 'maxQuantity', event.target.value)}
                          disabled={customizationSaving}
                        />
                      </label>
                      <label className="mc-customization-available">
                        <input
                          type="checkbox"
                          checked={extra.available}
                          onChange={event => updateExtraOption(extra._key, 'available', event.target.checked)}
                          disabled={customizationSaving}
                        />
                        <span>Valbar</span>
                      </label>
                      <button
                        type="button"
                        className="mc-customization-remove"
                        aria-label={`Ta bort tillval ${index + 1}`}
                        disabled={customizationSaving}
                        onClick={() => setExtraOptions(previous => previous.filter(row => row._key !== extra._key))}
                      >×</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mc-customization-add"
                    onClick={() => setExtraOptions(previous => [...previous, createExtraOption()])}
                    disabled={customizationSaving || extraOptions.length >= MAX_CUSTOMIZATION_OPTIONS}
                  >+ Lägg till tillval</button>
                </section>

                <p className="mc-customization-note">
                  Köksreceptet ändras inte. Kundval syns på produktsidan först när
                  produktanpassningar har kopplats till varukorg och kassa.
                </p>
                {customizationError && (
                  <p className="mc-customization-error" role="alert">{customizationError}</p>
                )}
              </div>
              <div className="mc-customization-footer">
                <button
                  type="button"
                  className="mc-customization-cancel"
                  onClick={closeCustomizations}
                  disabled={customizationSaving}
                >Avbryt</button>
                <button
                  type="submit"
                  className="mc-customization-save"
                  disabled={customizationSaving}
                >{customizationSaving ? 'Sparar…' : 'Spara kundval'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Receptredigeraren visas bara efter klick och påverkar inte produktlistans layout. */}
      {recipeProduct && (
        <div className="mc-recipe-overlay" onMouseDown={event => {
          if (event.target === event.currentTarget) closeRecipe()
        }}>
          <section
            className="mc-recipe-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mc-recipe-title"
          >
            <div className="mc-recipe-header">
              <div>
                <span className="mc-recipe-eyebrow">INTERNT KÖKSRECEPT</span>
                <h2 id="mc-recipe-title">{recipeProduct.name}</h2>
                <p>Syns bara i adminpanelen, aldrig för kunder.</p>
              </div>
              <button
                type="button"
                className="mc-recipe-close"
                onClick={closeRecipe}
                disabled={recipeSaving}
                aria-label="Stäng recept"
                autoFocus
              >×</button>
            </div>

            {recipeLoading ? (
              <p className="mc-recipe-message" role="status">Hämtar recept…</p>
            ) : recipeError ? (
              <div className="mc-recipe-message mc-recipe-message--error" role="alert">
                <p>{recipeError}</p>
                <button type="button" onClick={() => void openRecipe(recipeProduct)}>
                  Försök igen
                </button>
              </div>
            ) : (
              <form className="mc-recipe-form" onSubmit={saveRecipe}>
                <div className="mc-recipe-scroll">
                  <section className="mc-recipe-section">
                    <div className="mc-recipe-section-heading">
                      <div>
                        <h3>🥣 Ingredienser</h3>
                        <p>Fyll i mängd, enhet och namn på varje ingrediens.</p>
                      </div>
                    </div>

                    <div className="mc-recipe-ingredients">
                      {recipeIngredients.map((ingredient, index) => (
                        <div className="mc-recipe-ingredient" key={ingredient._key}>
                          <span className="mc-recipe-row-number">{index + 1}</span>
                          <label>
                            <span>Mängd</span>
                            <input
                              value={ingredient.amount}
                              maxLength={40}
                              placeholder="420"
                              onChange={event => updateRecipeIngredient(ingredient._key, 'amount', event.target.value)}
                            />
                          </label>
                          <label>
                            <span>Enhet</span>
                            <input
                              value={ingredient.unit}
                              maxLength={30}
                              placeholder="g"
                              onChange={event => updateRecipeIngredient(ingredient._key, 'unit', event.target.value)}
                            />
                          </label>
                          <label className="mc-recipe-ingredient-name">
                            <span>Ingrediens</span>
                            <input
                              value={ingredient.name}
                              maxLength={120}
                              placeholder="Vetemjöl"
                              onChange={event => updateRecipeIngredient(ingredient._key, 'name', event.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            className="mc-recipe-remove-row"
                            aria-label={`Ta bort ingrediens ${index + 1}`}
                            onClick={() => setRecipeIngredients(previous => previous.filter(row => row._key !== ingredient._key))}
                          >×</button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mc-recipe-add"
                      disabled={recipeIngredients.length >= 80}
                      onClick={() => setRecipeIngredients(previous => [...previous, newIngredient()])}
                    >+ Lägg till ingrediens</button>
                  </section>

                  <section className="mc-recipe-section">
                    <div className="mc-recipe-section-heading">
                      <div>
                        <h3>👩‍🍳 Tillagning</h3>
                        <p>Ett kort och tydligt steg i taget.</p>
                      </div>
                    </div>

                    <div className="mc-recipe-steps">
                      {recipeSteps.map((step, index) => (
                        <div className="mc-recipe-step" key={step._key}>
                          <span className="mc-recipe-row-number">{index + 1}</span>
                          <label>
                            <span>Steg {index + 1}</span>
                            <textarea
                              rows={2}
                              maxLength={800}
                              value={step.text}
                              placeholder="Beskriv vad som ska göras…"
                              onChange={event => updateRecipeStep(step._key, event.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            className="mc-recipe-remove-row"
                            aria-label={`Ta bort steg ${index + 1}`}
                            onClick={() => setRecipeSteps(previous => previous.filter(row => row._key !== step._key))}
                          >×</button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mc-recipe-add"
                      disabled={recipeSteps.length >= 50}
                      onClick={() => setRecipeSteps(previous => [...previous, newStep()])}
                    >+ Lägg till steg</button>
                  </section>
                </div>

                <div className="mc-recipe-footer">
                  <button type="button" className="mc-recipe-cancel" onClick={closeRecipe} disabled={recipeSaving}>
                    Avbryt
                  </button>
                  <button type="submit" className="mc-recipe-save" disabled={recipeSaving}>
                    {recipeSaving ? 'Sparar…' : 'Spara recept'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

    </div>

  )

}


export default List
