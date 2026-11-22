import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(dir, '../controllers/cartController.js'), 'utf8')
  .replace(/^import\s+.*?;\s*$/gm, '')
  .replace(/export\s*\{[\s\S]*?\};\s*$/, '');
const A='aaaaaaaaaaaaaaaaaaaaaaaa'; const B='bbbbbbbbbbbbbbbbbbbbbbbb';
const U='dddddddddddddddddddddddd';
const clone = x => structuredClone(x);
function fixture(initial = {}) {
 const db = { cartData: clone(initial) };
 const userModel = {
  async findById(id){return id === U ? { cartData: clone(db.cartData) } : null},
  async findOneAndUpdate(filter, patch){
   await Promise.resolve(); // allow concurrent reads before conditional writes
   if(filter._id!==U)return null;
   for(const [key, wanted] of Object.entries(filter)) {
    if (key === '_id') continue;
    const id=key.slice('cartData.'.length);
    const has=Object.prototype.hasOwnProperty.call(db.cartData,id);
    if(wanted && typeof wanted==='object' && wanted.$exists===false){if(has)return null;}
    else if(!has || db.cartData[id]!==wanted)return null;
   }
   if (patch.$set) for(const [key,value] of Object.entries(patch.$set)){
    if(key === 'cartData') db.cartData=clone(value);
    else db.cartData[key.slice('cartData.'.length)]=value;
   }
   if (patch.$unset) for(const key of Object.keys(patch.$unset)) delete db.cartData[key.slice('cartData.'.length)];
   return {cartData: clone(db.cartData)};
  }
 };
 const foodModel = {
  async findById(id){return [A,B].includes(id) ? {_id:id,price:65}:null},
  async find(){return [{_id:{toString:()=>A},price:65},{_id:{toString:()=>B},price:65}]}
 };
 const mongoose={isValidObjectId:id=>/^[a-f0-9]{24}$/i.test(String(id))};
 const sandbox={userModel,foodModel,mongoose,console:{error(){}}};
 const c=vm.runInNewContext(src+'; ({addToCart,removeFromCart,replaceCart,getCart})',sandbox);
 const res=()=>({code:200,body:null,status(n){this.code=n;return this},json(v){this.body=v;return this}});
 const request=(itemId,cartData)=>({userId:U,body:{itemId,cartData}});
 return {db,c,res,request};
}
test('two concurrent adds to same item result in 2',async()=>{
 const f=fixture();const a=f.res(),b=f.res();
 await Promise.all([f.c.addToCart(f.request(A),a),f.c.addToCart(f.request(A),b)]);
 assert.equal(f.db.cartData[A],2);assert.deepEqual([a.code,b.code],[200,200]);
});
test('two concurrent adds to different items persist both',async()=>{
 const f=fixture();const a=f.res(),b=f.res();
 await Promise.all([f.c.addToCart(f.request(A),a),f.c.addToCart(f.request(B),b)]);
 assert.deepEqual(f.db.cartData,{[A]:1,[B]:1});assert.deepEqual([a.code,b.code],[200,200]);
});
test('simultaneous add/remove preserves original quantity',async()=>{
 const f=fixture({[A]:1});const a=f.res(),b=f.res();
 await Promise.all([f.c.addToCart(f.request(A),a),f.c.removeFromCart(f.request(A),b)]);
 assert.equal(f.db.cartData[A],1);assert.deepEqual([a.code,b.code],[200,200]);
});
test('concurrent increment cannot exceed 99',async()=>{
 const f=fixture({[A]:98});const a=f.res(),b=f.res();
 await Promise.all([f.c.addToCart(f.request(A),a),f.c.addToCart(f.request(A),b)]);
 assert.equal(f.db.cartData[A],99); assert.equal([a.code,b.code].filter(x=>x===400).length,1);
});
test('remove last item deletes key instead of leaving zero',async()=>{
 const f=fixture({[A]:1});const r=f.res();await f.c.removeFromCart(f.request(A),r);
 assert.equal(r.code,200); assert.deepEqual(f.db.cartData,{});
});
test('login guest-cart replace overwrites outdated server cart atomically',async()=>{
 const f=fixture({[A]:8});const r=f.res();
 await f.c.replaceCart(f.request(undefined,{[B]:2}),r);
 assert.equal(r.code,200);assert.deepEqual(f.db.cartData,{[B]:2});
});
test('server rejects invalid quantities from login cart',async()=>{
 const f=fixture({[A]:1});const r=f.res();
 await f.c.replaceCart(f.request(undefined,{[B]:1000}),r);
 assert.equal(r.code,400);assert.deepEqual(f.db.cartData,{[A]:1});
});
test('login/logout frontend respects account change and local-cart safeguard',()=>{
 const store=fs.readFileSync(path.resolve(dir,'../../frontend/src/context/StoreContext.jsx'),'utf8');
 const nav=fs.readFileSync(path.resolve(dir,'../../frontend/src/components/Navbar/Navbar.jsx'),'utf8');
 const login=fs.readFileSync(path.resolve(dir,'../../frontend/src/components/LoginPopup/LoginPopup.jsx'),'utf8');
 assert.match(nav,/const logout\s*=\s*\(\)\s*=>\s*\{\s*signOut\(\)/);
 assert.match(login,/await acceptLogin\(response\.data\.token\)/);
 assert.match(store,/localStorage\.removeItem\(CART_PENDING_SYNC_KEY\)/);
 assert.match(store,/localStorage\.getItem\("token"\) !== userToken/);
 assert.match(store,/if \(localStorage\.getItem\(CART_PENDING_SYNC_KEY\) === "1"\)/);
});
