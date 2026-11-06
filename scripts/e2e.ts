import {spawn} from 'node:child_process';
import type {ChildProcess} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';
import {once} from 'node:events';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {importEditorialPack} from '../src/modules/play/editorial.ts';
import {seedPlayFixture} from '../tests/fixtures/play.ts';
import {seedAttestationFixture} from '../tests/fixtures/attestations.ts';
import {seedMessagingFixture} from '../tests/fixtures/messaging.ts';
import {hashPassword} from '../src/modules/identity/crypto.ts';

const fetchWithinDeadline:typeof fetch=(input,init)=>fetch(input,{...init,signal:init?.signal??AbortSignal.timeout(30_000)});
const runId=randomUUID();
const email=`e2e-${runId}@example.invalid`;
const password='TalentLink-http-test-2026';
const base='http://127.0.0.1:4387';
const directory=path.join('.local',`e2e-${runId}`);
let server:ChildProcess|undefined;
let stage='initialisation';
let playGameId='';
let messagingProgramId='';
let attestationProgramId='';
const errors:string[]=[];
let serverOutput='';
async function stop(){
 if(!server?.pid||server.exitCode!==null)return;
 const exited=once(server,'exit').then(()=>true);
 if(server.connected)server.send('shutdown');else server.kill('SIGTERM');
 const stopped=await Promise.race([exited,pause(10_000).then(()=>false)]);
 if(!stopped){server.kill();throw new Error('Test server did not stop')}
}
async function post(action:string,input:unknown,cookie='',origin=base){
 return fetchWithinDeadline(`${base}/api/v1/auth/${action}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(input),signal:AbortSignal.timeout(30_000)});
}
async function current(cookie:string){return fetchWithinDeadline(`${base}/api/v1/auth/session`,{headers:{cookie},signal:AbortSignal.timeout(30_000)})}
async function mailToken(subject:string,recipient=email){
 const files=await readdir('.local/mail');
 for(const file of files){if(!file.endsWith('.json'))continue;const message=JSON.parse(await readFile(path.join('.local/mail',file),'utf8'));if(message.to===recipient&&message.subject.includes(subject)){const token=message.text.match(/#token=([a-f0-9]{64})/);if(token)return token[1] as string}}
 throw new Error('Synthetic mail not found');
}
try{
 try{await fetchWithinDeadline(base,{signal:AbortSignal.timeout(500)});throw new Error('Test port already in use')}catch(error){if(error instanceof Error&&error.message==='Test port already in use')throw error}
 await mkdir('.local',{recursive:true});
 stage='base de test';console.log('E2E : base isolée');const db=await embeddedDatabase(directory);try{await migrate(db);playGameId=(await seedPlayFixture(db)).gameId;const messagingFixture=await seedMessagingFixture(db,await hashPassword(password));messagingProgramId=messagingFixture.programId;await importEditorialPack(db,messagingFixture.admin,JSON.parse(await readFile('editorial/launch-quizzes.v1.json','utf8')));attestationProgramId=(await seedAttestationFixture(db,await hashPassword(password))).programId}finally{await db.close()}
 stage='serveur Next.js';console.log('E2E : démarrage Next.js');
 server=spawn(process.execPath,['scripts/e2e-server.ts'],{
  windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,DB_DRIVER:'pglite',PGLITE_PATH:directory,
    AUTH_ENABLED:'true',AUTH_REGISTRATION_ENABLED:'true',AUTH_SECRET:randomBytes(32).toString('hex'),APP_URL:base,MAIL_DRIVER:'file',PLAY_ENABLED:'true',MENTORING_ENABLED:'true',MESSAGING_ENABLED:'true',PLANNING_ENABLED:'true',ATTESTATIONS_ENABLED:'true',ATTESTATIONS_APPROVED:'false',PRIVATE_COMMUNICATIONS_APPROVED:'false',NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'},
 });
 server.stderr?.on('data',chunk=>{serverOutput=(serverOutput+String(chunk)).slice(-4000);if(String(chunk).includes('talentlink_auth_error'))errors.push('auth_error')});
 server.stdout?.on('data',chunk=>{serverOutput=(serverOutput+String(chunk)).slice(-4000)});
 const deadline=Date.now()+120_000;
 let ready=false;
 while(Date.now()<deadline){if(server.exitCode!==null)throw new Error('Test server exited before readiness');try{const response=await fetchWithinDeadline(`${base}/api/v1/auth/config`,{signal:AbortSignal.timeout(3000)});if(response.ok&&(await response.json()).enabled){ready=true;break}}catch{}await pause(300)}
 if(!ready)console.error(serverOutput);
 assert.ok(ready,'Next.js API did not become ready');
 stage='parcours HTTP';console.log('E2E : parcours HTTP');
 const health=await fetchWithinDeadline(`${base}/api/health/`);assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:'ok'});assert.equal(health.headers.get('cache-control'),'no-store');
 const playPost=(action:string,data:unknown,cookie='',origin=base)=>fetchWithinDeadline(`${base}/api/v1/play/${action}/`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 const catalog=await fetchWithinDeadline(`${base}/api/v1/play/catalog/`);assert.equal(catalog.status,200);const catalogBody=await catalog.json();assert.equal(catalogBody.total,1);assert.ok(!JSON.stringify(catalogBody).includes('correct_index'));
 assert.equal((await playPost('start',{gameId:playGameId},'','https://evil.invalid')).status,403);
 const started=await playPost('start',{gameId:playGameId});assert.equal(started.status,201);assert.match(started.headers.get('set-cookie')!,/HttpOnly/);
 const playCookie=started.headers.get('set-cookie')!.split(';')[0],attemptId=(await started.json()).id;
 const initial=await fetchWithinDeadline(`${base}/api/v1/play/state/?id=${attemptId}`,{headers:{cookie:playCookie}});const initialBody=await initial.json();assert.equal(initialBody.question.options.length,3);assert.ok(!JSON.stringify(initialBody).includes('correctIndex'));
 assert.equal((await fetchWithinDeadline(`${base}/api/v1/play/state/?id=${attemptId}`)).status,404);
 for(let index=0;index<3;index++){const response=await playPost('answer',{attemptId,index,choice:index},playCookie);assert.equal(response.status,200);const feedback=await response.json();assert.equal(feedback.points,10);assert.ok(feedback.explanation)}
 assert.equal((await playPost('answer',{attemptId,index:0,choice:0,points:999},playCookie)).status,400);
 assert.equal((await playPost('answer',{attemptId,index:0,choice:0},playCookie)).status,200);
 const completed=await(await fetchWithinDeadline(`${base}/api/v1/play/state/?id=${attemptId}`,{headers:{cookie:playCookie}})).json();assert.equal(completed.score,30);assert.equal(completed.completed,true);assert.equal(completed.percentage,100);
 assert.equal((await fetchWithinDeadline(`${base}/play/`)).status,200);assert.equal((await fetchWithinDeadline(`${base}/play/${playGameId}/`)).status,200);
 const loginMessaging=async(email:string)=>{const r=await post('login',{email,password});assert.equal(r.status,200);return r.headers.get('set-cookie')!.split(';')[0]};
 const messagingMentor=await loginMessaging('mentor-messaging@example.invalid'),messagingMentee=await loginMessaging('mentee-messaging@example.invalid'),messagingModerator=await loginMessaging('moderation-messaging@example.invalid'),messagingOther=await loginMessaging('other-messaging@example.invalid');
 const adminSession=await loginMessaging('admin-messaging@example.invalid');
 const adminGet=(action:string,cookie=adminSession)=>fetchWithinDeadline(`${base}/api/v1/administration/${action}/`,{headers:{cookie}});
 const overview=await adminGet('overview');assert.equal(overview.status,200);assert.equal(overview.headers.get('cache-control'),'no-store');assert.ok((await overview.json()).counts.active_accounts>=5);
 assert.equal((await adminGet('overview',messagingMentor)).status,403);assert.equal((await adminGet('audit',messagingModerator)).status,403);
 assert.equal((await fetchWithinDeadline(`${base}/api/v1/administration/overview/`)).status,401);
 const audit=await adminGet('audit');assert.equal(audit.status,200);assert.ok(Array.isArray((await audit.json()).items));
 assert.equal((await fetchWithinDeadline(`${base}/administration/`)).status,200);
 const editorialResponse=await fetchWithinDeadline(`${base}/api/v1/play/questions/`,{headers:{cookie:adminSession}});assert.equal(editorialResponse.status,200);const editorial=(await editorialResponse.json()).items.filter((q:{editorial_batch_id?:string})=>q.editorial_batch_id);assert.equal(editorial.length,12);assert.ok(editorial.every((q:{author_id:unknown;created_by:unknown;status:string})=>q.author_id===null&&q.created_by===null&&q.status==='submitted'));
 const humanReview=await fetchWithinDeadline(`${base}/api/v1/play/review-question/`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',cookie:adminSession},body:JSON.stringify({id:editorial[0].id,decision:'approved',note:'Relecture humaine simulée uniquement dans la base HTTP isolée.'})});assert.equal(humanReview.status,200);
 const attestationAdmin=await loginMessaging('admin-attestations@example.invalid'),attestationRecipient=await loginMessaging('mentee-attestations@example.invalid');
 const attPost=(action:string,data:unknown,cookie=attestationAdmin)=>fetchWithinDeadline(`${base}/api/v1/attestations/${action}/`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 const attGet=(action:string,cookie=attestationRecipient)=>fetchWithinDeadline(`${base}/api/v1/attestations/${action}`,{headers:{cookie}});
 const issue=await attPost('issue',{programId:attestationProgramId});assert.equal(issue.status,201);const issued=await issue.json();
 assert.equal((await attGet('detail/?id='+issued.id,messagingOther)).status,404);
 const cert=await(await attGet('detail/?id='+issued.id)).json();assert.equal(cert.attestation.completed_sessions,1);assert.equal(cert.attestation.revoked_at,null);
 assert.equal((await attPost('revoke',{id:issued.id,revision:1,reason:'Révocation fictive du parcours HTTP.'})).status,200);
 const revoked=await(await attGet('detail/?id='+issued.id)).json();assert.ok(revoked.attestation.revoked_at);
 for(const page of ['compte/attestations','administration/attestations'])assert.equal((await fetchWithinDeadline(`${base}/${page}/`)).status,200);
 const messagePost=(action:string,data:unknown,cookie:string,origin=base)=>fetchWithinDeadline(`${base}/api/v1/messaging/${action}/`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 const messageGet=(action:string,cookie:string)=>fetchWithinDeadline(`${base}/api/v1/messaging/${action}`,{headers:{cookie}});
 const messageInput={programId:messagingProgramId,clientId:randomUUID(),body:'Bonjour, ceci est un échange synthétique de test HTTP.'};
 assert.equal((await messagePost('send',messageInput,messagingMentor,'https://evil.invalid')).status,403);
 const sentMessage=await messagePost('send',messageInput,messagingMentor);assert.equal(sentMessage.status,201);const sentBody=await sentMessage.json();
 assert.equal((await(await messagePost('send',messageInput,messagingMentor)).json()).id,sentBody.id);
 assert.equal((await messageGet('messages/?programId='+messagingProgramId,messagingOther)).status,404);
 const thread=await messageGet('messages/?programId='+messagingProgramId,messagingMentee);assert.equal(thread.status,200);assert.equal((await thread.json()).items.length,1);
 const unread=await(await messageGet('conversations/',messagingMentee)).json();assert.equal(unread.items[0].unread,1);
 assert.equal((await messagePost('read',{programId:messagingProgramId,messageId:sentBody.id},messagingMentee)).status,200);
 assert.equal((await messagePost('block',{programId:messagingProgramId,blocked:true},messagingMentee)).status,200);
 assert.equal((await messagePost('send',{...messageInput,clientId:randomUUID()},messagingMentor)).status,403);
 assert.equal((await messagePost('report',{programId:messagingProgramId,messageId:sentBody.id,reason:'other',details:'Parcours de signalement exclusivement synthétique.'},messagingMentee)).status,202);
 const reports=await(await messageGet('reports/',messagingModerator)).json();assert.equal(reports.items.length,1);
 assert.equal((await messagePost('moderate',{id:reports.items[0].id,action:'hide',note:'Masquage de test du message synthétique uniquement.'},messagingModerator)).status,200);
 const hidden=await(await messageGet('messages/?programId='+messagingProgramId,messagingMentee)).json();assert.equal(hidden.items[0].hidden,true);assert.equal(hidden.items[0].body,'');
 await messagePost('block',{programId:messagingProgramId,blocked:false},messagingMentee);
 const planningPost=(action:string,data:unknown,cookie=messagingMentor)=>fetchWithinDeadline(`${base}/api/v1/planning/${action}/`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 const planningGet=(action:string,cookie=messagingMentor)=>fetchWithinDeadline(`${base}/api/v1/planning/${action}`,{headers:{cookie}});
 const plan={programId:messagingProgramId,clientId:randomUUID(),title:'Préparer le projet HTTP',startsAt:new Date(Date.now()+86400000).toISOString(),durationMinutes:45};
 const proposal=await planningPost('propose',plan);assert.equal(proposal.status,201);const planned=await proposal.json();
 assert.equal((await planningPost('session-action',{programId:messagingProgramId,id:planned.id,revision:1,action:'confirm'},messagingMentee)).status,200);
 assert.equal((await planningGet('board/?programId='+messagingProgramId,messagingOther)).status,404);
 const target=await planningPost('objective',{programId:messagingProgramId,clientId:randomUUID(),title:'Construire un portfolio de test',dueDate:null},messagingMentee);assert.equal(target.status,201);const targetData=await target.json();
 assert.equal((await planningPost('objective-action',{programId:messagingProgramId,id:targetData.id,revision:1,status:'done'})).status,200);
 const roadmap=await(await planningGet('board/?programId='+messagingProgramId)).json();assert.equal(roadmap.sessions[0].status,'confirmed');assert.equal(roadmap.objectives[0].status,'done');
 assert.equal((await fetchWithinDeadline(`${base}/compte/planning/`)).status,200);
 for(const page of ['compte/messages','administration/signalements'])assert.equal((await fetchWithinDeadline(`${base}/${page}/`)).status,200);
 assert.equal((await post('register',{email,password,role:'admin',adultConfirmed:true,termsAccepted:true,privacyAccepted:true})).status,400);
 assert.equal((await post('register',{},'','https://other.invalid')).status,403);
 assert.equal((await post('register',{email,password,role:'mentee',adultConfirmed:true,termsAccepted:true,privacyAccepted:true})).status,202);
 assert.equal((await post('login',{email,password})).status,403);
 assert.equal((await post('verify-email',{token:await mailToken('Vérifiez')})).status,200);
 const logged=await post('login',{email,password});assert.equal(logged.status,200);
 const cookie=logged.headers.get('set-cookie')!.split(';')[0];assert.match(logged.headers.get('set-cookie')!,/HttpOnly/);
 assert.equal((await(await current(cookie)).json()).account.email,email);
 const mentorEmail=`mentor-${runId}@example.invalid`;
 assert.equal((await post('register',{email:mentorEmail,password,role:'mentor',adultConfirmed:true,termsAccepted:true,privacyAccepted:true,mentorCharterAccepted:true})).status,202);
 assert.equal((await post('verify-email',{token:await mailToken('Vérifiez',mentorEmail)})).status,200);
 const mentorLogin=await post('login',{email:mentorEmail,password});assert.equal(mentorLogin.status,200);
 const mentorCookie=mentorLogin.headers.get('set-cookie')!.split(';')[0];
 const mpost=(action:string,input:unknown,session=mentorCookie,origin=base)=>fetchWithinDeadline(`${base}/api/v1/mentoring/${action}/`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie:session},body:JSON.stringify(input)});
 const draft={publicName:'Mentor HTTP synthétique',biography:'Biographie de test exclusivement synthétique pour le parcours HTTP.',experience:'Expérience fictive réservée à la vérification automatique.',skills:['Communication'],expertise:['Orientation'],languages:['Français'],generalLocation:'Conakry',availability:'Samedi',formats:['online'],professionalLinks:[],revision:0};
 assert.equal((await mpost('own-profile',draft,mentorCookie,'https://evil.invalid')).status,403);
 assert.equal((await mpost('own-profile',draft,cookie)).status,403);
 assert.equal((await mpost('own-profile',{...draft,verification_status:'verified'})).status,400);
 assert.equal((await mpost('own-profile',draft)).status,200);
 const own=await fetchWithinDeadline(`${base}/api/v1/mentoring/own-profile/`,{headers:{cookie:mentorCookie}});assert.equal(own.status,200);
 const profile=(await own.json()).profile;
 assert.equal((await fetchWithinDeadline(`${base}/api/v1/mentoring/profile/?id=${profile.user_id}`)).status,404);
 assert.equal((await fetchWithinDeadline(`${base}/api/v1/mentoring/own-profile/`)).status,401);
 assert.equal((await mpost('submit',{revision:profile.revision})).status,200);
 assert.equal((await fetchWithinDeadline(`${base}/api/v1/mentoring/reviews/`,{headers:{cookie:mentorCookie}})).status,403);
 const directoryResponse=await fetchWithinDeadline(`${base}/api/v1/mentoring/directory/?q=synthétique`);assert.equal(directoryResponse.status,200);assert.equal((await directoryResponse.json()).total,0);
 assert.equal((await mpost('request',{mentorId:profile.user_id,goal:'Un objectif synthétique de test pour le parcours HTTP.'},cookie)).status,403);
 for(const page of ['mentors','compte/profil-mentor','compte/mentorat','administration/mentors'])assert.equal((await fetchWithinDeadline(`${base}/${page}/`)).status,200);
 assert.equal((await fetchWithinDeadline(`${base}/auth/connexion/`)).status,200);
 assert.equal((await fetchWithinDeadline(`${base}/compte/`)).status,200);
 assert.equal((await fetchWithinDeadline(`${base}/page-absente/`)).status,404);
 assert.equal((await post('forgot-password',{email})).status,202);
 assert.equal((await post('reset-password',{token:await mailToken('Réinitialisez'),password:'TalentLink-http-updated-2026'})).status,200);
 assert.equal((await current(cookie)).status,401);
 assert.equal((await post('login',{email,password})).status,401);
 const renewed=await post('login',{email,password:'TalentLink-http-updated-2026'});assert.equal(renewed.status,200);
 const renewedCookie=renewed.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await post('logout',{},renewedCookie)).status,200);assert.equal((await current(renewedCookie)).status,401);
 for(let n=0;n<5;n++)assert.equal((await post('resend-verification',{email:'absent-e2e@example.invalid'})).status,202);
 const limited=await post('resend-verification',{email:'absent-e2e@example.invalid'});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'900');
 assert.deepEqual(errors,[]);
 await writeFile('.local/last-e2e.json',JSON.stringify({directory,email,password:'TalentLink-http-updated-2026'}),{mode:0o600});
 console.log('E2E HTTP Next.js : parcours complet, pages, CSRF, révocation et limitation vérifiés sur une base isolée.');
}catch(error){
 console.error(error instanceof assert.AssertionError?`E2E : ${error.message}`:`E2E : échec à l’étape ${stage} (${error instanceof Error?error.name:'erreur'}).`);process.exitCode=1;
}finally{await stop()}
