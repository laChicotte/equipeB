# Administration — itération 0.7

Le tableau de bord /administration/ réunit les liens vers la revue des mentors, l’atelier de quiz et les signalements. Il utilise les API GET /api/v1/administration/overview/ et /api/v1/administration/audit/.

## Autorisations

Chaque lecture exige une session valide et un compte administrateur actif avec adresse vérifiée, relu en base. Le rôle envoyé par le navigateur ou mémorisé avant une modification ne suffit pas. Un modérateur conserve son accès spécifique aux signalements mais ne peut pas lire ce tableau global. Aucun changement de rôle, accès adulte ou état de compte n’est proposé par ce tableau.

Les réponses sont privées, no-store, nosniff et no-referrer. Le tableau n’accède pas aux textes des conversations, aux objectifs individuels ou aux coordonnées. Les identifiants UUID du journal restent des données pseudonymes à protéger ; ils ne rendent pas le journal anonyme.

## Indicateurs

Les nombres proviennent de requêtes SQL, sans données de démonstration ajoutées à la base réelle : comptes actifs, comptes actifs vérifiés, mentors soumis et publiés éligibles, versions de questions et jeux en attente, demandes en attente, accompagnements actifs, signalements en attente, séances confirmées à venir ou en cours et objectifs déclarés atteints. Les états métier sont conservés même si le module est fermé ; une séance confirmée dans un programme suspendu peut donc rester comptée jusqu’à son annulation. Un objectif atteint ne constitue pas une attestation.

Les états d’activation des modules sont calculés depuis les mêmes verrous d’environnement. Aucun secret, URL de base, clé SMTP ou valeur brute de configuration n’est retourné. L’accès privé Vercel ne vaut pas validation d’ouverture des communications.

## Journal

Le journal affiche seulement date, action, domaine, acteur et identifiant de ressource. Filtre facultatif par comptes, mentorat, Play, messagerie ou planification. Pagination serveur de 50 événements, curseur date + UUID pour préserver les événements simultanés. La précision PostgreSQL en microsecondes est conservée dans le curseur. Les index de la migration additive 008 soutiennent ce parcours. Le filtre est strictement validé et les paramètres SQL ne sont jamais interpolés.

L’actualisation recharge les indicateurs et le début du journal. Pas d’édition, suppression ni export du journal par cette interface. Les journaux ne sont pas présentés comme inviolables : les droits opérationnels de base et la conservation doivent être organisés avant ouverture large.

## Vérifications et limites

Tests d’isolation des rôles, compte désactivé/non vérifié, rôle modifié en base, valeurs SQL, absence de contenu privé, curseurs avec dates identiques et microsecondes, réponses HTTP et absence de secrets. Contrôle PostgreSQL dans une transaction annulée. Aucun e-mail ni message à une personne réelle.

La revue du code vérifie les libellés de formulaire, les états de chargement, les erreurs avec reprise, les listes et les retours accessibles. Elle ne remplace pas un audit navigateur avec technologies d’assistance. Les attestations révocables sont ajoutées en 0.8 (voir attestations.md). L’audit complet d’accessibilité, la performance sur connexion limitée et les procédures opérationnelles restent les étapes suivantes de la phase 5.
