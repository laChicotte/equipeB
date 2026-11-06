import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';
import {request} from '../src/client/request.ts';
test('réseau client : succès HTTP et absence de nouvelle tentative automatique',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async(_input:unknown,init:RequestInit)=>{calls++;assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store');return new Response(JSON.stringify({message:'Déjà traité'}),{status:409})});
 const result=await request('/api/example',{method:'POST',body:'{}'});assert.equal(result.status,409);assert.equal(calls,1);assert.equal((await result.json()).message,'Déjà traité');
});
test('réseau client : délai borné sans rejouer une écriture',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',(_input:unknown,init:RequestInit)=>{calls++;return new Promise((_resolve,reject)=>{init.signal!.addEventListener('abort',()=>reject(init.signal!.reason),{once:true})})});
 const hold=pause(50);await assert.rejects(request('/api/example',{method:'POST',body:'{}'},10),{name:'TimeoutError'});assert.equal(calls,1);await hold;
});
test('réseau client : annulation du composant conservée',async t=>{
 t.mock.method(globalThis,'fetch',(_input:unknown,init:RequestInit)=>new Promise((_resolve,reject)=>{if(init.signal!.aborted)reject(init.signal!.reason);else init.signal!.addEventListener('abort',()=>reject(init.signal!.reason),{once:true})}));const controller=new AbortController();const pending=request('/api/example',{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});
});

test('réseau client : le corps lent reste soumis au délai après réception des en-têtes',async t=>{
 t.mock.method(globalThis,'fetch',async(_input:unknown,init:RequestInit)=>new Response(new ReadableStream({start(controller){init.signal!.addEventListener('abort',()=>controller.error(init.signal!.reason),{once:true})}}),{status:200}));await assert.rejects(request('/api/example',{},10),{name:'TimeoutError'});
});
