# Séances et objectifs — itération 0.6

Le parcours /compte/planning/ permet à un mentor et un mentoré autorisés de proposer gratuitement un créneau pour un accompagnement accepté, puis de suivre leurs objectifs partagés.

## Séances

Chaque participant peut proposer un intitulé et un créneau futur, entre 15 et 180 minutes, dans les douze prochains mois. L’autre participant confirme. Une proposition est une disponibilité pour cet accompagnement, pas une réservation confirmée. Pour changer de créneau, annuler puis proposer une nouvelle séance. La réservation est gratuite ; aucun paiement, lien de visioconférence ou adresse privée n’est collecté.

Les dates sont transmises avec un fuseau explicite, stockées en timestamptz et affichées dans le fuseau de l’appareil. Les séances confirmées ne peuvent pas se chevaucher pour un même participant, y compris entre accompagnements différents. Des verrous transactionnels par participant sérialisent les confirmations concurrentes. Les créneaux adjacents sont acceptés. Le mentor peut marquer la séance terminée une fois l’heure de fin passée. Chaque modification vérifie la révision de l’élément pour refuser les écrasements concurrents.

Les deux participants peuvent annuler une proposition ou séance confirmée. L’annulation reste possible après suspension ou blocage, tant que l’acteur possède encore son accès adulte et son rôle de participant. La fermeture globale du module suspend l’ensemble de ses API métier. Les séances terminées et annulées restent dans l’historique.

## Objectifs

Les deux participants peuvent ajouter un objectif concret et une échéance facultative, puis choisir : à faire, en cours, atteint ou abandonné. Le suivi compte les objectifs atteints parmi ceux qui ne sont pas abandonnés, sur les éléments chargés. Il s’agit d’un état partagé déclaré par les participants ; aucune certification de compétence n’est émise. Les créations ont un UUID d’idempotence pour éviter les doublons lors d’une nouvelle tentative identique.

## Accès et confidentialité

PLANNING_ENABLED=false par défaut. La production exige aussi PRIVATE_COMMUNICATIONS_APPROVED=true ; les écritures normales exigent MENTORING_ENABLED=true, un programme actif, une demande acceptée, deux comptes vérifiés avec accès adulte approuvé, un mentor toujours publié et vérifié, et aucune relation bloquée. Le serveur relit ces conditions dans la transaction. Les mineurs restent exclus des parcours privés.

Un administrateur n’obtient aucun accès général au planning des utilisateurs. Les données ne sont accessibles qu’aux participants du programme avec le rôle attendu. Les formulaires réutilisent la session HttpOnly, Origin exact, Zod strict, une limite de corps et une limite persistante de 30 écritures par action et par quart d’heure. Les titres sont affichés comme texte React ; aucun titre n’est enregistré dans les journaux d’audit. L’audit conserve acteur, action et identifiant de ressource.

La migration 007 est additive. Les essais isolés utilisent seulement des comptes fictifs ; le contrôle PostgreSQL natif annule sa transaction. Aucun compte réel, approbation adulte ou contenu de démonstration n’est créé par cette livraison.

## Limites

Actualisation manuelle. Les listes sont limitées à 100 accompagnements et aux 100 séances/objectifs les plus récents par programme. Les compteurs portent sur ces éléments chargés. Pas encore de disponibilités récurrentes publiques, synchronisation Google/Outlook, export calendrier, rappels e-mail/push, bilan libre ou attestation. Aucun envoi externe automatique. Les procédures opérationnelles, la rétention et l’ouverture des communications restent à valider avant activation réelle.

## Contrôles

npm test ; npm run test:e2e ; npm run db:smoke-planning ; npm run build ; npm run test:preview.

## Démonstration isolée

npm run planning:demo démarre http://127.0.0.1:4394/compte/planning/ sur une base embarquée neuve. Comptes fictifs mentor-messaging@example.invalid et mentee-messaging@example.invalid ; mot de passe réservé à la démonstration : TalentLink-planning-demo-2026. Une proposition et un objectif fictifs sont préchargés. Se connecter comme mentoré pour confirmer le créneau, puis avancer l’objectif. La bannière indique la simulation. Aucun accès à Neon ou SMTP ; Ctrl+C arrête le serveur.
