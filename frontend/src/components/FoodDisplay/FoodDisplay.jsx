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
          Våra desserter
        </h2>

        <p>
          Hitta din nästa favorit hos Manila Café.
          Välj bland filippinska desserter och tropiska sötsaker
          som Mango Float, Ube Cake, Fruit Cup, Taho och fler
          smaker att upptäcka i Göteborg.
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
              Inga desserter hittades i den här kategorin just nu.
            </p>

          </div>

        )}

      </div>

    </section>
  )
}


export default FoodDisplay