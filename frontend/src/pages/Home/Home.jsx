import React, {
  useState
} from 'react'

import './Home.css'

import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import AboutUs from '../../components/AboutUs/AboutUs'
import CultureSection from '../../components/CultureSection/CultureSection'
import FutureProducts from '../../components/FutureProducts/FutureProducts'


const Home = () => {

  const [
    category,
    setCategory
  ] = useState("All")


  return (

    <div className="home">

      <Header />


      <ExploreMenu
        category={category}
        setCategory={setCategory}
      />


      <FoodDisplay
        category={category}
      />


      {/* VÅR HISTORIA */}

      <AboutUs />


      {/* FILIPPINSK KULTUR */}

      <CultureSection />


      {/* CUSTOMER VOTING */}

      <FutureProducts />


    </div>

  )

}


export default Home