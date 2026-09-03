import React, { useState } from 'react'
import './Add.css'
import { assets } from '../../assets/assets'
import axios from "axios"
import { toast } from 'react-toastify'


const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_PRICE = 100000
const MAX_SAME_DAY_STOCK = 10000


const Add = ({ url }) => {

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

  const [image, setImage] =
    useState(null)

  const [isLoading, setIsLoading] =
    useState(false)

  const [data, setData] =
    useState({
      name: "",
      description: "",
      price: "",
      category: "Halo-Halo",
      sameDayStock: 0
    })


  // ======================================================
  // INPUT HANDLER
  // ======================================================

  const onChangeHandler = (event) => {

    const {
      name,
      value
    } = event.target

    setData((prev) => ({
      ...prev,
      [name]: value
    }))

  }


  // ======================================================
  // IMAGE HANDLER
  // ======================================================

  const onImageChange = (event) => {

    const selectedFile =
      event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {

      toast.error(
        "Välj en giltig bildfil."
      )

      event.target.value = ""

      return
    }

    setImage(
      selectedFile
    )

  }


  // ======================================================
  // SUBMIT PRODUCT
  // ======================================================

  const onSubmitHandler = async (
    event
  ) => {

    event.preventDefault()


    if (isLoading) {
      return
    }


    // ==================================================
    // BACKEND URL
    // ==================================================

    if (!backendUrl) {

      toast.error(
        "Backend-adressen saknas."
      )

      return
    }


    // ==================================================
    // ADMIN TOKEN
    // ==================================================

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


    // ==================================================
    // VALIDATE IMAGE
    // ==================================================

    if (!image) {

      toast.error(
        "Du måste välja en produktbild."
      )

      return
    }


    // ==================================================
    // VALIDATE TEXT
    // ==================================================

    if (
  !data.name.trim() ||
  !data.description.trim() ||
  !data.category.trim()
) {

  toast.error(
    "Alla produktuppgifter måste fyllas i."
  )

  return
}


if (
  data.name.trim().length >
  MAX_NAME_LENGTH
) {

  toast.error(
    `Produktnamnet får vara högst ${MAX_NAME_LENGTH} tecken.`
  )

  return
}


if (
  data.description.trim().length >
  MAX_DESCRIPTION_LENGTH
) {

  toast.error(
    `Produktbeskrivningen får vara högst ${MAX_DESCRIPTION_LENGTH} tecken.`
  )

  return
}



    // ==================================================
// PRICE
// ==================================================

const price =
  Number(
    data.price
  )


if (
  !Number.isFinite(price) ||
  price < 0 ||
  price > MAX_PRICE
) {

  toast.error(
    `Priset måste vara mellan 0 och ${MAX_PRICE} kr.`
  )

  return
}


    // ==================================================
    // SAME-DAY STOCK
    // ==================================================

    const sameDayStock =
      Number(
        data.sameDayStock
      )


    if (
  !Number.isInteger(
    sameDayStock
  ) ||
  sameDayStock < 0 ||
  sameDayStock >
    MAX_SAME_DAY_STOCK
) {

  toast.error(
    `Dagslagret måste vara ett heltal mellan 0 och ${MAX_SAME_DAY_STOCK}.`
  )

  return
}


    try {

      setIsLoading(true)


      // ==================================================
      // FORM DATA
      // ==================================================

      const formData =
        new FormData()


      formData.append(
        "name",
        data.name.trim()
      )


      formData.append(
        "description",
        data.description.trim()
      )


      formData.append(
        "price",
        price
      )


      formData.append(
        "category",
        data.category
      )


      formData.append(
        "sameDayStock",
        sameDayStock
      )


      formData.append(
        "image",
        image
      )


      // ==================================================
      // SEND PRODUCT
      // ==================================================

      const response =
        await axios.post(

          `${backendUrl}/api/food/add`,

          formData,

          {
            headers: {
              token
            }
          }

        )


      // ==================================================
      // SUCCESS
      // ==================================================

      if (
        response.data.success
      ) {

        toast.success(
          response.data.message ||
          "Produkten har lagts till."
        )


        setData({
          name: "",
          description: "",
          price: "",
          category: "Halo-Halo",
          sameDayStock: 0
        })


        setImage(
          null
        )


        const imageInput =
          document.getElementById(
            "image"
          )


        if (imageInput) {
          imageInput.value = ""
        }


        return
      }


      toast.error(
        response.data.message ||
        "Produkten kunde inte läggas till."
      )


    } catch (error) {

      console.log(
        "Add product error:",
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
        "Något gick fel när produkten skulle läggas till."
      )


    } finally {

      setIsLoading(false)

    }

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <div className="add">

      <form
        className="flex-col"
        onSubmit={onSubmitHandler}
      >


        {/* ============================================== */}
        {/* IMAGE */}
        {/* ============================================== */}

        <div className="add-img-upload flex-col">

          <p>
            Produktbild
          </p>


          <label htmlFor="image">

            <img
              src={
                image
                  ? URL.createObjectURL(
                      image
                    )
                  : assets.upload_area
              }
              alt="Ladda upp produkt"
            />

          </label>


          <input
            onChange={onImageChange}
            type="file"
            id="image"
            accept="image/*"
            hidden
            required
          />

        </div>


        {/* ============================================== */}
        {/* NAME */}
        {/* ============================================== */}

        <div className="add-product-name flex-col">

          <p>
            Produktnamn
          </p>

          <input
  onChange={onChangeHandler}
  value={data.name}
  type="text"
  name="name"
  maxLength={MAX_NAME_LENGTH}
  placeholder="Exempel: Mango Float"
  required
/>

        </div>


        {/* ============================================== */}
        {/* DESCRIPTION */}
        {/* ============================================== */}

        <div className="add-product-description flex-col">

          <p>
            Produktbeskrivning
          </p>

         <textarea
  onChange={onChangeHandler}
  value={data.description}
  name="description"
  rows="6"
  maxLength={MAX_DESCRIPTION_LENGTH}
  placeholder="Beskriv produkten..."
  required
/>

        </div>


        {/* ============================================== */}
        {/* CATEGORY / PRICE / STOCK */}
        {/* ============================================== */}

        <div className="add-category-price">


          {/* CATEGORY */}

          <div className="add-category flex-col">

            <p>
              Kategori
            </p>

            <select
              onChange={onChangeHandler}
              name="category"
              value={data.category}
            >

              <option value="Halo-Halo">
                Halo-Halo
              </option>

              <option value="Ube cake">
                Ube cake
              </option>

              <option value="Floats">
                Floats
              </option>

              <option value="Fruit salad">
                Fruit salad
              </option>

            </select>

          </div>


          {/* PRICE */}

          <div className="add-price flex-col">

            <p>
              Pris exkl. moms
            </p>

            <input
  onChange={onChangeHandler}
  value={data.price}
  type="number"
  name="price"
  min="0"
  max={MAX_PRICE}
  step="0.01"
  placeholder="45"
  required
/>

          </div>


          {/* SAME-DAY STOCK */}

          <div className="add-stock flex-col">

            <p>
              Tillgängligt idag
            </p>

            <input
  onChange={onChangeHandler}
  value={data.sameDayStock}
  type="number"
  name="sameDayStock"
  min="0"
  max={MAX_SAME_DAY_STOCK}
  step="1"
  placeholder="0"
  required
/>

            <span className="stock-help">
              Antal portioner som kan beställas samma dag.
            </span>

          </div>


        </div>


        {/* ============================================== */}
        {/* BUTTON */}
        {/* ============================================== */}

        <button
          type="submit"
          className="add-btn"
          disabled={isLoading}
        >

          {
            isLoading
              ? "LÄGGER TILL..."
              : "LÄGG TILL"
          }

        </button>


      </form>

    </div>

  )

}


export default Add