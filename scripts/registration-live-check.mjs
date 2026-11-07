import assert from 'node:assert/strict';
import {REGISTRATION_RULES_VERSION} from '../src/content/registration.ts';
const base='https://talentlink.today';
const config=await(await fetch(base+'/api/v1/auth/config/',{signal:AbortSignal.timeout(30000)})).json();assert.deepEqual(config,{enabled:true,registrationEnabled:true});
const home=await(await fetch(base+'/',{signal:AbortSignal.timeout(30000)})).text();assert.ok(home.includes('Les inscriptions sont ouvertes'));assert.ok(home.includes('Rejoindre TalentLink'));assert.ok(!home.includes('Lancement découverte · inscriptions fermées'));
const form=await fetch(base+'/auth/inscription/',{signal:AbortSignal.timeout(30000)});assert.equal(form.status,200);
for(const path of ['/conditions/','/inscriptions-adultes/']){const text=await(await fetch(base+path,{signal:AbortSignal.timeout(30000)})).text();assert.ok(text.includes('Les inscriptions sont ouvertes'),path);assert.ok(!text.includes('Les nouvelles inscriptions restent fermées'),path);}
const post=(input,origin=base)=>fetch(base+'/api/v1/auth/register/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(30000)});
// Intentionally invalid payloads stop before account creation and e-mail delivery.
const invalid=await post({registrationRulesVersion:REGISTRATION_RULES_VERSION});assert.equal(invalid.status,400);assert.equal((await invalid.json()).code,'validation_failed');
const stale=await post({registrationRulesVersion:'obsolete'});assert.equal(stale.status,409);
const minor=await post({email:'never-created@example.invalid',password:'Synthetic-test-only-2026!',role:'mentee',adultConfirmed:false,registrationRulesAccepted:true,registrationRulesVersion:REGISTRATION_RULES_VERSION,termsAccepted:true,privacyAccepted:true});assert.equal(minor.status,400);
const foreign=await post({},'https://foreign.invalid');assert.equal(foreign.status,403);
assert.equal((await fetch(base+'/api/prototype/',{signal:AbortSignal.timeout(30000)})).status,404);
console.log(JSON.stringify({verifiedAt:new Date().toISOString(),registrationEnabled:true,registrationPage:200,homeAndTermsConsistent:true,invalidForm:400,oldRules:409,declaredMinor:400,foreignOrigin:403,realAccountCreated:false,emailSent:false}));
