import futureProductModel from "../models/futureProductModel.js";
import mongoose from "mongoose";


// ======================================================
// GET FUTURE PRODUCTS
// PUBLIC
// ======================================================

const listFutureProducts = async (
  req,
  res
) => {

  try {

    /*
      Om användaren är inloggad kan vi
      markera vilka produkter personen
      redan har röstat på.

      Om användaren inte är inloggad
      fungerar sidan fortfarande.
    */

    const userId =
      req.userId || null;


    const products =
      await futureProductModel
        .find({
          active: true
        })
        .sort({
          createdAt: -1
        });


    const formattedProducts =
      products.map(
        (product) => {

          const votes =
            Array.isArray(
              product.votes
            )
              ? product.votes
              : [];


          const hasVoted =
            userId
              ? votes.some(
                  (voteUserId) =>

                    voteUserId
                      .toString() ===
                    userId.toString()

                )
              : false;


          return {

            _id:
              product._id,

            name:
              product.name,

            description:
              product.description,

            image:
              product.image,

            emoji:
              product.emoji,

            category:
              product.category,

            voteCount:
              votes.length,

            hasVoted,

            createdAt:
              product.createdAt

          };

        }
      );


    /*
      Produkterna sorteras även efter
      antal röster så den mest populära
      hamnar högst.
    */

    formattedProducts.sort(
      (a, b) =>

        b.voteCount -
        a.voteCount
    );


    return res.status(200).json({

      success: true,

      count:
        formattedProducts.length,

      data:
        formattedProducts

    });


  } catch (error) {

    console.log(
      "List future products error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Kunde inte hämta kommande produkter."

    });

  }

};


// ======================================================
// VOTE FOR PRODUCT
// USER
// ======================================================

const voteFutureProduct = async (
  req,
  res
) => {

  try {

    const userId =
      req.userId;


    const {
      productId
    } = req.body;


    // ==================================================
    // USER
    // ==================================================

    if (!userId) {

      return res.status(401).json({

        success: false,

        message:
          "Du måste vara inloggad för att rösta."

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
          "Ogiltig användarsession."

      });

    }


    // ==================================================
    // PRODUCT ID
    // ==================================================

    if (!productId) {

      return res.status(400).json({

        success: false,

        message:
          "Produkt-ID saknas."

      });

    }


    if (
      !mongoose.isValidObjectId(
        productId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

      });

    }


    // ==================================================
    // FIND PRODUCT
    // ==================================================

    const product =
      await futureProductModel.findOne({

        _id:
          productId,

        active:
          true

      });


    if (!product) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

      });

    }


    // ==================================================
    // CHECK EXISTING VOTE
    // ==================================================

    const alreadyVoted =
      product.votes.some(
        (voteUserId) =>

          voteUserId
            .toString() ===
          userId.toString()

      );


    if (alreadyVoted) {

      return res.status(409).json({

        success: false,

        message:
          "Du har redan röstat på den här produkten.",

        voteCount:
          product.votes.length,

        hasVoted:
          true

      });

    }


    // ==================================================
    // ADD VOTE
    // ==================================================

    /*
      $addToSet används istället för $push.

      Det gör att samma userId inte kan
      läggas till två gånger även om två
      requests skulle komma nästan samtidigt.
    */

    const updatedProduct =
      await futureProductModel
        .findByIdAndUpdate(

          productId,

          {
            $addToSet: {
              votes:
                userId
            }
          },

          {
            new: true,
            runValidators: true
          }

        );


    if (!updatedProduct) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

      });

    }


    return res.status(200).json({

      success: true,

      message:
        "Tack! Din röst är registrerad.",

      data: {

        productId:
          updatedProduct._id,

        voteCount:
          updatedProduct.votes.length,

        hasVoted:
          true

      }

    });


  } catch (error) {

    console.log(
      "Vote future product error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Din röst kunde inte registreras."

    });

  }

};


// ======================================================
// REMOVE VOTE
// USER
// ======================================================

const removeFutureProductVote = async (
  req,
  res
) => {

  try {

    const userId =
      req.userId;


    const {
      productId
    } = req.body;


    // ==================================================
    // USER
    // ==================================================

    if (!userId) {

      return res.status(401).json({

        success: false,

        message:
          "Du måste vara inloggad."

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
          "Ogiltig användarsession."

      });

    }


    // ==================================================
    // PRODUCT ID
    // ==================================================

    if (
      !productId ||
      !mongoose.isValidObjectId(
        productId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

      });

    }


    // ==================================================
    // REMOVE USER FROM VOTES
    // ==================================================

    const updatedProduct =
      await futureProductModel
        .findByIdAndUpdate(

          productId,

          {
            $pull: {
              votes:
                userId
            }
          },

          {
            new: true,
            runValidators: true
          }

        );


    if (!updatedProduct) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

      });

    }


    return res.status(200).json({

      success: true,

      message:
        "Din röst har tagits bort.",

      data: {

        productId:
          updatedProduct._id,

        voteCount:
          updatedProduct.votes.length,

        hasVoted:
          false

      }

    });


  } catch (error) {

    console.log(
      "Remove future product vote error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Rösten kunde inte tas bort."

    });

  }

};


// ======================================================
// ADD FUTURE PRODUCT
// ADMIN
// ======================================================

const addFutureProduct = async (
  req,
  res
) => {

  try {

    const {
      name,
      description,
      emoji,
      category
    } = req.body;


    // ==================================================
    // VALIDATE
    // ==================================================

    if (
      !String(
        name || ""
      ).trim()
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Produktnamn krävs."

      });

    }


    if (
      !String(
        description || ""
      ).trim()
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Produktbeskrivning krävs."

      });

    }


    // ==================================================
    // IMAGE
    // ==================================================

    const image =
      req.file?.filename || "";


    // ==================================================
    // CREATE PRODUCT
    // ==================================================

    const product =
      new futureProductModel({

        name:
          String(
            name
          ).trim(),

        description:
          String(
            description
          ).trim(),

        image,

        emoji:
          String(
            emoji || "🍰"
          ).trim(),

        category:
          String(
            category ||
            "Dessert"
          ).trim(),

        votes:
          [],

        active:
          true

      });


    await product.save();


    return res.status(201).json({

      success: true,

      message:
        "Den framtida produkten har lagts till.",

      data: {

        _id:
          product._id,

        name:
          product.name,

        description:
          product.description,

        image:
          product.image,

        emoji:
          product.emoji,

        category:
          product.category,

        voteCount:
          0,

        active:
          product.active

      }

    });


  } catch (error) {

    console.log(
      "Add future product error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Produkten kunde inte läggas till."

    });

  }

};


// ======================================================
// GET ALL FUTURE PRODUCTS
// ADMIN
// ======================================================

const adminListFutureProducts = async (
  req,
  res
) => {

  try {

    const products =
      await futureProductModel
        .find({})
        .sort({
          createdAt: -1
        });


    const formattedProducts =
      products.map(
        (product) => ({

          _id:
            product._id,

          name:
            product.name,

          description:
            product.description,

          image:
            product.image,

          emoji:
            product.emoji,

          category:
            product.category,

          voteCount:
            Array.isArray(
              product.votes
            )
              ? product.votes.length
              : 0,

          active:
            product.active,

          createdAt:
            product.createdAt

        })
      );


    return res.status(200).json({

      success: true,

      count:
        formattedProducts.length,

      data:
        formattedProducts

    });


  } catch (error) {

    console.log(
      "Admin list future products error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Produkterna kunde inte hämtas."

    });

  }

};


// ======================================================
// CHANGE ACTIVE STATUS
// ADMIN
// ======================================================

const updateFutureProductStatus = async (
  req,
  res
) => {

  try {

    const {
      productId,
      active
    } = req.body;


    if (
      !productId ||
      !mongoose.isValidObjectId(
        productId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

      });

    }


    if (
      typeof active !==
      "boolean"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltig produktstatus."

      });

    }


    const product =
      await futureProductModel
        .findByIdAndUpdate(

          productId,

          {
            active
          },

          {
            new: true,
            runValidators: true
          }

        );


    if (!product) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

      });

    }


    return res.status(200).json({

      success: true,

      message:
        active
          ? "Produkten visas nu för kunder."
          : "Produkten har dolts.",

      data: {

        _id:
          product._id,

        active:
          product.active

      }

    });


  } catch (error) {

    console.log(
      "Update future product status error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Produktstatus kunde inte uppdateras."

    });

  }

};


// ======================================================
// DELETE FUTURE PRODUCT
// ADMIN
// ======================================================

const removeFutureProduct = async (
  req,
  res
) => {

  try {

    const {
      productId
    } = req.body;


    if (
      !productId ||
      !mongoose.isValidObjectId(
        productId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

      });

    }


    const product =
      await futureProductModel
        .findByIdAndDelete(
          productId
        );


    if (!product) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

      });

    }


    return res.status(200).json({

      success: true,

      message:
        "Produkten har tagits bort."

    });


  } catch (error) {

    console.log(
      "Remove future product error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Produkten kunde inte tas bort."

    });

  }

};


// ======================================================
// EXPORT
// ======================================================

export {
  listFutureProducts,
  voteFutureProduct,
  removeFutureProductVote,
  addFutureProduct,
  adminListFutureProducts,
  updateFutureProductStatus,
  removeFutureProduct
};