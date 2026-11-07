import {randomUUID} from 'node:crypto';
import type {Database} from '../src/server/database.ts';
import {hashPassword} from '../src/modules/identity/crypto.ts';
import {seedMessagingFixture} from '../tests/fixtures/messaging.ts';
import {seedPlayFixture} from '../tests/fixtures/play.ts';
import {seedAttestationFixture} from '../tests/fixtures/attestations.ts';
import {MessagingService} from '../src/modules/messaging/service.ts';
import {PlanningService} from '../src/modules/planning/service.ts';
import {LearningService} from '../src/modules/learning/service.ts';
import {AttestationService} from '../src/modules/attestations/service.ts';
export const prototypePassword='TalentLink-prototype-2026!';
// Only called with a newly created local embedded database by the prototype runner or tests.
export async function seedPrototype(db:Database){
 const hash=await hashPassword(prototypePassword),f=await seedMessagingFixture(db,hash,'prototype'),play=await seedPlayFixture(db),learning=new LearningService(db);
 await db.query("UPDATE mentor_profile SET public_name='Mentor fictif — Numérique et orientation',biography='Profil de démonstration pour explorer les parcours de TalentLink.',experience='Expérience simulée pour les essais, sans personne réelle.',skills=ARRAY['Numérique','Orientation'],expertise=ARRAY['Technologie & numérique'],languages=ARRAY['Français'],availability='En semaine',formats=ARRAY['distance'],general_location='Conakry' WHERE user_id=$1",[f.mentor.id]);
 for(const [actor,name] of [[f.mentor,'Mentor démo'],[f.mentee,'Talent démo'],[f.admin,'Équipe démo'],[f.moderator,'Modération démo']] as const)await learning.saveProfile(actor,{displayName:name,interests:'Numérique, communication et orientation',ambition:'Préparer un projet d’apprentissage dans le prototype.'});
 const resources=[
  {title:'Construire son premier objectif d’apprentissage',category:'Développement personnel',body:'1. Choisis une compétence précise. « Mieux communiquer » est une intention ; « présenter mon projet en trois minutes » est un objectif observable.\n\n2. Définis une petite activité : rédiger un plan, répéter puis demander un retour à une personne de confiance.\n\n3. Choisis une date réaliste et note ton état initial. Après chaque essai, consigne une réussite et une amélioration.\n\n4. Fais le bilan : qu’as-tu réellement réalisé ? Quels éléments restent à pratiquer ? Une activité terminée ne constitue pas à elle seule une compétence certifiée.'},
  {title:'Préparer un échange utile avec son mentor',category:'Orientation professionnelle',body:'Avant l’échange, écris en quelques lignes ta situation, tes envies et une question concrète. Prépare un exemple de ce que tu as déjà essayé.\n\nPendant la séance, clarifie ton objectif et les limites de l’accompagnement. Prends des notes sans enregistrer la personne à son insu. Ne communique ni mot de passe ni document sensible inutile.\n\nAprès l’échange, choisis une prochaine action, une date et un critère observable. Remercie ton mentor et indique les points que tu souhaites reprendre. Le mentorat bénévole ne promet ni emploi ni résultat scolaire.'},
  {title:'Vérifier une information trouvée en ligne',category:'Technologie et numérique',body:'Commence par identifier l’auteur, la date et le contexte. Une publication populaire peut être incorrecte.\n\nRemonte à la source initiale : document officiel, étude ou témoignage direct. Compare avec une seconde source indépendante. Sépare les faits observés des opinions et des interprétations.\n\nAvant de partager, demande-toi si le titre correspond au contenu et si une information ancienne est présentée comme récente. En cas de doute, suspends le partage et explique ce qui reste à vérifier.\n\nExercice : choisis une affirmation publique et note deux sources, leur date et ce qu’elles permettent réellement de conclure.'}
 ];
 for(const item of resources){const r=await learning.submitResource(f.mentor,{...item,summary:'Un guide original et court, rédigé pour apprendre à travers des activités concrètes dans le prototype TalentLink.',kind:'guide',sourceUrl:'',rights:'Texte original de démonstration TalentLink, rédigé pour ce prototype ; reproduction autorisée pour ses essais.',rightsConfirmed:true});await learning.review(f.admin,{id:r.id,type:'resource',decision:'published'})}
 await learning.goal(f.mentee,{title:'Lire un guide et choisir une première action',dueDate:null,status:'active'});
 await learning.goal(f.mentee,{title:'Préciser les domaines que je veux découvrir',dueDate:null,status:'done'});
 const post=await learning.post(f.mentor,{body:'Bienvenue dans la communauté de démonstration ! Quel petit objectif aimerais-tu atteindre cette semaine ?',parentId:null,publicationAccepted:true});await learning.review(f.moderator,{id:post.id,type:'post',decision:'published'});
 const reply=await learning.post(f.mentee,{body:'Je vais préparer une présentation de mon projet en trois minutes, puis demander un retour à mon mentor fictif.',parentId:post.id,publicationAccepted:true});await learning.review(f.moderator,{id:reply.id,type:'post',decision:'published'});
 const messaging=new MessagingService(db,true,true);await messaging.send(f.mentor,{programId:f.programId,clientId:randomUUID(),body:'Bienvenue ! Ceci est un échange fictif. Préparons ton premier objectif.'});await messaging.send(f.mentee,{programId:f.programId,clientId:randomUUID(),body:'Merci ! Je souhaite découvrir les outils numériques utiles à mon projet.'});
 const planning=new PlanningService(db,true,true),session=await planning.propose(f.mentor,{programId:f.programId,clientId:randomUUID(),title:'Séance fictive : mon premier objectif',startsAt:new Date(Date.now()+86400000).toISOString(),durationMinutes:45});await planning.sessionAction(f.mentee,{programId:f.programId,id:session.id,revision:1,action:'confirm'});await planning.objective(f.mentor,{programId:f.programId,clientId:randomUUID(),title:'Définir trois actions concrètes pour mon projet',dueDate:null});
 const completed=await seedAttestationFixture(db,hash);await new AttestationService(db,true).issue(f.admin,{programId:completed.programId});
 await db.query("UPDATE app_user SET email='diplome-prototype@example.invalid' WHERE id=$1",[completed.mentee.id]);
 return {...f,...play};
}
