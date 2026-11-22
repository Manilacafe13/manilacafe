import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeRegularCart,
  pruneRegularCart,
  getVisibleRegularCartEntries,
  getCartBadgeCount
} from '../src/context/cartIntegrity.js';

const ID_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const ID_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const ID_DELETED = 'cccccccccccccccccccccccc';
const foodList = [
  { _id: ID_A, name: 'Ube Cake', price: 65, image: 'ube.png' },
  { _id: ID_B, name: 'Mango Sago', price: 59, image: 'mango.png' }
];

test('Regression: 2 visible + 3 removed products means badge is 2, not 5', () => {
  const cartItems = { [ID_A]: 1, [ID_B]: 1, [ID_DELETED]: 3 };
  const visible = getVisibleRegularCartEntries(cartItems, foodList);
  const badge = getCartBadgeCount({ cartItems, customizedCartItems: {}, foodList });
  assert.equal(visible.reduce((total, line) => total + line.quantity, 0), 2);
  assert.equal(badge, 2);
  assert.deepEqual(pruneRegularCart(cartItems, foodList), { [ID_A]: 1, [ID_B]: 1 });
});

test('Normalizes malformed quantities and IDs (also protects persisted cart)', () => {
  assert.deepEqual(sanitizeRegularCart({
    [ID_A]: 1.9, [ID_B]: 999, [ID_DELETED]: -3,
    'not-a-product': 12
  }), { [ID_A]: 1, [ID_B]: 99 });
});

test('Price-less and unavailable catalog records cannot appear in badge', () => {
  const visible = getVisibleRegularCartEntries({ [ID_A]: 2, [ID_B]: 3 }, [
    { _id: ID_A, name: 'A', price: 12 },
    { _id: ID_B, name: 'B', price: 'invalid' }
  ]);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].quantity, 2);
});

test('Customized items and Manila Solo use the same quantities as the cart page', () => {
  const optionId = 'dddddddddddddddddddddddd';
  const custom = {
    legacyKey: {
      productId: ID_B,
      quantity: 2,
      removedIngredientIds: [optionId],
      extras: []
    }
  };
  assert.equal(getCartBadgeCount({
    cartItems: { [ID_A]: 1 },
    customizedCartItems: custom,
    foodList,
    manilaSolo: null
  }), 3);
  assert.equal(getCartBadgeCount({
    cartItems: {}, customizedCartItems: {}, foodList,
    manilaSolo: { type: 'manila-solo' }
  }), 1);
});

test('No stale badge when the confirmed catalog is empty', () => {
  assert.equal(getCartBadgeCount({
    cartItems: { [ID_A]: 8 }, customizedCartItems: {}, foodList: []
  }), 0);
});

test('Code regression: checkout verification clears all cart types', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const current = dirname(fileURLToPath(import.meta.url));
  const verify = await readFile(resolve(current, '../src/pages/Verify/Verify.jsx'), 'utf8');
  const store = await readFile(resolve(current, '../src/context/StoreContext.jsx'), 'utf8');
  assert.match(verify, /if \(response\.data\.success\)\s*\{[\s\S]*?clearPurchasedCart\(\)/);
  for (const storageKey of ['CART_STORAGE_KEY','CUSTOMIZED_CART_STORAGE_KEY','MANILA_SOLO_STORAGE_KEY']) {
    assert.match(store, new RegExp(`localStorage\\.removeItem\\(${storageKey}\\)`));
  }
});

test('Code regression: Manila Solo checkout matches server-defined meal', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const current = dirname(fileURLToPath(import.meta.url));
  const checkout = await readFile(resolve(current, '../src/pages/PlaceOrder/PlaceOrder.jsx'), 'utf8');
  const backend = await readFile(resolve(current, '../../backend/utils/manilaSolo.js'), 'utf8');
  assert.match(checkout, /mealId: 'chicken adobo'/);
  assert.match(backend, /\{ key: 'mealId', name: 'chicken adobo'/);
});
