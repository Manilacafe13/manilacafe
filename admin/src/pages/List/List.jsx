import React, {
  useCallback,
  useEffect,
  useState
} from 'react'

import './List.css'
import axios from "axios"
import { toast } from "react-toastify"

const MAX_SAME_DAY_STOCK = 10000


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

      console.log(
        "Fetch food list error:",
        error.response?.data ||
        error.message
      )


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

      console.log(
        "Update stock error:",
        error.response?.data ||
        error.message
      )


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

      console.log(
        "Remove food error:",
        error.response?.data ||
        error.message
      )


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

      <div className="list add flex-col">

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

    <div className="list add flex-col">


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


              {/* ======================================== */}
              {/* DELETE */}
              {/* ======================================== */}

              <button

                type="button"

                className="delete-food-button"

                disabled={
                  removingId ===
                  item._id
                }

                onClick={() =>
                  removeFood(
                    item._id
                  )
                }

              >

                {
                  removingId ===
                  item._id

                    ? "..."

                    : "×"
                }

              </button>


            </div>

          ))

        )}


      </div>


    </div>

  )

}


export default List