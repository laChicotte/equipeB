# Authentification — itération 0.2

## Ce qui est développé
Inscription adulte (mentoré ou mentor), consentements versionnés, vérification d’e-mail, renvoi de vérification, connexion, consultation du compte courant, déconnexion, mot de passe oublié et réinitialisation. Les permissions sont appliquées côté serveur et les sessions sont révocables.

Les comptes réels ne sont pas activés par cette livraison. Les textes juridiques restent préparatoires. Une déclaration de majorité n’est pas une preuve d’âge. Le mentorat privé et la messagerie restent refusés par le serveur pour tous les comptes à ce stade ; aucune variable d’environnement ne suffit à ouvrir ces parcours.

## API `/api/v1/auth`

| Méthode et action | Entrée | Résultat |
|---|---|---|
| GET `/config` | aucune | disponibilité des comptes et des inscriptions |
| POST `/register` | email, password, role, adultConfirmed, termsAccepted, privacyAccepted, mentorCharterAccepted si mentor | réponse neutre 202 ; e-mail de vérification si éligible |
| POST `/login` | email, password | cookie de session HttpOnly, 200 |
| GET `/session` | cookie | compte du seul utilisateur connecté, sinon 401 |
| POST `/logout` | `{}` et cookie | révocation et suppression du cookie |
| POST `/forgot-password` | email | réponse neutre 202 |
| POST `/resend-verification` | email | réponse neutre 202 |
| POST `/verify-email` | token | vérification à usage unique |
| POST `/reset-password` | token, password | nouveau hachage, révocation de toutes les sessions |

Les POST exigent un en-tête Origin égal à l’origine APP_URL et du JSON. Les corps dépassant 8 Kio sont refusés. Les champs inconnus et les rôles privilégiés à l’inscription sont rejetés. Erreurs : 400 validation/lien invalide, 401 identification, 403 permission/vérification/origine, 413 taille, 415 format, 429 débit, 503 configuration ou service. Les réponses sensibles sont `no-store`.

## Configuration locale
Node.js 22.18 minimum ; environnement vérifié avec Node 26. Copier `.env.example` dans `.env.local` en conservant votre connexion existante. Ne pas publier ce fichier. Renseigner APP_URL, AUTH_SECRET aléatoire d’au moins 32 caractères et le pilote de mail.

```sh
npm ci
npm run db:check
npm run db:migrate
npm test
npm run test:e2e
npm run db:smoke
npm run dev -- --hostname 127.0.0.1
```

Pour les seuls comptes fictifs de développement : AUTH_ENABLED=true, AUTH_REGISTRATION_ENABLED=true, MAIL_DRIVER=file. Les messages sont alors écrits dans `.local/mail/`, jamais dans les réponses API. Les liens personnels utilisent un fragment `#token=...`, retiré de l’URL dès lecture par le formulaire. Ouvrir exactement http://127.0.0.1:3000 si APP_URL correspond à cette origine ; localhost et 127.0.0.1 sont deux origines différentes.

`DB_DRIVER=pglite` permet un développement PostgreSQL embarqué dans `.local/pgdata` sans serveur externe ; ce pilote est refusé en production. Les migrations ne se lancent jamais automatiquement au démarrage web. Les tests `npm test` utilisent une base embarquée isolée en mémoire, pas votre base ni votre SMTP.

Votre connexion Neon est reconnue automatiquement et utilise le pilote officiel @neondatabase/serverless en WSS sécurisé sur 443, compatible avec les transactions interactives. Les autres serveurs PostgreSQL utilisent pg et TLS selon leur configuration. Les réglages de schéma sont locaux à chaque transaction, compatibles avec une URL de pooler.

## E-mails
En production : MAIL_DRIVER=smtp, SMTP_URL (`smtp://...` ou `smtps://...`) et MAIL_FROM obligatoires ; STARTTLS est exigé pour une connexion SMTP non implicitement TLS. Le mode fichier est interdit en production. Aucun envoi via un fournisseur réel n’est déclaré vérifié sans test spécifique.

Un échec d’envoi conserve le compte non vérifié et un événement serveur sans coordonnées. La réponse publique reste neutre afin de ne pas révéler l’existence d’une adresse. L’utilisateur peut demander un nouveau lien. Il n’y a pas encore de file d’envoi durable avec reprise automatique ; ajouter la surveillance SMTP avant l’ouverture réelle.

## Migrations et tests natifs
Le schéma PostgreSQL est `talentlink`. Le registre de migrations contient un checksum ; une migration déjà appliquée ne doit pas être modifiée. Chaque exécution prend un verrou transactionnel. La migration initiale historique est conservée ; 002 ajoute les champs et index d’authentification.

`db:smoke` crée un compte fictif avec un identifiant aléatoire sur le domaine réservé example.invalid, teste le cycle complet et le reset concurrent, puis supprime uniquement ce compte et ses événements dans un bloc finally. Aucun SMTP n’est utilisé. Les compteurs de débit pseudonymes correspondants expirent au bout de 15 minutes ; leur purge est une tâche d’exploitation à prévoir. Refus du script lorsque NODE_ENV=production.

## Déploiement
Les scripts Next.js utilisent Webpack pour éviter les jonctions Turbopack refusées dans le sandbox Windows. Cette décision ne change pas les routes ou les services métier.

Cette version nécessite un hébergement Next.js Node.js, une base PostgreSQL et un service e-mail. L’hébergement Sites existant est statique : il continue à servir la vitrine 0.1. Ne pas déployer le dossier `out/` comme s’il contenait ce backend. Aucun service payant, compte réel ou fonction sensible n’est activé automatiquement. Voir deployment.md pour les conditions d’ouverture.
