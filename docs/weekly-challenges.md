# Défis hebdomadaires Play — 0.23

Dans `/compte/jeux/`, le bilan personnel présente trois défis : trois parties entièrement terminées, deux quiz différents et une partie terminée sur deux jours distincts. Ils sont calculés à partir de l’historique enregistré avec accord, sans inscription supplémentaire au défi.

## Calendrier et calcul

La semaine commence le lundi à 00 h UTC, heure de Conakry, et s’achève au lundi suivant exclu. La date de fin de partie détermine son rattachement, même si elle a commencé la semaine précédente. Les bornes sont calculées par PostgreSQL, indépendamment du fuseau du navigateur et de la session SQL. Les dates futures sont exclues. L’interface indique les dates et le fuseau.

Une partie doit être enregistrée pour le compte, terminée et intégralement parcourue. Une expiration avec questions sans réponse ne compte pas. Les parties anonymes, celles d’autres comptes et les parties hors période sont exclues. Rejouer un quiz augmente la pratique mais pas le nombre de quiz différents. Les jours sont décomptés en UTC ; plusieurs parties le même jour ne créent pas plusieurs jours.

Aucun score minimum, classement, pénalité, récompense matérielle ou appel IA. Les Sprints terminés et enregistrés peuvent compter comme les autres quiz, lorsque leur génération sera activée. Aucun jeu temporairement indisponible n’est requis pour accomplir ces objectifs.

## Confidentialité et limites

Données renvoyées par GET `/api/v1/play/progress/` sous `weekly` : dates de période, fuseau et trois objectifs avec progression bornée et état accompli. Les contrôles privés existants sont conservés : session, compte actif vérifié et accès adulte approuvé, aucun identifiant de compte fourni par le client, lecture seule, réponses no-store/no-referrer.

Aucune migration, nouvelle table, attribution persistante de récompense ou tâche planifiée. Le bilan repart à zéro à chaque semaine ; les semaines précédentes ne sont pas archivées. Une suppression de parties peut faire diminuer la progression. L’écran est actualisé à l’ouverture de Mes jeux ; un onglet laissé ouvert doit être rechargé pour consulter la nouvelle semaine.

## Vérification

Tests isolés : plafonds et seuils, lundi inclus et lundi suivant exclu, jours UTC, parties incomplètes, anonymes, autre compte, répétitions, absence d’accès adulte et changement du fuseau SQL. Les protections HTTP restent couvertes par les tests existants du bilan Play. Aucune partie fictive créée en production ; parcours visuel authentifié à vérifier manuellement.
