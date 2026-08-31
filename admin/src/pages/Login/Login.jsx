import React, { useState } from 'react'
import './Login.css'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const Login = () => {

  const url =
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000"

  const navigate = useNavigate()

  const [data, setData] = useState({
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

    try {

      setLoading(true)


      const response =
        await axios.post(
          `${url}/api/user/login`,
          {
            email:
              data.email
                .trim()
                .toLowerCase(),

            password:
              data.password
          }
        )


      if (!response.data.success) {

        toast.error(
          response.data.message ||
          "Inloggningen misslyckades."
        )

        return
      }


      if (!response.data.token) {

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

      navigate("/orders")


    } catch (error) {

      console.log(
        "Admin login error:",
        error.response?.data ||
        error.message
      )


      toast.error(
        error.response?.data?.message ||
        "Fel e-post eller lösenord."
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


        <div className="admin-login-input">

          <label>
            E-post
          </label>

          <input
            type="email"
            name="email"
            value={data.email}
            onChange={onChangeHandler}
            placeholder="E-post"
            autoComplete="email"
            required
          />

        </div>


        <div className="admin-login-input">

          <label>
            Lösenord
          </label>

          <input
            type="password"
            name="password"
            value={data.password}
            onChange={onChangeHandler}
            placeholder="Lösenord"
            autoComplete="current-password"
            required
          />

        </div>


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