# Prototype fonctionnel regroupé — version 0.13

Le 7 novembre 2026, l’utilisateur a demandé de recentrer le travail sur les fonctionnalités et de disposer d’un prototype accessible pour les essais. Cette itération regroupe les modules existants et ajoute bibliothèque, communauté, profil d’apprentissage, objectifs personnels et notifications de revue.

## Démarrage et comptes

Depuis le dossier TalentLink : `npm run prototype`, puis ouvrir http://127.0.0.1:4399/prototype/.

Le lanceur crée exclusivement une base PostgreSQL embarquée dans `.local/full-prototype`, applique les migrations et initialise les données fictives une seule fois. Les modifications persistent après redémarrage. Il ne charge pas DATABASE_URL et ne se connecte pas à Neon. Il refuse NODE_ENV=production et écoute sur 127.0.0.1. Aucun achat, envoi SMTP ou déploiement Vercel n’est effectué. La migration 012 n’a pas été appliquée à la base du site public.

Mot de passe commun de démonstration : `TalentLink-prototype-2026!`.

| Compte fictif | Parcours |
|---|---|
| mentee-prototype@example.invalid | Profil, progression, bibliothèque, communauté, programme actif, messages et séance confirmée |
| mentor-prototype@example.invalid | Profil mentor, demandes, programme, messages, séances et contributions aux ressources/quiz |
| admin-prototype@example.invalid | Administration, revue des mentors/quiz, ressources, publications et attestations |
| moderation-prototype@example.invalid | Modération des publications et signalements autorisés |
| other-prototype@example.invalid | Second mentoré pour vérifier la confidentialité et créer une demande |
| diplome-prototype@example.invalid | Consultation d’une attestation fictive de participation, non accréditée |

Déconnecter le compte courant dans /compte/ pour changer de rôle. Les fonctions sont activées dans ce prototype ; les permissions par rôle, la revue des mentors et l’isolation des participants restent effectives. Les seuls accords et approbations préremplis sont simulés sur les comptes fictifs de la base locale.

## Nouveaux modules fonctionnels

| Module | Fonctions vérifiées |
|---|---|
| Bibliothèque /bibliotheque/ | Catalogue paginé, recherche texte, filtres domaine/format, lecture, source HTTPS, téléchargement texte, impression et favoris privés |
| Contributions /compte/ressources/ | Soumission par mentor/admin, déclaration des droits, revue distincte, refus, retrait, audit et notification de décision |
| Communauté /communaute/ | Publications et réponses avec accord explicite, modération avant affichage, réactions idempotentes, abonnements et filtre du fil |
| Profil /compte/profil/ | Pseudonyme, centres d’intérêt et ambition ; seuls les pseudonymes accompagnent les publications |
| Progression /compte/progression/ | Objectifs personnels avec date cible et état, jauge déclarative, compteurs issus de SQL et notifications privées lisibles |

La bibliothèque contient trois guides originaux de démonstration. Aucun livre sous droits n’a été récupéré ou copié. Les formats document/livre permettent un contenu textuel et un lien HTTPS autorisé ; l’hébergement et l’envoi de fichiers binaires ne sont pas implémentés dans cette version.

## Parcours d’essai conseillé

1. Se connecter comme mentoré ; ouvrir un guide, le placer dans ses favoris, mettre à jour son profil et un objectif personnel.
2. Ouvrir le programme actif, lire les messages, répondre et consulter la séance confirmée et ses objectifs partagés.
3. Jouer au quiz de démonstration ; choisir l’historique si souhaité, consulter les résultats et suggestions de mentors par domaine.
4. Soumettre une publication communautaire. Changer pour le compte modérateur et la publier, puis revenir au second mentoré pour réagir, suivre l’auteur et répondre.
5. Soumettre une ressource comme mentor avec sa provenance et ses droits. Changer pour l’administrateur pour l’examiner, puis consulter la notification du mentor. Un auteur ne peut pas approuver sa propre contribution.
6. Explorer l’atelier des quiz, la revue des mentors et les indicateurs administratifs. Les données initiales restent explicitement fictives.
7. Utiliser diplome-prototype@example.invalid pour consulter l’attestation de participation fictive. L’administrateur dispose aussi du parcours d’émission et de révocation.
8. Créer une nouvelle adresse @example.invalid, consulter sa boîte locale depuis /prototype/, ouvrir le lien puis confirmer. L’administrateur peut ensuite accorder l’accès adulte fictif à ce compte dans le même espace de test. La confirmation e-mail seule n’attribue pas ce droit.

La boîte locale est réservée au mode prototype, ne lit que `.local/prototype-mail` et refuse les adresses réelles. La route /api/prototype et la page /prototype retournent 404 hors de la configuration locale dédiée. Les inscriptions du prototype refusent les adresses sans suffixe @example.invalid.

## Contrôles et limites

`npm run typecheck`, `npm test` et `node scripts/prototype-check.mjs` (prototype démarré). Le contrôle HTTP vérifie pages, modules activés, quatre rôles, bibliothèque, revue, confidentialité des objectifs, messagerie/planning, inscription, e-mail local et approbation d’accès fictive. Il conserve ses seules données de test dans la base locale de démonstration.

Résultats du 7 novembre 2026 : contrôle TypeScript réussi, 98 tests réussis sans échec, compilation Next.js réussie avec génération de 35 pages statiques et routes dynamiques listées, contrôle HTTP complet réussi. La compilation locale utilise TALENTLINK_KEEP_BUILD_OUTPUT=true pour le contournement Windows déjà documenté ; la valeur par défaut des builds ordinaires reste inchangée. L’inspection des processus Windows via CIM a été refusée par l’environnement ; aucun arrêt de processus n’a été effectué par cette tentative et le serveur de prototype est resté disponible pendant la compilation.

Le contrôle visuel avec l’outil navigateur a été interrompu : l’outil n’a pas pu déterminer de manière fiable l’URL du navigateur Windows. Aucun audit visuel mobile, lecteur d’écran ou téléchargement par interface n’est donc déclaré réussi pour les nouveaux écrans. Les thèmes utilisent les tokens existants ; l’impression et le téléchargement texte sont implémentés mais leur interaction navigateur reste à examiner manuellement.

Cette version n’est pas la totalité du prompt maître. Restent notamment : fichiers/photo S3 avec validation, évaluations des mentors, badges avancés, sous-objectifs/jalons/bilans détaillés, disponibilités récurrentes et rappels externes, vérification publique limitée des attestations, recherche sémantique et assistance IA réelle avec validation humaine, audio/vidéo, opportunités de phase 2 et application mobile. Aucun faux service d’IA ni appel à un service payant n’est ajouté pour simuler ces fonctions. Le prototype regroupe les fonctions existantes activées et les nouveaux modules ci-dessus ; le site public conserve sa configuration.
