# Disponibilités hebdomadaires — version 0.19

## Parcours mentor

Le formulaire /compte/profil-mentor/ permet de renseigner jusqu’à vingt-et-un créneaux hebdomadaires et un fuseau horaire IANA, par exemple Africa/Conakry ou Europe/Paris. Chaque créneau comporte un jour du lundi au dimanche et une heure de début et de fin. Les horaires suivent un pas de quinze minutes, avec une durée de quinze minutes à douze heures. Une fin à 24:00 est possible ; une plage qui traverse minuit doit être répartie sur deux jours.

Le serveur refuse les doublons et chevauchements d’un même jour ; les plages adjacentes restent possibles. Les créneaux sont triés par jour puis heure. Le bouton d’ajout propose une plage sans chevauchement lorsque cela est possible. Une liste vide retire explicitement les créneaux. Le texte de disponibilité générale existant reste disponible pour apporter du contexte.

Les créneaux et le fuseau font partie de la même révision que le profil. L’enregistrement remet le profil en brouillon, demande une nouvelle revue et suspend les programmes selon le comportement existant. Deux sauvegardes concurrentes d’une même révision ne s’écrasent pas : la seconde reçoit 409. Un ancien client qui omet ces nouveaux champs préserve les valeurs déjà enregistrées.

## Affichage public et revue

Les horaires deviennent visibles seulement avec un profil publié, vérifié et éligible. Ils figurent aussi dans l’aperçu administratif du profil soumis. Le brouillon, le profil retiré ou le compte désactivé ne sont pas exposés. L’annuaire ajoute un filtre par jour, dans le fuseau du mentor. Ce filtre porte uniquement sur les créneaux structurés, pas sur une interprétation du texte libre.

Il s’agit de disponibilités déclaratives, sans promesse de créneau libre à une date donnée. L’affichage conserve le jour et l’heure du mentor et annonce son fuseau, sans conversion automatique vers celui du visiteur. Pour les zones avec changement saisonnier d’heure, le motif reste une heure locale hebdomadaire ; aucune date UTC de rendez-vous n’est inventée. Les congés, exceptions, réservations à partir de ces motifs et rappels externes restent à développer.

Les mises en relation, la messagerie, les séances et la génération IA conservent leurs activations actuelles. Cette livraison ne les ouvre pas, ne crée aucun rendez-vous et n’envoie aucun e-mail. Les séances existantes conservent leurs dates propres, sans déplacement automatique dû à une modification du motif hebdomadaire.

## Stockage et autorisation

La migration additive 017_weekly_availability.sql ajoute availability_timezone et weekly_slots dans mentor_profile. Valeurs initiales : Africa/Conakry et liste vide. Aucune disponibilité n’est déduite d’un texte existant, aucune révision ni publication préexistante n’est modifiée. Le stockage JSON exige une liste de vingt-et-un éléments au maximum ; la validation métier du serveur vérifie les champs, jours, heures et chevauchements à la sauvegarde et à la soumission.

Les droits du titulaire sont relus en base, le rôle mentor reste nécessaire, les écritures conservent la session, l’origine attendue et le budget anti-abus du profil. Aucun identifiant de propriétaire n’est accepté dans le formulaire. Les champs publics contiennent les horaires annoncés et le fuseau, sans rendez-vous privé, coordonnées ou justificatif. Le fuseau doit être reconnu par Intl dans le runtime, et non un décalage libre ou une valeur HTML.

L’ajout de colonnes permet un retour vers l’ancienne application sans les supprimer : les anciens formulaires ignorent ces champs et les données restent conservées. Ne pas effacer le schéma pour revenir à une interface antérieure.

## Vérification

Dix-sept tests ciblés de disponibilité et mentorat, puis les 151 tests de la suite complète et la compilation ont réussi. Les essais couvrent les fuseaux invalides, minuit, les durées, limites et chevauchements, le tri, la confidentialité, la revue, les anciens clients, les conflits concurrents, les droits et l’origine. Les comptes et créneaux fictifs sont exclusivement dans la base embarquée isolée. La revue visuelle du formulaire et l’usage avec lecteur d’écran restent à examiner manuellement.

La migration a réussi sur la branche Neon availability-release-20261108 / br-lingering-band-bdljirbb avant application transactionnelle en production. Checksum SHA-256 : aae847ba48eff82d1a5653dfe385c0f18013a0351f0cf165ce5f7c74530826a5. La production compte ensuite dix-sept migrations et zéro profil avec un créneau structuré au relevé, sans création de profil ou modification de contenu métier pour les tests. Aucun plan payant ni achat n’a été engagé.
