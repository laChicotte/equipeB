# Préversion Vercel — comptes fermés

Choix utilisateur confirmé le 5 novembre 2026 : Vercel. Aucun fournisseur d’e-mail n’est encore choisi. Cette étape prépare une préversion protégée, sans transfert des identifiants Neon et sans ouverture de comptes réels.

## Configuration prête à examiner

- Framework Next.js, installation npm ci, compilation npm run build avec Webpack.
- Choisir Node.js 24.x dans le projet Vercel ; la source exige au minimum Node 22.18 et a été testée localement avec Node 26.13.
- Les trois verrous AUTH_ENABLED, AUTH_REGISTRATION_ENABLED et REAL_ACCOUNTS_APPROVED sont explicitement false dans vercel.json. Leur levée nécessitera une modification relue de ce fichier et les réglages privés correspondants, après validation.
- La fonction d’authentification dispose d’un budget maximal de 60 secondes. Ne pas modifier le plan ou engager de dépense pour ce déploiement sans accord.
- .vercelignore exclut les fichiers .env, les données et messages locaux, les caches, les archives et les métadonnées Sites. .vercel/ n’est pas versionné.
- GET /api/health renvoie uniquement un état de fonctionnement du serveur, sans contrôle de base ou SMTP ni révélation de configuration.

## Première préversion

1. Accéder au compte Vercel autorisé et vérifier le plan existant. Ne pas accepter de conditions ni souscrire une offre à la place de l’utilisateur.
2. Créer ou sélectionner le projet TalentLink, avec la racine de ce dépôt et Node 24.x.
3. Activer et vérifier la protection par authentification Vercel sur la préversion avant de la partager. Ne pas créer de lien de contournement public et ne pas élargir les accès.
4. Déployer une Preview, sans promotion en production. La configuration de compte fermé permet ce déploiement sans DATABASE_URL, AUTH_SECRET ou SMTP_URL dans Vercel.
5. Vérifier le build, l’accueil, les pages de compte fermées et /api/health. Le point health est un test de vie du serveur, pas une validation de l’authentification complète.

La protection par authentification Vercel peut protéger tous les déploiements sur tous les plans depuis l’annonce du 9 septembre 2026. Ne pas se fier aux anciennes pages indiquant un supplément nécessaire : vérifier la configuration réellement retournée par le projet. Le plan Hobby est limité aux usages personnels ou non commerciaux ; confirmer l’adéquation du compte et du projet avant de l’utiliser. Aucun changement de plan automatique.

## Contrôles disponibles

```sh
npm run deploy:check
npm run deploy:check-accounts
npm run mail:check
```

deploy:check valide uniquement la fermeture des comptes et le nettoyage normal de compilation. Il ne prouve ni le lien Vercel, ni la protection d’accès, ni un déploiement effectif. deploy:check-accounts liste les prérequis manquants sans afficher leurs valeurs. mail:check teste la connexion SMTP/TLS et l’authentification sans envoyer de message. Cela ne prouve pas que MAIL_FROM sera accepté ni qu’un message arrivera en boîte de réception.

## Après choix du fournisseur d’e-mail

Préparer le domaine expéditeur et ses réglages SPF/DKIM selon les instructions du fournisseur. Placer SMTP_URL et MAIL_FROM uniquement dans la configuration privée locale puis dans l’environnement Vercel autorisé. Aucun mot de passe ni clé d’API ne doit être collé dans le chat ou ajouté à Git.

Avant comptes réels : vérifier les connexions, tester un e-mail vers un destinataire explicitement autorisé, finaliser le cadre de traitement des données et valider l’ouverture. Seulement ensuite modifier les verrous dans vercel.json et définir APP_URL HTTPS, DATABASE_URL, AUTH_SECRET, MAIL_DRIVER=smtp et les valeurs approuvées dans Vercel. Les mises en relation privées et les mineurs restent hors de cette activation.

## Sources officielles consultées
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan
- https://vercel.com/docs/plans/hobby
- https://nodemailer.com/smtp
