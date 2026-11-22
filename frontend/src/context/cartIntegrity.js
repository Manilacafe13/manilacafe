// Keep the header badge, cart page and persisted regular cart in sync.
// No stock-based filtering: an item may still be eligible for a future order.
import { sanitizeCustomizedCart } from './customizedCart.js';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const MAX_QUANTITY = 99;

export const sanitizeRegularCart = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean = {};
  for (const [id, rawQuantity] of Object.entries(value)) {
    const quantity = Number(rawQuantity);
    if (!OBJECT_ID.test(id) || !Number.isFinite(quantity) || quantity <= 0) continue;
    const integerQuantity = Math.min(Math.floor(quantity), MAX_QUANTITY);
    if (integerQuantity > 0) clean[id.toLowerCase()] = integerQuantity;
  }
  return clean;
};

export const getVisibleRegularCartEntries = (cartItems, foodList) => {
  const safeCart = sanitizeRegularCart(cartItems);
  if (!Array.isArray(foodList)) return [];
  return foodList.flatMap(product => {
    const productId = String(product?._id || '').toLowerCase();
    const quantity = safeCart[productId] || 0;
    const price = Number(product?.price);
    if (!quantity || !Number.isFinite(price) || price < 0) return [];
    return [{
      cartKey: productId,
      productId,
      name: product.name,
      image: product.image,
      price,
      quantity,
      isCustomized: false,
      invalidCustomization: false
    }];
  });
};

export const pruneRegularCart = (cartItems, foodList) =>
  Object.fromEntries(getVisibleRegularCartEntries(cartItems, foodList)
    .map(({ productId, quantity }) => [productId, quantity]));

export const getCartBadgeCount = ({ cartItems, customizedCartItems, manilaSolo, foodList }) => {
  const regularCount = getVisibleRegularCartEntries(cartItems, foodList)
    .reduce((sum, item) => sum + item.quantity, 0);
  const customizedCount = Object.values(sanitizeCustomizedCart(customizedCartItems))
    .reduce((sum, item) => sum + item.quantity, 0);
  const bundleCount = manilaSolo?.type === 'manila-solo' ? 1 : 0;
  return regularCount + customizedCount + bundleCount;
};
