# Vérification — préparation des inscriptions adultes 0.12

## Demande et limites

Le 6 novembre 2026, l’utilisateur a choisi de préparer l’ouverture des inscriptions adultes. Il a confirmé que sauvegarde et restauration Neon n’avaient pas encore été vérifiées et a demandé de garder ce point à préparer. Aucune ouverture des inscriptions n’est autorisée ou effectuée par cette itération.

## Résultats

- 93 tests réussis. Quatre contrôles nouveaux couvrent le verrou distinct de production, les règles exactes, l’accord versionné, la confirmation e-mail sans approbation de l’âge, le quota global avec adresses distinctes et le maintien du budget de connexion face à un flot d’inscriptions refusées.
- Parcours HTTP test:e2e et test:public réussis sur des bases isolées, avec les nouveaux accords dans les formulaires. Aucun compte réel créé et aucun e-mail adressé à une personne réelle.
- SMTP : connexion, TLS et authentification vérifiés sans envoi de message. Cela ne prouve pas à lui seul une livraison du nouveau parcours réel ou la disponibilité des quotas du prestataire.
- Build public et TypeScript réussis : 30 pages statiques et routes API compilées, dont /inscriptions-adultes/.
- Contrôle qualité des dix pages et budgets réussi ; la page des règles retourne sa version et noindex. Préversion fermée réussie.

Les tests positifs inscrivent seulement des personnes fictives dans PGlite avec un transport mail simulé ou fichier. Ils vérifient que la création et la vérification ne remplissent pas adult_access_approved_at. Les consentements préexistants ne sont pas modifiés. Aucune migration SQL n’est nécessaire : la table consent existante accepte la nouvelle finalité.

## Configuration et dossier d’ouverture

ADULT_REGISTRATION_APPROVED=false explicitement configuré en production. Les deux variables d’inscription et les verrous des mises en relation, messagerie, planning et attestations ont été relus fermés. La protection Vercel standard reste enabled=true, prod_deployment_urls_and_all_previews. Aucun changement de secret, de rôle, d’approbation adulte ou de données de compte réel.

Le protocole recovery-drill.md et le contrôle en lecture seule database/operations/recovery-check.sql sont préparés. Aucune branche Neon n’a été créée et aucun exercice de récupération n’a été exécuté ; cette préparation ne doit pas être présentée comme une sauvegarde restaurée avec succès. Les textes actifs décrivent toujours la découverte sans inscriptions ; avant activation, finaliser leurs versions, les règles de conservation et les procédures opérationnelles listées dans adult-registration.md.

Aucun nouvel essai visuel automatisé du formulaire n’est déclaré dans cette itération. Les essais précédents de navigation confirmés par l’utilisateur restent distincts des nouveaux contrôles de code et HTTP. Les conditions de traitement et obligations applicables doivent être examinées avant de collecter de nouveaux comptes au public.

## Livraison de la préparation

Source e2d86a661611311aec1f081799120ef898903a1a. Déploiement dpl_Cv5DZtdaafWQtm367wqoeKRaCsKs confirmé READY, associé à talentlink.today et www.talentlink.today sans erreur d’alias. Aucun changement de portée de protection ou d’activation des comptes.

Contrôles HTTPS du 6 novembre 2026 à 15:40 UTC : /inscriptions-adultes/ retourne 200, version 2026-11-06-adult-v1 et noindex ; authentification existante activée, registrationEnabled=false ; POST register avec corps vide et Origin canonique refusé 403 avant création de compte. Le catalogue conserve trois quiz publiés. Messagerie, planning et attestations restent fermés ; API administrateur sans session refusée 401. Le SQL d’exercice n’est pas exposé publiquement (404). L’URL technique de déploiement reste protégée (302 Vercel Authentication).

La sauvegarde/récupération reste non vérifiée, conformément à la réponse de l’utilisateur. Les documents adult-registration.md et recovery-drill.md décrivent les actions restantes avant une éventuelle décision d’ouverture. Aucun point de restauration, branche Neon, export de données ou coût supplémentaire créé par cette préparation. Aucun e-mail envoyé.
