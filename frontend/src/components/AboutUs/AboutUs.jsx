import React from 'react'
import './AboutUs.css'

const AboutUs = () => {

  return (

    <section
      className="about-us"
      id="about-us"
    >

      <div className="about-us-inner">


        {/* LEFT SIDE */}

        <div className="about-us-visual">

          <div className="about-us-decoration decoration-one">
          </div>

          <div className="about-us-decoration decoration-two">
          </div>


          <div className="about-us-main-card">

            <span className="about-us-small-title">
              Manila Café
            </span>

            <h2>
              En liten smak av
              <span> Filippinerna</span>
            </h2>

            <p>
              Desserter skapade för att delas,
              upptäckas och njutas tillsammans.
            </p>


            <div className="about-us-flavours">

              <span>
                Mango
              </span>

              <span>
                Ube
              </span>

              <span>
                Kokos
              </span>

            </div>

          </div>


          <div className="about-us-mini-card">

            <span>
              ♡
            </span>

            <div>

              <strong>
                Gjort med omtanke
              </strong>

              <p>
                Smaker som för människor samman.
              </p>

            </div>

          </div>

        </div>


        {/* RIGHT SIDE */}

        <div className="about-us-content">

          <span className="section-eyebrow">
            VÅR HISTORIA
          </span>

          <h2>
            Välkommen till
            <span> Manila Café</span>
          </h2>


          <p className="about-us-lead">
            För oss handlar dessert om mer än
            något sött efter maten.
          </p>


          <p>
            Manila Café vill dela med sig av
            filippinska smaker, traditioner och
            den värme som kan uppstå när människor
            samlas runt matbordet.
          </p>


          <p>
            Mat är en viktig del av gemenskapen.
            Den delas med familj, vänner och gäster
            och blir ofta en del av både vardag,
            firanden och minnen.
          </p>


          <p>
            Genom våra desserter vill vi ge dig
            möjlighet att upptäcka smaker som
            mango, kokos och ube – samtidigt som
            du får lära känna lite mer av kulturen
            bakom dem.
          </p>


          <div className="about-us-quote">

            <span className="quote-mark">
              “
            </span>

            <p>
              Vår förhoppning är att varje dessert
              ska ge dig både en god smak och en
              liten berättelse att ta med dig.
            </p>

          </div>

        </div>


      </div>

    </section>

  )

}

export default AboutUs