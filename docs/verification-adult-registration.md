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
