import mongoose from "mongoose";


// ======================================================
// FUTURE PRODUCT SCHEMA
// ======================================================

const futureProductSchema =
  new mongoose.Schema(

    {

      // ==================================================
      // PRODUCT NAME
      // ==================================================

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
      },


      // ==================================================
      // DESCRIPTION
      // ==================================================

      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
      },


      // ==================================================
      // IMAGE
      // ==================================================

      image: {
        type: String,
        default: "",
        trim: true
      },


      // ==================================================
      // EMOJI / FALLBACK
      // ==================================================

      emoji: {
        type: String,
        default: "🍰",
        trim: true
      },


      // ==================================================
      // CATEGORY
      // ==================================================

      category: {
        type: String,
        default: "Dessert",
        trim: true
      },


      // ==================================================
      // CUSTOMER VOTES
      // ==================================================

      votes: [

        {
          type:
            mongoose.Schema.Types.ObjectId,

          ref:
            "user"
        }

      ],


      // ==================================================
      // ACTIVE
      // ==================================================

      active: {
        type: Boolean,
        default: true
      }

    },

    {
      timestamps: true
    }

  );


// ======================================================
// INDEXES
// ======================================================

futureProductSchema.index({
  active: 1,
  createdAt: -1
});


// ======================================================
// PREVENT DUPLICATE USER IDS IN VOTES
// ======================================================

futureProductSchema.pre(
  "save",
  function (next) {

    if (
      Array.isArray(this.votes)
    ) {

      this.votes =
        [
          ...new Map(

            this.votes.map(
              (userId) => [

                userId.toString(),

                userId

              ]
            )

          ).values()
        ];

    }


    next();

  }
);


// ======================================================
// MODEL
// ======================================================

const futureProductModel =
  mongoose.models.futureProduct ||
  mongoose.model(
    "futureProduct",
    futureProductSchema
  );


export default futureProductModel;