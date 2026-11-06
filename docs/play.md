# TalentLink Play — itération 0.4

## Parcours

- /play/ : catalogue public paginé, catégories, niveau, durée et nombre de questions, tri récent ou parties terminées.
- /play/[id]/ : démarrage sans compte, trois réponses, correction serveur, explication, progression, score et résumé. Une bonne réponse rapporte 10 points par défaut, une erreur 0, aucun malus ; le barème proposé est validé avec le jeu et figé par tentative.
- /compte/jeux/ : historique privé des parties dont l’utilisateur a demandé la conservation ; accès adulte approuvé requis.
- /compte/contributions/ : atelier réservé aux mentors publiés/vérifiés et aux administrateurs. Brouillon, prévisualisation, soumission, relecture distincte, correction dans une nouvelle version, composition de quiz et publication administrative.
- /api/v1/play/[action] : configuration, catalogue, catégories, tentatives, réponses, recommandations, historique, contributions et indicateurs.

## Questions et publication

Les contraintes PostgreSQL imposent trois options non vides et distinctes, avec un unique index de correction entre 0 et 2. Les schémas serveur refusent les champs inconnus, plusieurs corrections ou un barème injecté par le joueur. Le contenu d’une version est immuable par trigger ; modifier un contenu crée une nouvelle version. L’auteur initial et l’auteur d’une correction ne peuvent pas approuver cette version, y compris s’ils sont administrateurs.

Question : brouillon → soumise → en révision/approuvée/rejetée ; une version approuvée peut être archivée. Une correction est enregistrée dans un nouveau brouillon. Jeu : brouillon → soumis → publié/archivé. La publication transactionnelle contrôle toutes les versions, leur état approuvé et leur catégorie. Les propositions d’un mentor n’apparaissent jamais automatiquement dans le catalogue.

L’atelier signale les autres questions dont l’énoncé normalisé est identique. Ce signal n’est pas une détection sémantique exhaustive : exactitude, sources et droits restent contrôlés humainement. Les questions IA suivent la même procédure. Les douze catégories initiales sont de la taxonomie, pas des quiz prétendument validés.

## Jouer et confidentialité

Le joueur visiteur n’a pas à fournir de coordonnées, de pseudonyme ou d’âge. Un jeton aléatoire est placé dans un cookie HttpOnly, SameSite=Lax et Secure sur HTTPS, avec préfixe __Host et Path=/ sur HTTPS. Seule son empreinte SHA-256 est conservée dans la tentative. Aucun classement ni profil public de joueur n’est créé. La partie expire après 24 heures.

La tentative contient un instantané privé des questions et du barème. L’API n’envoie ni correction, ni explication, ni source avant la réponse. Elle retourne uniquement la question courante avec trois options. Le serveur verrouille la tentative pour corriger et compter les points ; rejouer exactement une réponse est idempotent, changer une réponse passée ou sauter en avant est refusé. Un retrait éditorial ne casse pas une partie déjà commencée.

L’historique nominatif est facultatif, lié à la session vérifiée et à l’accès adulte approuvé. Une autre session ne peut pas lire une partie personnelle, même avec le cookie joueur ; le tableau personnel ne retourne que les parties de son propriétaire. Les réponses sélectionnées et la durée indicative sont conservées côté serveur. La première interface d’historique affiche date, jeu, catégorie et score, pas encore un bilan détaillé transversal.

Les mineurs peuvent uniquement suivre le parcours visiteur public autorisé. Aucun accès privé ou compte mineur n’est activé ; aucun classement public, message, récompense monétaire ou demande de mentorat n’est imposé.

## Mentors et indicateurs

La catégorie du jeu contient un domaine mentor explicite. Les recommandations recherchent uniquement les mentors publiés et vérifiés dans ce domaine, sans modèle opaque. Le visiteur peut consulter les profils ; les restrictions des mises en relation restent celles du module mentorat.

Le clic vers l’annuaire est compté au maximum une fois par tentative. Une demande de mentorat peut être reliée explicitement à une partie personnelle terminée du même utilisateur ; une attribution à la partie d’un tiers ou à une partie visiteur est refusée. Il n’y a pas d’attribution implicite des inscriptions.

L’administration dispose des jeux publiés, parties commencées/terminées, taux de complétion, score moyen, catégories explorées, questions ratées, clics et demandes explicitement reliées. Ces nombres proviennent des parties conservées ; ils ne représentent pas un compteur permanent après purge. Aucun identifiant de joueur n’apparaît dans ces agrégats.

## Activation et entretien

PLAY_ENABLED=false dans .env.example et vercel.json. Aucun nouveau jeu n’est publié dans le PostgreSQL réel par les scripts de test. AUTH_SECRET sert à limiter les écritures par HMAC ; APP_URL doit être l’origine locale exacte ou HTTPS en production. Les écritures exigent Origin exact et JSON limité à 8 Ko. La limitation applicative est complétée par une limite globale ; la rotation du cookie ne remplace pas une protection réseau avant ouverture large.

Les migrations additives 004 et 005 ont été appliquées à PostgreSQL de développement. Elles ne changent ni les comptes, ni leurs rôles ou approbations adultes.

```sh
npm test
npm run test:e2e
npm run db:smoke-play
npm run play:demo
```

play:demo construit une base PostgreSQL embarquée isolée dans .local/, avec un quiz explicitement nommé « Démonstration ». Il démarre uniquement sur 127.0.0.1:4392, sans accès à Neon ni SMTP. Les validations simulées ne constituent pas une validation éditoriale du vrai catalogue. Ctrl+C arrête le serveur.

db:smoke-play utilise PostgreSQL natif dans une transaction annulée : données synthétiques jamais visibles aux autres connexions, aucun e-mail. Ne pas remplacer ce contrôle par un seed du vrai catalogue.

```sh
npm run play:purge -- --expired-guests
```

Cette commande d’entretien explicite supprime les tentatives visiteurs expirées et leurs réponses. Elle préserve les historiques personnels et les parties référencées par une demande. Elle n’est ni exécutée automatiquement ni planifiée dans cette livraison : prévoir sa fréquence et la politique de conservation avant activation publique. L’expiration d’accès seule ne supprime pas les lignes de base.

## Limites

Pas de quiz public publié automatiquement, ni d’avis ou de participation inventés. Couvertures, badges, défis et classements optionnels sont différés. La banque de questions et les listes de gestion sont limitées à 200 versions/100 jeux ; pagination administrative avancée à ajouter si le volume l’exige. L’interface permet création et archivage des catégories ; leur renommage/réactivation est disponible par API administrative. La source facultative est un lien HTTPS, jamais téléchargé par le serveur. Les indicateurs ne constituent pas une évaluation certifiée des compétences. La messagerie reste hors de cette itération.
