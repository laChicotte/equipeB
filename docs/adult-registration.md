# Préparation des inscriptions adultes — itération 0.12

Mise à jour du 7 novembre 2026 : les inscriptions adultes sont maintenant ouvertes sur talentlink.today, après demande explicite de l’utilisateur et correction des indicateurs et textes. Voir [registration-opening.md](registration-opening.md) pour la version déployée et les vérifications réelles. Le reste de ce document décrit la préparation historique et les travaux d’exploitation encore distincts de cette activation.

## Périmètre demandé

Le 7 novembre 2026, l’utilisateur a explicitement demandé de finaliser et ouvrir les inscriptions adultes. Il a également confirmé que les formalités de traitement et de transfert n’ont pas encore été vérifiées. L’activation attend cette clarification et les vérifications techniques restantes : voir [data-formalities-request.md](data-formalities-request.md), qui contient une demande prête à compléter. Le site reste en découverte publique avec AUTH_REGISTRATION_ENABLED=false et ADULT_REGISTRATION_APPROVED=false. Les mises en relation, messages, séances, émissions d’attestations et parcours des mineurs restent fermés.

## Préparation technique

En production, les deux indicateurs AUTH_REGISTRATION_ENABLED et ADULT_REGISTRATION_APPROVED doivent être true pour rendre l’inscription disponible. Le second ne peut pas être envoyé dans le formulaire. Le mode développement conserve l’activation locale pour les essais isolés. Le tableau de bord administrateur affiche l’état effectif des inscriptions.

La majorité déclarée est obligatoire. Le formulaire ajoute une lecture explicite des règles des comptes adultes, avec version 2026-11-06-adult-v1. Le serveur exige exactement cette version ; un ancien formulaire reçoit 409 et doit être actualisé. Les conditions, la confidentialité et, pour un candidat mentor, la charte restent aussi requises. Les accords sont enregistrés avec leur version et leur date ; aucun consentement historique n’est réécrit.

La confirmation e-mail est nécessaire avant connexion et ne vaut jamais approbation de l’âge. Le rôle choisi est limité à mentoré ou mentor ; aucun rôle de modération ne vient du formulaire. La validation de l’e-mail laisse adult_access_approved_at vide. Une candidature mentor reste privée tant qu’elle n’a pas été examinée et publiée selon les règles métier.

Limites persistantes : cinq tentatives d’inscription par adresse sur quinze minutes, trente demandes admissibles au schéma par fenêtre globale et cent POST d’inscription par fenêtre au niveau HTTP. Le budget HTTP d’inscription est séparé du budget des autres actions de compte pour éviter que ces demandes n’épuisent celui des connexions. Les limites ne promettent pas une protection absolue contre les abus ou la disponibilité du fournisseur de mail.

Les règles préparées sont consultables sur /inscriptions-adultes/, avec noindex. Elles expliquent explicitement que l’inscription reste fermée. Aucun nouveau champ de date de naissance, pièce d’identité ou donnée intime n’est collecté.

## Conditions restantes avant activation

Le dossier concret de textes est préparé dans [adult-opening-texts.md](adult-opening-texts.md), avec le tableau des durées et la procédure dans [account-lifecycle.md](account-lifecycle.md). Il reste à approuver et à rendre exécutable ; les pages publiques et versions de consentement ne sont pas modifiées par ces brouillons. Le responsable désigné est BANGOURA Aboubacar Sidiki, enseignant et entrepreneur à Conakry, République de Guinée (confirmation du 7 novembre 2026). TalentLink Group est un projet collectif de quatre personnes né lors d’un hackathon, sans structure enregistrée déclarée. Les formalités applicables aux transferts hors de Guinée restent à vérifier avant l’ouverture.

| Point | État actuel | Décision ou preuve attendue |
|---|---|---|
| Sauvegarde et récupération Neon | Récupération historique isolée contrôlée le 6 novembre 2026 ; vingt tables métier et onze migrations concordent | Preuve dans recovery-drill.md ; fixer encore les objectifs RPO/RTO et la stratégie de copie indépendante |
| Règles, conditions et confidentialité pour de nouveaux comptes | Règles préparées ; documents publics actuels décrivent encore la découverte fermée | Valider les textes d’ouverture et leur nouvelle version, notamment données des profils mentors et transferts des prestataires |
| Conservation et clôture des comptes | Traitement manuel existant ; pas de suppression automatique des comptes | Fixer les durées, les responsabilités et la procédure de demande sans mot de passe |
| E-mail | Connexion SMTP/TLS vérifiable sans envoi ; envoi de validation déjà éprouvé dans les étapes antérieures | Vérifier quotas actuels, surveillance des échecs et un parcours réel avec destinataire explicitement autorisé avant activation |
| Support et incidents | Téléphone public fourni ; réception e-mail du domaine reportée | Confirmer la prise en charge des demandes et incidents ; ne pas promettre une boîte e-mail réceptrice |
| Accès adultes approuvés et mentors | Aucune approbation automatique | Garder une décision séparée, avec procédures adaptées, avant tout accès privé |
| Ouverture publique | Demandée explicitement le 7 novembre 2026 ; pas encore exécutée | Clarifier les formalités puis terminer les vérifications ci-dessus avant activation ; ne pas redemander l’autorisation produit déjà donnée |

Il ne faut pas simplement basculer les deux variables : le texte des conditions et de la confidentialité actuellement publié dit que les inscriptions sont fermées. La préparation technique n’est pas une certification juridique ou une preuve de restauration.

## Vérification et retour arrière

Les essais utilisent des comptes fictifs et un transport e-mail local en mémoire/fichier. Les tests couvrent refus des mineurs déclarés, accords absents ou périmés, version persistée, confirmation e-mail sans accès adulte approuvé, limites globales avec adresses différentes et conservation du budget de connexion face aux inscriptions refusées.

Après déploiement de la préparation, contrôler que le catalogue conserve les trois quiz, que /inscriptions-adultes/ répond et annonce la préparation, que la configuration retourne registrationEnabled=false et que POST register reste 403. Aucun compte réel ni e-mail de test ne doit être créé pour ce contrôle.

Pour fermer une éventuelle ouverture ultérieure, remettre AUTH_REGISTRATION_ENABLED=false et ADULT_REGISTRATION_APPROVED=false dans un nouveau déploiement, sans révoquer les comptes existants par défaut. Aucun changement de rôle ou d’accès adulte ne découle de ce retour arrière.
