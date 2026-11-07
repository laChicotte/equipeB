import assert from 'node:assert/strict';
const base='https://talentlink.today';
const checks=[];
async function read(path,status=200){const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(r.status,status,path);const text=await r.text();checks.push({path,status:r.status});return {r,text,json:()=>JSON.parse(text)}}
for(const path of ['/','/bibliotheque/','/communaute/','/compte/profil/','/compte/progression/','/compte/ressources/']){const {text}=await read(path);assert.ok(!text.includes('TalentLink-prototype-2026!'));assert.ok(!text.includes('href="/prototype/"'));assert.ok(!text.includes('PROTOTYPE LOCAL'));}
assert.deepEqual((await read('/api/v1/learning/config/')).json(),{enabled:true});
const catalog=await read('/api/v1/learning/resources/');assert.equal(catalog.r.headers.get('cache-control'),'no-store');assert.equal(catalog.r.headers.get('x-content-type-options'),'nosniff');assert.equal(catalog.json().total,0);
for(const action of ['dashboard','profile','feed','queue'])await read('/api/v1/learning/'+action+'/',401);
assert.deepEqual((await read('/api/v1/auth/config/')).json(),{enabled:true,registrationEnabled:false});
assert.equal((await read('/api/v1/play/catalog/')).json().total,3);
await read('/prototype/',404);await read('/api/prototype/',404);
for(const [path,status,origin] of [['/api/v1/auth/register/',403,base],['/api/v1/learning/goal/',401,base],['/api/v1/learning/goal/',403,'https://foreign.invalid']]){const r=await fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}',redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(r.status,status,path);checks.push({path,status:r.status,method:'POST',origin:origin===base?'same-origin':'foreign'});}
const www=await fetch('https://www.talentlink.today/bibliotheque/',{redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(www.status,308);assert.equal(www.headers.get('location'),base+'/bibliotheque/');
const technical=await fetch('https://talentlink-3xa1kie9v-talent-link1.vercel.app/',{redirect:'manual',signal:AbortSignal.timeout(30000)});const authRedirect=technical.headers.get('location');const login=authRedirect?new URL(authRedirect,technical.url):null;assert.ok([401,403].includes(technical.status)||(technical.status===302&&login?.origin==='https://vercel.com'&&login.pathname==='/sso-api'),'Technical deployment protection');
console.log(JSON.stringify({verifiedAt:new Date().toISOString(),checks,originalQuizCount:3,libraryEmpty:true,registrationClosed:true,prototypeAbsent:true,wwwRedirect:308,technicalUrlProtected:true},null,2));
