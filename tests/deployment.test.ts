import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentReadiness} from '../src/server/deployment-readiness.ts';
import {smtpSettings} from '../src/server/smtp-settings.ts';
import {authConfig,handleAuth} from '../src/server/auth-http.ts';
const production={NODE_ENV:'production',AUTH_ENABLED:'true',AUTH_REGISTRATION_ENABLED:'true',REAL_ACCOUNTS_APPROVED:'true',
  APP_URL:'https://talentlink.example.invalid',AUTH_SECRET:'synthetic-auth-secret-not-for-real-use-2026',DB_DRIVER:'postgres',
  DATABASE_URL:'postgresql://fixture:private-db-password@db.example.neon.tech/fixture?sslmode=require',
  MAIL_DRIVER:'smtp',SMTP_URL:'smtps://fixture:private-smtp-password@smtp.example.invalid',MAIL_FROM:'TalentLink <fixture@example.invalid>'};
test('préversion : comptes fermés sans transférer de secrets',()=>{
  assert.equal(deploymentReadiness({},'preview').ok,true);
  assert.equal(deploymentReadiness({AUTH_ENABLED:'true'},'preview').ok,false);
  assert.equal(deploymentReadiness({AUTH_REGISTRATION_ENABLED:'true'},'preview').ok,false);
  assert.equal(deploymentReadiness({TALENTLINK_KEEP_BUILD_OUTPUT:'true'},'preview').ok,false);
});
test('ouverture réelle : validation humaine, TLS, secrets et SMTP requis',()=>{
  assert.equal(deploymentReadiness(production,'accounts').ok,true);
  for(const overrides of [{REAL_ACCOUNTS_APPROVED:'false'},{AUTH_ENABLED:'false'},{APP_URL:'http://example.invalid'},
    {APP_URL:'https://user:password@example.invalid'},{APP_URL:'https://example.invalid/path'},
    {AUTH_SECRET:'replace-with-a-real-secret-long-enough'},{MAIL_DRIVER:'file'},{SMTP_URL:'http://smtp.example.invalid'},
    {DB_DRIVER:'pglite'},{DATABASE_URL:'postgres://fixture:password@db.example.invalid/test?sslmode=disable'}]){
    assert.equal(deploymentReadiness({...production,...overrides},'accounts').ok,false);
  }
  const output=JSON.stringify(deploymentReadiness(production,'accounts'));
  for(const value of [production.AUTH_SECRET,'private-db-password','private-smtp-password',production.DATABASE_URL,production.SMTP_URL])assert.ok(!output.includes(value));
});
test('SMTP : TLS obligatoire, aucun paramètre de désactivation implicite',()=>{
  const secure=smtpSettings(production,true);assert.equal(secure.options.secure,true);assert.equal(secure.options.requireTLS,true);
  const starttls=smtpSettings({...production,SMTP_URL:'smtp://fixture:password@smtp.example.invalid:587'},true);
  assert.equal(starttls.options.secure,false);assert.equal(starttls.options.requireTLS,true);
  for(const overrides of [{MAIL_FROM:'sender@example.invalid\r\nBcc: other@example.invalid'},
    {SMTP_URL:'smtp://fixture@smtp.example.invalid'},
    {SMTP_URL:'smtps://fixture:password@smtp.example.invalid/?tls.rejectUnauthorized=false'},
    {SMTP_URL:'http://fixture:password@smtp.example.invalid'}])assert.throws(()=>smtpSettings({...production,...overrides},true));
});
test('Resend Marketplace : clé protégée, expéditeur explicite et priorité SMTP',()=>{
  const env={MAIL_DRIVER:'smtp',MAIL_FROM:'TalentLink <notifications@example.invalid>',MESSAGING_RESEND_API_KEY:'fixture:/@?#%secret'};
  const settings=smtpSettings(env,true);
  assert.equal(settings.options.host,'smtp.resend.com');assert.equal(settings.options.port,465);
  assert.equal(settings.options.secure,true);assert.equal(settings.options.requireTLS,true);
  assert.deepEqual(settings.options.auth,{user:'resend',pass:env.MESSAGING_RESEND_API_KEY});
  assert.throws(()=>smtpSettings({...env,MAIL_FROM:''},true));
  assert.throws(()=>smtpSettings({...env,MESSAGING_RESEND_API_KEY:''},true));
  assert.equal(smtpSettings({...env,SMTP_URL:production.SMTP_URL},true).options.host,'smtp.example.invalid');
});
test('production : le serveur refuse l’activation non approuvée et ne divulgue pas sa configuration',async()=>{
  const keys=Object.keys(production);const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try{
    Object.assign(process.env,production,{REAL_ACCOUNTS_APPROVED:'false'});assert.throws(()=>authConfig());
    const request=new Request('https://talentlink.example.invalid/api/v1/auth/config');
    const closed=await handleAuth(request,'config');assert.deepEqual(await closed.json(),{enabled:false,registrationEnabled:false});
    process.env.REAL_ACCOUNTS_APPROVED='true';assert.equal(authConfig().secure,true);
    const ready=await handleAuth(request,'config');assert.deepEqual(await ready.json(),{enabled:true,registrationEnabled:true});
  }finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});
