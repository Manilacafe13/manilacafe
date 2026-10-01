import React, { useContext } from 'react'
import './FoodDisplay.css'

import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'


const FoodDisplay = ({
  category = "All",
  type = "desserts"
}) => {

  const {
    food_list = []
  } = useContext(StoreContext)


  // ======================================================
  // PRODUCT TYPE
  // ======================================================

  const isMeals = type === "meals"


  // ======================================================
  // FILTER PRODUCTS
  // ======================================================

  const filteredFoods = food_list.filter((item) => {

    // MATRÄTTER
    if (isMeals) {
      return item.category === "Maträtter"
    }


    // DESSERTER
    if (item.category === "Maträtter") {
      return false
    }


    // SHOW ALL DESSERTS
    if (category === "All") {
      return true
    }


    // FILTER DESSERT CATEGORY
    return item.category === category

  })


  // ======================================================
  // SECTION INFORMATION
  // ======================================================

  const sectionId = isMeals
    ? "meals-display"
    : "food-display"

  const titleId = isMeals
    ? "meals-display-title"
    : "food-display-title"


  // ======================================================
  // JSX
  // ======================================================

  return (

    <section
      className={`food-display ${isMeals ? "food-display-meals" : "food-display-desserts"}`}
      id={sectionId}
      aria-labelledby={titleId}
    >


      {/* ============================================== */}
      {/* INTRO */}
      {/* ============================================== */}

      <div className="food-display-intro">

        {isMeals ? (

          <>
            <span className="food-display-eyebrow">
              FILIPINO FOOD
            </span>

            <h2 id={titleId}>
              Maträtter
            </h2>

            <p>
              Upptäck våra filippinska maträtter i Göteborg.
              Från klassiska favoriter som Sinigang till fler
              traditionella smaker från Filippinerna.
            </p>
          </>

        ) : (

          <>
            <span className="food-display-eyebrow">
              FILIPINO DESSERTS
            </span>

            <h2 id={titleId}>
              Desserter
            </h2>

            <p>
              Upptäck Manila Cafés filippinska desserter och
              tropiska favoriter som Mango Float, Ube Cake,
              Fruit Cup, Turon och fler söta smaker.
            </p>
          </>

        )}

      </div>


      {/* ============================================== */}
      {/* PRODUCTS */}
      {/* ============================================== */}

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
              {
                isMeals
                  ? "Inga maträtter finns tillgängliga just nu."
                  : "Inga desserter hittades i den här kategorin just nu."
              }
            </p>

          </div>

        )}

      </div>

    </section>

  )
}


export default FoodDisplay