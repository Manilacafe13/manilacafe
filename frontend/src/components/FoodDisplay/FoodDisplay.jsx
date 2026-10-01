import React, { useContext } from 'react'
import './FoodDisplay.css'

import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'

const FoodDisplay = ({ category }) => {

  const { food_list } = useContext(StoreContext)

  const filteredFoods = food_list.filter((item) =>
    category === "All" || category === item.category
  )

  return (
    <section
      className="food-display"
      id="food-display"
      aria-labelledby="food-display-title"
    >

      {/* INTRO */}

      <div className="food-display-intro">

        <h2 id="food-display-title">
          Våra maträtter & desserter
        </h2>

        <p>
          Upptäck Manila Cafés filippinska smaker i Göteborg.
          Välj bland klassiska maträtter som Sinigang och tropiska
          desserter som Mango Float, Ube Cake, Fruit Cup och fler
          favoriter för avhämtning eller leverans.
        </p>

      </div>


      {/* PRODUCTS */}

      <div
        className="food-display-list"
        aria-live="polite"
      >

        {filteredFoods.length > 0 ? (

          filteredFoods.map((item) => (

            <FoodItem
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image}
              category={item.category}
            />

          ))

        ) : (

          <div className="food-display-empty">

            <p>
              Inga produkter hittades i den här kategorin just nu.
            </p>

          </div>

        )}

      </div>

    </section>
  )
}

export default FoodDisplay