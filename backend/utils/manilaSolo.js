/* MANILA CAFÃ‰ â€” fast Manila Solo, server-side validation */
export const MANILA_SOLO_ID = 'manila-solo';
export const MANILA_SOLO_PRICE_ORE = 24900; // inklusive moms

const normalize = value => String(value ?? '').trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const normalizeId = value => String(value ?? '').trim().toLowerCase();
const validId = value => /^[a-f0-9]{24}$/.test(normalizeId(value));
const DRINK_CATEGORIES = new Set(['coffee', 'shakes', 'kalla dryck']);

export const validateManilaSolo = ({
  selection, products, eligibleProductIds, pickupOnlyIds = [], deliveryMethod
}) => {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    throw new Error('Ogiltig Manila Solo-bestÃ¤llning.');
  }
  if (!['pickup', 'delivery'].includes(deliveryMethod)) {
    throw new Error('Ogiltigt leveransalternativ.');
  }
  if (!Array.isArray(products) || !Array.isArray(eligibleProductIds) ||
      !Array.isArray(pickupOnlyIds)) {
    throw new Error('Manila Solo Ã¤r inte korrekt konfigurerad.');
  }

  const requiredKeys = ['mealId', 'dessertId', 'drinkId'];
  if (Object.keys(selection).length !== 3 ||
      !requiredKeys.every(key => Object.prototype.hasOwnProperty.call(selection, key))) {
    throw new Error('Manila Solo har ett fast innehÃ¥ll.');
  }

  // These are server-owned configuration, never prices or IDs from the client.
  const fixedIds = {
    mealId: normalizeId(process.env.MANILA_SOLO_PANCIT_ID),
    dessertId: normalizeId(process.env.MANILA_SOLO_GOLDEN_TURON_ID),
    drinkId: normalizeId(process.env.MANILA_SOLO_UBE_CARAMEL_TWIRL_ID)
  };
  const ids = requiredKeys.map(key => fixedIds[key]);
  if (!ids.every(validId) || new Set(ids).size !== 3) {
    throw new Error('Manila Solo saknar giltig produktkonfiguration.');
  }
  if (requiredKeys.some(key => !validId(selection[key]) ||
      normalizeId(selection[key]) !== fixedIds[key])) {
    throw new Error('Manila Solo innehåller endast Pancit, Golden Turon & Ube Ice Cream och Ube Caramel Twirl.');
  }
  // Keep the controller's eligible IDs restrictive too.
  const eligible = new Set(eligibleProductIds.map(normalizeId));
  if (eligible.size !== 3 || ids.some(id => !eligible.has(id))) {
    throw new Error('Manila Solo Ã¤r inte korrekt konfigurerad.');
  }
  const productMap = new Map(products.filter(product => product?._id)
    .map(product => [normalizeId(product._id), product]));
  const pickupOnly = new Set(pickupOnlyIds.map(normalizeId));
  const fixed = [
    { key: 'mealId', name: 'pancit', group: 'meal' },
    { key: 'dessertId', name: 'golden turon & ube ice cream', group: 'dessert' },
    { key: 'drinkId', name: 'ube caramel twirl', group: 'drink' }
  ];
  const items = fixed.map(({ key, name, group }) => {
    const productId = fixedIds[key];
    const product = productMap.get(productId);
    if (!product || normalize(product.name) !== name) {
      throw new Error(`Manila Solo saknar rÃ¤tt produkt: ${name}.`);
    }
    if (product.available === false || product.isAvailable === false) {
      throw new Error(`${product.name} Ã¤r inte tillgÃ¤nglig.`);
    }
    const category = normalize(product.category);
    const actualGroup = category === 'matratter' ? 'meal' :
      DRINK_CATEGORIES.has(category) ? 'drink' : 'dessert';
    if (actualGroup !== group) {
      throw new Error(`${product.name} tillhÃ¶r fel produktkategori.`);
    }
    if (deliveryMethod === 'delivery' && pickupOnly.has(productId)) {
      throw new Error(`${product.name} erbjuds endast fÃ¶r avhÃ¤mtning.`);
    }
    return { productId, name: String(product.name), group, quantity: 1 };
  });
  return {
    bundleType: MANILA_SOLO_ID, quantity: 1, items,
    priceOre: MANILA_SOLO_PRICE_ORE, currency: 'sek', deliveryMethod
  };
};