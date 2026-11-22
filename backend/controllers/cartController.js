import userModel from "../models/userModel.js";
import foodModel from "../models/foodmodel.js";
import mongoose from "mongoose";


// ======================================================
// VAT / MOMS
// ======================================================

const VAT_RATE = 0.06;


// ======================================================
// MAX QUANTITY PER PRODUCT
// ======================================================

const MAX_ITEM_QUANTITY = 99;


// ======================================================
// ROUND MONEY
// ======================================================

const roundMoney = (value) => {

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Number(
    number.toFixed(2)
  );

};


// ======================================================
// CALCULATE CART TOTALS
// ======================================================

const calculateCartTotals = async (
  cartData = {}
) => {

  const itemIds =
    Object.keys(cartData).filter(
      (itemId) => {

        const quantity =
          Number(cartData[itemId]);

        return (
          mongoose.isValidObjectId(itemId) &&
          Number.isFinite(quantity) &&
          quantity > 0
        );

      }
    );


  if (itemIds.length === 0) {

    return {
      subtotal: 0,
      vatRate: 6,
      vatAmount: 0,
      total: 0
    };

  }


  const products =
    await foodModel.find({

      _id: {
        $in: itemIds
      }

    });


  let subtotal = 0;


  for (const product of products) {

    const productId =
      product._id.toString();


    const quantity =
      Number(
        cartData[productId]
      );


    const price =
      Number(
        product.price
      );


    if (
      Number.isFinite(quantity) &&
      quantity > 0 &&
      Number.isFinite(price) &&
      price >= 0
    ) {

      subtotal +=
        price * quantity;

    }

  }


  const vatAmount =
    subtotal * VAT_RATE;


  const total =
    subtotal + vatAmount;


  return {

    subtotal:
      roundMoney(subtotal),

    vatRate:
      6,

    vatAmount:
      roundMoney(vatAmount),

    total:
      roundMoney(total)

  };

};


// ======================================================
// ATOMIC CART MUTATIONS
// ======================================================
// A MongoDB compare-and-set prevents simultaneous requests from silently
// overwriting a different product or losing an increment/decrement.
// Never save an entire old cart snapshot from add/remove.
const mutateCart = async (req, res, action) => {
  try {
    const userId = req.userId;
    const itemId = req.body?.itemId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Ogiltig användarsession. Logga in igen." });
    }
    if (typeof itemId !== "string" || !mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: "Ogiltigt produkt-ID." });
    }
    const productId = itemId.toLowerCase();
    if (action === "add" && !await foodModel.findById(productId)) {
      return res.status(404).json({ success: false, message: "Produkten kunde inte hittas." });
    }

    // Only a single field is changed, guarded by its previously observed
    // value. A conflicting request retries against the new database state.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(401).json({ success: false, message: "Användaren kunde inte hittas. Logga in igen." });
      }
      const oldCart = user.cartData || {};
      const rawValue = Object.prototype.hasOwnProperty.call(oldCart, productId)
        ? oldCart[productId] : undefined;
      const oldQuantity = Number(rawValue ?? 0);
      const quantity = Number.isInteger(oldQuantity) && oldQuantity >= 0
        ? oldQuantity : 0;
      if (action === "add" && quantity >= MAX_ITEM_QUANTITY) {
        return res.status(400).json({
          success: false, message: `Du kan lägga till högst ${MAX_ITEM_QUANTITY} st av samma produkt.`,
          maxQuantity: MAX_ITEM_QUANTITY, currentQuantity: quantity
        });
      }
      if (action === "remove" && quantity <= 0) {
        return res.status(400).json({ success: false, message: "Produkten finns inte i varukorgen." });
      }

      const field = `cartData.${productId}`;
      const match = rawValue === undefined ? { $exists: false } : rawValue;
      const nextQuantity = action === "add" ? quantity + 1 : quantity - 1;
      const update = nextQuantity === 0
        ? { $unset: { [field]: 1 } }
        : { $set: { [field]: nextQuantity } };
      const saved = await userModel.findOneAndUpdate(
        { _id: userId, [field]: match }, update,
        { new: true, projection: { cartData: 1 } }
      );
      if (!saved) continue;
      const cartData = saved.cartData ? { ...saved.cartData } : {};
      const totals = await calculateCartTotals(cartData);
      return res.status(200).json({
        success: true,
        message: action === "add"
          ? "Produkten har lagts till i varukorgen."
          : "Produkten har tagits bort från varukorgen.",
        cartData, ...totals
      });
    }
    return res.status(409).json({
      success: false, message: "Varukorgen ändrades samtidigt. Försök igen."
    });
  } catch (error) {
    console.error("Cart update error:", error.message);
    return res.status(500).json({ success: false, message: "Varukorgen kunde inte uppdateras." });
  }
};

const addToCart = (req, res) => mutateCart(req, res, "add");
const removeFromCart = (req, res) => mutateCart(req, res, "remove");


// Reconcile a guest cart after login. The client is responsible for sending
// only its regular item quantities; never accept prices from the browser.
const replaceCart = async (req, res) => {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      return res.status(401).json({ success: false, message: "Du är inte inloggad." });
    }
    const supplied = req.body?.cartData;
    if (!supplied || typeof supplied !== "object" || Array.isArray(supplied) ||
        Object.keys(supplied).length > 100) {
      return res.status(400).json({ success: false, message: "Ogiltig varukorg." });
    }
    const clean = {};
    for (const [id, quantity] of Object.entries(supplied)) {
      if (!mongoose.isValidObjectId(id) || !Number.isInteger(quantity) ||
          quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
        return res.status(400).json({ success: false, message: "Ogiltigt produktantal." });
      }
      clean[id.toLowerCase()] = quantity;
    }
    const updated = await userModel.findOneAndUpdate(
      { _id: req.userId }, { $set: { cartData: clean } },
      { new: true, projection: { cartData: 1 } }
    );
    if (!updated) {
      return res.status(401).json({ success: false, message: "Användaren kunde inte hittas." });
    }
    return res.status(200).json({ success: true, cartData: clean });
  } catch (error) {
    console.error("Cart replace error:", error.message);
    return res.status(500).json({ success: false, message: "Varukorgen kunde inte synkroniseras." });
  }
};


// ======================================================
// GET USER CART
// ======================================================

const getCart = async (
  req,
  res
) => {

  try {

    // User ID kommer från authMiddleware
    const userId =
      req.userId;


    // ==================================================
    // CHECK USER
    // ==================================================

    if (!userId) {

      return res.status(401).json({

        success: false,

        message:
          "Du är inte inloggad."

      });

    }


    if (
      !mongoose.isValidObjectId(
        userId
      )
    ) {

      return res.status(401).json({

        success: false,

        message:
          "Ogiltig användarsession. Logga in igen."

      });

    }


    // ==================================================
    // GET USER
    // ==================================================

    const user =
      await userModel.findById(
        userId
      );


    if (!user) {

      return res.status(401).json({

        success: false,

        message:
          "Användaren kunde inte hittas. Logga in igen."

      });

    }


    // ==================================================
    // CART
    // ==================================================

    const cartData =
      user.cartData
        ? { ...user.cartData }
        : {};


    // ==================================================
    // TOTALS
    // ==================================================

    const totals =
      await calculateCartTotals(
        cartData
      );


    return res.status(200).json({

      success: true,

      cartData,

      subtotal:
        totals.subtotal,

      vatRate:
        totals.vatRate,

      vatAmount:
        totals.vatAmount,

      total:
        totals.total

    });


  } catch (error) {

    console.error("Get cart error:", error.message);


    return res.status(500).json({

      success: false,

      message:
        "Ett fel uppstod när varukorgen skulle hämtas."

    });

  }

};


// ======================================================
// EXPORT
// ======================================================

export {
  addToCart,
  removeFromCart,
  getCart,
  replaceCart
};