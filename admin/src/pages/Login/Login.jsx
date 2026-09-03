import React, { useState } from 'react'
import './Login.css'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'


const Login = () => {

  // ======================================================
  // BACKEND URL
  // ======================================================

  const url = (
    import.meta.env.VITE_API_URL ||
    (
      import.meta.env.DEV
        ? "http://localhost:4000"
        : ""
    )
  ).replace(/\/+$/, "")


  const navigate =
    useNavigate()


  const [data, setData] =
    useState({
      email: "",
      password: ""
    })


  const [loading, setLoading] =
    useState(false)


  // ======================================================
  // INPUT
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
  // LOGIN
  // ======================================================

  const loginAdmin = async (event) => {

    event.preventDefault()


    if (loading) {
      return
    }


    // ==================================================
    // CHECK BACKEND URL
    // ==================================================

    if (!url) {



      toast.error(
        "Backend-adressen är inte konfigurerad."
      )

      return
    }


    // ==================================================
    // VALIDATE LOGIN
    // ==================================================

    const email =
      data.email
        .trim()
        .toLowerCase()


    const password =
      data.password


    if (
      !email ||
      !password
    ) {

      toast.error(
        "Fyll i e-post och lösenord."
      )

      return
    }


    try {

      setLoading(true)


      const response =
        await axios.post(

          `${url}/api/user/login`,

          {
            email,
            password
          }

        )


      // ==================================================
      // LOGIN FAILED
      // ==================================================

      if (
        !response.data.success
      ) {

        toast.error(
          response.data.message ||
          "Inloggningen misslyckades."
        )

        return
      }


      // ==================================================
      // TOKEN CHECK
      // ==================================================

      if (
        !response.data.token
      ) {

        toast.error(
          "Ingen token kunde hämtas."
        )

        return
      }


      // ==================================================
      // SAVE ADMIN TOKEN
      // ==================================================

      localStorage.setItem(
        "token",
        response.data.token
      )


      toast.success(
        "Inloggad."
      )


      // ==================================================
      // GO TO ORDERS
      // ==================================================

      navigate(
        "/orders",
        {
          replace: true
        }
      )


    } catch (error) {



      // ==================================================
      // WRONG LOGIN
      // ==================================================

      if (
        error.response?.status === 401
      ) {

        toast.error(
          error.response?.data?.message ||
          "Fel e-post eller lösenord."
        )

        return
      }


      // ==================================================
      // CORS / FORBIDDEN
      // ==================================================

      if (
        error.response?.status === 403
      ) {

        toast.error(
          error.response?.data?.message ||
          "Åtkomst nekad."
        )

        return
      }


      // ==================================================
      // NETWORK ERROR
      // ==================================================

      if (
        !error.response
      ) {

        toast.error(
          "Kunde inte ansluta till servern."
        )

        return
      }


      // ==================================================
      // GENERAL ERROR
      // ==================================================

      toast.error(
        error.response?.data?.message ||
        "Inloggningen misslyckades."
      )


    } finally {

      setLoading(false)

    }

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <div className="admin-login">


      <form
        className="admin-login-form"
        onSubmit={loginAdmin}
      >


        <h1>
          Admin
        </h1>


        <p>
          Logga in för att hantera Manila Café.
        </p>


        {/* ============================================== */}
        {/* EMAIL */}
        {/* ============================================== */}

        <div className="admin-login-input">

          <label htmlFor="admin-email">
            E-post
          </label>


          <input

            id="admin-email"

            type="email"

            name="email"

            value={data.email}

            onChange={onChangeHandler}

            placeholder="E-post"

            autoComplete="email"

            disabled={loading}

            required

          />

        </div>


        {/* ============================================== */}
        {/* PASSWORD */}
        {/* ============================================== */}

        <div className="admin-login-input">

          <label htmlFor="admin-password">
            Lösenord
          </label>


          <input

            id="admin-password"

            type="password"

            name="password"

            value={data.password}

            onChange={onChangeHandler}

            placeholder="Lösenord"

            autoComplete="current-password"

            disabled={loading}

            required

          />

        </div>


        {/* ============================================== */}
        {/* LOGIN BUTTON */}
        {/* ============================================== */}

        <button
          type="submit"
          disabled={loading}
        >

          {
            loading
              ? "Loggar in..."
              : "Logga in"
          }

        </button>


      </form>


    </div>

  )

}


export default Login