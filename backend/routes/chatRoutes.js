
import express from "express";
import crypto from "node:crypto";

// ======================================================
// MANILA CAFÉ LIVECHAT V1.0
// Free automated customer support
// Express + MongoDB + Mongoose
// ======================================================

const REASONS = new Set([
  "delivery_cost",
  "product_info",
  "price",
  "payment",
  "just_browsing",
  "other"
]);

const norm = (s) =>
  String(s || "")
    .toLocaleLowerCase("sv-SE")
    .trim();

const sha256 = (s) =>
  crypto
    .createHash("sha256")
    .update(s)
    .digest("hex");

const newToken = () =>
  crypto.randomBytes(32).toString("hex");

const clean = (s, max) =>
  typeof s === "string"
    ? s.trim().slice(0, max)
    : "";


// ======================================================
// AUTOMATIC CUSTOMER RESPONSES
// No paid AI API required
// ======================================================

function autoAnswer(message) {

  const q = norm(message);

  // HUMAN SUPPORT

  if (
    /människa|personal|person|kollega|riktig|medarbetare|prata med er/.test(q)
  ) {
    return {
      text:
        "Absolut! 💜 Jag skickar din fråga till vårt team. Skriv gärna vad du behöver hjälp med så återkommer vi här.",
      handoff: true
    };
  }

  // ALLERGENS

  if (
    /allerg|nöt|gluten|laktos|mjölk|ägg|soja|skaldjur/.test(q)
  ) {
    return {
      text:
        "Vi hjälper gärna till med ingredienser och allergener 💜 För att undvika felaktiga uppgifter lämnar jag frågan till personalen. Vilken produkt gäller det?",
      handoff: true
    };
  }

  // DELIVERY

  if (
    /lever|frakt|område|partille|kungsbacka|mölndal|göteborg/.test(q)
  ) {
    return {
      text:
        "Vi erbjuder leverans till flera områden runt Göteborg 💜 Skriv din adress i kassan för att kontrollera tillgängliga leveransalternativ och aktuell kostnad.",
      handoff: false
    };
  }

  // ORDERS AND PAYMENTS

  if (
    /beställ|köp|kassa|betala|kort|swish|klarna/.test(q)
  ) {
    return {
      text:
        "Du kan välja dina produkter och slutföra köpet i kassan på vår hemsida 💜 Om något inte fungerar, skriv vad som händer så hjälper vi dig.",
      handoff: false
    };
  }

  // OPENING HOURS AND PICKUP

  if (
    /öppet|öppettid|hämta|avhämtning|sitta|bord/.test(q)
  ) {
    return {
      text:
        "Manila Café erbjuder avhämtning och hemleverans, men inga sittplatser 💜 Se hemsidan för aktuella beställnings- och upphämtningstider.",
      handoff: false
    };
  }

  // PRODUCTS AND RECOMMENDATIONS

  if (
    /ube|mango|sago|turon|taho|rekommender|tips|godast/.test(q)
  ) {
    return {
      text:
        "Mums! 💜 Kika gärna på vår meny för dagens aktuella utbud. Föredrar du något fruktigt, chokladigt eller med ube?",
      handoff: false
    };
  }

  // DEFAULT RESPONSE

  return {
    text:
      "Tack för din fråga! 💜 Jag kan hjälpa till med leverans, beställning och menyn. Vill du ha personlig hjälp kan jag även lämna över till vårt team.",
    handoff: false
  };

}


// ======================================================
// CREATE CHAT ROUTER
// ======================================================

function makeChatRouter({
  mongoose,
  staffAuth
}) {

  // SECURITY: Require real admin authentication

  if (typeof staffAuth !== "function") {
    throw new Error(
      "Chat admin routes require real staffAuth middleware."
    );
  }


  // ====================================================
  // MONGODB SCHEMA
  // ====================================================

  const schema = new mongoose.Schema({

    tokenHash: {
      type: String,
      required: true,
      select: false
    },

    status: {
      type: String,
      enum: [
        "bot",
        "needs_staff",
        "staff",
        "closed"
      ],
      default: "bot"
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    },

    lastMessageAt: {
      type: Date,
      default: Date.now
    },

    messages: [
      {
        role: {
          type: String,
          enum: [
            "customer",
            "bot",
            "staff"
          ],
          required: true
        },

        text: {
          type: String,
          required: true,
          maxlength: 1000
        },

        at: {
          type: Date,
          default: Date.now
        }
      }
    ],

    feedback: [
      {
        reason: {
          type: String,
          enum: [...REASONS]
        },

        at: {
          type: Date,
          default: Date.now
        }
      }
    ]

  }, {
    minimize: true
  });


  // ====================================================
  // DATABASE INDEX
  // ====================================================

  schema.index({
    lastMessageAt: -1
  });


  const Chat =
    mongoose.models.ManilaChatConversation ||
    mongoose.model(
      "ManilaChatConversation",
      schema
    );


  // ====================================================
  // EXPRESS ROUTER
  // ====================================================

  const router = express.Router();

  router.use(
    express.json({
      limit: "16kb"
    })
  );


  // ====================================================
  // BASIC RATE LIMITING
  // ====================================================

  const windows = new Map();

  const throttle = (req, res, next) => {

    const key = req.ip || "unknown";
    const now = Date.now();

    const w = windows.get(key) || {
      count: 0,
      reset: now + 60000
    };

    if (now > w.reset) {
      w.count = 0;
      w.reset = now + 60000;
    }

    w.count += 1;

    windows.set(key, w);

    if (windows.size > 10000) {

      for (const [k, v] of windows) {

        if (v.reset < now) {
          windows.delete(k);
        }

      }

    }

    if (w.count > 90) {

      return res.status(429).json({
        error:
          "För många förfrågningar. Försök igen snart."
      });

    }

    next();

  };


  // ====================================================
  // VALIDATE CONVERSATION ID
  // ====================================================

  const validId = (id) =>
    mongoose.isValidObjectId(id);


  // ====================================================
  // AUTHENTICATE CUSTOMER CONVERSATION
  // ====================================================

  const authenticateVisitor = async (
    req,
    res,
    next
  ) => {

    if (!validId(req.params.id)) {

      return res.status(404).json({
        error: "Inte hittad"
      });

    }

    const token =
      req.get("X-Chat-Token") || "";

    if (!/^[a-f0-9]{64}$/.test(token)) {

      return res.status(403).json({
        error: "Ingen åtkomst"
      });

    }

    const doc = await Chat
      .findById(req.params.id)
      .select("+tokenHash");

    if (
      !doc ||
      doc.tokenHash !== sha256(token)
    ) {

      return res.status(404).json({
        error: "Inte hittad"
      });

    }

    req.conversation = doc;

    next();

  };


  // ====================================================
  // ASYNC ERROR HANDLER
  // ====================================================

  const wrap = (fn) =>
    (req, res, next) =>
      Promise.resolve(
        fn(req, res, next)
      ).catch(next);


  // ====================================================
  // START CUSTOMER CHAT
  // POST /api/chat/start
  // ====================================================

  router.post(
    "/start",
    throttle,
    wrap(async (_req, res) => {

      const token = newToken();

      const doc = await Chat.create({

        tokenHash: sha256(token),

        messages: [
          {
            role: "bot",
            text:
              "Hej hej! 💜 Välkommen till Manila Café. Behöver du hjälp med beställning, leverans eller menyn?"
          }
        ]

      });

      res.status(201).json({

        id: doc.id,
        token,
        status: doc.status,
        messages: doc.messages

      });

    })
  );


  // ====================================================
  // GET CUSTOMER CONVERSATION
  // ====================================================

  router.get(
    "/conversations/:id",
    throttle,
    wrap(authenticateVisitor),
    wrap(async (req, res) => {

      const {
        id,
        status,
        messages
      } = req.conversation;

      res.json({
        id,
        status,
        messages
      });

    })
  );


  // ====================================================
  // SEND CUSTOMER MESSAGE
  // ====================================================

  router.post(
    "/conversations/:id/messages",
    throttle,
    wrap(authenticateVisitor),
    wrap(async (req, res) => {

      const msg = clean(
        req.body?.text,
        1000
      );

      if (!msg) {

        return res.status(400).json({
          error: "Skriv ett meddelande."
        });

      }

      const doc = req.conversation;

      if (doc.messages.length >= 150) {

        return res.status(400).json({
          error:
            "Starta en ny konversation via personalen."
        });

      }

      doc.messages.push({
        role: "customer",
        text: msg
      });


      // AUTOMATED ANSWER

      if (doc.status === "bot") {

        const reply = autoAnswer(msg);

        doc.messages.push({
          role: "bot",
          text: reply.text
        });

        if (reply.handoff) {
          doc.status = "needs_staff";
        }

      }

      doc.lastMessageAt =
        doc.updatedAt =
          new Date();

      await doc.save();

      res.json({

        status: doc.status,
        messages: doc.messages

      });

    })
  );


  // ====================================================
  // REQUEST HUMAN SUPPORT
  // ====================================================

  router.post(
    "/conversations/:id/handoff",
    throttle,
    wrap(authenticateVisitor),
    wrap(async (req, res) => {

      const doc = req.conversation;

      doc.status = "needs_staff";

      doc.messages.push({

        role: "bot",

        text:
          "Vi har meddelat personalen 💜 Du kan skriva din fråga här så svarar vi när någon är tillgänglig."

      });

      doc.lastMessageAt =
        doc.updatedAt =
          new Date();

      await doc.save();

      res.json({

        status: doc.status,
        messages: doc.messages

      });

    })
  );


  // ====================================================
  // CUSTOMER FEEDBACK
  // ====================================================

  router.post(
    "/conversations/:id/feedback",
    throttle,
    wrap(authenticateVisitor),
    wrap(async (req, res) => {

      const reason = clean(
        req.body?.reason,
        30
      );

      if (!REASONS.has(reason)) {

        return res.status(400).json({
          error: "Ogiltig anledning"
        });

      }

      const doc = req.conversation;

      if (doc.feedback.length >= 2) {

        return res.status(409).json({
          error: "Feedback redan mottagen"
        });

      }

      doc.feedback.push({
        reason
      });

      await doc.save();

      res.json({
        ok: true
      });

    })
  );


  // ====================================================
  // STAFF ROUTES
  // Protected with existing admin authentication
  // ====================================================

  const staff = express.Router();

  staff.use(staffAuth);


  // ====================================================
  // GET ALL CONVERSATIONS
  // GET /api/chat/staff/conversations
  // ====================================================

  staff.get(
    "/conversations",
    wrap(async (_req, res) => {

      const docs = await Chat
        .find()
        .select("-tokenHash")
        .sort({
          lastMessageAt: -1
        })
        .limit(100)
        .lean();

      res.json(docs);

    })
  );


  // ====================================================
  // STAFF REPLY
  // ====================================================

  staff.post(
    "/conversations/:id/reply",
    wrap(async (req, res) => {

      if (!validId(req.params.id)) {

        return res.status(404).json({
          error: "Inte hittad"
        });

      }

      const msg = clean(
        req.body?.text,
        1000
      );

      if (!msg) {

        return res.status(400).json({
          error: "Skriv ett meddelande"
        });

      }

      const doc = await Chat.findById(
        req.params.id
      );

      if (!doc) {

        return res.status(404).json({
          error: "Inte hittad"
        });

      }

      if (doc.messages.length >= 150) {

        return res.status(400).json({
          error: "För många meddelanden"
        });

      }

      doc.messages.push({
        role: "staff",
        text: msg
      });

      doc.status = "staff";

      doc.lastMessageAt =
        doc.updatedAt =
          new Date();

      await doc.save();

      res.json({

        status: doc.status,
        messages: doc.messages

      });

    })
  );


  // ====================================================
  // UPDATE CONVERSATION STATUS
  // ====================================================

  staff.patch(
    "/conversations/:id",
    wrap(async (req, res) => {

      if (!validId(req.params.id)) {

        return res.status(404).json({
          error: "Inte hittad"
        });

      }

      if (
        ![
          "bot",
          "needs_staff",
          "staff",
          "closed"
        ].includes(req.body?.status)
      ) {

        return res.status(400).json({
          error: "Ogiltig status"
        });

      }

      const doc =
        await Chat.findByIdAndUpdate(

          req.params.id,

          {
            $set: {
              status: req.body.status,
              updatedAt: new Date()
            }
          },

          {
            new: true
          }

        );

      if (!doc) {

        return res.status(404).json({
          error: "Inte hittad"
        });

      }

      res.json({

        id: doc.id,
        status: doc.status

      });

    })
  );


  // ====================================================
  // CUSTOMER INSIGHTS
  // GET /api/chat/staff/insights
  // ====================================================

  staff.get(
    "/insights",
    wrap(async (_req, res) => {

      const docs = await Chat
        .find()
        .select("status feedback")
        .lean();

      const reasons = Object.fromEntries(
        [...REASONS].map(
          (r) => [r, 0]
        )
      );

      for (const doc of docs) {

        for (const f of doc.feedback || []) {

          if (f.reason in reasons) {
            reasons[f.reason]++;
          }

        }

      }

      res.json({

        conversations: docs.length,

        needsStaff:
          docs.filter(
            (d) =>
              d.status === "needs_staff"
          ).length,

        reasons

      });

    })
  );


  // ====================================================
  // MOUNT STAFF ROUTES
  // ====================================================

  router.use(
    "/staff",
    staff
  );


  // ====================================================
  // CHAT ERROR HANDLER
  // ====================================================

  router.use(
    (err, _req, res, _next) => {

      console.error(
        "Chat route error:",
        err.message
      );

      res.status(500).json({

        error:
          "Något gick fel. Försök igen."

      });

    }
  );


  return router;

}


// ======================================================
// EXPORT
// ======================================================

export {
  makeChatRouter
};
