# Mentorat — itération 0.3

## Parcours implémentés

- `/mentors/` : annuaire public paginé par 12, recherche nom/biographie/compétences, filtres domaine exact, langue exacte, localisation générale, disponibilité et format.
- `/mentors/[id]/` : profil public, liens HTTPS, favoris et formulaire de demande lorsque les mises en relation sont ouvertes.
- `/compte/profil-mentor/` : édition privée, brouillon puis soumission. Biographie, expérience, compétences, domaines, langues, ville/région, disponibilités générales, formats et liens professionnels.
- `/administration/mentors/` : examen réservé à un administrateur authentifié ; publication, retour pour correction et suspension avec motif et journal d’audit.
- `/compte/mentorat/` : favoris, demandes envoyées/reçues, acceptation/refus/annulation et programmes avec objectif commun et états actif/suspendu/terminé/annulé.
- API `/api/v1/mentoring/[action]`, réutilisable ultérieurement par un client mobile.

Les écrans privés sont des coquilles sans données personnelles dans leur HTML initial. Les API vérifient la session, le rôle et les autorisations en base. Les demandes reçues constituent les notifications internes ; aucun e-mail de mentorat n’est envoyé automatiquement.

## Publication et confidentialité

Les profils démarrent en brouillon. L’utilisateur ne peut ni modifier son statut de vérification, ni son rôle, ni son accès adulte par ces API. L’examen interdit l’auto-validation et exige, pour publier, un compte mentor actif avec e-mail et accès adulte validés. La vérification effective du parcours reste un travail humain : aucun profil ne doit être publié pour simplement faire apparaître une carte.

Un profil modifié repasse en brouillon, perd sa vérification et ses programmes actifs sont suspendus dans la même transaction. Une suspension administrative retire le profil et suspend les programmes. Une publication ultérieure ne réactive pas automatiquement les programmes. Les versions de profil évitent l’écrasement d’une modification ou d’une décision concurrente.

L’annuaire ne retourne ni e-mail, ni note de revue, ni justificatif, ni identité des mentorés. Les favoris masquent les profils retirés. Les contenus saisis s’affichent comme texte React, jamais comme HTML. Les liens professionnels HTTPS ne sont pas récupérés par le serveur. Pas de faux mentor, de faux avis ou de statistiques inventées.

## Garde d’ouverture

MENTORING_ENABLED=false par défaut et dans l’environnement de production privée Vercel. Les demandes et leur acceptation sont refusées tant que ce verrou n’est pas levé. En plus, les deux participants doivent être actifs, leur e-mail vérifié et leur accès adulte approuvé ; le mentor doit toujours être publié et vérifié à l’acceptation/réactivation. Un compte simplement déclaré majeur ne suffit pas.

Aucune promotion de rôle ni approbation adulte réelle n’a été faite dans cette itération. Aucun parcours de vérification d’âge ou de collecte de pièces sensibles n’est ajouté sans validation juridique et opérationnelle. Les scénarios complets sont testés avec des comptes synthétiques dans des bases isolées. Ne pas lever le verrou pour contourner cette étape.

Une demande en attente peut être annulée par son auteur ; seul le mentor destinataire peut accepter/refuser. Une acceptation crée un seul programme dans la même transaction. L’unicité en base bloque les demandes simultanées en attente/acceptées pour une même paire. Les tiers ne voient ni les demandes ni les programmes. Les états terminés/annulés d’un programme sont définitifs. L’annulation reste possible quand la création est fermée.

## Base et vérifications

Migration additive `003_mentoring.sql` : champs de profil, version, revue, favoris, demandes et programmes. Ne jamais modifier 001/002 déjà appliquées. Exécuter `npm run db:migrate` explicitement ; pas de migration au démarrage d’une requête.

`npm test` inclut les tests de rôle, accès adulte, visibilité, liens malveillants, revue, révisions, doublons concurrents, programmes, CSRF, annulation et isolation. `npm run test:e2e` exerce les vraies routes Next.js avec e-mails fictifs et PostgreSQL embarqué, sans Neon ni SMTP réels.

## Limites explicites

Photos/téléversements, justificatifs, évaluations, publications et badges restent à ajouter avec les procédures appropriées. Pas de nombre d’heures ou de séances sans données réelles. La disponibilité est déclarative, sans réservation. Les objectifs de programme sont éditables mais il n’y a pas encore de jalons ou de bilan structuré. Les listes personnelles sont limitées à 100 éléments dans cette première version ; l’annuaire est paginé. La messagerie, les séances et le suivi avancé viendront après TalentLink Play. Les inscriptions sont accessibles seulement derrière la protection privée Vercel ; les mises en relation restent fermées.
