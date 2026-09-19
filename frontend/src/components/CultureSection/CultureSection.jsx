import React from 'react'
import './CultureSection.css'


const CultureSection = () => {

  const cultureCards = [

    {
      icon: "🥭",
      title: "Mango",
      subtitle: "Tropisk sötma",
      text:
        "Mango är en populär smak i filippinska desserter. Hos Manila Café möter du den bland annat i Mango Float – en kall och krämig dessert med mango, grädde och Graham crackers."
    },

    {
      icon: "💜",
      title: "Ube",
      subtitle: "Den lila favoriten",
      text:
        "Ube är en lila jams som används i många filippinska desserter och sötsaker. Den är känd för sin karakteristiska lila färg och milda, söta smak. Hos oss hittar du den bland annat i Ube Cake."
    },

    {
      icon: "🥥",
      title: "Kokos",
      subtitle: "En tropisk klassiker",
      text:
        "Kokos används på många olika sätt i filippinsk matkultur och passar särskilt bra i söta och krämiga desserter. Smaken kombineras ofta med ingredienser som ube och tropisk frukt."
    },

    {
      icon: "🍧",
      title: "Halo-halo",
      subtitle: "En filippinsk dessertklassiker",
      text:
        "Halo-halo är en välkänd filippinsk dessert där flera ingredienser, färger och texturer blandas tillsammans. Namnet förknippas med att blanda och desserten kan innehålla bland annat is, mjölk och olika söta ingredienser."
    },

    {
      icon: "🥛",
      title: "Taho",
      subtitle: "En klassisk Filipino-favorit",
      text:
        "Taho är en klassisk filippinsk rätt med silkeslen tofu, söt sirap och sagopärlor. Kombinationen ger en mjuk och söt upplevelse som skiljer sig från många traditionella svenska desserter."
    },

    {
      icon: "🍓",
      title: "Fruit Cup",
      subtitle: "Krämigt & fruktigt",
      text:
        "Vår Fruit Cup är inspirerad av filippinsk fruit salad och kombinerar frukt med söta och krämiga smaker. En kall dessert för dig som gillar tropisk frukt och vill prova något annorlunda."
    }

  ]


  return (

    <section
      className="culture-section"
      id="culture"
      aria-labelledby="culture-title"
    >

      {/* =================================================
          HEADING
      ================================================= */}

      <div className="culture-heading">

        <span className="section-eyebrow">
          SMAKER & KULTUR
        </span>

        <h2 id="culture-title">
          Upptäck filippinska desserter
          <span> genom smaken</span>
        </h2>

        <p>
          Från mango och ube till kokos och Taho –
          filippinska desserter bjuder på smaker,
          ingredienser och kombinationer som skiljer sig
          från mycket annat. Här kan du upptäcka några
          av smakerna och desserttraditionerna bakom
          Manila Café.
        </p>

      </div>


      {/* =================================================
          CULTURE CARDS
      ================================================= */}

      <div className="culture-grid">

        {cultureCards.map((item) => (

          <article
            className="culture-card"
            key={item.title}
          >

            <div
              className="culture-icon"
              aria-hidden="true"
            >
              {item.icon}
            </div>


            <span className="culture-subtitle">
              {item.subtitle}
            </span>


            <h3>
              {item.title}
            </h3>


            <p>
              {item.text}
            </p>


            <div
              className="culture-card-line"
              aria-hidden="true"
            >
            </div>

          </article>

        ))}

      </div>


      {/* =================================================
          CULTURE FACT
      ================================================= */}

      <div className="culture-fact">

        <div className="culture-fact-label">
          Visste du att?
        </div>


        <div>

          <h3>
            Filippinsk matkultur handlar också om gemenskap.
          </h3>

          <p>
            Mat och desserter delas ofta tillsammans med
            familj, vänner och gäster. Med Manila Café vill
            vi göra det enklare att upptäcka filippinska
            smaker och desserttraditioner här i Göteborg.
          </p>

        </div>

      </div>

    </section>

  )

}


export default CultureSection