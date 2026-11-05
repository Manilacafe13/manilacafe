
/* ======================================================
   MANILA CAFÉ — MANILA SOLO
   Server-side bundle validation
   ====================================================== */

export const MANILA_SOLO_ID = "manila-solo";

// Paketpris inklusive 6 % moms, i öre.
export const MANILA_SOLO_PRICE_ORE = 24900;

// ======================================================
// PRODUCT CATEGORIES
// ======================================================

const DRINK_CATEGORIES = new Set([
    "coffee",
    "shakes",
    "kalla dryck"
]);

const MEAL_CATEGORIES = new Set([
    "matratter"
]);

const EXCLUDED_PRODUCT_NAMES = new Set([
    "large ube cake",
    "ube cake large",
    "stor ube cake",
    "ube cake stor",
    "ube cake large size"
]);

// ======================================================
// HELPERS
// ======================================================

const normalize = (value = "") =>
    String(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const normalizeId = (value) =>
    String(value || "").trim().toLowerCase();

const isValidObjectId = (value) =>
    typeof value === "string" &&
    /^[a-f0-9]{24}$/i.test(value);

const getProductGroup = (product) => {
    const category = normalize(product?.category);

    if (MEAL_CATEGORIES.has(category)) {
        return "meal";
    }

    if (DRINK_CATEGORIES.has(category)) {
        return "drink";
    }

    // Samma kategoriindelning som i MenuBuilder.
    return "dessert";
};

const isExcludedProduct = (product) =>
    EXCLUDED_PRODUCT_NAMES.has(
        normalize(product?.name)
    );

const isProductAvailable = (product) => {
    if (!product) return false;

    if (
        product.available === false ||
        product.isAvailable === false
    ) {
        return false;
    }

    return true;
};

// ======================================================
// VALIDATE MANILA SOLO
// ======================================================

export const validateManilaSolo = ({
    selection,
    products,
    eligibleProductIds,
    pickupOnlyIds = [],
    deliveryMethod
}) => {

    // ==================================================
    // 1. VALIDATE SELECTION
    // ==================================================

    if (
        !selection ||
        typeof selection !== "object" ||
        Array.isArray(selection)
    ) {
        throw new Error(
            "Ogiltig Manila Solo-beställning."
        );
    }

    const requiredKeys = [
        "mealId",
        "dessertId",
        "drinkId"
    ];

    const selectionKeys = Object.keys(selection);

    if (
        selectionKeys.length !== 3 ||
        requiredKeys.some(
            key => !selectionKeys.includes(key)
        ) ||
        selectionKeys.some(
            key => !requiredKeys.includes(key)
        )
    ) {
        throw new Error(
            "Manila Solo kräver exakt en maträtt, " +
            "en dessert och en dryck."
        );
    }

    // ==================================================
    // 2. VALIDATE DELIVERY METHOD
    // ==================================================

    if (
        !["pickup", "delivery"].includes(
            deliveryMethod
        )
    ) {
        throw new Error(
            "Ogiltigt leveransalternativ."
        );
    }

    // ==================================================
    // 3. VALIDATE SERVER CONFIGURATION
    // ==================================================

    if (
        !Array.isArray(products) ||
        !Array.isArray(eligibleProductIds) ||
        !Array.isArray(pickupOnlyIds)
    ) {
        throw new Error(
            "Manila Solo är inte korrekt konfigurerad."
        );
    }

    // Ingen öppen tillåtelselista.
    // Servern måste uttryckligen godkänna produkter.
    if (eligibleProductIds.length === 0) {
        throw new Error(
            "Manila Solo är inte tillgänglig ännu."
        );
    }

    // ==================================================
    // 4. VALIDATE PRODUCT IDS
    // ==================================================

    const selectedIds = requiredKeys.map(
        key => selection[key]
    );

    if (
        selectedIds.some(
            id => !isValidObjectId(id)
        )
    ) {
        throw new Error(
            "Ett eller flera produktval är ogiltiga."
        );
    }

    const normalizedIds = selectedIds.map(
        normalizeId
    );

    if (
        new Set(normalizedIds).size !== 3
    ) {
        throw new Error(
            "Manila Solo måste innehålla tre olika produkter."
        );
    }

    // ==================================================
    // 5. CREATE SERVER-SIDE LOOKUP SETS
    // ==================================================

    const eligibleIds = new Set(
        eligibleProductIds.map(normalizeId)
    );

    const pickupOnly = new Set(
        pickupOnlyIds.map(normalizeId)
    );

    const productById = new Map(
        products
            .filter(product => product?._id)
            .map(product => [
                normalizeId(product._id),
                product
            ])
    );

    const expectedGroups = [
        "meal",
        "dessert",
        "drink"
    ];

    // ==================================================
    // 6. VALIDATE EACH PRODUCT
    // ==================================================

    const items = normalizedIds.map(
        (productId, index) => {

            const product = productById.get(
                productId
            );

            const expectedGroup =
                expectedGroups[index];

            // Produkt måste finnas i databasen.
            if (!product) {
                throw new Error(
                    "En av produkterna finns inte längre."
                );
            }

            // Produkt måste vara uttryckligen tillåten.
            if (!eligibleIds.has(productId)) {
                throw new Error(
                    `${product.name} ingår inte i Manila Solo.`
                );
            }

            // Extra skydd för stor Ube Cake.
            if (isExcludedProduct(product)) {
                throw new Error(
                    "Stor Ube Cake ingår inte i Manila Solo."
                );
            }

            // Produkt får inte vara avaktiverad.
            if (!isProductAvailable(product)) {
                throw new Error(
                    `${product.name} är inte tillgänglig.`
                );
            }

            // Rätt produkt i rätt kategori.
            const actualGroup =
                getProductGroup(product);

            if (actualGroup !== expectedGroup) {
                throw new Error(
                    `${product.name} tillhör fel produktkategori.`
                );
            }

            // Respektera produkter som endast
            // får hämtas, t.ex. Halo-Halo och Taho.
            if (
                deliveryMethod === "delivery" &&
                pickupOnly.has(productId)
            ) {
                throw new Error(
                    `${product.name} erbjuds endast för avhämtning.`
                );
            }

            // Returnera bara serververifierade data.
            // Inga priser hämtas från frontend.
            return {
                productId,
                name: String(product.name),
                group: expectedGroup,
                quantity: 1
            };
        }
    );

    // ==================================================
    // 7. RETURN VERIFIED BUNDLE
    // ==================================================

    return {
        bundleType: MANILA_SOLO_ID,
        quantity: 1,
        items,
        priceOre: MANILA_SOLO_PRICE_ORE,
        currency: "sek",
        deliveryMethod
    };
};
