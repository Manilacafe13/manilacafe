// Isolated tests of actual stock and payment helpers. No live DB or Stripe.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../controllers/orderController.js', import.meta.url), 'utf8');
const food = fs.readFileSync(new URL('../controllers/foodControllers.js', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const model = fs.readFileSync(new URL('../models/orderModel.js', import.meta.url), 'utf8');
const a = src.indexOf('const groupStockByProduct = (items) => {');
const b = src.indexOf('// ======================================================\n// DELIVERY ZONES',a);
const c = src.indexOf('const getPaymentIntentId = (stripeSession) => {',b);
const d = src.indexOf('const sendOrderConfirmationSafely = async (',c);
assert.ok(a >= 0 && b > a && c > b && d > c);
const functions = src.slice(a,b) + '\n' + src.slice(c,d) + '\n({reserveOrderStock,releaseOrderStock,processPaidCheckoutSession})';
const A='aaaaaaaaaaaaaaaaaaaaaaaa', B='bbbbbbbbbbbbbbbbbbbbbbbb', O='cccccccccccccccccccccccc';
const U='dddddddddddddddddddddddd';
const clone=(x)=>structuredClone(x);

function setup({stockA=5,stockB=4,epoch=0,quantity=2,status='none',items=null}={}) {
 const state={
  products:{[A]:{_id:A,sameDayStock:stockA,inventoryEpoch:epoch},[B]:{_id:B,sameDayStock:stockB,inventoryEpoch:0}},
  order:{_id:O,items: items ?? [{_id:A,name:'Ube cake',quantity}],fulfillmentType:'same-day',payment:false,status:'Inväntar betalning',stockReservationStatus:status,stockReservationLines:[],discountReservationStatus:'none',amount:100,stripeSessionId:'cs_test_ok',userId:U},
  userCart:{[A]:2}
 };
 let transactions=Promise.resolve();
 const mkmockOrder=()=>{
  const doc=clone(state.order);
  doc.toObject=()=>clone(state.order);
  doc.save=async()=>{state.order=clone(Object.fromEntries(Object.entries(doc).filter(([key])=>!['save','toObject'].includes(key))));};
  return doc;
 };
 const transaction=async fn=>{
   let unlock;
   const prev=transactions;
   transactions = new Promise(resolve=>{unlock=resolve});
   await prev;
   const original=clone(state);
   try {return await fn()} catch (error){Object.assign(state,original);throw error} finally{unlock()}
 };
 const mongoose={
  isValidObjectId: id => /^[0-9a-f]{24}$/i.test(String(id)),
  startSession:async()=>({withTransaction:transaction,endSession:async()=>{}})
 };
 const foodModel={
  findById:id=>({session:async()=>clone(state.products[String(id)]||null)}),
  updateOne:async (where, updates)=>{
   const doc=state.products[String(where._id)];
   if (!doc) return {modifiedCount:0};
   if (where.sameDayStock?.$gte!==undefined && doc.sameDayStock<where.sameDayStock.$gte)return {modifiedCount:0};
   const epochCondition=where.inventoryEpoch??where.$or?.[0]?.inventoryEpoch;
   if (epochCondition!==undefined && epochCondition!==doc.inventoryEpoch)return {modifiedCount:0};
   doc.sameDayStock+=updates.$inc.sameDayStock;
   return {modifiedCount:1};
  }
 };
 const orderModel={findById:id=>({session:async()=>id===O?mkmockOrder():null})};
 const userModel={findByIdAndUpdate:async()=>{state.userCart={}}};
 const env={STRIPE_WEBHOOK_SECRET:'test'};
 const sandbox={mongoose,foodModel,orderModel,userModel,redeemDiscount:async()=>true,releaseDiscount:async()=>true,
   Date,Number,Math,String,Set,Map,Error,Object,Array,console:{warn(){},log(){},error(){}},process:{env}};
 const api=vm.runInNewContext(functions,sandbox,{timeout:1000});
 const stripeSession={id:'cs_test_ok',payment_status:'paid',metadata:{orderId:O},amount_total:10000,currency:'sek'};
 return {state,api,stripeSession};
}

const plain=x=>JSON.parse(JSON.stringify(x));
test('stock reservation occurs before payment and reduces visible balance',async()=>{
 const f=setup();
 const doc=plain(f.state.order);
 await f.api.reserveOrderStock(doc,{});
 assert.equal(f.state.products[A].sameDayStock,3);
 assert.equal(doc.stockReservationStatus,'reserved');
 assert.equal(doc.stockReservationLines[0].inventoryEpoch,0);
 assert.equal(doc.stockReservationLines[0].quantity,2);
});
test('customized and normal versions reserve cumulative quantities',async()=>{
 const f=setup({stockA:6,items:[{_id:A,name:'cake',quantity:2},{_id:A,name:'cake',quantity:3}]});
 const doc=plain(f.state.order);
 await f.api.reserveOrderStock(doc,{});
 assert.equal(f.state.products[A].sameDayStock,1);
 assert.equal(doc.stockReservationLines.length,1);
});
test('insufficient stock rejects checkout before payment',async()=>{
 const f=setup({stockA:1});
 await assert.rejects(f.api.reserveOrderStock(plain(f.state.order),{}),/SAME_DAY_STOCK/);
 assert.equal(f.state.products[A].sameDayStock,1);
});
test('reserved paid order consumes hold without another stock deduction',async()=>{
 const f=setup({stockA:3,status:'reserved'});
 f.state.order.stockReservationLines=[{productId:A,quantity:2,inventoryEpoch:0}];
 const out=await f.api.processPaidCheckoutSession(f.stripeSession);
 assert.equal(out.warning,null);
 assert.equal(f.state.products[A].sameDayStock,3);
 assert.equal(f.state.order.stockReservationStatus,'consumed');
 assert.equal(f.state.order.payment,true);
});
test('replaying paid callback never deducts again',async()=>{
 const f=setup({stockA:3,status:'reserved'});
 f.state.order.stockReservationLines=[{productId:A,quantity:2,inventoryEpoch:0}];
 await f.api.processPaidCheckoutSession(f.stripeSession);
 const replay=await f.api.processPaidCheckoutSession(f.stripeSession);
 assert.equal(replay.alreadyProcessed,true);
 assert.equal(f.state.products[A].sameDayStock,3);
});
test('expired session restores reserved stock once',async()=>{
 const f=setup({stockA:3,status:'reserved'});
 f.state.order.stockReservationLines=[{productId:A,quantity:2,inventoryEpoch:0}];
 await f.api.releaseOrderStock(O,'cs_test_ok');
 await f.api.releaseOrderStock(O,'cs_test_ok');
 assert.equal(f.state.products[A].sameDayStock,5);
 assert.equal(f.state.order.stockReservationStatus,'released');
});
test('wrong session id cannot release reservation',async()=>{
 const f=setup({stockA:3,status:'reserved'});
 f.state.order.stockReservationLines=[{productId:A,quantity:2,inventoryEpoch:0}];
 await f.api.releaseOrderStock(O,'cs_wrong');
 assert.equal(f.state.products[A].sameDayStock,3);
 assert.equal(f.state.order.stockReservationStatus,'reserved');
});
test('paid orders cannot restore stock',async()=>{
 const f=setup({stockA:3,status:'reserved'});
 f.state.order.stockReservationLines=[{productId:A,quantity:2,inventoryEpoch:0}];
 f.state.order.payment=true;
 await f.api.releaseOrderStock(O,'cs_test_ok');
 assert.equal(f.state.products[A].sameDayStock,3);
});
test('inventory reset does not refill stock from an earlier hold',async()=>{
 const f=setup({stockA:1,epoch:1,status:'reserved'});
 f.state.order.stockReservationLines=[{productId:A,quantity:2,inventoryEpoch:0}];
 await f.api.releaseOrderStock(O,'cs_test_ok');
 assert.equal(f.state.products[A].sameDayStock,1);
 assert.equal(f.state.order.stockReservationStatus,'released');
});
test('legacy order still deducts stock exactly once after payment',async()=>{
 const f=setup();
 await f.api.processPaidCheckoutSession(f.stripeSession);
 assert.equal(f.state.products[A].sameDayStock,3);
});
test('a released order cannot later be marked paid silently',async()=>{
 const f=setup({status:'released'});
 await assert.rejects(f.api.processPaidCheckoutSession(f.stripeSession),/STOCK_RESERVATION_EXPIRED/);
 assert.equal(f.state.order.payment,false);
});
test('integration hooks include atomic reserve, expiry release, recovery and manual stock epochs',()=>{
 assert.match(src,/await reserveOrderStock\(newOrder, reservationSession\)/);
 assert.match(src,/await releaseOrderStock\(orderId, stripeSession\.id\)/);
 assert.match(src,/checkout\.session\.async_payment_failed/);
 assert.match(src,/const reconcileExpiredStockHolds = async \(\) =>/);
 assert.match(server,/reconcileExpiredStockHolds\(\)/);
 assert.match(food,/\$inc: \{ inventoryEpoch: 1 \}/);
 assert.match(model,/stockReservationStatus: \{/);
});
