import OrdersActiveCount from './OrdersActiveCount'
import ChatActiveCount from './ChatActiveCount'

import React from 'react'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  return (
    <div className='sidebar'>
      <div className="sidebar-options">

        <NavLink to='/add' className="sidebar-option">
          <img src={assets.add_icon} alt="" />
          <p>Lägg till produkt</p>
        </NavLink>

        <NavLink to='/list' className="sidebar-option">
          <img src={assets.order_icon} alt="" />
          <p>Produkter</p>
        </NavLink>

        <NavLink to='/orders' className="sidebar-option">
          <img src={assets.order_icon} alt="" />
          <p>Beställningar</p>
          <OrdersActiveCount />
        </NavLink>

        <NavLink to='/future-products' className="sidebar-option">
          <img src={assets.add_icon} alt="" />
          <p>Framtida produkter</p>
        </NavLink>

        <NavLink to='/discounts' className="sidebar-option">
          <img src={assets.add_icon} alt="" />
          <p>Rabattkoder</p>
        </NavLink>

        {/* ========================================
            MANILA CAFÉ LIVECHAT
        ======================================== */}

        <NavLink to='/livechat' className="sidebar-option">
          <span
            aria-hidden="true"
            style={{
              fontSize: '23px',
              width: '24px',
              textAlign: 'center',
              flexShrink: 0
            }}
          >
            💬
          </span>
          <p>Livechatt</p>
          <ChatActiveCount />
        </NavLink>

      </div>
    </div>
  )
}

export default Sidebar
