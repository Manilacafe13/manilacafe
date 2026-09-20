import React, {
  useEffect,
  useState
} from 'react'

import axios from 'axios'

import Navbar from './components/Navbar/Navbar'
import Sidebar from './components/Sidebar/Sidebar'

import {
  Route,
  Routes,
  Navigate,
  useLocation
} from 'react-router-dom'

import Add from './pages/Add/Add'
import List from './pages/List/List'
import Orders from './pages/Orders/Orders'
import Login from './pages/Login/Login'
import FutureProducts from './pages/FutureProducts/FutureProducts'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'


const App = () => {

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


  const location =
    useLocation()


  const isLoginPage =
    location.pathname === "/login"


  // ======================================================
  // SESSION STATE
  // ======================================================

  const [authStatus, setAuthStatus] =
    useState("checking")


  // ======================================================
  // VERIFY ADMIN SESSION
  // ======================================================

  useEffect(() => {

    let active = true


    const verifyAdmin = async () => {

      const token =
        localStorage.getItem("token")


      // No token
      if (!token) {

        if (active) {
          setAuthStatus("unauthenticated")
        }

        return

      }


      try {

        const response =
          await axios.get(
            `${url}/api/admin/verify`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          )


        if (
          active &&
          response.data.success
        ) {

          setAuthStatus("authenticated")

        }


      } catch (error) {

        localStorage.removeItem("token")

        if (active) {
          setAuthStatus("unauthenticated")
        }

      }

    }


    verifyAdmin()


    return () => {
      active = false
    }

  }, [url])


  // ======================================================
  // CHECKING SESSION
  // ======================================================

  if (authStatus === "checking") {

    return (

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif"
        }}
      >
        Kontrollerar adminsession...
      </div>

    )

  }


  // ======================================================
  // NOT LOGGED IN
  // ======================================================

  if (
    authStatus === "unauthenticated" &&
    !isLoginPage
  ) {

    return (
      <Navigate
        to="/login"
        replace
      />
    )

  }


  // ======================================================
  // LOGIN PAGE
  // ======================================================

  if (isLoginPage) {

    if (authStatus === "authenticated") {

      return (
        <Navigate
          to="/orders"
          replace
        />
      )

    }


    return (
      <>

        <ToastContainer />

        <Routes>

          <Route
            path="/login"
            element={
              <Login
                url={url}
                onLogin={() => {
                  setAuthStatus("authenticated")
                }}
              />
            }
          />

        </Routes>

      </>
    )

  }


  // ======================================================
  // ADMIN PANEL
  // ======================================================

  if (authStatus !== "authenticated") {

    return (
      <Navigate
        to="/login"
        replace
      />
    )

  }


  return (

    <div>

      <ToastContainer />


      <Navbar
        onLogout={() => {
          localStorage.removeItem("token")
          setAuthStatus("unauthenticated")
        }}
      />
      <hr />


      <div className="app-content">

        <Sidebar />


        <Routes>

          <Route
            path="/"
            element={
              <Navigate
                to="/orders"
                replace
              />
            }
          />


          <Route
            path="/add"
            element={
              <Add url={url} />
            }
          />


          <Route
            path="/list"
            element={
              <List url={url} />
            }
          />


          <Route
            path="/orders"
            element={
              <Orders url={url} />
            }
          />


          <Route
            path="/future-products"
            element={
              <FutureProducts url={url} />
            }
          />


          <Route
            path="*"
            element={
              <Navigate
                to="/orders"
                replace
              />
            }
          />

        </Routes>

      </div>

    </div>

  )

}


export default App