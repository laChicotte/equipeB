# Vérification des attestations — itération 0.8

Contrôles du 6 novembre 2026 :

- 76 tests réussis au total, dont huit contrôles du module. Les assertions supplémentaires de refus d’auto-délivrance et de mentor suspendu ont aussi été exécutées avec succès.
- Émissions concurrentes : une seule attestation et un seul événement d’émission. Refus des programmes non clôturés, sans séance terminée, avec titulaire non approuvé ou mentor non éligible.
- Isolation : consultation par titulaire et administrateur ; refus pour mentor, modérateur et tiers. Compte désactivé et rôle modifié relus en base. Champs supplémentaires refusés par validation stricte.
- Révocation : motif et statut visibles, révision concurrente contrôlée, seconde révocation et réémission automatique refusées. Consultation/révocation maintenues lorsque l’émission est fermée.
- Parcours HTTP Next.js sur base isolée : connexion, émission administrative, lecture titulaire, tiers refusé, révocation et état persisté, pages titulaire et administration servies.
- PostgreSQL natif : émission, rejeu, isolation et révocation réussis dans une transaction annulée. Aucun document réel ni donnée fictive conservés.
- Migration additive 009 appliquée à PostgreSQL de développement. Build réussi avec 27 pages statiques et routes API dynamiques ; contrôle TypeScript réussi.
- Préversion fermée sans identifiants de base ni SMTP réussie, avec configuration des attestations désactivée.

La revue des composants vérifie les libellés, états d’erreur et de chargement, rendu texte, consultation du statut et règles CSS d’impression. Aucun parcours visuel automatisé ni contrôle d’impression/PDF en navigateur effectué pour cette itération. La compilation et les tests HTTP ne remplacent pas ces contrôles. Aucun PDF signé ni vérification publique n’est annoncé.

Aucune modification de rôle ou accès adulte réel ; aucun envoi d’e-mail. L’émission réelle reste fermée avec ATTESTATIONS_ENABLED=false et ATTESTATIONS_APPROVED=false. Les attestations sont non accréditées et identifient un compte, sans collecte de nom légal. Voir attestations.md pour le périmètre et les limites.

## Livraison privée Vercel

Source déployée : e82c4ead17445e132b6ae09ad630058c0441f768. Déploiement dpl_8oyHV1rW933KAmNdcjQtE6xk5Nv1 confirmé READY et associé à talentlink.today et www.talentlink.today, sans erreur d’alias. Les deux variables ATTESTATIONS_ENABLED et ATTESTATIONS_APPROVED ont été explicitement fixées à false en production avant construction.

Protection relue après livraison : enabled=true, deploymentType=all. Les requêtes HTTPS anonymes vers /compte/attestations/, /administration/attestations/ et /api/v1/attestations/config/ reçoivent HTTP 302 vers vercel.com. Cela prouve la protection de ces chemins, sans valider un parcours applicatif authentifié dans le cloud. Aucun lien de contournement créé ; aucune attestation émise dans le cloud.
