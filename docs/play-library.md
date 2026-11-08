# Continuer dans la bibliothèque après un quiz — 0.24

Après le résultat d’une partie Play, le joueur reçoit jusqu’à trois ressources publiées en rapport avec le domaine du quiz. Les liens ouvrent le lecteur existant de la bibliothèque. Aucun compte ou enregistrement dans l’historique n’est exigé pour une partie visiteur.

Les suggestions comparent la catégorie de la ressource au domaine et à la catégorie conservés dans le snapshot de la partie, sans distinction de casse ni espaces de bord. Elles sont classées par date de création décroissante, puis identifiant. Elles ne recherchent pas dans les réponses, objectifs personnels, contacts ou messages. Aucun appel IA, score d’adéquation ou diagnostic de compétence.

Seuls titre, résumé, domaine, format et référence publique de la ressource sont renvoyés. Aucun auteur, contenu intégral, justificatif de droits ou identifiant de fichier. Les ressources soumises, rejetées et archivées sont exclues. Un retrait disparaît lors de la prochaine consultation des suggestions ; le lecteur refuse déjà un contenu retiré.

Un lien de recherche publique par catégorie permet d’explorer davantage. Une absence de résultat est indiquée explicitement. En cas de panne, un message et une nouvelle tentative sont proposés. Les recommandations de mentors existantes restent distinctes ; consulter des ressources ne déclenche pas de demande de mentorat et n’enregistre pas de clic mentor.

## Contrôles

Extension de `/api/v1/play/recommendations/` et du résultat de `mentor-click`, après les contrôles existants : cookie de propriétaire de partie, compte correspondant pour l’historique enregistré, partie terminée et non expirée. Aucune référence de partie d’un autre navigateur n’ouvre ses résultats. Les suggestions suivent LEARNING_ENABLED et ne sont pas renvoyées lorsque la bibliothèque est fermée. Play doit aussi être ouvert. Réponses no-store/no-referrer.

Pas de migration, de nouvelle collecte, de publication automatique ou de contenu fictif en production. Les rapprochements sont thématiques ; les synonymes et accents ne sont pas normalisés. Une ressource dont seul le titre évoque le thème n’est pas recommandée automatiquement. Un Sprint expiré peut recevoir des pistes de lecture après son résultat, sans être déclaré entièrement réussi.

## Vérification

Tests isolés : fin de partie requise, propriétaire, plafond de trois ressources, casse/espaces, statuts exclus, retrait, résultat vide, bibliothèque désactivée et projection minimale. Contrôle TypeScript et compilation. Le parcours visuel de fin de quiz reste à vérifier manuellement.
