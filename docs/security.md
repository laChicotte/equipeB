# Sécurité et conditions d’activation

Version actuelle : aucune API, aucun compte, aucun outil de suivi, aucune donnée utilisateur à part la préférence de thème locale. Les liens externes et fichiers distants ne sont pas nécessaires au rendu.

## Authentification cible — non implémentée
Mot de passe haché avec un algorithme spécialisé maintenu, sessions aléatoires stockées hachées, cookies HttpOnly/Secure/SameSite, rotation et révocation. Vérification e-mail et réinitialisation via jetons courts, hachés, à usage unique. Réponses neutres contre l’énumération des comptes. Limitation de débit par action ; protection CSRF et contrôle Origin. Validation serveur par Zod ; permissions vérifiées sur chaque ressource.

## Données et opérations
Secrets côté serveur, `.env.example` uniquement dans Git. Stockage S3 privé, types et taille des fichiers contrôlés, liens signés courts, analyse des téléversements. Journal administratif sans secrets, sauvegardes chiffrées et restauration testée. Contrôle de concurrence pour séances, demandes et publication des quiz.

## Mineurs
Aucune fonctionnalité privée avant validation juridique et opérationnelle. Refus côté serveur, même si le navigateur falsifie les champs. Classements publics désactivés. Ne pas se fonder seulement sur une case déclarative pour autoriser une interaction sensible.

Les textes juridiques livrés sont des projets. Vérifier le cadre guinéen auprès d’un conseil compétent avant activation ; aucune conformité juridique n’est revendiquée. Aucune recherche juridique ni analyse de conformité n’a été réalisée dans cette première itération.
