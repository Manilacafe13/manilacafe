import React, {
  useEffect,
  useState
} from 'react'

import './FutureProducts.css'

import axios from 'axios'

import {
  toast
} from 'react-toastify'


const FutureProducts = ({
  url
}) => {

  // ======================================================
  // STATE
  // ======================================================

  const [products, setProducts] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [image, setImage] =
    useState(null)

  const [preview, setPreview] =
    useState("")

  const [formData, setFormData] =
    useState({

      name: "",

      description: "",

      emoji: "🍰",

      category: "Dessert"

    })


  // ======================================================
  // TOKEN
  // ======================================================

  const token =
    localStorage.getItem("token")


  // ======================================================
  // IMAGE URL
  // ======================================================

  const getImageUrl = (
    imageValue
  ) => {

    if (!imageValue) {
      return ""
    }


    const value =
      String(
        imageValue
      ).trim()


    if (
      value.startsWith(
        "https://"
      ) ||
      value.startsWith(
        "http://"
      )
    ) {

      return value

    }


    if (
      value.startsWith("//")
    ) {

      return `https:${value}`

    }


    return `${url}/images/${value}`

  }


  // ======================================================
  // LOAD PRODUCTS
  // ======================================================

  const fetchProducts =
    async () => {

      try {

        setLoading(
          true
        )


        const response =
          await axios.get(

            `${url}/api/future-product/admin/list`,

            {

              headers: {
                token
              }

            }

          )


        if (
          response.data.success
        ) {

          setProducts(
            response.data.data || []
          )

        } else {

          toast.error(
            response.data.message ||
            "Produkterna kunde inte hämtas."
          )

        }


      } catch (error) {

        console.log(
          "Future products error:",
          error
        )


        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {

          toast.error(
            "Din adminsession är inte giltig. Logga in igen."
          )

          return

        }


        toast.error(
          error.response?.data?.message ||
          "Produkterna kunde inte hämtas."
        )


      } finally {

        setLoading(
          false
        )

      }

    }


  // ======================================================
  // LOAD ON START
  // ======================================================

  useEffect(
    () => {

      fetchProducts()

    },
    []
  )


  // ======================================================
  // INPUT CHANGE
  // ======================================================

  const onChangeHandler = (
    event
  ) => {

    const {
      name,
      value
    } =
      event.target


    setFormData(
      (previous) => ({

        ...previous,

        [name]:
          value

      })
    )

  }


  // ======================================================
  // IMAGE CHANGE
  // ======================================================

  const handleImageChange = (
    event
  ) => {

    const file =
      event.target.files?.[0]


    if (!file) {

      setImage(null)

      setPreview("")

      return

    }


    setImage(
      file
    )


    const objectUrl =
      URL.createObjectURL(
        file
      )


    setPreview(
      objectUrl
    )

  }


  // ======================================================
  // ADD PRODUCT
  // ======================================================

  const submitHandler =
    async (
      event
    ) => {

      event.preventDefault()


      if (
        !formData.name.trim() ||
        !formData.description.trim()
      ) {

        toast.error(
          "Namn och beskrivning krävs."
        )

        return

      }


      try {

        setSubmitting(
          true
        )


        const data =
          new FormData()


        data.append(
          "name",
          formData.name.trim()
        )

        data.append(
          "description",
          formData.description.trim()
        )

        data.append(
          "emoji",
          formData.emoji.trim() || "🍰"
        )

        data.append(
          "category",
          formData.category.trim() || "Dessert"
        )


        if (image) {

          data.append(
            "image",
            image
          )

        }


        const response =
          await axios.post(

            `${url}/api/future-product/add`,

            data,

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
            "Framtida produkt tillagd."
          )


          setFormData({

            name: "",

            description: "",

            emoji: "🍰",

            category: "Dessert"

          })


          setImage(
            null
          )


          if (preview) {

            URL.revokeObjectURL(
              preview
            )

          }


          setPreview(
            ""
          )


          const fileInput =
            document.getElementById(
              "future-product-image"
            )


          if (fileInput) {

            fileInput.value =
              ""

          }


          await fetchProducts()

        } else {

          toast.error(
            response.data.message ||
            "Produkten kunde inte läggas till."
          )

        }


      } catch (error) {

        console.log(
          "Add future product error:",
          error
        )


        toast.error(
          error.response?.data?.message ||
          "Produkten kunde inte läggas till."
        )


      } finally {

        setSubmitting(
          false
        )

      }

    }


  // ======================================================
  // TOGGLE ACTIVE STATUS
  // ======================================================

  const toggleStatus =
    async (
      product
    ) => {

      try {

        const response =
          await axios.post(

            `${url}/api/future-product/status`,

            {

              productId:
                product._id,

              active:
                !product.active

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

          setProducts(
            (previous) =>

              previous.map(
                (item) =>

                  item._id === product._id
                    ? {
                        ...item,
                        active:
                          !product.active
                      }
                    : item

              )
          )


          toast.success(
            !product.active
              ? "Produkten visas nu för kunder."
              : "Produkten har dolts."
          )

        } else {

          toast.error(
            response.data.message ||
            "Status kunde inte ändras."
          )

        }


      } catch (error) {

        console.log(
          "Status update error:",
          error
        )


        toast.error(
          error.response?.data?.message ||
          "Status kunde inte ändras."
        )

      }

    }


  // ======================================================
  // REMOVE PRODUCT
  // ======================================================

  const removeProduct =
    async (
      productId
    ) => {

      const confirmed =
        window.confirm(
          "Är du säker på att du vill ta bort den här produkten?"
        )


      if (!confirmed) {
        return
      }


      try {

        const response =
          await axios.post(

            `${url}/api/future-product/remove`,

            {
              productId
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

          setProducts(
            (previous) =>

              previous.filter(
                (product) =>
                  product._id !== productId
              )

          )


          toast.success(
            "Produkten har tagits bort."
          )

        } else {

          toast.error(
            response.data.message ||
            "Produkten kunde inte tas bort."
          )

        }


      } catch (error) {

        console.log(
          "Remove future product error:",
          error
        )


        toast.error(
          error.response?.data?.message ||
          "Produkten kunde inte tas bort."
        )

      }

    }


  // ======================================================
  // RENDER
  // ======================================================

  return (

    <div className="future-products">

      <div className="future-products-header">

        <div>

          <h1>
            Framtida produkter
          </h1>

          <p>
            Lägg till produkter som kunder kan rösta på.
          </p>

        </div>

      </div>


      {/* ==================================================
          ADD PRODUCT FORM
      ================================================== */}

      <form
        className="future-product-form"
        onSubmit={submitHandler}
      >

        <h2>
          Lägg till framtida produkt
        </h2>


        <div className="future-form-grid">


          <div className="future-form-group">

            <label>
              Produktnamn
            </label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChangeHandler}
              placeholder="Exempel: Ube Cheesecake"
              maxLength={100}
              required
            />

          </div>


          <div className="future-form-group">

            <label>
              Kategori
            </label>

            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={onChangeHandler}
              placeholder="Dessert"
            />

          </div>


          <div className="future-form-group">

            <label>
              Emoji
            </label>

            <input
              type="text"
              name="emoji"
              value={formData.emoji}
              onChange={onChangeHandler}
              placeholder="🍰"
              maxLength={10}
            />

          </div>


          <div className="future-form-group">

            <label>
              Bild
            </label>

            <input
              id="future-product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />

          </div>

        </div>


        <div className="future-form-group">

          <label>
            Beskrivning
          </label>

          <textarea
            name="description"
            value={formData.description}
            onChange={onChangeHandler}
            placeholder="Beskriv produkten..."
            maxLength={500}
            required
          />

        </div>


        {
          preview &&
          (

            <div className="future-image-preview">

              <img
                src={preview}
                alt="Förhandsvisning"
              />

            </div>

          )
        }


        <button
          className="future-submit-button"
          type="submit"
          disabled={submitting}
        >

          {
            submitting
              ? "Lägger till..."
              : "Lägg till produkt"
          }

        </button>

      </form>


      {/* ==================================================
          PRODUCT LIST
      ================================================== */}

      <div className="future-product-list">

        <div className="future-list-heading">

          <h2>
            Produkter
          </h2>

          <span>
            {products.length} st
          </span>

        </div>


        {
          loading
            ? (

              <p className="future-state-message">
                Hämtar produkter...
              </p>

            )
            : products.length === 0
              ? (

                <p className="future-state-message">
                  Inga framtida produkter har lagts till ännu.
                </p>

              )
              : (

                <div className="future-product-grid">

                  {
                    products.map(
                      (product) => (

                        <div
                          className="future-product-card"
                          key={product._id}
                        >


                          <div className="future-card-image">

                            {
                              product.image
                                ? (

                                  <img
                                    src={
                                      getImageUrl(
                                        product.image
                                      )
                                    }
                                    alt={product.name}
                                  />

                                )
                                : (

                                  <div className="future-card-emoji">

                                    {
                                      product.emoji ||
                                      "🍰"
                                    }

                                  </div>

                                )
                            }


                            <div
                              className={
                                product.active
                                  ? "future-status active"
                                  : "future-status hidden"
                              }
                            >

                              {
                                product.active
                                  ? "Visas"
                                  : "Dold"
                              }

                            </div>

                          </div>


                          <div className="future-card-content">

                            <div className="future-card-title">

                              <h3>
                                {product.name}
                              </h3>

                              <span>
                                {
                                  product.emoji ||
                                  "🍰"
                                }
                              </span>

                            </div>


                            <p className="future-category">

                              {
                                product.category ||
                                "Dessert"
                              }

                            </p>


                            <p className="future-description">

                              {
                                product.description
                              }

                            </p>


                            <div className="future-votes">

                              <strong>
                                {product.voteCount || 0}
                              </strong>

                              <span>
                                röster
                              </span>

                            </div>


                            <div className="future-card-actions">

                              <button
                                type="button"
                                className={
                                  product.active
                                    ? "future-hide-button"
                                    : "future-show-button"
                                }
                                onClick={
                                  () =>
                                    toggleStatus(
                                      product
                                    )
                                }
                              >

                                {
                                  product.active
                                    ? "Dölj"
                                    : "Visa"
                                }

                              </button>


                              <button
                                type="button"
                                className="future-delete-button"
                                onClick={
                                  () =>
                                    removeProduct(
                                      product._id
                                    )
                                }
                              >

                                Ta bort

                              </button>

                            </div>

                          </div>

                        </div>

                      )
                    )
                  }

                </div>

              )
        }

      </div>

    </div>

  )

}


export default FutureProducts