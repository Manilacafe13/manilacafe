// Isolated contract checks of actual orderController logic. No network/DB/API calls.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=process.env.MANILA_TEST_ROOT || path.resolve(here, '../..');
const source=await readFile(path.join(root,'backend/controllers/orderController.js'),'utf8');
const groupStart=source.indexOf('const groupStockByProduct = (items) => {');
const groupEnd=source.indexOf('// ======================================================',groupStart);
const paidStart=source.indexOf('const getPaymentIntentId = (stripeSession) => {');
const paidEnd=source.indexOf('const sendOrderConfirmationSafely = async (',paidStart);
assert.ok(groupStart>0 && groupEnd>groupStart && paidStart>0 && paidEnd>paidStart,'Payment functions exist');
const verificationStart=source.indexOf('const verifyOrder = async (req, res) => {',paidEnd);
const afterWebhook=source.indexOf('const userOrders = async (req, res) => {',verificationStart);
assert.ok(verificationStart>paidEnd && afterWebhook>verificationStart,'Verify and webhook endpoints exist');
const actualLogic=source.slice(groupStart,groupEnd)+'\n'+source.slice(paidStart,paidEnd)+'\n'+source.slice(verificationStart,afterWebhook)+'\n({groupStockByProduct,validatePaidStripeSession,processPaidCheckoutSession,verifyOrder,stripeWebhook})';
const ID_A='aaaaaaaaaaaaaaaaaaaaaaaa', ID_B='bbbbbbbbbbbbbbbbbbbbbbbb';
const ORD='cccccccccccccccccccccccc';
const OTHER='dddddddddddddddddddddddd';
const copy=x=>structuredClone(x);

function fixture({stock=10,quantity=2, userId='eeeeeeeeeeeeeeeeeeeeeeee', orderId=ORD, amount=130,items=null}={}) {
  const state={
    orders:{[orderId]:{_id:orderId, amount, stripeSessionId:'cs_test_confirmed',payment:false,fulfillmentType:'same-day',userId,items:items||[{_id:ID_A,name:'Ube Cake',quantity}], discountReservationStatus:'none',status:'Inväntar betalning'}},
    stock:{[ID_A]:{_id:ID_A,sameDayStock:stock},[ID_B]:{_id:ID_B,sameDayStock:5}},
    users:{[userId]:{cartData:{[ID_A]:quantity}}},
    discountRedemptions:0
  };
  const makeOrder=id=>{
    const record=state.orders[id];
    if(!record)return null;
    const m=copy(record);
    m.toObject=()=>copy(state.orders[id]);
    m.save=async ()=>{state.orders[id]=JSON.parse(JSON.stringify(m, (k,v)=>k==='toObject'||k==='save'?undefined:v));return m};
    return m;
  };
  const mongoose={
    isValidObjectId:x=>/^[0-9a-f]{24}$/i.test(String(x)),
    startSession:async()=>({
      withTransaction: async fn=>{
        const before=copy(state);
        try{return await fn()}catch(e){Object.assign(state,before);throw e}
      }, endSession:async()=>{}
    })
  };
  const orderModel={findById:id=>({session:async()=>makeOrder(id)})};
  const foodModel={
    findById:id=>({session:async()=> state.stock[String(id)]?copy(state.stock[String(id)]):null}),
    updateOne:async(query,update)=>{
      const id=String(query._id); const r=state.stock[id];
      if(!r || r.sameDayStock<query.sameDayStock.$gte)return {modifiedCount:0};
      r.sameDayStock+=update.$inc.sameDayStock;
      return {modifiedCount:1};
    }
  };
  const userModel={findByIdAndUpdate:async(id,update)=>{
    if(state.users[id])state.users[id].cartData=copy(update.cartData);
  }};
  const stripe={checkout:{sessions:{retrieve:async()=>stripeSession}},webhooks:{constructEvent:(raw,signature)=>{if(signature!=='sig_test_ok')throw new Error('Bad test signature'); return raw}}};
  const sandbox={mongoose,foodModel,orderModel,userModel,
    redeemDiscount:async()=>{state.discountRedemptions++;return true},
    releaseDiscount:async()=>true,getStripe:()=>stripe,sendOrderConfirmationSafely:async()=>{},process:{env:{STRIPE_WEBHOOK_SECRET:'test_only'}},console:{log(){},error(){}}, Date,Number,String,Map,Math,Error,Object,Array,Set,
  };
  const handlers=vm.runInNewContext(actualLogic,sandbox,{timeout:1000});
  const stripeSession={id:'cs_test_confirmed',metadata:{orderId}, payment_status:'paid',amount_total:amount*100,currency:'sek', payment_intent:'pi_test_ok'};
  return {state,handlers,stripeSession};
}

// This is an isolated mock of Mongo and Stripe, NOT a real integration test.
test('Paid order deducts stock and clears server-side user cart',async()=>{
 const f=fixture();
 const r=await f.handlers.processPaidCheckoutSession(f.stripeSession);
 assert.equal(f.state.stock[ID_A].sameDayStock,8);
 assert.equal(f.state.orders[ORD].payment,true);
 assert.equal(f.state.orders[ORD].status,'Betalning mottagen');
 assert.deepEqual(f.state.users['eeeeeeeeeeeeeeeeeeeeeeee'].cartData,{});
 assert.equal(r.alreadyProcessed,false);
});
test('Repeated payment callback is idempotent for stock',async()=>{
 const f=fixture(); await f.handlers.processPaidCheckoutSession(f.stripeSession);
 const second=await f.handlers.processPaidCheckoutSession(f.stripeSession);
 assert.equal(second.alreadyProcessed,true);
 assert.equal(f.state.stock[ID_A].sameDayStock,8);
});
test('Rejects Stripe session with incorrect metadata/order ID',async()=>{
 const f=fixture();
 await assert.rejects(f.handlers.processPaidCheckoutSession({...f.stripeSession,metadata:{orderId:OTHER}}),/ORDER_NOT_FOUND/);
 assert.equal(f.state.stock[ID_A].sameDayStock,10);
});
test('Rejects wrong Stripe session for same order',async()=>{
 const f=fixture();
 await assert.rejects(f.handlers.processPaidCheckoutSession({...f.stripeSession,id:'cs_other'}),/STRIPE_SESSION_MISMATCH/);
 assert.equal(f.state.stock[ID_A].sameDayStock,10);
});
test('Rejects not-paid, incorrect amount, or incorrect currency',async()=>{
 for (const patch of [{payment_status:'unpaid'},{amount_total:1},{currency:'usd'}]) {
  const f=fixture();
  await assert.rejects(f.handlers.processPaidCheckoutSession({...f.stripeSession,...patch}));
  assert.equal(f.state.stock[ID_A].sameDayStock,10);
  assert.equal(f.state.orders[ORD].payment,false);
 }
});
test('Mixed variants of same product are counted together',async()=>{
 const f=fixture({stock:5,items:[{_id:ID_A,name:'Ube Cake',quantity:2},{_id:ID_A,name:'Ube Cake',quantity:3}]});
 const r=await f.handlers.processPaidCheckoutSession(f.stripeSession);
 assert.equal(r.warning,null);
 assert.equal(f.state.stock[ID_A].sameDayStock,0);
});
test('Insufficient stock after payment produces PAID order with stock-warning; no negative stock',async()=>{
 const f=fixture({stock:1,quantity:2});
 const r=await f.handlers.processPaidCheckoutSession(f.stripeSession);
 assert.match(r.warning,/tillräckligt dagslager/);
 assert.equal(f.state.orders[ORD].payment,true);
 assert.equal(f.state.orders[ORD].status,'Betalning mottagen - lagerkontroll krävs');
 assert.equal(f.state.stock[ID_A].sameDayStock,1);
});
test('Payment for guest order succeeds without server user cart',async()=>{
 const f=fixture({userId:null});
 const r=await f.handlers.processPaidCheckoutSession(f.stripeSession);
 assert.equal(r.warning,null);
 assert.equal(f.state.stock[ID_A].sameDayStock,8);
});

const response=()=>({code:200,body:null,status(code){this.code=code;return this},json(body){this.body=body;return this},send(body){this.body=body;return this}});
test('Verify endpoint rejects a cancelled checkout without clearing stock',async()=>{
 const f=fixture();const res=response();
 await f.handlers.verifyOrder({body:{success:'false',orderId:ORD}},res);
 assert.equal(res.code,200); assert.equal(res.body.success,false);
 assert.equal(f.state.stock[ID_A].sameDayStock,10);
});
test('Verify endpoint marks paid session once and returns success',async()=>{
 const f=fixture();const res=response();
 await f.handlers.verifyOrder({body:{success:'true',orderId:ORD,sessionId:f.stripeSession.id}},res);
 assert.equal(res.code,200);assert.equal(res.body.success,true);
 assert.equal(f.state.orders[ORD].payment,true);
 assert.equal(f.state.stock[ID_A].sameDayStock,8);
});
test('Verify endpoint fails safely when Stripe is not paid',async()=>{
 const f=fixture();f.stripeSession.payment_status='unpaid';const res=response();
 await f.handlers.verifyOrder({body:{success:'true',orderId:ORD,sessionId:f.stripeSession.id}},res);
 assert.equal(res.code,400);assert.equal(res.body.success,false);
 assert.equal(f.state.stock[ID_A].sameDayStock,10);
});
test('Verify endpoint fails safely when Stripe session references wrong order',async()=>{
 const f=fixture();f.stripeSession.metadata.orderId=OTHER;const res=response();
 await f.handlers.verifyOrder({body:{success:'true',orderId:ORD,sessionId:f.stripeSession.id}},res);
 assert.equal(res.code,400);assert.equal(res.body.success,false);
 assert.equal(f.state.stock[ID_A].sameDayStock,10);
});
test('Webhook rejects invalid test signature (mock signature check only)',async()=>{
 const f=fixture(); const res=response();
 await f.handlers.stripeWebhook({headers:{'stripe-signature':'bad'},body:{type:'checkout.session.completed',data:{object:f.stripeSession}}},res);
 assert.equal(res.code,400);
 assert.equal(f.state.stock[ID_A].sameDayStock,10);
});
test('Webhook replay does not double-deduct confirmed order',async()=>{
 const f=fixture();
 const event={id:'evt_test',type:'checkout.session.completed',data:{object:f.stripeSession}};
 let res=response();await f.handlers.stripeWebhook({headers:{'stripe-signature':'sig_test_ok'},body:event},res);
 assert.equal(res.code,200); assert.equal(f.state.stock[ID_A].sameDayStock,8);
 res=response();await f.handlers.stripeWebhook({headers:{'stripe-signature':'sig_test_ok'},body:event},res);
 assert.equal(res.code,200); assert.equal(f.state.stock[ID_A].sameDayStock,8);
});
