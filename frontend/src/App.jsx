import React, { lazy, Suspense, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import LoginPopup from './components/LoginPopup/LoginPopup'

import Home from './pages/Home/Home'
const Cart = lazy(() => import('./pages/Cart/Cart'))
const PlaceOrder = lazy(() => import('./pages/PlaceOrder/PlaceOrder'))
const Verify = lazy(() => import('./pages/Verify/Verify'))
const MyOrders = lazy(() => import('./pages/MyOrders/MyOrders'))
const ProductPage = lazy(() => import('./pages/Product/ProductPage'))
import CookieBanner from './components/CookieBanner/CookieBanner'

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


        <Suspense fallback={<main className="page-loading" role="status" aria-live="polite">Laddar sidan…</main>}>
        <Routes>

          {/* HOME */}

          <Route
            path="/"
            element={<Home />}
          />


          {/* PRODUCTS */}

          <Route
            path="/dessert/:slug"
            element={<ProductPage />}
          />

          <Route
            path="/matratt/:slug"
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

                  <h1>
                    Sidan hittades inte
                  </h1>

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
        </Suspense>

      </div>


           <Footer />

      <CookieBanner />

    </>
  )
}

export default App