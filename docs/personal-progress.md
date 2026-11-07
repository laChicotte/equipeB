# Suivi personnel détaillé — version 0.14

Le suivi de /compte/progression/ permet de décomposer un objectif personnel en sous-objectifs et jalons, d’indiquer une échéance facultative, de cocher ou rouvrir une étape, de rédiger des bilans privés et de consulter les derniers événements enregistrés.

Chaque objectif appartient à son titulaire. Les droits sont relus en base pour toutes les opérations ; un autre utilisateur ou un administrateur ne peut pas consulter ses bilans ni modifier ses étapes. Les nouvelles routes de l’API learning exigent une session ; les écritures exigent l’origine autorisée, la validation des champs et le budget anti-abus déjà utilisé par le module.

La migration additive 013_personal_progress.sql ajoute learning_step, learning_review et learning_goal_event. Les comptes, objectifs et données existants ne sont pas transformés. Les étapes et bilans sont liés à l’objectif ; une éventuelle suppression ultérieure de l’objectif doit examiner les cascades prévues. Aucune suppression automatique n’est ajoutée dans cette livraison.

Limites : cent étapes et cinquante bilans par objectif ; affichage des cent derniers événements seulement. L’historique commence à la mise en service, sans inventer d’actions passées. Les étapes utilisent une révision pour refuser une mise à jour obsolète en 409. Les actions sont transactionnelles, verrouillées sur le parent, et un changement identique n’ajoute pas d’événement de réalisation. Cocher toutes les étapes ne marque pas automatiquement le parent comme atteint. La progression et les bilans sont déclaratifs, sans certification de compétence.

Les détails ne sont chargés qu’à l’ouverture du suivi d’un objectif, avec annulation des lectures devenues inutiles. Les formulaires et listes utilisent les styles et thèmes existants. La revue visuelle et l’utilisation avec lecteur d’écran restent à examiner dans le navigateur.

Validation du 7 novembre 2026 : TypeScript réussi, huit tests ciblés réussis, suite complète de 101 tests réussie et compilation de la phase adulte réussie. Les essais couvrent le cycle étapes/jalons/bilans, la confidentialité, les conflits concurrents et la réouverture, les limites de volume, la session, l’origine et les champs invalides. La migration a réussi sur la branche Neon isolée progress-release-20261107 / br-billowing-pond-bdexrkxj avant application à la source.

Pour actualiser un prototype local déjà démarré, l’arrêter puis relancer npm run prototype : le lanceur applique la nouvelle migration dans sa base locale. Les objectifs partagés de mentorat gardent leur propre parcours ; leurs sous-objectifs détaillés et bilans collaboratifs restent à développer.
