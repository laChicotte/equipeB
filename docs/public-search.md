# Recherche publique unifiée — version 0.17

Le parcours /recherche/ regroupe les quiz de TalentLink Play, les ressources de bibliothèque et les profils mentors publiés. Il est accessible sans compte depuis la navigation de l’accueil, les espaces Play/apprentissage et le formulaire principal de recherche. Ce dernier remplace son ancien message d’attente par une véritable navigation vers les résultats. Les thèmes suggérés ouvrent une recherche correspondante.

## Utilisation

Saisir de deux à cent caractères, puis lancer la recherche. La frappe seule ne déclenche aucune requête. La vue « Tous les contenus » présente jusqu’à quatre éléments de chaque type et le nombre total de correspondances. Un lien ouvre les résultats de ce type, paginés par douze. Le sujet et les filtres se trouvent dans l’URL pour permettre le partage et le retour arrière. Les requêtes devenues inutiles sont annulées côté navigateur.

Chaque résultat ouvre le jeu, le profil mentor ou directement la ressource. Le nouveau lecteur /bibliotheque/:id/ fournit le texte, les droits et la source éventuelle ainsi que les téléchargements texte/PDF disponibles et l’impression. Il réutilise l’API de lecture publique existante, sans donner accès aux ressources non publiées.

Les critères portent sur les champs publics : titres, descriptions et domaines pour Play ; titres, résumés, textes et catégories pour la bibliothèque ; noms publics, biographies, compétences et domaines pour les mentors. Les filtres de recherche des catalogues individuels profitent aussi de l’ajout des domaines. La recherche utilise des correspondances textuelles insensibles à la casse, sans moteur sémantique, synonyme automatique ni tolérance avancée aux fautes. Les accents restent significatifs. Les ordres des catalogues existants sont conservés, sans score de pertinence inventé.

## Confidentialité et accès

Le serveur réutilise les services de catalogue qui contrôlent la publication. Les quiz doivent conserver toutes leurs questions disponibles ; les ressources doivent être publiées ; les mentors doivent rester vérifiés, publiés, actifs, avec e-mail confirmé et accès adulte approuvé. Un retrait prend effet lors de la prochaine recherche. Les modules Play et bibliothèque fermés par configuration sont exclus et signalés comme indisponibles. La recherche ne modifie aucune activation existante.

Aucune recherche dans les messages, objectifs, bilans, profils d’apprentissage, favoris, notifications, signalements, brouillons ou publications communautaires. Les résultats contiennent uniquement un identifiant public, un titre, un résumé public tronqué, un domaine, un lien interne et, pour les jeux concernés, la mention IA. Aucune correction de quiz, adresse e-mail ni donnée d’administration n’est renvoyée. Le contenu s’affiche comme texte React, sans HTML injecté.

La route GET /api/v1/search/ accepte q, type=all|play|resource|mentor et page. Le schéma est strict, la pagination bornée et les paramètres SQL échappent les caractères de motif. La vue groupée reste à la première page. Une saisie invalide reçoit 400 avant la connexion à la base ; une écriture reçoit 405. Réponses no-store, nosniff et no-referrer. Le parcours ne conserve pas d’historique de recherche dans la base TalentLink. Le sujet figure toutefois dans l’URL et peut apparaître dans l’historique du navigateur ou les journaux techniques de l’hébergeur.

## Intégration et validation

Pas de migration, d’extension PostgreSQL ou de service externe ajouté. Aucune création de compte, ressource, mentor ou jeu en production pour les essais. Aucun appel IA ni envoi d’e-mail. AI_SPRINT_ENABLED reste false.

La suite complète de 132 tests a réussi avant le dernier élargissement aux domaines. Les tests ciblés des catalogues et de la recherche couvrent ensuite les domaines, l’affichage des trois groupes, la pagination de treize ressources, les contenus privés exclus, les modules fermés, les caractères spéciaux et les retraits. Les fixtures sont exclusivement dans une base PostgreSQL embarquée isolée. TypeScript est validé. La revue visuelle et le lecteur d’écran restent à examiner manuellement.

Validation complémentaire : les 36 tests des modules recherche, Play, bibliothèque et mentorat ont réussi après l’élargissement aux domaines, puis la compilation de production a réussi avec 40 pages statiques et les nouvelles routes de recherche/lecture.
