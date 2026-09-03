import React, { useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import { Route, Routes } from 'react-router-dom'

import Home from './pages/Home/Home'
import Cart from './pages/Cart/Cart'
import PlaceOrder from './pages/PlaceOrder/PlaceOrder'
import LoginPopup from './components/LoginPopup/LoginPopup'
import Verify from './pages/Verify/Verify'
import MyOrders from './pages/MyOrders/MyOrders'

import {
  TermsPage,
  CancellationPage,
  DeliveryPage,
  PrivacyPage,
  ContactPage
} from './pages/Information/InformationPages'


const App = () => {

  const [showLogin, setShowLogin] =
    useState(false)


  return (
    <>

      {showLogin && (
        <LoginPopup
          setShowLogin={setShowLogin}
        />
      )}


      <div className="app">

        <Navbar
          setShowLogin={setShowLogin}
        />


        <Routes>

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/cart"
            element={<Cart />}
          />

          <Route
            path="/order"
            element={<PlaceOrder />}
          />

          <Route
            path="/verify"
            element={<Verify />}
          />

          <Route
            path="/myorders"
            element={<MyOrders />}
          />


          <Route
            path="/kopvillkor"
            element={<TermsPage />}
          />

          <Route
            path="/avbokning"
            element={<CancellationPage />}
          />

          <Route
            path="/leverans"
            element={<DeliveryPage />}
          />

          <Route
            path="/integritet"
            element={<PrivacyPage />}
          />

          <Route
            path="/kontakt"
            element={<ContactPage />}
          />

        </Routes>

      </div>


      <Footer />

    </>
  )
}


export default App