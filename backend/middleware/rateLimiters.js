import {
  rateLimit,
  ipKeyGenerator
} from "express-rate-limit";


// ======================================================
// CLIENT IP
// ======================================================

const getClientIp = (req) => {

  const cloudflareIp =
    req.headers[
      "cf-connecting-ip"
    ];


  if (
    typeof cloudflareIp === "string" &&
    cloudflareIp.trim()
  ) {

    return cloudflareIp.trim();

  }


  return (
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );

};


// ======================================================
// RATE LIMIT KEY
// ======================================================

const clientKeyGenerator = (req) => {

  return ipKeyGenerator(
    getClientIp(req)
  );

};


// ======================================================
// LOGIN RATE LIMIT
// ======================================================

const loginLimiter = rateLimit({

  windowMs:
    15 * 60 * 1000,

  limit:
    10,

  skipSuccessfulRequests:
    true,

  standardHeaders:
    "draft-8",

  legacyHeaders:
    false,

  keyGenerator:
    clientKeyGenerator,

  message: {

    success:
      false,

    message:
      "För många inloggningsförsök. Vänta 15 minuter och försök igen."

  }

});


// ======================================================
// REGISTER RATE LIMIT
// ======================================================

const registerLimiter = rateLimit({

  windowMs:
    60 * 60 * 1000,

  limit:
    5,

  standardHeaders:
    "draft-8",

  legacyHeaders:
    false,

  keyGenerator:
    clientKeyGenerator,

  message: {

    success:
      false,

    message:
      "För många registreringsförsök. Försök igen senare."

  }

});


// ======================================================
// EXPORT
// ======================================================

export {
  loginLimiter,
  registerLimiter
};