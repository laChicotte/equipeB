# Architecture proposée

## Synthèse
TalentLink réunit mentorat bénévole, apprentissage ludique et suivi personnel. Le MVP reste gratuit, mobile-first et destiné d’abord à la Guinée. Les opportunités professionnelles, le mobile natif et l’IA sont hors de la première version.

## Architecture cible
Monolithe modulaire Next.js App Router, React, TypeScript strict ; API JSON versionnée `/api/v1`, services métiers indépendants de l’interface et dépôts PostgreSQL via Prisma. React Native/Expo pourra utiliser la même API. Modules : identity, profiles, mentoring, play, scheduling, messaging, progress, moderation.

Client → routes API → validation serveur → session/permissions → service métier → transaction → dépôt PostgreSQL. Le client ne décide jamais des permissions, de la vérification d’un mentor ou du score d’un quiz.

L’export statique livré est une étape de présentation. Il ne peut pas exécuter les futures routes API. Retirer le mode export lors de l’activation du serveur. Choisir alors un hébergement Next.js compatible PostgreSQL/SMTP/S3 ; ne pas supposer la compatibilité de l’hébergement statique Sites avec un serveur Node/PostgreSQL.

## Décisions de cette itération
- Aucun service payant et aucune donnée sensible traitée.
- Pas de compte factice ou de faux badge vérifié pour simuler un service actif.
- Identité originale, illustration typographique locale, sans copier eFONIJ.
- Français initial, textes à extraire dans un catalogue fr puis en pour les traductions.
- Aucun SDK IA, aucune messagerie avant TalentLink Play.

## Structure future
`src/modules/{identity,profiles,mentoring,play}/` : domain, services, repositories, schemas. `src/server/` : sessions, access, errors, rate-limit. `app/api/v1/` : adaptateurs HTTP. `prisma/` : schéma et migrations vérifiées. `tests/` : unité, intégration PostgreSQL, parcours navigateur.

## Références vérifiées
- https://nextjs.org/docs/app/getting-started/installation : Node minimum 20.9, App Router.
- https://nextjs.org/support-policy : utiliser une version stable maintenue.
- https://www.efonij.gn/ : référence de clarté des services, sans reprise d’actifs.


## Mise à jour 0.2
La source 0.2 utilise désormais le serveur Next.js et les API Node.js. Les adaptateurs pg/Neon, les migrations SQL transactionnelles et les services d’identité sont implémentés. SQL paramétré et un dépôt typé ont été retenus pour cette première surface de données, sans introduire un ORM supplémentaire ; les services sont séparés du transport et réutilisables par une future application mobile. Voir authentication.md pour les décisions et les limites de publication.
