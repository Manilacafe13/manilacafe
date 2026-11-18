
import React, {
  lazy,
  Suspense,
  useCallback,
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
import ImageMigration from './pages/ImageMigration/ImageMigration'
import Orders from './pages/Orders/Orders'
import Login from './pages/Login/Login'
import FutureProducts from './pages/FutureProducts/FutureProducts'
import Discounts from './pages/Discounts/Discounts'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'


// ======================================================
// MANILA CAFÉ LIVECHAT
// Lazy loaded to keep admin fast
// ======================================================

const ChatInbox = lazy(() =>
  import('./pages/ChatInbox/ChatInbox')
)


// ======================================================
// APP
// ======================================================

const App = () => {

  // ====================================================
  // BACKEND URL
  // ====================================================

  const url = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:4000' : '')
  ).replace(/\/+$/, '')


  const location = useLocation()

  const isLoginPage =
    location.pathname === '/login'


  // ====================================================
  // SESSION STATE
  // ====================================================

  const [authStatus, setAuthStatus] =
    useState('checking')


  // ====================================================
  // VERIFY ADMIN SESSION
  // ====================================================

  useEffect(() => {

    let active = true

    const verifyAdmin = async () => {

      const token =
        localStorage.getItem('token')

      if (!token) {

        if (active) {
          setAuthStatus('unauthenticated')
        }

        return
      }

      try {

        const response = await axios.get(
          `${url}/api/admin/verify`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        if (active) {

          setAuthStatus(
            response.data.success
              ? 'authenticated'
              : 'unauthenticated'
          )

        }

      } catch (error) {

        localStorage.removeItem('token')

        if (active) {
          setAuthStatus('unauthenticated')
        }

      }

    }

    verifyAdmin()

    return () => {
      active = false
    }

  }, [url])


  // ====================================================
  // AUTHENTICATED CHAT REQUESTS
  // Uses existing admin Bearer token
  // ====================================================

  const authenticatedChatFetch = useCallback(
    async (endpoint, options = {}) => {

      const token =
        localStorage.getItem('token')

      if (!token) {
        throw new Error(
          'Adminsession saknas. Logga in igen.'
        )
      }

      return fetch(endpoint, {

        ...options,

        headers: {

          ...(options.headers || {}),

          Authorization: `Bearer ${token}`

        }

      })

    },
    []
  )


  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = () => {

    localStorage.removeItem('token')

    setAuthStatus('unauthenticated')

  }


  // ====================================================
  // CHECKING SESSION
  // ====================================================

  if (authStatus === 'checking') {

    return (

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif'
        }}
      >

        Kontrollerar adminsession...

      </div>

    )

  }


  // ====================================================
  // NOT LOGGED IN
  // ====================================================

  if (
    authStatus === 'unauthenticated' &&
    !isLoginPage
  ) {

    return (
      <Navigate
        to="/login"
        replace
      />
    )

  }


  // ====================================================
  // LOGIN PAGE
  // ====================================================

  if (isLoginPage) {

    if (authStatus === 'authenticated') {

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
                onLogin={() =>
                  setAuthStatus('authenticated')
                }
              />
            }
          />

        </Routes>

      </>

    )

  }


  // ====================================================
  // PROTECT ADMIN PANEL
  // ====================================================

  if (authStatus !== 'authenticated') {

    return (
      <Navigate
        to="/login"
        replace
      />
    )

  }


  // ====================================================
  // ADMIN PANEL
  // ====================================================

  return (

    <div>

      <ToastContainer />


      {/* NAVBAR */}

      <Navbar
        onLogout={handleLogout}
      />

      <hr />


      <div className="app-content">

        {/* SIDEBAR */}

        <Sidebar />


        {/* ADMIN ROUTES */}

        <Suspense
          fallback={
            <div
              role="status"
              style={{
                padding: '30px',
                textAlign: 'center'
              }}
            >
              Laddar...
            </div>
          }
        >

          <Routes>

            {/* DEFAULT */}

            <Route
              path="/"
              element={
                <Navigate
                  to="/orders"
                  replace
                />
              }
            />


            {/* ADD PRODUCT */}

            <Route
              path="/add"
              element={
                <Add url={url} />
              }
            />


            {/* PRODUCT LIST */}

            <Route
              path="/list"
              element={
                <List url={url} />
              }
            />


            {/* ORDERS */}

            <Route
              path="/orders"
              element={
                <Orders url={url} />
              }
            />


            {/* FUTURE PRODUCTS */}

            <Route
              path="/future-products"
              element={
                <FutureProducts url={url} />
              }
            />


            {/* DISCOUNTS */}

            <Route
              path="/discounts"
              element={
                <Discounts url={url} />
              }
            />


            {/* IMAGE MIGRATION */}

            <Route
              path="/bildflytt"
              element={
                <ImageMigration url={url} />
              }
            />


            {/* ==================================
                MANILA CAFÉ LIVECHAT
               ================================== */}

            <Route
              path="/livechat"
              element={
                <ChatInbox
                  apiBase={url}
                  authenticatedFetch={
                    authenticatedChatFetch
                  }
                />
              }
            />


            {/* FALLBACK */}

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

        </Suspense>

      </div>

    </div>

  )

}

export default App
