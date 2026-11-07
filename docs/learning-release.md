# Intégration des espaces d’apprentissage sur talentlink.today

Le 7 novembre 2026, l’utilisateur a demandé l’intégration aux vrais comptes du site, et a distingué ce choix d’une démonstration privée. La livraison utilise le projet Vercel talentlink dans talent-link1 et la branche Neon production existants. Elle ajoute bibliothèque, profil d’apprentissage, objectifs personnels, notifications de revue, communauté modérée et atelier des ressources.

## Périmètre

LEARNING_ENABLED=true en production est le seul nouvel indicateur d’activation. AUTH_REGISTRATION_ENABLED et ADULT_REGISTRATION_APPROVED restent false. Les états de la messagerie, du mentorat, du planning, des attestations et leurs approbations restent inchangés. Aucun rôle ni accès adulte n’est attribué. Les contenus et comptes de démonstration ne sont pas importés.

La bibliothèque ne montre que des ressources réellement publiées après une revue distincte de leur auteur. L’état initial vide est attendu. La communauté conserve l’exigence d’un accès adulte approuvé et la modération avant affichage. L’administration des contributions reste accessible aux rôles autorisés. Le pseudonyme accompagne les publications, tandis que les centres d’intérêt, l’ambition, les objectifs, favoris et notifications restent privés.

Les liens vers /prototype/ sont limités au mode de démonstration locale. /prototype/ et /api/prototype/ restent introuvables en production ; la boîte e-mail de test, les mots de passe de démonstration et l’outil d’approbation fictive ne sont pas exposés. La configuration de production conserve DB_DRIVER=postgres, les e-mails SMTP existants et la protection Vercel des URL techniques et des préversions.

## Base et validation avant transfert

Source Neon : projet nameless-unit-88033561, branche br-delicate-darkness-bdhflh27. Plan free_v3 constaté, limite de dix branches, rétention de six heures. Branche de test learning-release-20261107 / br-rough-tree-bdiqr909, créée depuis la source avec compute 0,25 CU et suspension du plan. Elle conserve une copie sensible à accès restreint, sans rattachement au site, aux e-mails ou aux crons. La branche de preuve de récupération antérieure reste intacte.

La migration additive 012_learning_workspace.sql est exécutée transactionnellement avec le verrou de migration habituel et son checksum SHA-256 enregistré. Empreinte : 06dd86413a36804a8a1c675c391643f13ffe6e83294907a83e4cb4f4d1ece59f. Sur la branche de test : douze migrations, un compte, trois quiz publiés, zéro ressource, publication communautaire et objectif personnel. Aucun contenu métier existant n’est modifié par cette migration.

Les essais locaux couvrent les rôles, la revue distincte, les droits déclarés, les liens HTTPS, les favoris privés, l’isolation des objectifs et notifications, le consentement de publication, la communauté réservée aux adultes approuvés et les refus HTTP d’origine/session. La compilation et les tests de livraison doivent réussir avant le transfert. Les contrôles anonymes après publication doivent vérifier les pages, le catalogue vide, les refus des API privées, le refus d’inscription et les routes prototype en 404. Le parcours authentifié du titulaire reste à examiner dans son navigateur ; aucun compte réel de test ni e-mail n’est créé.

## Retour arrière

Remettre LEARNING_ENABLED=false puis redéployer si un problème affecte le module. Les nouvelles tables additives restent en place et les données éventuellement créées sont conservées. Ne pas supprimer de compte ou annuler le schéma pour revenir à l’état fermé. Ne pas réexposer les anciens déploiements ou relancer une ancienne source aux inscriptions ouvertes.
