# Conservation et clôture — proposition d’exploitation

État au 6 novembre 2026 : proposition à approuver et à éprouver avant l’ouverture adulte. Aucune suppression de compte, modification SQL ou purge nouvelle n’est exécutée par ce document.

Décision de l’utilisateur : les objectifs suivants sont acceptés — suppression des comptes non confirmés après 30 jours, prise en charge des demandes sous 7 jours, clôture visée sous 30 jours après vérification et revue des comptes inactifs après 24 mois. Cette décision autorise leur préparation technique ; elle ne constate pas leur mise en œuvre et ne valide pas les autres durées proposées. Le 7 novembre 2026, BANGOURA Aboubacar Sidiki a accepté d’être désigné responsable du projet : enseignant et entrepreneur, résidant à Conakry, République de Guinée. TalentLink Group est un collectif de quatre personnes né lors d’un hackathon, sans structure enregistrée déclarée. Les inscriptions demeurent fermées.

## Durées proposées et réalité technique

| Données | Règle proposée | Mise en œuvre actuelle / travail restant |
|---|---|---|
| Compte non confirmé | Effacement après 30 jours sans confirmation, sauf incident documenté | Pas de purge de comptes ; préparer une sélection contrôlée et un essai isolé |
| Compte actif et profil | Durée de l’utilisation ; revue après 24 mois sans activité | Pas de suivi dédié de dernière activité ; ne pas promettre de clôture automatique |
| Compte clos et données personnelles associées | Traitement sans délai injustifié ; objectif interne de finalisation sous 30 jours après vérification de la demande | Traitement manuel à tester ; exceptions nécessaires documentées individuellement |
| Historique de quiz lié au compte | Durée du compte ; effacement ou anonymisation lors de la clôture | Le cron ne purge pas les parties des comptes |
| Preuves d’accord et événements de sécurité | Pendant le compte ; après clôture, conservation uniquement justifiée et minimisée, avec revue au plus tard à 12 mois | Pas de purge dédiée ; durée exceptionnelle à justifier au cas par cas |
| Suivi d’une demande de droits | Dossier minimal jusqu’au traitement ; revue de nécessité à 12 mois après clôture | Registre privé à organiser, sans mot de passe ni copie systématique de pièce d’identité |
| Partie visiteur | Expiration 24 h, suppression au passage quotidien suivant si aucune dépendance métier | Existant, limité à 1 000 lignes par passage ; surveiller incidents et arriéré |
| Session | Validité maximale 7 jours | Suppression si expirée depuis plus d’un jour ou révoquée depuis plus de 7 jours, au passage suivant |
| Lien de confirmation / réinitialisation | Validité 24 h / 30 min ; usage unique | Nettoyage si expiré ou consommé depuis plus d’un jour, au passage suivant |
| Compteur anti-abus | Fenêtre 15 min | Nettoyage après expiration depuis plus d’un jour, au passage suivant |
| Historique Neon | Fenêtre configurée 6 h | Le snapshot manuel et la branche du test sont conservés séparément ; leur maintien doit être décidé |

Ces objectifs sont proposés pour l’exploitation ; ils ne sont pas des délais réglementaires déclarés. La revue à 12 mois n’autorise pas à conserver une donnée inutile jusque-là. Les journaux des prestataires et leurs sauvegardes ont leur propre cycle, à inventorier. Aucune durée universelle de suppression des copies n’est aujourd’hui démontrée.

## Procédure manuelle de demande

1. Recevoir la demande au téléphone public. Attribuer une référence dans un registre privé : date, type de demande, interlocuteur responsable, prochaine action. Éviter de noter le contenu sensible dans Git, les journaux applicatifs ou une conversation publique.
2. Vérifier le titulaire par un moyen proportionné. Le support ne doit jamais demander mot de passe, jeton ou lien de réinitialisation. L’e-mail de réception du domaine n’existe pas encore : ne pas le proposer comme canal. Préparer un moyen sûr de vérification et de remise d’une copie avant les premières inscriptions.
3. Confirmer le périmètre souhaité : copie, rectification, clôture ou effacement. Expliquer les effets, les délais attendus et les difficultés éventuelles. Objectif proposé : accusé de prise en charge sous 7 jours ; ceci ne suspend pas une obligation d’agir plus rapidement.
4. Pour une clôture confirmée, restreindre l’accès, révoquer sessions et liens, retirer le profil de l’annuaire et empêcher sa republication. La désactivation seule ne constitue pas un effacement.
5. Examiner les dépendances avant toute mutation : accords, quiz, contributions éditoriales, audit et éventuels objets de mentorat. Les contraintes ON DELETE CASCADE peuvent supprimer des éléments liés ; ne jamais appliquer un DELETE générique sur la base réelle. Préparer une opération ciblée, révisable, puis la tester sur une branche isolée dédiée ; la branche de preuve de récupération reste intacte.
6. Remettre une copie par un canal sûr, après retrait des secrets, données de tiers et informations de sécurité internes. Pour une suppression, effacer ou anonymiser ce qui n’a plus de finalité ; isoler et justifier précisément toute exception avec date de revue. Ne pas considérer un hash ou un identifiant remplaçant comme une anonymisation suffisante sans examen.
7. Traiter les copies : tenir une liste privée des demandes d’effacement à réappliquer avant toute remise en service d’une restauration historique. Restreindre la branche et le snapshot existants ; décider si leur suppression est nécessaire après examen de la preuve conservée. Ne pas recréer un compte supprimé par restauration sans retraitement.
8. Vérifier l’absence d’accès et de profil public résiduel, consigner uniquement les preuves minimales de traitement et informer la personne du résultat et des limites. Aucun opérateur de suppression n’est implémenté ou validé par cette procédure documentaire.

## Décisions à prendre

L’identité du responsable du projet est confirmée ; préciser encore l’organisation opérationnelle du support et sa capacité à tenir ces délais ; accepter ou modifier les durées ; vérifier les formalités de traitement et de transfert ; définir le canal sûr de vérification/remise. Ensuite seulement, implémenter et éprouver les opérations manuelles nécessaires. Une reprise HTTP complète, les objectifs RPO/RTO et une copie indépendante de Neon restent des chantiers d’exploitation distincts.
