
const GA_ID = "G-8F662GGCWE";

let analyticsLoaded = false;

export const loadAnalytics = () => {
  if (analyticsLoaded || typeof window === "undefined") {
    return;
  }

  // Load only after the visitor has accepted.
  if (
    localStorage.getItem("manilacafe_cookie_consent") !==
    "accepted"
  ) {
    return;
  }

  analyticsLoaded = true;

  window.dataLayer = window.dataLayer || [];

  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  // Consent Mode v2
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  window.gtag("js", new Date());

  window.gtag("consent", "update", {
    analytics_storage: "granted",
  });

  window.gtag("config", GA_ID, {
    send_page_view: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

  document.head.appendChild(script);
};
