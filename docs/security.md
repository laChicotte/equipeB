# Sécurité — authentification 0.2

## Accès et périmètre
AUTH_ENABLED et AUTH_REGISTRATION_ENABLED sont false par défaut. Les formulaires ne collectent pas de coordonnées lorsque le service annonce sa fermeture. Les comptes fictifs servent aux tests ; aucun compte réel n’est ouvert automatiquement. L’espace courant est protégé par une vérification de session côté API, même si le navigateur modifie son affichage.

## Mots de passe et sessions
Scrypt : N=131072, r=8, p=1, sel aléatoire 128 bits, sortie 512 bits ; comparaison en temps constant. Mot de passe de 12 à 128 caractères à la création/reset, aucune transformation silencieuse des espaces. Deux calculs simultanés au maximum, file bornée à huit demandes. Les erreurs de capacité restent génériques.

Sessions opaques aléatoires 256 bits, seul SHA-256 du jeton en base. Expiration absolue de sept jours. Cookie HttpOnly, SameSite=Lax, Path=/, Secure et préfixe __Host- en HTTPS. Aucun jeton de session dans localStorage. Une connexion peut révoquer le précédent cookie ; la déconnexion révoque en base et efface le cookie. Toute réinitialisation révoque les sessions du compte. Le statut désactivé et le rôle sont relus en base.

## Liens et e-mails
Vérification valable 24 heures, reset 30 minutes, jetons 256 bits à usage unique, uniquement hachés en base. Verrou utilisateur puis verrou de jeton dans chaque transaction ; le reset et la connexion se synchronisent sur le même utilisateur. Les scanners de liens ne valident rien : la consommation exige un POST explicite. Le fragment d’URL contenant le jeton est retiré avant les appels API. Pages de compte noindex et referrer no-referrer.

En développement, le transport fichier écrit les e-mails fictifs dans `.local/mail/`. Ce mode est refusé en production, où SMTP/TLS est requis. Aucun jeton ne figure dans les réponses JSON ni dans les logs applicatifs. Les erreurs d’envoi restent neutres ; le compte non vérifié peut demander un nouvel envoi. La surveillance SMTP et une reprise durable des e-mails restent à préparer avant ouverture réelle.

## Requêtes, abus et permissions
Validation Zod côté service, SQL paramétré, transactions sur un client unique. Les POST exigent JSON, une origine exacte APP_URL et un corps <=8 Kio. Les requêtes explicitement cross-site sont refusées ; aucune origine issue d’un en-tête X-Forwarded n’est utilisée pour autoriser une action. Pas de CORS permissif.

Limites persistantes : cinq tentatives par action et adresse normalisée en 15 minutes, dix par jeton, budget global de 500 POST en 15 minutes. Les identifiants de compteurs sont des HMAC avec AUTH_SECRET, sans adresse IP ou e-mail en clair. La purge physique des compteurs expirés et la politique de rétention des journaux doivent être ajoutées à l’exploitation. Les compteurs expirés ne bloquent plus l’accès.

Inscription : mentoré ou mentor seulement, consentements explicites et charte obligatoire pour les mentors. Aucun mentor n’est vérifié automatiquement. Les permissions administrateur/modérateur ne proviennent jamais des données envoyées par le navigateur.

## Mineurs
Les mineurs déclarés ne peuvent pas s’inscrire dans cette étape. La déclaration de majorité n’est pas une preuve d’âge. Les permissions de mentorat privé sont refusées pour tous les utilisateurs, même si un champ de majorité ou un rôle est falsifié. Le futur parcours des mineurs et la vérification des mentors nécessitent une procédure humaine, juridique et opérationnelle avant activation.

## Infrastructure
Secrets uniquement dans .env.local ou le gestionnaire d’environnement serveur, jamais dans Git ou dans les archives de livraison. PostgreSQL est isolé dans le schéma talentlink. Les migrations sont explicites, atomiques, verrouillées et contrôlées par checksum. Pas de modification destructive automatique de données existantes. Neon utilise WSS chiffré avec vérification TLS ; les autres connexions distantes exigent sslmode=verify-full en production. Aucun certificat n’est accepté sans validation.

Avant comptes réels : valider les textes juridiques et l’identité de l’éditeur, durées de conservation, sauvegardes/restauration, notifications d’incident, SMTP, hébergement Node.js, charge du hachage et audit d’accessibilité/sécurité. Aucun audit juridique ou pentest complet n’est revendiqué.

Référence de paramétrage : https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
