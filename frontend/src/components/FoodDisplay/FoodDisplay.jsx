import React, { useContext } from 'react'
import './FoodDisplay.css'
import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'

const FoodDisplay = ({ category }) => {

  const { food_list } = useContext(StoreContext)

  return (
    <section
      className='food-display'
      id='food-display'
      aria-labelledby='food-display-title'
    >

      <div className='food-display-intro'>

        <h2 id='food-display-title'>
          Filippinska desserter i Göteborg
        </h2>

        <p>
          Upptäck Manila Cafés utbud av filippinska desserter,
          med favoriter som Mango Float, Ube Cake, Taho,
          Fruit Salad och andra tropiska smaker.
        </p>

      </div>


      <div className='food-display-list'>

        {food_list.map((item) => {

          if (
            category === "All" ||
            category === item.category
          ) {

            return (
              <FoodItem
                key={item._id}
                id={item._id}
                name={item.name}
                description={item.description}
                price={item.price}
                image={item.image}
              />
            )

          }

          return null

        })}

      </div>

    </section>
  )
}

export default FoodDisplay