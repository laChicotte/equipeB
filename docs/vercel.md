# Hébergement Vercel — lancement découverte

Le choix public du 6 novembre 2026 remplace le régime privé intégral décrit ci-dessous. Le périmètre, les variables, le contact et le retour arrière actuels sont décrits dans [public-launch.md](public-launch.md). Les domaines de production deviennent publics après validation de la nouvelle source ; les inscriptions et fonctions sensibles restent fermées.

## Historique de la version privée

# Hébergement Vercel — version privée

Le 6 novembre 2026, l’utilisateur a demandé de regrouper toutes les fonctionnalités développées sur Vercel avec talentlink.today, puis a choisi explicitement un accès privé protégé par sa connexion Vercel.

Projet : talentlink, espace talent-link1, identifiant prj_lVIrejwZbhcaJqwyJYJ9Eu86R2BL. Domaine principal : https://talentlink.today ; www.talentlink.today redirige en 308 vers le domaine principal. Les enregistrements Resend existants sont conservés ; aucun achat, transfert, changement de nameservers ou de plan.

## Configuration par environnement

vercel.json définit uniquement Next.js, npm ci et npm run build. Les verrous ne sont plus codés dans ce fichier : leurs valeurs viennent désormais de l’environnement Vercel. En l’absence de valeurs, le code et .env.example gardent les fonctions désactivées.

Production privée : AUTH_ENABLED=true, AUTH_REGISTRATION_ENABLED=true, REAL_ACCOUNTS_APPROVED=true, PLAY_ENABLED=true, MENTORING_ENABLED=false, MESSAGING_ENABLED=false, PLANNING_ENABLED=false, ATTESTATIONS_ENABLED=false, ATTESTATIONS_APPROVED=false, PRIVATE_COMMUNICATIONS_APPROVED=false. APP_URL=https://talentlink.today, DB_DRIVER=postgres, MAIL_DRIVER=smtp, MAIL_FROM=TalentLink <notifications@talentlink.today>. DATABASE_URL est transférée depuis la configuration PostgreSQL de développement autorisée ; un AUTH_SECRET distinct a été généré pour le cloud. Ces secrets sont stockés comme variables sensibles de production, jamais dans Git, un livrable ou le chat. La clé MESSAGING_RESEND_API_KEY du Marketplace est conservée sans lecture.

Ces valeurs autorisent les essais derrière Vercel Authentication, pas une ouverture publique. La protection du projet doit rester enabled=true et deploymentType=all. Ne pas la retirer : cela exposerait l’inscription et Play. L’ouverture publique exige une décision distincte et la finalisation des textes/procédures. Les mineurs et mises en relation privées ne sont pas activés. La Preview n’hérite pas de ces variables de production ; elle reste fermée par défaut.

## Accès

Ouvrir le domaine principal, se connecter à Vercel avec le compte autorisé, puis se connecter au compte TalentLink. Les formulaires doivent utiliser talentlink.today : les URL techniques de déploiement ne correspondent pas à APP_URL et leurs écritures peuvent être refusées par le contrôle Origin.

Avec son accord explicite, le compte désigné par l’utilisateur devient administrateur. Les sessions antérieures sont révoquées. Aucun autre rôle ni accès adulte n’est modifié. L’administration permet l’examen des mentors et des quiz ; les contenus ne sont pas approuvés automatiquement et un auteur ne peut pas approuver sa propre question.

L’annuaire et les jeux réels peuvent être vides tant qu’aucun contenu réel n’a été validé. Les données de la démonstration locale ne sont pas copiées dans Neon. Les API des demandes/programmes sont déployées, avec le verrou métier conservé jusqu’à validation des procédures.

## Vérification et maintenance

Inspecter le déploiement, ses journaux, les domaines, HTTPS et la protection retournée par Vercel. Les anciens tests locaux (43 tests, HTTP, build et PostgreSQL natif) ne prouvent pas à eux seuls le fonctionnement de chaque parcours dans le cloud. Une vérification manuelle authentifiée de connexion/e-mail reste nécessaire après publication privée.

npm run deploy:check contrôle uniquement l’environnement local fermé, pas les variables du projet Vercel. Ne pas considérer son succès comme une preuve de fermeture du cloud. Les migrations 001 à 009 sont déjà appliquées à PostgreSQL de développement ; elles ne sont pas exécutées automatiquement au déploiement. Organiser sauvegardes, séparation des données de production et entretien avant ouverture large.

Les premières préversions 0.2 restaient sans identifiants Neon et sans comptes ouverts ; elles sont remplacées par cette livraison regroupée à l’accès privé. La vitrine statique Sites historique reste séparée et ne représente pas le backend à jour.
