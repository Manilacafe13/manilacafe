
import React, { useState } from 'react'

import './Home.css'

import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import AboutUs from '../../components/AboutUs/AboutUs'
import CultureSection from '../../components/CultureSection/CultureSection'
import FutureProducts from '../../components/FutureProducts/FutureProducts'

const Home = () => {

  // ======================================================
  // CATEGORY STATES
  // ======================================================

  const [mealCategory, setMealCategory] = useState("All")
  const [dessertCategory, setDessertCategory] = useState("All")
  const [drinkCategory, setDrinkCategory] = useState("All")

  return (
    <main className="home">

      {/* ============================================== */}
      {/* HEADER */}
      {/* ============================================== */}

      <Header />


      {/* ============================================== */}
      {/* MATRÄTTER */}
      {/* ============================================== */}

      <ExploreMenu
        category={mealCategory}
        setCategory={setMealCategory}
        type="meals"
      />

      <FoodDisplay
        category={mealCategory}
        type="meals"
      />


      {/* ============================================== */}
      {/* DESSERTER */}
      {/* ============================================== */}

      <ExploreMenu
        category={dessertCategory}
        setCategory={setDessertCategory}
        type="desserts"
      />

      <FoodDisplay
        category={dessertCategory}
        type="desserts"
      />


      {/* ============================================== */}
      {/* DRYCKER */}
      {/* ============================================== */}

      <ExploreMenu
        category={drinkCategory}
        setCategory={setDrinkCategory}
        type="drinks"
      />

      <FoodDisplay
        category={drinkCategory}
        type="drinks"
      />


      {/* ============================================== */}
      {/* SEO / DISCOVERY */}
      {/* ============================================== */}

      <section className="home-seo-section">

        <h2>
          Filippinska maträtter, desserter & drycker
          i Göteborg
        </h2>

        <h3>
          En smak av Filippinerna
        </h3>

        <p>
          Upptäck Manila Café och filippinska smaker
          i Göteborg. Här hittar du klassiska maträtter,
          populära desserter som Mango Float, Ube Cake
          och Fruit Cup, samt vårt utbud av kaffedrycker.
        </p>

        <p>
          Beställ online för avhämtning eller leverans
          i Göteborg och upptäck traditionella maträtter,
          tropiska desserter och goda drycker.
        </p>

      </section>


      {/* ============================================== */}
      {/* VÅR HISTORIA */}
      {/* ============================================== */}

      <AboutUs />


      {/* ============================================== */}
      {/* FILIPPINSK KULTUR */}
      {/* ============================================== */}

      <CultureSection />


      {/* ============================================== */}
      {/* FRAMTIDA PRODUKTER */}
      {/* ============================================== */}

      <FutureProducts />

    </main>
  )
}

export default Home
