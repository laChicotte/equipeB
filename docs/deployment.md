# Déploiement

## Préversion
`npm ci`, `npm test`, `npm run typecheck`, `npm run build`. Publier `out/` en statique. L’identité Sites est conservée dans `.openai/hosting.json`. Garder la préversion privée ; ne pas changer l’audience sans instruction explicite.

## Backend ultérieur
Choisir un hébergement Next.js serveur et PostgreSQL compatible, puis retirer l’export statique. Ne jamais placer les variables secrètes dans NEXT_PUBLIC_* ni dans le dépôt. Prévoir migrations relues, déploiement en staging, restauration testée, mail sandbox, stockage privé et protection du compte administrateur. Vérifier les coûts avant engagement.

## Activation
Avant comptes réels : identité de l’éditeur, politique de confidentialité finalisée, procédure d’incident, règles de conservation et validation des parcours. Les justificatifs d’identité, mineurs et fonctions privées ne sont pas activés par cette livraison.

## Retour arrière
Conserver une version statique connue et repointer le déploiement vers cette version si la vitrine régresse. Pour les futures migrations de données : sauvegarde préalable et stratégie de compatibilité ; pas de migration destructive automatique.
