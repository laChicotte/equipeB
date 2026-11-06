# Protocole de récupération isolée — à exécuter avant les inscriptions

Statut au 6 novembre 2026 : exercice de récupération historique isolée réussi sur le périmètre de contrôles décrit ci-dessous. La branche de production et son endpoint sont conservés. Ce résultat ne vaut ni test de basculement applicatif ni validation d’une sauvegarde indépendante de Neon.

1. Dans Neon, identifier le projet et la branche réellement utilisés par TalentLink. Vérifier la fenêtre d’historique disponible et ses limites sur le plan actuel ; noter le point de récupération envisagé. Ne pas augmenter le plan ou engager un coût sans décision de l’utilisateur.
2. Suspendre les changements administratifs de contenu pendant les comparaisons. Exécuter database/operations/recovery-check.sql sur la branche source et conserver les résultats dans un emplacement privé. Ce SQL est en lecture seule et ne contient ni mots de passe, ni adresses e-mail, ni réponses aux quiz.
3. Choisir un point historique T0 correspondant à cet état de référence, toujours disponible dans la fenêtre Neon. Vérifier dans la console que la cible est une nouvelle branche isolée avec son propre endpoint, et que la branche de production ne sera ni restaurée en place, ni réinitialisée. Si l’interface propose seulement une restauration en place ou ne permet pas cette cible sur le plan actuel, arrêter l’exercice et examiner les options avant d’agir.
4. Récupérer l’état T0 dans cette branche de test. Ne rattacher cette branche à aucun domaine Vercel, cron, transport SMTP ou environnement public ; ne remplacer aucune DATABASE_URL du site. Les données clonées restent aussi sensibles que la source.
5. Dans la branche récupérée, exécuter le même SQL et comparer migrations/checksums, comptes par rôle, états des profils et des quiz, ainsi que les empreintes. Vérifier que les trois quiz publiés et leurs versions approuvées sont présents. Consulter le journal de l’opération Neon pour confirmer la source et le point choisis.
6. Consigner date, branche source et cible, T0, durée et résultats, sans chaîne de connexion, jeton ou donnée personnelle. Une différence doit être expliquée ; une simple copie de l’état courant ne prouve pas une récupération historique. Définir ensuite les objectifs de perte de données et de délai de remise en service, les accès au compte Neon et l’entretien des copies.

Le SQL vérifie un ensemble de contrôles de cohérence ; il ne démontre pas à lui seul la restauration de chaque ligne ou un basculement réel du site. Un test de reprise de l’application complète devra utiliser un environnement privé isolé avec e-mails désactivés. Ne jamais simuler une perte de données en supprimant des tables sur la branche du site.

Une fois le résultat vérifié, décider du maintien ou de la suppression de la branche de test ; ne pas supprimer automatiquement une copie contenant potentiellement la seule preuve de restauration. Une branche Neon et son historique ne remplacent pas nécessairement une copie indépendante : la stratégie complète et les responsabilités d’exploitation restent à documenter.

Références officielles consultées : [gestion des branches Neon](https://github.com/neondatabase/website/blob/main/content/docs/manage/branches.md), [fenêtre d’historique](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/history-window.md), [restauration instantanée](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/branch-restore.md). Leurs fonctionnalités et limites dépendent du plan et de la configuration ; ne pas supposer une fenêtre de rétention donnée.

## Outillage et état de référence

Le 6 novembre 2026, l’utilisateur a demandé de réaliser l’exercice. La préparation initiale disposait seulement d’un accès SQL. Après installation et connexion du plugin Neon par l’utilisateur, l’accès de gestion a permis l’exercice ci-dessous sans changer la connexion du site.

node scripts/recovery-baseline.ts capture produit .local/recovery-source-baseline.json en transaction REPEATABLE READ READ ONLY. Le relevé du 6 novembre 2026 à 15:51:25 UTC contient onze migrations, trois jeux publiés, douze versions approuvées, les comptes agrégés par rôle et des empreintes calculées côté serveur pour vingt tables métier persistantes. Aucun champ d’e-mail, mot de passe, message ou jeton n’est exporté ; les empreintes restent privées. Les tables transitoires de sessions, jetons, compteurs et parties visiteurs sont exclues de cette comparaison afin de distinguer le périmètre contrôlé. Ce n’est pas une sauvegarde de données.

Après création vérifiée de la branche historique, renseigner sa connexion distincte uniquement dans RECOVERY_DATABASE_URL de .env.local, puis exécuter node scripts/recovery-baseline.ts verify. Le script refuse le même endpoint que la source, force les lectures en transaction read-only et compare les contrôles avec le fichier de référence. Il n’exécute ni migration, écriture métier, SMTP, cron ni changement d’environnement Vercel. Une correspondance ne valide pas à elle seule le point historique : conserver aussi la preuve de la branche source, du T0 et de l’opération Neon.

Les empreintes servent à détecter des différences ; elles ne sont pas une signature de sauvegarde. Si le point T0 sort de la fenêtre d’historique avant la création de la branche, produire un nouveau relevé et adapter explicitement le point de récupération. Ne pas comparer après coup un nouveau relevé à une branche créée à un ancien T0.

## Résultat réel du 6 novembre 2026

Le connecteur Neon a identifié le projet TalentLink `nameless-unit-88033561`, plan `free_v3`, avec une rétention configurée de 21 600 secondes. La branche `production` (`br-delicate-darkness-bdhflh27`) correspond à l’endpoint déjà configuré localement, `ep-tiny-bonus-bd1i2ymo`. Une seule branche et aucun snapshot manuel n’existaient avant l’exercice. Aucun changement de plan ou de rétention n’a été effectué. Les ressources créées entrent dans les limites gratuites constatées et documentées : [plans Neon](https://neon.com/docs/introduction/plans).

| Preuve | Valeur |
|---|---|
| Relevé source antérieur, conservé sans réécriture | 2026-11-06 à 15:51:25.149 UTC |
| Point demandé au snapshot | 2026-11-06T15:51:25.149Z |
| Snapshot créé à 21:34:55 UTC | `snap-odd-haze-bdohxs3y` |
| Branche récupérée, créée à 21:35:48 UTC | `recovery-drill-20261106-155125` / `br-polished-river-bdmmmc8b` |
| Provenance renvoyée par Neon | `restore_status=restored`, `restored_from=snap-odd-haze-bdohxs3y` |
| Point effectif renvoyé par Neon | `parent_timestamp=2026-11-06T15:51:16Z`, `parent_lsn=0/2131D90` |
| Endpoint de récupération distinct | `ep-weathered-sound-bdfvx9e6` |
| Opération de création terminée, sans échec | `662f03d5-3ed5-4b39-86f5-5c4f54658503` — 845 ms |
| Démarrage du compute terminé, sans échec | `6633bb0a-6c29-4900-ba35-3383d373884e` — 1 499 ms |

La requête de restauration n’a fourni aucun `target_branch_id` et a explicitement utilisé `finalize=false`. Aucun appel de finalisation, réinitialisation, permutation des noms ou déplacement de l’endpoint de production n’a suivi. La branche source est toujours `production`, prête, principale et par défaut ; son endpoint reste sur son identifiant initial. La branche récupérée est prête et non principale. Aucun branchement Vercel, SMTP, cron ou domaine n’a été ajouté.

Les contrôles ont été exécutés par le connecteur Neon avec des SELECT uniquement, en un seul relevé SQL sur la cible explicitement désignée. Le même séparateur de lignes et les mêmes expressions d’empreinte que le script local ont été utilisés. Le fichier de référence du relevé de 15:51:25.149 UTC n’a pas été renouvelé après la restauration. Les résultats concordent intégralement pour les contrôles sélectionnés : onze migrations et leurs checksums, comptes par rôle, états des profils mentors, trois jeux publiés, douze versions approuvées, empreintes éditoriales et comptes/empreintes des vingt tables métier persistantes listées dans le script. Un second relevé SELECT sur la source actuelle concorde également avec cette référence.

L’heure effective Neon précède de 9,149 secondes l’heure demandée. Le résultat démontre la concordance du périmètre métier contrôlé à ce point historique, pas une précision temporelle de restauration garantie à la milliseconde. La preuve provient de la création du snapshot avec timestamp explicite, de sa provenance dans la branche récupérée et des opérations terminées ; une simple copie de HEAD n’a pas été utilisée.

La synthèse exploitable est conservée dans `.local/recovery-comparison.json` (ignorée par Git), à côté de la référence privée. Aucun mot de passe, URL de connexion, adresse personnelle ou contenu de ligne métier n’est inclus dans ce compte rendu. La branche récupérée et le snapshot sont conservés pour examen, sans suppression automatique ; les données restent sensibles. Le snapshot occupe l’unique emplacement manuel du plan gratuit : décider explicitement de son remplacement ou de sa conservation lors du prochain exercice. Le compute utilise la suspension après inactivité du plan.

Limites : les tables transitoires ne sont pas comparées ; aucune connexion utilisateur ni reprise HTTP de l’application sur la cible n’a été testée. Les durées fournisseur ci-dessus ne constituent pas un RTO de service. Les objectifs acceptables de perte de données (RPO), de remise en service (RTO), le calendrier d’exercice et une copie indépendante restent à décider. Les inscriptions adultes demeurent fermées ; cette réussite ne les active pas.
