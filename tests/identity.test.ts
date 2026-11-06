import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { embeddedDatabase } from '../src/server/database.ts';
import { migrate } from '../src/server/migrations.ts';
import { IdentityService } from '../src/modules/identity/service.ts';
import { digestToken } from '../src/modules/identity/crypto.ts';
import { requirePermission } from '../src/modules/identity/access.ts';
import { registerSchema } from '../src/modules/identity/schemas.ts';
import { handleAuth, authConfig } from '../src/server/auth-http.ts';
import type { AuthConfig, AuthDependencies } from '../src/server/auth-http.ts';
import type { Mail } from '../src/server/mail.ts';

const password='TalentLink-test-unique-2026';
const registration=(email:string)=>({email,password,role:'mentee',adultConfirmed:true,termsAccepted:true,privacyAccepted:true});
const tokenFrom=(mail:Mail)=>mail.text.match(/#token=([a-f0-9]{64})/)![1];
test('validation : élévation de rôle, mineurs déclarés et consentements refusés',()=>{
  for(const overrides of [{role:'admin'},{role:'moderator'},{adultConfirmed:false},{termsAccepted:false},{privacyAccepted:false},{role:'mentor'},{email_verified_at:'2026-01-01'}]){
    assert.equal(registerSchema.safeParse({...registration('test@example.invalid'),...overrides}).success,false);
  }
  assert.equal(registerSchema.safeParse({...registration('mentor@example.invalid'),role:'mentor',mentorCharterAccepted:true}).success,true);
});

test('authentification fermée et configuration production invalide : refus par défaut',async()=>{
  const keys=['AUTH_ENABLED','AUTH_SECRET','NODE_ENV','DB_DRIVER','APP_URL','MAIL_DRIVER','SMTP_URL','MAIL_FROM'];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try{
    process.env.AUTH_ENABLED='false';assert.throws(()=>authConfig(),{status:503});
    const response=await handleAuth(new Request('http://127.0.0.1/api/v1/auth/config'),'config');
    assert.deepEqual(await response.json(),{enabled:false,registrationEnabled:false});
    Object.assign(process.env,{AUTH_ENABLED:'true',AUTH_SECRET:'replace-with-a-real-secret-long-enough',NODE_ENV:'production',APP_URL:'https://example.invalid',DB_DRIVER:'pglite',MAIL_DRIVER:'smtp',SMTP_URL:'smtps://example.invalid',MAIL_FROM:'test@example.invalid'});
    assert.throws(()=>authConfig());
    process.env.AUTH_SECRET=randomBytes(32).toString('hex');assert.throws(()=>authConfig());
  }finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});

test('authentification intégrée sur le moteur PostgreSQL embarqué',async t=>{
  const db=await embeddedDatabase();t.after(()=>db.close());
  assert.deepEqual(await migrate(db),['001_foundation.sql','002_authentication.sql','003_mentoring.sql','004_play.sql','005_play_authorship.sql','006_messaging.sql']);
  assert.deepEqual(await migrate(db),[]);
  const sent:Mail[]=[];
  const config:AuthConfig={origin:'http://127.0.0.1:3000',secure:false,registrationEnabled:true,secret:randomBytes(32).toString('hex')};
  const service=new IdentityService(db,{async send(mail){sent.push(mail)}},config.origin,config.secret);
  const deps:AuthDependencies={config:()=>config,service:async()=>service};
  const post=(action:string,data:unknown,headers:Record<string,string>={})=>handleAuth(new Request(`${config.origin}/api/v1/auth/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:config.origin,...headers},body:JSON.stringify(data)}),action,deps);
  const session=(cookie:string)=>handleAuth(new Request(`${config.origin}/api/v1/auth/session`,{headers:{cookie}}),'session',deps);

  await t.test('CSRF, JSON et fermeture des inscriptions',async()=>{
    assert.equal((await post('register',registration('blocked@example.invalid'),{Origin:'https://evil.invalid'})).status,403);
    assert.equal((await post('register',registration('blocked@example.invalid'),{'Sec-Fetch-Site':'cross-site'})).status,403);
    assert.equal((await post('register',registration('blocked@example.invalid'),{'Content-Type':'text/plain'})).status,415);
    assert.equal((await post('register',{padding:'x'.repeat(9000)})).status,413);
    const closed={...deps,config:()=>({...config,registrationEnabled:false})};
    const result=await handleAuth(new Request(config.origin,{method:'POST',headers:{Origin:config.origin}}),'register',closed);
    assert.equal(result.status,403);
    assert.equal((await db.query('SELECT id FROM app_user')).length,0);
  });
  let cookie='';let userId='';
  await t.test('inscription, unicité, hachage et vérification obligatoire',async()=>{
    const response=await post('register',registration('  Alice@Example.Invalid  '));assert.equal(response.status,202);
    const raw=tokenFrom(sent.at(-1)!);
    assert.ok(!(await response.text()).includes(raw));
    const [user]=await db.query<{id:string;password_hash:string;adult_access_approved_at:unknown}>('SELECT * FROM app_user');userId=user.id;
    assert.ok(user.password_hash.startsWith('scrypt$131072$8$1$'));assert.ok(!user.password_hash.includes(password));
    assert.equal(user.adult_access_approved_at,null);
    const [ticket]=await db.query<{token_hash:string}>('SELECT token_hash FROM email_token');
    assert.equal(ticket.token_hash,digestToken(raw));assert.notEqual(ticket.token_hash,raw);
    const duplicate=await post('register',registration('alice@example.invalid'));assert.equal(duplicate.status,202);
    assert.equal(sent.length,1);assert.equal((await db.query('SELECT id FROM app_user')).length,1);
    assert.equal((await post('login',{email:'alice@example.invalid',password})).status,403);
    assert.equal((await post('verify-email',{token:raw})).status,200);
    assert.equal((await post('verify-email',{token:raw})).status,400);
  });
  await t.test('connexion, cookie HttpOnly et isolation des comptes',async()=>{
    const logged=await post('login',{email:'alice@example.invalid',password});assert.equal(logged.status,200);
    const header=logged.headers.get('set-cookie')!;assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Lax/);assert.doesNotMatch(header,/Domain=/);
    cookie=header.split(';')[0];
    const result=await session(cookie);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
    const account=(await result.json()).account;assert.equal(account.id,userId);assert.equal(account.password_hash,undefined);
    const forged=await handleAuth(new Request(config.origin+'/api/v1/auth/session?userId=other',{headers:{cookie}}),'session',deps);
    assert.equal((await forged.json()).account.id,userId);
    assert.equal((await session('tl_session='+'0'.repeat(64))).status,401);
    assert.throws(()=>requirePermission(account,'users:manage'));
    assert.throws(()=>requirePermission({...account,role:'mentor'},'mentoring:start'));
    assert.throws(()=>requirePermission(null,'account:read'));
  });
  await t.test('liens expirés et finalités non interchangeables',async()=>{
    await service.requestEmail({email:'alice@example.invalid'},'reset');const token=tokenFrom(sent.at(-1)!);
    assert.equal((await post('verify-email',{token})).status,400);
    await db.query('UPDATE email_token SET expires_at=now()-interval \'1 minute\' WHERE token_hash=$1',[digestToken(token)]);
    assert.equal((await post('reset-password',{token,password:'Other-safe-password-2026'})).status,400);
  });
  await t.test('reset atomique, usage unique concurrent, révocation de toutes les sessions',async()=>{
    await service.requestEmail({email:'alice@example.invalid'},'reset');const token=tokenFrom(sent.at(-1)!);
    const results=await Promise.all([post('reset-password',{token,password:'New-password-unique-2026'}),post('reset-password',{token,password:'New-password-unique-2026'})]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
    assert.equal((await session(cookie)).status,401);
    assert.equal((await post('login',{email:'alice@example.invalid',password})).status,401);
    const logged=await post('login',{email:'alice@example.invalid',password:'New-password-unique-2026'});assert.equal(logged.status,200);cookie=logged.headers.get('set-cookie')!.split(';')[0];
  });
  await t.test('déconnexion et expiration serveur',async()=>{
    assert.equal((await post('logout',{}, {cookie})).status,200);assert.equal((await session(cookie)).status,401);
    const logged=await post('login',{email:'alice@example.invalid',password:'New-password-unique-2026'});assert.equal(logged.status,200);
    const expired=logged.headers.get('set-cookie')!.split(';')[0];
    await db.query('UPDATE auth_session SET expires_at=now()-interval \'1 second\' WHERE user_id=$1',[userId]);
    assert.equal((await session(expired)).status,401);
  });
  await t.test('réponses neutres et limitation persistante',async()=>{
    const existing=await post('forgot-password',{email:'alice@example.invalid'});
    const absent=await post('forgot-password',{email:'missing@example.invalid'});
    assert.equal(existing.status,absent.status);assert.deepEqual(await existing.json(),await absent.json());
    for(let index=0;index<5;index++)await service.rate('test-limit','subject');
    await assert.rejects(service.rate('test-limit','subject'),{status:429});
    const [row]=await db.query<{bucket:string}>('SELECT bucket FROM auth_rate_limit LIMIT 1');assert.match(row.bucket,/^[a-f0-9]{64}$/);
  });
  await t.test('HTTPS : cookie préfixé et Secure',async()=>{
    const secureConfig={...config,origin:'https://talentlink.example.invalid',secure:true};
    const secureDeps={...deps,config:()=>secureConfig};
    await service.register(registration('secure@example.invalid'));await service.consume({token:tokenFrom(sent.at(-1)!)},'verify');
    const response=await handleAuth(new Request(secureConfig.origin,{method:'POST',headers:{Origin:secureConfig.origin,'Content-Type':'application/json'},body:JSON.stringify({email:'secure@example.invalid',password})}),'login',secureDeps);
    assert.equal(response.status,200);assert.match(response.headers.get('set-cookie')!,/^__Host-tl_session=/);assert.match(response.headers.get('set-cookie')!,/; Secure/);
    const firstCookie=response.headers.get('set-cookie')!.split(';')[0];
    const own=await handleAuth(new Request(secureConfig.origin,{headers:{cookie:firstCookie}}),'session',secureDeps);
    const secondAccount=(await own.json()).account;assert.notEqual(secondAccount.id,userId);assert.equal(secondAccount.email,'secure@example.invalid');
    await db.query('UPDATE app_user SET disabled_at=now() WHERE id=$1',[secondAccount.id]);
    const disabled=await handleAuth(new Request(secureConfig.origin,{headers:{cookie:firstCookie}}),'session',secureDeps);assert.equal(disabled.status,401);
  });
  await t.test('inscriptions concurrentes : un seul compte et un seul e-mail',async()=>{
    const email='concurrent@example.invalid';
    const responses=await Promise.all([post('register',registration(email)),post('register',registration(email))]);
    assert.deepEqual(responses.map(r=>r.status),[202,202]);
    assert.equal((await db.query('SELECT id FROM app_user WHERE email=$1',[email])).length,1);
    assert.equal(sent.filter(mail=>mail.to===email).length,1);
  });
  await t.test('échec SMTP : réponse neutre, compte non vérifié et renvoi possible',async()=>{
    const failing=new IdentityService(db,{async send(){throw new Error('synthetic mail failure')}},config.origin,config.secret);
    const oldError=console.error;const events:unknown[][]=[];console.error=(...args:unknown[])=>{events.push(args)};
    try{
      const response=await handleAuth(new Request(config.origin,{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json'},body:JSON.stringify(registration('mail-test@example.invalid'))}),'register',{...deps,service:async()=>failing});
      assert.equal(response.status,202);assert.ok(!(await response.text()).includes('mail-test@example.invalid'));
      assert.deepEqual(events,[['talentlink_mail_delivery_failed']]);
    }finally{console.error=oldError}
    const [row]=await db.query<{email_verified_at:unknown}>('SELECT email_verified_at FROM app_user WHERE email=$1',['mail-test@example.invalid']);assert.equal(row.email_verified_at,null);
    await service.requestEmail({email:'mail-test@example.invalid'},'verify');
    await service.consume({token:tokenFrom(sent.at(-1)!)},'verify');
    assert.ok(await service.login({email:'mail-test@example.invalid',password}));
  });
});
