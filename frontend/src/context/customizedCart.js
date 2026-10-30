// Manila CafÃ© â€“ phase 2 customer customizations.
// All prices here are DISPLAY estimates; the checkout backend must reprice
// every product and selected option using current MongoDB values.

export const CUSTOMIZED_CART_STORAGE_KEY = 'manilaCafeCustomizedCart';
export const MAX_CUSTOMIZED_LINES = 200;
export const MAX_CART_QUANTITY = 99;

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const isId = value => typeof value === 'string' && OBJECT_ID.test(value);
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Keep only product IDs, option IDs and quantities. No client-provided prices.
export const normalizeCustomSelection = (raw, requireChoices = true) => {
  if (!isRecord(raw) || !Array.isArray(raw.removedIngredientIds) || !Array.isArray(raw.extras)) {
    throw new Error('Ogiltiga produktval.');
  }
  if (raw.removedIngredientIds.length > 30 || raw.extras.length > 30) {
    throw new Error('Får många valda alternativ.');
  }
  const removedIngredientIds = [];
  const seenRemoved = new Set();
  for (const id of raw.removedIngredientIds) {
    if (!isId(id) || seenRemoved.has(id.toLowerCase())) throw new Error('Ogiltigt ingrediensval.');
    seenRemoved.add(id.toLowerCase());
    removedIngredientIds.push(id.toLowerCase());
  }
  removedIngredientIds.sort();

  const extras = [];
  const seenExtras = new Set();
  for (const extra of raw.extras) {
    const id = extra?.optionId;
    const quantity = extra?.quantity;
    if (!isId(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
        seenExtras.has(id.toLowerCase())) {
      throw new Error('Ogiltigt tillval eller antal.');
    }
    seenExtras.add(id.toLowerCase());
    extras.push({ optionId: id.toLowerCase(), quantity });
  }
  extras.sort((a, b) => a.optionId.localeCompare(b.optionId));
  if (requireChoices && !removedIngredientIds.length && !extras.length) {
    throw new Error('Välj minst en anpassning.');
  }
  return { removedIngredientIds, extras };
};

export const customizationKey = (productId, selection) => {
  if (!isId(productId)) throw new Error('Ogiltigt produkt-ID.');
  const clean = normalizeCustomSelection(selection);
  return `custom:${productId.toLowerCase()}:${clean.removedIngredientIds.join('.')}:${clean.extras.map(e => `${e.optionId}x${e.quantity}`).join('.')}`;
};

// Validate all customer choices against the current public product configuration.
export const validateSelectionForProduct = (product, selection) => {
  if (!product || !isId(product._id) || product.customizations?.enabled !== true) {
    throw new Error('Produkten kan inte anpassas just nu.');
  }
  const clean = normalizeCustomSelection(selection);
  const removableOptions = new Map(
    (Array.isArray(product.customizations.removableIngredients)
      ? product.customizations.removableIngredients : [])
      .filter(option => isId(String(option?._id || '')) && option.available !== false)
      .map(option => [String(option._id).toLowerCase(), option])
  );
  const extraOptions = new Map(
    (Array.isArray(product.customizations.extras) ? product.customizations.extras : [])
      .filter(option => isId(String(option?._id || '')) && option.available !== false)
      .map(option => [String(option._id).toLowerCase(), option])
  );
  const removedIngredientNames = clean.removedIngredientIds.map(id => {
    const option = removableOptions.get(id);
    if (!option) throw new Error('En ingrediens kan inte längre väljas bort.');
    return String(option.name || '');
  });
  let extrasTotal = 0;
  const selectedExtras = clean.extras.map(({ optionId, quantity }) => {
    const option = extraOptions.get(optionId);
    if (!option) throw new Error('Ett tillval Ã¤r inte lÃ¤ngre tillgÃ¤ngligt.');
    const maxQuantity = Number(option.maxQuantity ?? 1);
    const price = Number(option.price);
    if (!Number.isInteger(maxQuantity) || maxQuantity < 1 || quantity > maxQuantity ||
        !Number.isFinite(price) || price < 0 || price > 100000) {
      throw new Error('Ett tillval har ändrats. Välj det igen.');
    }
    extrasTotal += price * quantity;
    return { optionId, name: String(option.name || ''), quantity, price };
  });
  const basePrice = Number(product.price);
  if (!Number.isFinite(basePrice) || basePrice < 0 || basePrice > 100000) {
    throw new Error('Produkten saknar ett giltigt pris.');
  }
  return {
    ...clean,
    removedIngredientNames,
    selectedExtras,
    unitPrice: Number((basePrice + extrasTotal).toFixed(2))
  };
};

export const sanitizeCustomizedCart = input => {
  if (!isRecord(input)) return {};
  const result = {};
  for (const candidate of Object.values(input).slice(0, MAX_CUSTOMIZED_LINES)) {
    try {
      if (!isRecord(candidate) || !isId(candidate.productId)) continue;
      const quantity = Number(candidate.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) continue;
      const selection = normalizeCustomSelection(candidate);
      const productId = candidate.productId.toLowerCase();
      const cartKey = customizationKey(productId, selection);
      if (own(result, cartKey)) {
        result[cartKey].quantity = Math.min(MAX_CART_QUANTITY, result[cartKey].quantity + quantity);
      } else {
        result[cartKey] = { productId, ...selection, quantity: Math.min(MAX_CART_QUANTITY, quantity) };
      }
    } catch {
      // Ignore corrupted/malformed stored entries instead of allowing checkout leakage.
    }
  }
  return result;
};

export const buildCustomizedCartEntries = (customizedCartItems, foodList) => {
  const items = sanitizeCustomizedCart(customizedCartItems);
  const catalog = Array.isArray(foodList) ? foodList : [];
  return Object.entries(items).map(([cartKey, item]) => {
    const product = catalog.find(food => String(food._id).toLowerCase() === item.productId);
    try {
      const validated = validateSelectionForProduct(product, item);
      return {
        cartKey,
        productId: item.productId,
        name: String(product.name || ''),
        image: product.image,
        quantity: item.quantity,
        price: validated.unitPrice,
        isCustomized: true,
        invalidCustomization: false,
        removedIngredientIds: validated.removedIngredientIds,
        removedIngredients: validated.removedIngredientNames,
        extras: validated.selectedExtras
      };
    } catch (error) {
      return {
        cartKey,
        productId: item.productId,
        name: product?.name || 'Produkt är inte tillgänglig',
        image: product?.image || '',
        quantity: item.quantity,
        price: null,
        isCustomized: true,
        invalidCustomization: true,
        customizationError: error.message,
        removedIngredientIds: item.removedIngredientIds,
        removedIngredients: [],
        extras: item.extras
      };
    }
  });
};