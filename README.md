# TalentLink — authentification et mentorat

Itération 0.4, 6 novembre 2026. Plateforme gratuite de mentorat et d’apprentissage destinée d’abord aux jeunes en Guinée.

## État réel

Le projet est maintenant une application Next.js avec serveur Node.js, API d’authentification, PostgreSQL, formulaires français et thèmes clair/sombre/automatique. Inscription adulte, e-mail de vérification, connexion/déconnexion, compte courant, mot de passe oublié et reset sont implémentés. Les inscriptions ne permettent que les rôles mentoré et mentor.

Les comptes réels restent fermés par défaut. Les profils mentors, l’examen administratif, l’annuaire filtrable, les favoris, les demandes et les programmes sont implémentés. Les mises en relation privées restent fermées par défaut ; TalentLink Play ajoute les quiz publics sans compte, les scores et les contributions modérées. Les séances et la messagerie restent à développer. Une déclaration de majorité ne vaut pas vérification d’âge. Les textes juridiques restent préparatoires.

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
