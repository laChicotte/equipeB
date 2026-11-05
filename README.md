# TalentLink

Première itération web, 5 novembre 2026. Plateforme gratuite de mentorat et d’apprentissage pour les jeunes en Guinée. Signature : « Apprends. Connecte-toi. Réalise ton potentiel. »

## État réel

Livré : vitrine responsive en français, navigation mobile, thèmes clair/sombre/système persistants, recherche de domaines avec état d’attente explicite, présentation des parcours mentor/mentoré, FAQ et quatre pages publiques. Aucun chiffre d’impact, témoignage ou mentor fictif.

Les comptes ne sont **pas ouverts**. Les dialogues ne collectent aucune coordonnée. Pas de backend, de messagerie, de quiz jouable ni de donnée personnelle dans cette livraison. Le schéma SQL est une fondation à valider, pas une base déployée. L’authentification, PostgreSQL et les e-mails ne doivent pas être présentés comme fonctionnels.

## Consulter le site déjà compilé

Le dossier `out/` est inclus dans l’archive. Avec Node.js installé, lancez `node scripts/serve.mjs` depuis le dossier du projet, puis ouvrez http://127.0.0.1:3000. Aucune installation de dépendances n’est nécessaire pour consulter cette version compilée.

## Démarrage reproductible

Node.js 20.9 minimum selon Next.js ; environnement utilisé : Node 26.13.0, npm 11.20.0. Versions exactes dans package-lock.json.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Le build produit `out/`, hébergeable statiquement. `npm start` sert le dossier `out/` sur http://127.0.0.1:3000 après compilation ; `npm run dev` lance le développement. Le serveur fourni est destiné à la prévisualisation locale.

## Structure

```text
app/
  layout.tsx          Métadonnées et initialisation du thème
  page.tsx            Vitrine et interactions publiques
  globals.css         Tokens et styles responsive
  [slug]/page.tsx     Engagements, confidentialité, conditions, charte
database/migrations/  Fondation PostgreSQL, non appliquée
docs/                 Cadrage, architecture, sécurité et critères
tests/                Contrôles de livraison et modèle de publication
.env.example          Variables futures sans secret
.openai/hosting.json  Identité de la préversion privée
```

## Décisions

Next.js App Router + React + TypeScript strict. Export statique pour cette itération sans données : aucun serveur à exposer avant les validations. CSS sémantique léger sans dépendance visuelle ; Tailwind, shadcn/ui, Zod et React Hook Form pourront être ajoutés avec les formulaires réels. L’API `/api/v1` et PostgreSQL seront introduits à l’itération suivante en retirant `output: 'export'`. Cette transition est nécessaire avant toute authentification réelle.

Voir [le plan et les critères](docs/roadmap.md), [l’architecture](docs/architecture.md) et [le rapport de vérification](docs/verification.md).
