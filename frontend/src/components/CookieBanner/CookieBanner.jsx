import React, { useState, useEffect } from "react";
import "./CookieBanner.css";
import { loadAnalytics } from "../../analytics/analytics";

const COOKIE_KEY = "manilacafe_cookie_consent";

const CookieBanner = () => {
  const [consent, setConsent] = useState(() => {
    try {
      return localStorage.getItem(COOKIE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
  if (consent === "accepted") {
    loadAnalytics();
  }
}, [consent]);

  const saveConsent = (choice) => {
    try {
      localStorage.setItem(COOKIE_KEY, choice);
    } catch {
      // Keep the choice for this session.
    }

    setConsent(choice);
    window.dispatchEvent(
      new CustomEvent("manilacafe:consent", {
        detail: choice,
      })
    );
  };

  if (consent === "accepted" || consent === "rejected") {
    return null;
  }

  return (
    <section
      className="cookie-banner"
      aria-label="Cookieinställningar"
    >
      <div className="cookie-banner-content">
        <h3>Vi värnar om din integritet</h3>

        <p>
          Manila Café använder nödvändig lagring för att
          webbplatsen ska fungera. Med ditt samtycke
          använder vi även Google Analytics för att
          förstå hur webbplatsen används och förbättra
          upplevelsen. Du kan tacka nej.
        </p>

        <div className="cookie-banner-actions">
          <button
            type="button"
            onClick={() => saveConsent("rejected")}
          >
            Neka
          </button>

          <button
            type="button"
            onClick={() => saveConsent("accepted")}
          >
            Acceptera
          </button>
        </div>
      </div>
    </section>
  );
};

export default CookieBanner;
