# Publication des premiers quiz — 6 novembre 2026

L’utilisateur a répondu « OUI » à la demande explicite de validation des trois quiz et de leurs douze questions, après livraison du dossier de relecture et mise à disposition dans l’atelier. Cette décision humaine a été enregistrée au nom de son compte administrateur existant. Aucun auteur, compte ou relecteur fictif n’a été créé.

## Intégrité et publication

Le script publish-editorial.ts est limité au paquet approuvé par son empreinte SHA-256 canonique f0ff5ab98188947b855c34196ce8554f0493a0cb5dcaa81e91973c4e01bdd439. Il vérifie aussi les empreintes des lots importés, l’ordre et le contenu exact de toutes les versions, leurs sources et leurs états avant toute décision. Les versions rejetées ou archivées sont refusées, pas réactivées automatiquement.

Un essai complet a été effectué dans une transaction annulée, puis la publication réelle a approuvé les douze questions, composé les trois jeux, soumis et publié ces jeux dans une seule transaction. Les méthodes existantes reviewQuestion, createGame, submitGame et reviewGame ont appliqué les contrôles métier et les journaux d’audit. Aucun trigger ou contrôle d’accès n’a été contourné. La note de revue référence la validation explicite donnée dans le chat.

Le script cherche une composition existante identique avant création ; une vérification postérieure en mode transaction annulée contrôle le rejeu sans nouveau quiz. Les droits administrateur sont relus en base. Aucun secret n’est journalisé. Aucun changement d’environnement, de rôle ou de protection Vercel n’est nécessaire : les données sont visibles immédiatement par le déploiement existant.

## Jeux publics

- [Les bons réflexes numériques](https://talentlink.today/play/f2feadc8-8bb9-455f-b709-56a643625bc9/) — quatre questions, trois minutes indicatives, 10 points par bonne réponse.
- [Premiers repères dans le Système solaire](https://talentlink.today/play/b4399e8d-507e-416e-b138-e8dc2d541b34/) — quatre questions, trois minutes indicatives, 10 points par bonne réponse.
- [L’eau change et circule](https://talentlink.today/play/26419054-10ae-4902-8bb7-7992d7080ec3/) — quatre questions, trois minutes indicatives, 10 points par bonne réponse.

## Vérification après publication

Le script check-published-editorial.ts a contrôlé les trois pages et leur présence au catalogue public, puis joué chaque quiz sans compte. Trois choix sont présents ; la question initiale ne retourne ni correctIndex ni explication. Quatre réponses correctes donnent 40 points et un résultat complet à 100 %. Le rejeu de la première réponse laisse le score à 10 et le nombre de réponses à un.

Les trois parties techniques de contrôle ont été supprimées après vérification avec leur identifiant, identifiant de jeu, empreinte de cookie propriétaire et user_id IS NULL. Aucune partie d’un autre visiteur ou historique personnel n’est touché. Cette suppression ciblée empêche de gonfler les compteurs de parties terminées avec les essais techniques.

Fichier éditorial contenant les corrections : HTTP 404. API privée des questions : HTTP 401 sans session. La configuration publique conserve registrationEnabled=false. Les inscriptions et fonctions privées restent fermées. Aucun e-mail ou message envoyé.

TypeScript réussi pour les deux scripts d’administration. Les contrôles intégrés précédents (89 tests) restent la base de validation du moteur et des garde-fous ; aucune nouvelle suite de tests fictifs n’est comptabilisée comme utilisation réelle. Les contrôles de ce jour sont des requêtes HTTP réelles, pas un audit visuel navigateur ou lecteur d’écran.
