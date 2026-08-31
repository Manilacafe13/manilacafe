import React, {
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import './Verify.css'

import {
  useNavigate,
  useSearchParams
} from 'react-router-dom'

import { StoreContext } from '../../context/StoreContext'

import axios from 'axios'


const Verify = () => {

  const {
    url,
    setCartItems
  } = useContext(StoreContext)


  const [searchParams] =
    useSearchParams()


  const navigate =
    useNavigate()


  const [status, setStatus] =
    useState("loading")


  const [message, setMessage] =
    useState(
      "Verifierar din betalning..."
    )


  // Prevent duplicate verification
  // React StrictMode can run useEffect twice in development
  const verificationStarted =
    useRef(false)


  // ======================================================
  // VERIFY PAYMENT
  // ======================================================

  useEffect(() => {

    const verifyPayment = async () => {


      // Prevent duplicate API request
      if (verificationStarted.current) {
        return
      }


      verificationStarted.current = true


      // ==================================================
      // GET STRIPE PARAMETERS FROM URL
      // ==================================================

      const success =
        searchParams.get("success")


      const orderId =
        searchParams.get("orderId")


      const sessionId =
        searchParams.get("session_id")


      // ==================================================
      // CHECK ORDER ID
      // ==================================================

      if (!orderId) {

        setStatus("error")


        setMessage(
          "Order-ID saknas. Betalningen kunde inte verifieras."
        )


        return

      }


      // ==================================================
      // CHECK SUCCESS PARAMETER
      // ==================================================

      if (
        success !== "true" &&
        success !== "false"
      ) {

        setStatus("error")


        setMessage(
          "Betalningsstatus saknas eller är ogiltig."
        )


        return

      }


      // ==================================================
      // SUCCESS REQUIRES STRIPE SESSION ID
      // ==================================================

      if (
        success === "true" &&
        !sessionId
      ) {

        setStatus("error")


        setMessage(
          "Stripe-session saknas. Betalningen kunde inte verifieras."
        )


        return

      }


      // ==================================================
      // SEND VERIFICATION TO BACKEND
      // ==================================================

      try {

        const response =
          await axios.post(

            `${url}/api/order/verify`,

            {

              success,

              orderId,

              sessionId

            }

          )


        // ==================================================
        // PAYMENT SUCCESSFUL
        // ==================================================

        if (response.data.success) {


          // Clear frontend cart
          setCartItems({})


          setStatus("success")


          setMessage(
            "Tack för din beställning! Din betalning har genomförts."
          )


          return

        }


        // ==================================================
        // PAYMENT CANCELLED
        // ==================================================

        setStatus("cancelled")


        setMessage(

          response.data.message ||

          "Betalningen avbröts."

        )


      } catch (error) {


        console.log(
          "Verify payment error:",
          error.response?.data ||
          error.message
        )


        setStatus("error")


        setMessage(

          error.response?.data?.message ||

          "Något gick fel när betalningen skulle verifieras."

        )

      }

    }


    verifyPayment()


  }, [
    searchParams,
    url,
    setCartItems
  ])


  // ======================================================
  // JSX
  // ======================================================

  return (

    <div className="verify">


      <div
        className={`verify-card ${status}`}
      >


        {/* ============================================== */}
        {/* LOADING */}
        {/* ============================================== */}

        {status === "loading" && (

          <>

            <div className="verify-loader">
            </div>


            <h2>
              Verifierar betalning
            </h2>


            <p>
              Vänta medan vi kontrollerar
              din betalning med Stripe.
            </p>

          </>

        )}


        {/* ============================================== */}
        {/* SUCCESS */}
        {/* ============================================== */}

        {status === "success" && (

          <>

            <div className="verify-icon success-icon">
              ✓
            </div>


            <h2>
              Beställningen är bekräftad!
            </h2>


            <p>
              {message}
            </p>


            <p className="verify-info">

              Vi har tagit emot din order och
              kommer att påbörja hanteringen
              av din beställning.

            </p>


            <div className="verify-actions">


              <button
                type="button"
                onClick={() =>
                  navigate("/myorders")
                }
              >
                Mina beställningar
              </button>


              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate("/")
                }
              >
                Till startsidan
              </button>


            </div>

          </>

        )}


        {/* ============================================== */}
        {/* CANCELLED */}
        {/* ============================================== */}

        {status === "cancelled" && (

          <>

            <div className="verify-icon cancelled-icon">
              ×
            </div>


            <h2>
              Betalningen avbröts
            </h2>


            <p>
              {message}
            </p>


            <p className="verify-info">

              Ingen slutförd betalning
              registrerades.

              Du kan gå tillbaka till
              varukorgen och försöka igen.

            </p>


            <div className="verify-actions">


              <button
                type="button"
                onClick={() =>
                  navigate("/cart")
                }
              >
                Till varukorgen
              </button>


              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate("/")
                }
              >
                Till startsidan
              </button>


            </div>

          </>

        )}


        {/* ============================================== */}
        {/* ERROR */}
        {/* ============================================== */}

        {status === "error" && (

          <>

            <div className="verify-icon error-icon">
              !
            </div>


            <h2>
              Något gick fel
            </h2>


            <p>
              {message}
            </p>


            <p className="verify-info">

              Om betalningen har dragits från
              ditt konto, försök inte betala
              igen direkt.

              Kontrollera först dina
              beställningar.

            </p>


            <div className="verify-actions">


              <button
                type="button"
                onClick={() =>
                  navigate("/myorders")
                }
              >
                Mina beställningar
              </button>


              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate("/")
                }
              >
                Till startsidan
              </button>


            </div>

          </>

        )}


      </div>


    </div>

  )

}


export default Verify
