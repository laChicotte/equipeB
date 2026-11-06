# Plan et critères d’acceptation

## 0 — Cadrage
Synthèse, architecture, arborescence, modèle initial, tokens et parcours : documents présents. Les décisions différées sont signalées explicitement.

## 1 — Première itération
- Accueil et quatre pages publiques générés sans erreur.
- Navigation clavier et mobile utilisable ; absence de débordement à vérifier à 375, 768 et 1440 px.
- Trois choix de thème ; préférence persistante ; initialisation avant hydratation ; réaction au système.
- Aucun faux chiffre, témoignage, partenaire ou mentor.
- Comptes fermés et absence de collecte de coordonnées explicites.
- Compilation et contrôle TypeScript réussis ; limites de QA publiées.

## 1b — Identité réelle et stockage
Configurer PostgreSQL de développement, migrations Prisma, service mail de test. Inscription adulte, confirmation e-mail, connexion/déconnexion, expiration/révocation des sessions et reset. Tests d’intégration sur base isolée. Refus des sessions et jetons invalides. Aucun mot de passe en clair ou jeton complet dans les logs. Démontrer l’isolation de deux utilisateurs avant ouverture.

## 2 — Mentorat
Implémentation 0.3 : profils texte, revue administrative, annuaire filtrable/paginé, favoris, demandes et objectifs de programmes. Mises en relation toujours fermées ; limites et vérifications dans mentoring.md. Photos, avis, séances et bilans détaillés restent différés.
Profils, vérification administrative, annuaire paginé, filtres, demandes et transitions valides. Rejet serveur pour mentor non vérifié et utilisateur non autorisé. Test des doublons, concurrence et confidentialité.

## 3 — Play (avant messagerie)
Implémentation 0.4 : catalogue et moteur sans compte, versions stables, corrections/score serveur, contributions et publication contrôlée, historique facultatif, recommandations et indicateurs. Activation publique toujours fermée ; démonstration isolée disponible. Badges et classements optionnels restent différés.
Jeux, versions, trois options, correction serveur, scores, explications, historique, contributions, modération et recommandations. Exécuter les 17 scénarios du cahier des charges avant déclaration de livraison. Aucun indice de bonne réponse avant soumission. Une réponse rejouée ne double pas le score.

## 4 — Accompagnement
Messagerie autorisée, blocage, signalements, disponibilités, réservation gratuite, rappels et suivi d’objectifs. Mineurs exclus des parcours privés jusqu’à validation.

## 5 — Administration et qualité
Modération avancée, attestations révocables (non accréditées), indicateurs réels, audit d’accessibilité, sécurité, tests E2E et performance sur connexion limitée.

## 6 — Évolutions
Bibliothèque, communauté, IA assistée avec validation humaine, audio/vidéo, opportunités puis Expo. Chaque activation sensible ou payante nécessite une décision explicite.
