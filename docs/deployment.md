# Déploiement — 0.2

## Deux périmètres distincts
La vitrine 0.1 est publiée en privé sur Sites : https://talentlink-guinee-fondations.driedlabel1.chatgpt.site

Son identité est conservée dans `.openai/hosting.json`, avec un ancien export `out/`. Ce fichier ne constitue pas une configuration valide pour héberger le nouveau serveur Node.js. Ne pas publier cet ancien export en prétendant activer l’authentification. Aucun changement d’audience n’est effectué.

L’authentification 0.2 se développe et se teste comme une application Next.js Node.js. Retirer le mode export était nécessaire aux API et sessions. Il faut choisir un hébergement compatible avant l’ouverture en ligne ; aucun service payant n’est engagé par cette livraison.

## Serveur Node.js
Node >=22.18, PostgreSQL accessible et SMTP. Exécuter npm ci, db:check, db:migrate, test, typecheck puis build. Démarrer avec npm start derrière HTTPS. Le processus écoute par défaut sur 127.0.0.1. APP_URL est l’origine HTTPS finale ; cookies Secure, HttpOnly, SameSite=Lax et __Host-. Les requêtes POST d’une autre origine sont rejetées.

Neon utilise son pilote officiel WebSocket sécurisé lorsque le port 5432 n’est pas accessible. Les transactions utilisent un même client et SET LOCAL search_path, sans option de démarrage incompatible avec un pooler. Aucune désactivation de la validation TLS. Pour un PostgreSQL distant classique, utiliser sslmode=verify-full.

## Variables privées
DATABASE_URL, AUTH_SECRET, SMTP_URL et MAIL_FROM côté serveur. AUTH_ENABLED=false et AUTH_REGISTRATION_ENABLED=false tant que le traitement réel n’est pas validé. Ne pas utiliser NEXT_PUBLIC_* pour une valeur sensible. MAIL_DRIVER=file et DB_DRIVER=pglite sont uniquement des facilités de développement.

## Vérifications avant ouverture réelle
Configurer et tester les vrais e-mails de vérification/reset, sans afficher leurs jetons. Valider le responsable de traitement, les mentions légales et les consentements. Préparer rétention/purge des compteurs, sessions et journaux, sauvegardes chiffrées et restauration testée, supervision, incidents et contrôle des comptes privilégiés. Tester l’hébergement HTTPS final et ses cookies. Les parcours privés de mentorat et des mineurs restent fermés.

## Retour arrière
Dans le sandbox Windows, TALENTLINK_KEEP_BUILD_OUTPUT=true permet de conserver les dossiers .next préparés lorsque leur recréation est refusée par le système. Ne pas utiliser cet indicateur pour remplacer une compilation propre en CI ou sur le futur hébergement. Le nettoyage standard reste activé par défaut.

Le commit 40a8053 et l’archive 0.1 préservent la vitrine antérieure. Ne pas annuler ou effacer automatiquement un schéma de données après ouverture : utiliser des migrations compatibles, sauvegardes et restauration validée. Les tests natifs ne suppriment que le compte fictif qu’ils ont eux-mêmes créé.
