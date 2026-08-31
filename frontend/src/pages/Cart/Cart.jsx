import React, { useContext } from 'react'
import './Cart.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'

const Cart = () => {

  const {
    cartItems,
    food_list,
    removeFromCart,
    getTotalCartAmount,
    getVatAmount,
    getTotalWithVat,
    url
  } = useContext(StoreContext)

  const navigate = useNavigate()


  // Delsumma exklusive moms
  const subtotal = getTotalCartAmount()

  // 6% moms
  const vatAmount = getVatAmount()

  // Totalt inklusive moms
  const total = getTotalWithVat()


  return (
    <div className='cart'>


      {/* PRODUKTER */}

      <div className='cart-items'>


        <div className='cart-items-title'>

          <p>Produkt</p>

          <p>Namn</p>

          <p>Pris</p>

          <p>Mängd</p>

          <p>Totalt</p>

          <p>Ta bort</p>

        </div>


        <br />

        <hr />


        {food_list.map((item) => {

          const quantity =
            Number(cartItems[item._id] || 0)


          if (quantity <= 0) {
            return null
          }


          const price =
            Number(item.price)


          const rowTotal =
            price * quantity


          return (

            <div
              key={item._id}
              className='cart-item-wrapper'
            >


              <div className='cart-items-title cart-items-item'>


                {/* PRODUKTBILD */}

                <img
                  src={`${url}/images/${item.image}`}
                  alt={item.name}
                />


                {/* PRODUKTNAMN */}

                <p>
                  {item.name}
                </p>


                {/* STYCKPRIS EXKLUSIVE MOMS */}

                <p>
                  {price.toFixed(2)} kr
                </p>


                {/* ANTAL */}

                <p>
                  {quantity}
                </p>


                {/* RADTOTAL EXKLUSIVE MOMS */}

                <p>
                  {rowTotal.toFixed(2)} kr
                </p>


                {/* TA BORT */}

                <button
                  type='button'
                  onClick={() =>
                    removeFromCart(item._id)
                  }
                  className='cross'
                  aria-label={`Ta bort en ${item.name}`}
                >
                  ×
                </button>


              </div>


              <hr />


            </div>

          )

        })}


      </div>


      {/* NEDRE DEL */}

      <div className='cart-bottom'>


        {/* TOTAL */}

        <div className='cart-total'>


          <h2>
            Varukorg
          </h2>


          <div>


            {/* DELSUMMA */}

            <div className='cart-total-details'>

              <p>
                Delsumma
              </p>

              <p>
                {subtotal.toFixed(2)} kr
              </p>

            </div>


            <hr />


            {/* MOMS */}

            <div className='cart-total-details'>

              <p>
                Moms (6%)
              </p>

              <p>
                {vatAmount.toFixed(2)} kr
              </p>

            </div>


            <hr />


            {/* TOTAL */}

            <div className='cart-total-details cart-grand-total'>

              <b>
                Totalt
              </b>

              <b>
                {total.toFixed(2)} kr
              </b>

            </div>


          </div>


          {/* CHECKOUT */}

          <button
            type='button'
            className='checkout-button'
            onClick={() =>
              navigate('/order')
            }
            disabled={subtotal <= 0}
          >
            Till kassan
          </button>


        </div>


        {/* VÄRDEKOD */}

        <div className='cart-promocode'>


          <div>


            <p>
              Har du en värdekod?
            </p>


            <div className='cart-promocode-input'>


              <input
                type='text'
                placeholder='Ange värdekod'
                aria-label='Värdekod'
              />


              <button
                type='button'
              >
                Använd
              </button>


            </div>


          </div>


        </div>


      </div>


    </div>
  )
}

export default Cart
