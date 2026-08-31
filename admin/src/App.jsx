import React from 'react'
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

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'


const App = () => {

  const url =
    "http://localhost:4000"

  const location =
    useLocation()

  const token =
    localStorage.getItem("token")

  const isLoginPage =
    location.pathname === "/login"


  // ======================================================
  // NOT LOGGED IN
  // ======================================================

  if (!token && !isLoginPage) {

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

    return (
      <>

        <ToastContainer />

        <Routes>

          <Route
            path="/login"
            element={<Login />}
          />

        </Routes>

      </>
    )

  }


  // ======================================================
  // ADMIN PANEL
  // ======================================================

  return (

    <div>

      <ToastContainer />


      <Navbar />

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