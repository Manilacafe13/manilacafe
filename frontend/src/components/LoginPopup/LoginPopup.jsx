import React, { useContext, useState } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import axios from "axios"

const LoginPopup = ({ setShowLogin }) => {

  const { url, setToken } = useContext(StoreContext)

  const [currState, setCurrState] = useState("Logga in")

  const [data, setData] = useState({
    name: "",
    email: "",
    password: ""
  })


  const onChangeHandler = (event) => {
    const name = event.target.name
    const value = event.target.value

    setData((data) => ({
      ...data,
      [name]: value
    }))
  }


  const onLogin = async (event) => {
    event.preventDefault()

    try {

      let newUrl = url

      if (currState === "Logga in") {
        newUrl += "/api/user/login"
      } else {
        newUrl += "/api/user/register"
      }


      const requestData =
        currState === "Logga in"
          ? {
              email: data.email,
              password: data.password
            }
          : {
              name: data.name,
              email: data.email,
              password: data.password
            }


      const response = await axios.post(
        newUrl,
        requestData,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      )


      if (response.data.success) {

        setToken(response.data.token)

        localStorage.setItem(
          "token",
          response.data.token
        )

        setShowLogin(false)

      } else {

        alert(response.data.message)

      }

    } catch (error) {

      if (error.response?.data?.message) {
        alert(error.response.data.message)
      } else {
        alert("Något gick fel. Försök igen.")
      }

    }
  }


  const switchToRegister = () => {

    setCurrState("Skapa konto")

    setData({
      name: "",
      email: "",
      password: ""
    })
  }


  const switchToLogin = () => {

    setCurrState("Logga in")

    setData({
      name: "",
      email: "",
      password: ""
    })
  }


  return (
    <div className='login-popup'>

      <form
        onSubmit={onLogin}
        className="login-popup-container"
      >

        <div className="login-popup-title">

          <h2>{currState}</h2>

          <img
            onClick={() => setShowLogin(false)}
            src={assets.cross_icon}
            alt="Stäng"
          />

        </div>


        <div className="login-popup-inputs">

          {currState === "Skapa konto" && (
            <input
              name="name"
              onChange={onChangeHandler}
              value={data.name}
              type="text"
              placeholder="Namn"
              required
            />
          )}


          <input
            name="email"
            onChange={onChangeHandler}
            value={data.email}
            type="email"
            placeholder="Email"
            required
          />


          <input
            name="password"
            onChange={onChangeHandler}
            value={data.password}
            type="password"
            placeholder="Lösenord"
            minLength="8"
            required
          />

        </div>


        <button type="submit">

          {currState === "Skapa konto"
            ? "Skapa konto"
            : "Logga in"
          }

        </button>


        <div className="login-popup-condition">

          <input
            type="checkbox"
            required
          />

          <p>
            Genom att fortsätta godkänner jag användarvillkoren och integritetspolicyn.
          </p>

        </div>


        {currState === "Logga in" ? (

          <p>
            Skapa ett nytt konto?{" "}

            <span onClick={switchToRegister}>
              Klicka här
            </span>
          </p>

        ) : (

          <p>
            Har du redan ett konto?{" "}

            <span onClick={switchToLogin}>
              Logga in här
            </span>
          </p>

        )}

      </form>

    </div>
  )
}

export default LoginPopup