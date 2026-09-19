import React, { useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import LoginPopup from './components/LoginPopup/LoginPopup'

import Home from './pages/Home/Home'
import Cart from './pages/Cart/Cart'
import PlaceOrder from './pages/PlaceOrder/PlaceOrder'
import Verify from './pages/Verify/Verify'
import MyOrders from './pages/MyOrders/MyOrders'
import ProductPage from './pages/Product/ProductPage'

import {
  TermsPage,
  CancellationPage,
  DeliveryPage,
  PrivacyPage,
  ContactPage
} from './pages/Information/InformationPages'


const App = () => {

  const [showLogin, setShowLogin] = useState(false)


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

          {/* HOME */}

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/dessert/:slug"
            element={<ProductPage />}
          />


          {/* ORDER */}

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


          {/* INFORMATION */}

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


          {/* 404 */}

          <Route
            path="*"
            element={
              <main
                style={{
                  minHeight: "60vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "40px 20px"
                }}
              >
                <div>
                  <h1>Sidan hittades inte</h1>

                  <p>
                    Sidan du letar efter verkar inte finnas.
                  </p>

                  <a href="/">
                    Tillbaka till Manila Café
                  </a>
                </div>
              </main>
            }
          />

        </Routes>

      </div>


      <Footer />

    </>
  )
}


export default App