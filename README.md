## Itération 0.15 — documents et photos

PDF joints aux ressources et photos des mentors, stockage privé Neon, contrôles de fichiers et publication après revue : [guide des fichiers](docs/files.md).

## Itération 0.14 — progression personnelle détaillée

Sous-objectifs, jalons datés, bilans privés et historique sont disponibles dans le suivi des objectifs personnels. Guide : [docs/personal-progress.md](docs/personal-progress.md).

## Itération 0.13 — prototype fonctionnel regroupé

Les inscriptions des personnes déclarant avoir au moins 18 ans sont ouvertes depuis le 7 novembre 2026 : [ouverture et contrôles](docs/registration-opening.md). La confirmation e-mail reste obligatoire ; les habilitations privées sont distinctes de l’inscription.

Les nouveaux modules sont aussi intégrés aux comptes existants sur talentlink.today depuis le 7 novembre 2026 : [livraison et vérifications](docs/learning-release.md). Les contenus fictifs restent locaux ; les inscriptions et fonctions sensibles conservent leurs états antérieurs.

Lancer `npm run prototype` puis ouvrir http://127.0.0.1:4399/prototype/. Comptes et base fictifs persistants, modules existants activés pour les essais, bibliothèque, communauté, profil et progression personnelle ajoutés. Guide et périmètre réel : [docs/prototype.md](docs/prototype.md). Aucun changement de configuration du site public.

## Itération 0.12 — préparation des inscriptions adultes

Double verrou de production, règles versionnées et limites anti-abus. Les inscriptions restent fermées. Voir [docs/adult-registration.md](docs/adult-registration.md) et [docs/recovery-drill.md](docs/recovery-drill.md).

## Premiers quiz publiés

Les trois quiz sourcés ont été publiés le 6 novembre 2026 après validation explicite de l’utilisateur. Liens et vérifications : [docs/verification-editorial-publication.md](docs/verification-editorial-publication.md).

## Itération 0.11 — premiers quiz à relire

Trois lots éditoriaux sourcés, douze questions soumises à validation humaine. Guide : [docs/editorial-launch.md](docs/editorial-launch.md). Aucune publication automatique.

## Itération 0.10 — lancement découverte

Périmètre public autorisé : vitrine, annuaire, quiz validés ; nouvelles inscriptions fermées. Guide de lancement, contact et retour arrière : [docs/public-launch.md](docs/public-launch.md).

## Itération 0.9 — qualité et résilience

Navigation clavier, reprise après panne réseau et budgets des ressources de production : [docs/quality.md](docs/quality.md). Commande : npm run test:quality après compilation. Les contrôles visuels et lecteur d’écran restent distincts.

## Itération 0.8 — attestations de participation

Consultation privée et révocation, émission administrative fermée : [docs/attestations.md](docs/attestations.md). Documents non accrédités, sans certification de compétence.

## Itération 0.7 — administration

Tableau de bord privé et journal filtrable : [docs/administration.md](docs/administration.md). Aucun nouveau droit attribué aux comptes.

## Itération 0.6 — séances et objectifs

Planning privé par accompagnement, propositions confirmées à deux et objectifs partagés. Guide : [docs/planning.md](docs/planning.md). Fonctions réelles fermées par défaut.

# TalentLink — authentification et mentorat

Itération 0.5, 6 novembre 2026. Plateforme gratuite de mentorat et d’apprentissage destinée d’abord aux jeunes en Guinée.

## État réel

Le projet est maintenant une application Next.js avec serveur Node.js, API d’authentification, PostgreSQL, formulaires français et thèmes clair/sombre/automatique. Inscription adulte, e-mail de vérification, connexion/déconnexion, compte courant, mot de passe oublié et reset sont implémentés. Les inscriptions ne permettent que les rôles mentoré et mentor.

Les comptes réels restent fermés par défaut. Les profils mentors, l’examen administratif, l’annuaire filtrable, les favoris, les demandes et les programmes sont implémentés. Les mises en relation privées restent fermées par défaut ; TalentLink Play ajoute les quiz publics sans compte, les scores et les contributions modérées. La messagerie encadrée est implémentée mais désactivée ; les séances restent à développer. Une déclaration de majorité ne vaut pas vérification d’âge. Les textes juridiques restent préparatoires.

La vitrine 0.1 déjà publiée sur Sites reste en ligne. Cet hébergement statique ne fait pas fonctionner les nouvelles API Node.js. Le dossier historique `out/` correspond à cette vitrine, pas à l’authentification 0.2. La version regroupée est préparée sur talentlink.today, protégée par Vercel Authentication pour des essais privés. Resend est configuré ; l’utilisateur a validé le parcours local complet de vérification et de réinitialisation par e-mail.

## Installation et développement

Node.js >=22.18 (vérifié avec 26.13.0), versions verrouillées dans package-lock.json.

```sh
npm ci
# Renseigner .env.local à partir de .env.example, sans écraser vos identifiants existants.
npm run db:check
npm run db:migrate
npm test
npm run db:smoke
npm run dev -- --hostname 127.0.0.1
```

Pour l’interface de test locale uniquement, renseigner AUTH_ENABLED=true, AUTH_REGISTRATION_ENABLED=true, un AUTH_SECRET aléatoire d’au moins 32 caractères, APP_URL=http://127.0.0.1:3000 et MAIL_DRIVER=file. Utiliser exclusivement des comptes fictifs. Les messages sont dans `.local/mail/`, ignoré par Git. Aucun lien de vérification n’est exposé dans une API de développement publique.

Une connexion Neon est reconnue automatiquement : transport WSS sécurisé sur 443 via son pilote officiel. Les autres PostgreSQL utilisent pg. Sans serveur externe, DB_DRIVER=pglite permet une base PostgreSQL embarquée locale, interdite en production. Les tests unitaires/intégrés utilisent une base mémoire isolée et un faux transport d’e-mail.

## Compilation serveur

```sh
npm run typecheck
npm run build
npm start
```

Avant une exploitation HTTPS : APP_URL doit correspondre à l’origine finale ; SMTP et les procédures d’ouverture doivent être validés. Le serveur de démarrage écoute sur 127.0.0.1 derrière un proxy HTTPS. Les migrations sont explicites, transactionnelles, versionnées et protégées par checksum.

## Structure

```text
app/                         Vitrine, pages de compte et routes API /api/v1/auth
components/                  Formulaires, espace personnel et sélecteur de thème
src/modules/identity/        Validation, hachage, permissions et services métier
src/server/                  Adaptateurs PostgreSQL, migrations, HTTP et e-mail
database/migrations/         SQL versionné dans le schéma talentlink
scripts/                     Commandes de contrôle, migration et test PostgreSQL natif
tests/                       Tests de sécurité et parcours intégrés isolés
docs/                        Architecture, produit, sécurité, parcours et vérifications
.env.example                 Configuration sans secret réel
```

Le commit `40a8053` conserve le point de reprise de la vitrine 0.1. Cette itération ajoute les profils, la vérification des mentors et les demandes ; TalentLink Play précédera toujours la messagerie. Voir [le module mentorat et ses limites](docs/mentoring.md).

Voir [l’authentification](docs/authentication.md), [la sécurité](docs/security.md), [le déploiement](docs/deployment.md) et [les vérifications 0.2](docs/verification-auth.md).

## Préversion Vercel

L’hébergeur Vercel a été choisi. vercel.json définit le build ; les activations sont gérées dans les variables de chaque environnement. La production privée du domaine active les comptes et Play derrière Vercel Authentication. Voir [la procédure Vercel](docs/vercel.md).

`npm run deploy:check` vérifie cette fermeture. `npm run deploy:check-accounts` liste les prérequis d’une ouverture future sans exposer de secret. `npm run mail:check` vérifie un SMTP configuré sans envoyer d’e-mail. La connexion Vercel, la protection d’accès de la préversion et son déploiement effectif doivent être confirmés séparément. Resend est le fournisseur retenu, via SMTP sécurisé. Voir [le guide e-mail](docs/email.md).

## Contrôles du mentorat

Après `npm run db:migrate`, exécuter `npm test`, `npm run test:e2e` et `npm run db:smoke-mentoring`. Ce dernier contrôle les requêtes sur PostgreSQL natif dans une transaction annulée, sans conserver de faux profil ni envoyer d’e-mail. MENTORING_ENABLED reste false. Aucun administrateur réel ni accès adulte n’est créé automatiquement.

## TalentLink Play

Voir [le module Play](docs/play.md). `npm run play:demo` démarre une démonstration clairement identifiée sur une base embarquée isolée, sans Neon ni SMTP. `npm run db:smoke-play` vérifie PostgreSQL natif dans une transaction annulée. Les migrations 004/005 préparent le catalogue, les versions immuables, les tentatives et leur attribution explicite au mentorat. Play est activé seulement sur la production privée protégée ; aucun quiz réel n’est publié automatiquement.

## Messagerie encadrée

Voir [la messagerie et ses contrôles](docs/messaging.md). `npm run messaging:demo` démarre une base embarquée isolée pour tester les messages fictifs. `npm run db:smoke-messaging` vérifie PostgreSQL natif dans une transaction annulée. MESSAGING_ENABLED et PRIVATE_COMMUNICATIONS_APPROVED restent false en production.

## Version 0.16 — Mode Sprint IA

Création de quiz publics à partir d’un sujet, catégorie et niveau ; cinq questions, chronomètre serveur de trois minutes, contrôle automatisé distinct, signalements et quotas. Configuration et limites : [docs/sprint-ai.md](docs/sprint-ai.md).

### Complément 0.16.1 — signalements Sprint

File administrative paginée sur `/administration/sprints/`, consultation des corrections et retrait journalisé, disponible même lorsque la génération IA est désactivée.

## Version 0.17 — recherche publique unifiée

Recherche des quiz, ressources et mentors publiés depuis `/recherche/`, la navigation et le formulaire d’accueil. Filtres par type, pagination et lecture directe des ressources. Aucune recherche dans les espaces privés et aucun appel IA. Voir [docs/public-search.md](docs/public-search.md).

## Version 0.18 — badges et bilan Play

Badges de fin de quiz pour les visiteurs et bilan privé dans Mes jeux pour les parties enregistrées avec accord. Aucun classement public ni certification. Voir [docs/play-progress.md](docs/play-progress.md).

## Version 0.19 — disponibilités hebdomadaires

Créneaux structurés dans le profil mentor, fuseau IANA explicite, contrôle des chevauchements et filtre de l’annuaire par jour. Publication après revue du profil, sans réservation automatique. Voir [docs/mentor-availability.md](docs/mentor-availability.md).

## Version 0.20 — centre de notifications

Notifications privées paginées, compteur de non-lues et lecture des éléments affichés. Les décisions de validation des profils et quiz rejoignent les alertes de bibliothèque et de communauté existantes. Aucun e-mail ni notification sur appareil ajouté. Voir [docs/notifications.md](docs/notifications.md).
