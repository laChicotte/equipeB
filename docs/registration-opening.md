# Ouverture des inscriptions adultes — 7 novembre 2026

L’utilisateur avait explicitement demandé l’ouverture et a signalé que les inscriptions restaient fermées après la livraison des nouveaux modules. Cette correction active l’inscription des personnes déclarant avoir au moins 18 ans, avec confirmation e-mail obligatoire. Elle ne constitue pas une validation des formalités réglementaires, que l’utilisateur a demandé de traiter séparément de la réalisation du prototype.

Les indicateurs AUTH_REGISTRATION_ENABLED et ADULT_REGISTRATION_APPROVED passent à true en production. NEXT_PUBLIC_SITE_PHASE devient adult-accounts pour rendre les boutons de l’accueil et les textes cohérents avec le formulaire. La protection Vercel des préversions et URL techniques reste inchangée. Les rôles administratifs, approbations d’accès adulte des personnes, publication des mentors et accès aux communications privées ne sont pas attribués par cette activation.

Versions présentées aux nouveaux inscrits : règles adultes 2026-11-07-adult-v2 ; conditions et information de confidentialité 2026-11-07-adult-accounts. Les accords historiques restent intacts. Un ancien formulaire avec une version périmée est refusé et doit être rechargé. Les mots de passe sont hachés, les liens de vérification temporaires à usage unique, les erreurs de présence d’adresse neutres et les tentatives bornées.

Les textes décrivent les opérations manuelles réellement disponibles sans promettre une purge automatique des comptes. Le suivi des objectifs d’exploitation de conservation/clôture et les formalités restent à terminer dans leurs dossiers respectifs. Aucun compte réel de test ni nouvelle approbation individuelle n’est créé par cette livraison.

Validation avant déploiement : typecheck réussi, dix-sept tests d’identité/inscription réussis, connexion SMTP/TLS/authentification vérifiée sans envoi. La compilation utilise la phase adult-accounts pour contrôler les textes de cette phase. Après déploiement : vérifier registrationEnabled=true, accès au formulaire, accueil et conditions cohérents, POST de formulaire vide refusé pour validation (400) et non fermeture (403), ainsi que le refus des mineurs déclarés et des origines étrangères. Ces contrôles ne créent pas de compte ni n’envoient d’e-mail.

Retour arrière : remettre AUTH_REGISTRATION_ENABLED=false et ADULT_REGISTRATION_APPROVED=false, NEXT_PUBLIC_SITE_PHASE=public-discovery, puis redéployer. Ne pas supprimer les comptes déjà créés ni réécrire leurs accords.
