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
// ADD ITEM TO CART
// ======================================================

const addToCart = async (
  req,
  res
) => {

  try {

    // User ID kommer från authMiddleware
    const userId =
      req.userId;


    const {
      itemId
    } = req.body;


    // ==================================================
    // CHECK USER ID
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
    // CHECK ITEM ID
    // ==================================================

    if (!itemId) {

      return res.status(400).json({

        success: false,

        message:
          "Produkt-ID saknas."

      });

    }


    if (
      !mongoose.isValidObjectId(
        itemId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

      });

    }


    // ==================================================
    // CHECK PRODUCT
    // ==================================================

    const product =
      await foodModel.findById(
        itemId
      );


    if (!product) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

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
    // GET CART
    // ==================================================

    const cartData =
      user.cartData
        ? { ...user.cartData }
        : {};


    const productId =
      itemId.toString();


    // ==================================================
    // CURRENT QUANTITY
    // ==================================================

    const currentQuantity =
      Number(
        cartData[productId] || 0
      );


    // ==================================================
    // MAX QUANTITY CHECK
    // ==================================================

    if (
      currentQuantity >=
      MAX_ITEM_QUANTITY
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Du kan lägga till högst ${MAX_ITEM_QUANTITY} st av samma produkt.`,

        maxQuantity:
          MAX_ITEM_QUANTITY,

        currentQuantity

      });

    }


    // ==================================================
    // ADD PRODUCT
    // ==================================================

    cartData[productId] =
      currentQuantity + 1;


    // ==================================================
    // SAVE CART
    // ==================================================

    user.cartData =
      cartData;


    user.markModified(
      "cartData"
    );


    await user.save();


    // ==================================================
    // TOTALS
    // ==================================================

    const totals =
      await calculateCartTotals(
        cartData
      );


    return res.status(200).json({

      success: true,

      message:
        "Produkten har lagts till i varukorgen.",

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

    console.log(
      "Add to cart error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Ett fel uppstod när produkten skulle läggas till i varukorgen."

    });

  }

};


// ======================================================
// REMOVE ITEM FROM CART
// ======================================================

const removeFromCart = async (
  req,
  res
) => {

  try {

    const userId =
      req.userId;


    const {
      itemId
    } = req.body;


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
    // CHECK PRODUCT ID
    // ==================================================

    if (!itemId) {

      return res.status(400).json({

        success: false,

        message:
          "Produkt-ID saknas."

      });

    }


    if (
      !mongoose.isValidObjectId(
        itemId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

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
    // GET CART
    // ==================================================

    const cartData =
      user.cartData
        ? { ...user.cartData }
        : {};


    const productId =
      itemId.toString();


    const currentQuantity =
      Number(
        cartData[productId] || 0
      );


    // ==================================================
    // CHECK ITEM EXISTS
    // ==================================================

    if (currentQuantity <= 0) {

      return res.status(400).json({

        success: false,

        message:
          "Produkten finns inte i varukorgen."

      });

    }


    // ==================================================
    // REMOVE / REDUCE
    // ==================================================

    if (currentQuantity > 1) {

      cartData[productId] =
        currentQuantity - 1;

    } else {

      delete cartData[productId];

    }


    // ==================================================
    // SAVE CART
    // ==================================================

    user.cartData =
      cartData;


    user.markModified(
      "cartData"
    );


    await user.save();


    // ==================================================
    // TOTALS
    // ==================================================

    const totals =
      await calculateCartTotals(
        cartData
      );


    return res.status(200).json({

      success: true,

      message:
        "Produkten har tagits bort från varukorgen.",

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

    console.log(
      "Remove from cart error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Ett fel uppstod när varukorgen skulle uppdateras."

    });

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

    console.log(
      "Get cart error:",
      error
    );


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
  getCart
};