# Bilan personnel des contributions Play — 0.22

Dans `/compte/contributions/`, un mentor habilité ou un administrateur consulte son propre bilan. Un administrateur voit uniquement ses créations dans ce bloc, même si le reste de son atelier donne accès à la modération globale.

## Mesures

- Questions par état de leur dernière version, une seule fois par question dont le compte est auteur. Une révision par un administrateur reste attribuée à l’auteur initial. Un nouveau brouillon remplace l’ancienne version dans le bilan, sans modifier les versions utilisées dans les quiz.
- Quiz personnels par état : brouillon, soumis, publié, archivé. Les quiz composés de questions d’autres auteurs restent attribués à leur créateur.
- Quiz réellement jouables : publiés, catégorie active, au moins une question et aucune version retirée. Le nombre peut être inférieur au total publié.
- Parties entièrement terminées : date de fin présente et toutes les questions du snapshot parcourues. Les parties anonymes et enregistrées sont incluses, les répétitions aussi. Aucun décompte de personnes distinctes ni de maîtrise pédagogique.

Les générations Sprint IA sont exclues des deux compteurs éditoriaux et des parties. Les agrégats portent sur toute la base accessible, au-delà des limites de 200 versions et 100 quiz des listes de l’atelier. L’entretien des anciennes parties peut diminuer le total : il ne s’agit pas d’un compteur historique garanti.

## Accès et confidentialité

GET `/api/v1/play/contribution-progress/`, sans paramètre. POST et les autres méthodes refusés ; paramètres supplémentaires refusés. Session obligatoire, utilisateur actif et vérifié relu en base. Même habilitation que l’atelier : administrateur, ou mentor avec accès adulte approuvé et profil publié/vérifié. Un profil suspendu perd cet accès. Aucun identifiant de compte fourni par le client n’est accepté.

Réponse limitée aux compteurs par état, au nombre de quiz jouables et au nombre de parties entièrement terminées. Aucun joueur, réponse, score, détail de partie, contact ou secret. Réponses no-store/no-referrer. Aucun classement public, notification externe, appel IA ou nouvelle collecte.

Pas de migration et aucun changement d’activation des modules. L’interface recharge le bilan après les actions de l’atelier, propose une actualisation explicite et annule les requêtes lors du démontage.

## Vérification

Tests isolés : attribution mentor/admin distincte, nouvelle version sans double compte, exclusion IA, totaux au-delà de la limite des listes, état de publication distinct de la disponibilité, parties agrégées et contrôles HTTP. Les tests de suspension et désactivation vérifient les habilitations en base. Le parcours visuel authentifié reste à vérifier manuellement.


## Livraison du 8 novembre 2026

Source `47d3ffb52a32a96d09f08c2e863e21d6be106752`, version 0.22.0. Déploiement `dpl_CccsGEt5n1DDXsRDiKqiacjt8nhZ` READY sur talentlink.today. Aucune migration, création de compte, partie artificielle ou modification de données métier en production.

162 tests réussis, TypeScript et compilation réussis (42 pages statiques). Vérifications HTTP en production : atelier 200 ; bilan anonyme 401 avec no-store/no-referrer ; POST 405 ; paramètre userId refusé 400. Catalogue public 200 (trois quiz), inscriptions adultes toujours ouvertes, Sprint IA toujours désactivé. L’URL technique Vercel reste protégée (302). Les résultats autorisés ont été vérifiés sur fixtures isolées ; aucune session réelle empruntée et aucun contrôle visuel authentifié déclaré.
