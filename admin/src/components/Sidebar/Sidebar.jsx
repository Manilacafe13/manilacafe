import React from 'react'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {

  return (

    <div className='sidebar'>

      <div className="sidebar-options">


        {/* ADD PRODUCT */}

        <NavLink
          to='/add'
          className="sidebar-option"
        >

          <img
            src={assets.add_icon}
            alt=""
          />

          <p>
            Lägg till produkt
          </p>

        </NavLink>


        {/* PRODUCT LIST */}

        <NavLink
          to='/list'
          className="sidebar-option"
        >

          <img
            src={assets.order_icon}
            alt=""
          />

          <p>
            Produkter
          </p>

        </NavLink>


        {/* ORDERS */}

        <NavLink
          to='/orders'
          className="sidebar-option"
        >

          <img
            src={assets.order_icon}
            alt=""
          />

          <p>
            Beställningar
          </p>

        </NavLink>


        {/* FUTURE PRODUCTS */}

        <NavLink
          to='/future-products'
          className="sidebar-option"
        >

          <img
            src={assets.add_icon}
            alt=""
          />

          <p>
            Framtida produkter
          </p>

        </NavLink>


      </div>

    </div>

  )

}

export default Sidebar