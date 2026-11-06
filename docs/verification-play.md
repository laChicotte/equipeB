# Vérification TalentLink Play — 6 novembre 2026

## Résultats

- 43 tests unitaires/intégrés réussis : identité, mentorat et Play, sur bases PostgreSQL embarquées isolées.
- TypeScript et compilation serveur Webpack réussis ; 21 pages prégénérées et routes dynamiques.
- Test HTTP Next.js réussi : catalogue, démarrage sans compte, cookie HttpOnly, trois choix, refus d’une autre session, correction, score 30/30, rejeu sans double comptage, refus du score client et CSRF, ainsi que les parcours identité/mentorat précédents.
- PostgreSQL natif : migration 004 puis 005 appliquées explicitement au développement ; questions, versions, modération, publication, partie visiteur, score, rejeu et recommandations contrôlés dans une transaction annulée. Aucun quiz synthétique conservé dans Neon ou publié aux autres connexions.
- Préversion de production contrôlée avec comptes et Play désactivés, sans secrets ou URL d’application configurés. Le contrôle a détecté puis permis de corriger un refus inutile de configuration lorsque Play est fermé.
- Navigateur : partie complète sans compte sur le serveur de démonstration isolé. Bonne réponse, erreur expliquée, bonne réponse ; résultat 20/30, 67 %, deux bonnes réponses, une erreur et récapitulatif pédagogique.
- Interface sombre à 375 px : trois options utilisables et largeur du contenu ne dépassant pas le viewport. Interface claire et résultat inspectés également. Barre de progression incrémentée dès la validation.
- Aucun e-mail réel émis, aucune promotion de compte, aucun accès adulte ou classement public activé. Aucun nouveau déploiement Vercel.

Le build Windows utilise le contournement local déjà documenté : dossiers de sortie préparés et TALENTLINK_KEEP_BUILD_OUTPUT=true. Le nettoyage normal reste le défaut hors de ce contournement ; ne pas recopier cette variable dans Vercel.

## Couverture des critères du cahier des charges

| Critère | Preuve |
| --- | --- |
| Ouverture publique et jeu sans compte | HTTP réel et navigateur sur démonstration isolée |
| Trois réponses, une correction | Schéma strict et contraintes SQL, tentatives d’insertion invalide refusées |
| Correction et score côté serveur | Refus du champ points, réponse future refusée, 10/0 points et résumé vérifiés |
| Explication et résultat | Tests d’intégration, HTTP, partie navigateur à 67 % |
| Contribution mentor vérifié | Mentor non vérifié et mentoré refusés, mentor vérifié accepté |
| Refus d’auto-approbation | Auteur initial et administrateur auteur d’une correction refusés |
| Approbation administrative | Relecteur distinct autorisé, audit de décision présent |
| Questions non approuvées exclues | Composition et publication bloquées, retrait effectif du catalogue |
| Jeux invalides non publiables | Questions non approuvées, catégorie et doublons contrôlés |
| Isolation de deux joueurs | Cookie étranger et compte tiers refusés, historique privé isolé |
| Mineurs | Visiteur sans coordonnées, refus de l’historique personnel sans accès adulte approuvé, aucun classement |
| Thème sombre | Contrôle navigateur à 375 px |
| Recommandations cohérentes | Mentors publiés du domaine Sciences uniquement dans le test |

## Limites de validation

La validation éditoriale des vrais contenus reste humaine et n’est pas remplacée par les tests. L’atelier administratif a été vérifié via schémas/services/API ; son usage complet avec des administrateurs réels n’a pas été effectué dans le navigateur. Les tests simultanés de correction s’exécutent sur la base embarquée ; le contrôle PostgreSQL natif vérifie les mêmes requêtes mais pas une charge multi-connexions. La purge visiteurs est testée en base isolée, non exécutée sur les données réelles et non planifiée automatiquement. Les limites produit détaillées figurent dans play.md.
