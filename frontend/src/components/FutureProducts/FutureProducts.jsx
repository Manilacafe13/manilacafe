import React, {
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import './FutureProducts.css'
import axios from 'axios'

import {
  StoreContext
} from '../../context/StoreContext'


const FutureProducts = () => {

  const {
    url,
    token
  } = useContext(StoreContext)


  const [products, setProducts] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [updatingProduct, setUpdatingProduct] =
    useState(null)


  // ======================================================
  // SORT PRODUCTS BY VOTES
  // ======================================================

  const sortProducts = (
    productList
  ) => {

    return [...productList].sort(
      (a, b) =>
        Number(b.voteCount || 0) -
        Number(a.voteCount || 0)
    )

  }


  // ======================================================
  // GET IMAGE URL
  // ======================================================

  const getImageUrl = (
    image
  ) => {

    if (!image) {

      return ""

    }


    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {

      return image

    }


    return `${url}/images/${image}`

  }


  // ======================================================
  // FETCH FUTURE PRODUCTS
  // ======================================================

  const fetchFutureProducts =
    useCallback(async () => {

      try {

        setLoading(true)

        setError("")


        const config =
          token
            ? {
                headers: {
                  token
                }
              }
            : {}


        const response =
          await axios.get(

            `${url}/api/future-product/list`,

            config

          )


        if (
          response.data.success
        ) {

          const productData =
            Array.isArray(
              response.data.data
            )
              ? response.data.data
              : []


          setProducts(
            sortProducts(
              productData
            )
          )

        } else {

          setProducts([])

          setError(
            response.data.message ||
            "Kunde inte hämta produkterna."
          )

        }


      } catch (error) {
        setError(
          error.response?.data?.message ||
          "Något gick fel när produkterna skulle hämtas."
        )


      } finally {

        setLoading(false)

      }

    }, [
      url,
      token
    ])


  // ======================================================
  // LOAD PRODUCTS
  // ======================================================

  useEffect(() => {

    fetchFutureProducts()

  }, [fetchFutureProducts])


  // ======================================================
  // UPDATE PRODUCT LOCALLY
  // ======================================================

  const updateProductLocally = (
    productId,
    voteCount,
    hasVoted
  ) => {

    setProducts(
      (currentProducts) => {

        const updated =
          currentProducts.map(
            (product) => {

              if (
                product._id !==
                productId
              ) {

                return product

              }


              return {

                ...product,

                voteCount,

                hasVoted

              }

            }
          )


        return sortProducts(
          updated
        )

      }
    )

  }


  // ======================================================
  // VOTE / REMOVE VOTE
  // ======================================================

  const handleVote = async (
    product
  ) => {

    if (!token) {

      alert(
        "Logga in för att rösta på vilken dessert du vill se härnäst."
      )

      return

    }


    try {

      setUpdatingProduct(
        product._id
      )


      const endpoint =
        product.hasVoted
          ? "unvote"
          : "vote"


      const response =
        await axios.post(

          `${url}/api/future-product/${endpoint}`,

          {
            productId:
              product._id
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

        updateProductLocally(

          product._id,

          Number(
            response.data.data?.voteCount ||
            0
          ),

          Boolean(
            response.data.data?.hasVoted
          )

        )

      } else {

        alert(
          response.data.message ||
          "Rösten kunde inte registreras."
        )

      }


    } catch (error) {
      if (
        error.response?.status === 401
      ) {

        alert(
          "Din inloggning har gått ut. Logga in igen för att rösta."
        )

        return

      }


      if (
        error.response?.status === 409
      ) {

        await fetchFutureProducts()

        return

      }


      alert(
        error.response?.data?.message ||
        "Något gick fel när din röst skulle registreras."
      )


    } finally {

      setUpdatingProduct(
        null
      )

    }

  }


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return (

      <section className="future-products">

        <div className="future-products-loading">

          <div className="future-products-loader">
          </div>

          <p>
            Hämtar framtida desserter...
          </p>

        </div>

      </section>

    )

  }


  // ======================================================
  // ERROR
  // ======================================================

  if (error) {

    return (

      <section className="future-products">

        <div className="future-products-message">

          <span>
            ♡
          </span>

          <h3>
            Vi kunde inte hämta omröstningen
          </h3>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={fetchFutureProducts}
          >
            Försök igen
          </button>

        </div>

      </section>

    )

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <section
      className="future-products"
      id="future-products"
    >


      {/* ================================================ */}
      {/* HEADER */}
      {/* ================================================ */}

      <div className="future-products-header">

        <span className="future-products-eyebrow">
          DU BESTÄMMER • VI SKAPAR
        </span>


        <h2>
          Vad vill du smaka
          <span> härnäst?</span>
        </h2>


        <p>
          Vi har många idéer på nya filippinska
          favoriter och vill gärna låta dig vara
          med och påverka vårt sortiment.
          Rösta på den dessert du helst vill se
          hos Manila Café.
        </p>

      </div>


      {/* ================================================ */}
      {/* EMPTY */}
      {/* ================================================ */}

      {products.length === 0 ? (

        <div className="future-products-empty">

          <div className="future-products-empty-icon">
            💭
          </div>

          <h3>
            Nya idéer är på väg
          </h3>

          <p>
            Vi arbetar på nya filippinska
            desserter. Snart kan du vara med
            och rösta på vad som ska komma
            till menyn härnäst.
          </p>

        </div>

      ) : (

        <>


          {/* ============================================ */}
          {/* PRODUCT GRID */}
          {/* ============================================ */}

          <div className="future-products-grid">

            {products.map(
              (
                product,
                index
              ) => {

                const isTopProduct =
                  index === 0 &&
                  Number(
                    product.voteCount
                  ) > 0


                return (

                  <article
                    className={
                      `future-product-card ${
                        product.hasVoted
                          ? "voted"
                          : ""
                      }`
                    }
                    key={product._id}
                  >


                    {/* ================================== */}
                    {/* TOP BADGE */}
                    {/* ================================== */}

                    {isTopProduct && (

                      <div className="future-product-popular">

                        🔥 Mest efterfrågad

                      </div>

                    )}


                    {/* ================================== */}
                    {/* IMAGE */}
                    {/* ================================== */}

                    <div className="future-product-image">

                      {product.image ? (

                        <img
                          src={
                            getImageUrl(
                              product.image
                            )
                          }
                          alt={
                            product.name
                          }
                        />

                      ) : (

                        <div className="future-product-emoji">

                          {product.emoji ||
                            "🍰"}

                        </div>

                      )}


                      <div className="future-product-category">

                        {product.category ||
                          "Filippinsk dessert"}

                      </div>

                    </div>


                    {/* ================================== */}
                    {/* CONTENT */}
                    {/* ================================== */}

                    <div className="future-product-content">

                      <h3>
                        {product.name}
                      </h3>


                      <p className="future-product-description">

                        {product.description}

                      </p>


                      {/* ================================ */}
                      {/* VOTES */}
                      {/* ================================ */}

                      <div className="future-product-votes">

                        <div className="future-product-vote-count">

                          <span className="vote-heart">
                            ♥
                          </span>

                          <strong>
                            {product.voteCount || 0}
                          </strong>

                          <span>

                            {
                              Number(
                                product.voteCount
                              ) === 1
                                ? "röst"
                                : "röster"
                            }

                          </span>

                        </div>


                        {product.hasVoted && (

                          <span className="your-vote">

                            Din röst ✓

                          </span>

                        )}

                      </div>


                      {/* ================================ */}
                      {/* BUTTON */}
                      {/* ================================ */}

                      <button

                        type="button"

                        className={
                          product.hasVoted
                            ? "future-vote-button voted"
                            : "future-vote-button"
                        }

                        disabled={
                          updatingProduct ===
                          product._id
                        }

                        onClick={() =>
                          handleVote(
                            product
                          )
                        }

                      >

                        {
                          updatingProduct ===
                          product._id

                            ? "Sparar..."

                            : product.hasVoted

                              ? "♥ Du har röstat"

                              : "♡ Rösta på denna"
                        }

                      </button>


                      {product.hasVoted && (

                        <button
                          type="button"
                          className="remove-vote-button"
                          disabled={
                            updatingProduct ===
                            product._id
                          }
                          onClick={() =>
                            handleVote(
                              product
                            )
                          }
                        >
                          Ta bort min röst
                        </button>

                      )}


                    </div>


                  </article>

                )

              }
            )}

          </div>


          {/* ============================================ */}
          {/* BOTTOM MESSAGE */}
          {/* ============================================ */}

          <div className="future-products-bottom">

            <div className="future-products-bottom-icon">
              ♡
            </div>

            <div>

              <strong>
                Din åsikt betyder mycket för oss.
              </strong>

              <p>
                Dina röster hjälper oss förstå vilka
                smaker och desserter ni helst vill
                se hos Manila Café i framtiden.
              </p>

            </div>

          </div>


          {!token && (

            <p className="future-products-login-note">

              Du kan se resultatet utan konto.
              Logga in för att lägga din röst.

            </p>

          )}


        </>

      )}


    </section>

  )

}


export default FutureProducts