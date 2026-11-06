# Préparation des inscriptions adultes — itération 0.12

## Périmètre demandé

L’utilisateur a demandé de préparer l’ouverture des inscriptions adultes, pas de les activer. Le site reste en découverte publique avec AUTH_REGISTRATION_ENABLED=false. ADULT_REGISTRATION_APPROVED=false est ajouté en production. Les mises en relation, messages, séances, émissions d’attestations et parcours des mineurs restent fermés.

## Préparation technique

En production, les deux indicateurs AUTH_REGISTRATION_ENABLED et ADULT_REGISTRATION_APPROVED doivent être true pour rendre l’inscription disponible. Le second ne peut pas être envoyé dans le formulaire. Le mode développement conserve l’activation locale pour les essais isolés. Le tableau de bord administrateur affiche l’état effectif des inscriptions.

La majorité déclarée est obligatoire. Le formulaire ajoute une lecture explicite des règles des comptes adultes, avec version 2026-11-06-adult-v1. Le serveur exige exactement cette version ; un ancien formulaire reçoit 409 et doit être actualisé. Les conditions, la confidentialité et, pour un candidat mentor, la charte restent aussi requises. Les accords sont enregistrés avec leur version et leur date ; aucun consentement historique n’est réécrit.

La confirmation e-mail est nécessaire avant connexion et ne vaut jamais approbation de l’âge. Le rôle choisi est limité à mentoré ou mentor ; aucun rôle de modération ne vient du formulaire. La validation de l’e-mail laisse adult_access_approved_at vide. Une candidature mentor reste privée tant qu’elle n’a pas été examinée et publiée selon les règles métier.

Limites persistantes : cinq tentatives d’inscription par adresse sur quinze minutes, trente demandes admissibles au schéma par fenêtre globale et cent POST d’inscription par fenêtre au niveau HTTP. Le budget HTTP d’inscription est séparé du budget des autres actions de compte pour éviter que ces demandes n’épuisent celui des connexions. Les limites ne promettent pas une protection absolue contre les abus ou la disponibilité du fournisseur de mail.

Les règles préparées sont consultables sur /inscriptions-adultes/, avec noindex. Elles expliquent explicitement que l’inscription reste fermée. Aucun nouveau champ de date de naissance, pièce d’identité ou donnée intime n’est collecté.

## Conditions restantes avant activation

| Point | État actuel | Décision ou preuve attendue |
|---|---|---|
| Sauvegarde et récupération Neon | Non vérifiées, confirmé par l’utilisateur | Exécuter recovery-drill.md et conserver un résultat réel |
| Règles, conditions et confidentialité pour de nouveaux comptes | Règles préparées ; documents publics actuels décrivent encore la découverte fermée | Valider les textes d’ouverture et leur nouvelle version, notamment données des profils mentors et transferts des prestataires |
| Conservation et clôture des comptes | Traitement manuel existant ; pas de suppression automatique des comptes | Fixer les durées, les responsabilités et la procédure de demande sans mot de passe |
| E-mail | Connexion SMTP/TLS vérifiable sans envoi ; envoi de validation déjà éprouvé dans les étapes antérieures | Vérifier quotas actuels, surveillance des échecs et un parcours réel avec destinataire explicitement autorisé avant activation |
| Support et incidents | Téléphone public fourni ; réception e-mail du domaine reportée | Confirmer la prise en charge des demandes et incidents ; ne pas promettre une boîte e-mail réceptrice |
| Accès adultes approuvés et mentors | Aucune approbation automatique | Garder une décision séparée, avec procédures adaptées, avant tout accès privé |
| Ouverture publique | Non autorisée par la demande de préparation seule | Après les validations ci-dessus, décider explicitement de l’activation |

Il ne faut pas simplement basculer les deux variables : le texte des conditions et de la confidentialité actuellement publié dit que les inscriptions sont fermées. La préparation technique n’est pas une certification juridique ou une preuve de restauration.

## Vérification et retour arrière

Les essais utilisent des comptes fictifs et un transport e-mail local en mémoire/fichier. Les tests couvrent refus des mineurs déclarés, accords absents ou périmés, version persistée, confirmation e-mail sans accès adulte approuvé, limites globales avec adresses différentes et conservation du budget de connexion face aux inscriptions refusées.

Après déploiement de la préparation, contrôler que le catalogue conserve les trois quiz, que /inscriptions-adultes/ répond et annonce la préparation, que la configuration retourne registrationEnabled=false et que POST register reste 403. Aucun compte réel ni e-mail de test ne doit être créé pour ce contrôle.

Pour fermer une éventuelle ouverture ultérieure, remettre AUTH_REGISTRATION_ENABLED=false et ADULT_REGISTRATION_APPROVED=false dans un nouveau déploiement, sans révoquer les comptes existants par défaut. Aucun changement de rôle ou d’accès adulte ne découle de ce retour arrière.
