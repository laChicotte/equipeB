# Centre de notifications — version 0.20

## Utilisation

Le parcours /compte/notifications/ regroupe les alertes internes du titulaire. Il propose un filtre toutes/non lues, vingt éléments par page, une navigation vers les notifications plus anciennes et un retour au début. Le compteur représente toutes les notifications non lues du compte, pas seulement la page affichée.

Le lien Notifications figure dans les espaces Play, mentorat/apprentissage et dans Mon compte. Son compteur s’actualise à l’ouverture, au retour sur la fenêtre, après une lecture dans le centre et environ chaque minute lorsque la page reste visible. La consultation automatique s’arrête pour une session absente ou non autorisée ; le retour sur la fenêtre permet de revérifier une connexion effectuée dans un autre onglet. Aucun contenu de notification n’est stocké dans localStorage.

Chaque élément comporte son état, sa date et un lien vers l’espace concerné. Le bouton individuel ou « Marquer cette page comme lue » vise uniquement les identifiants affichés. Une notification arrivée après le chargement reste non lue, sans acquittement global par date. La lecture est idempotente et préserve la première date de lecture. Ouvrir un lien ne marque pas silencieusement un élément comme lu.

## Événements couverts

Les notifications de revue des ressources et publications communautaires existantes sont conservées. Les nouvelles décisions de profil mentor, de version de question Play, de publication/retrait de quiz et de retrait d’un Sprint génèrent désormais une alerte interne au contributeur concerné. Une mise à jour qui maintient une question en examen n’ajoute pas une nouvelle alerte identique. Le retrait idempotent d’un Sprint ne répète pas l’alerte.

Ces insertions appartiennent à la même transaction que la décision et son audit. Un refus de permission, une décision invalide, une erreur ou un rollback ne laisse pas d’alerte. Un contenu éditorial sans auteur humain ne reçoit pas de destinataire inventé. L’auteur d’une action ne reçoit pas d’auto-notification. Les corps ajoutés sont des textes génériques sans coordonnées, note privée de relecture, contenu de conversation ou réponse de quiz.

Les anciens éléments gardent leur texte et leur état. Aucune décision passée n’est reconstruite ni annoncée rétroactivement. Les demandes de mentorat, messages et séances ne disposent pas de nouveaux rappels dans cette livraison. Aucun e-mail, SMS, notification d’appareil, permission du navigateur ou service tiers n’est ajouté.

## API et confidentialité

GET /api/v1/notifications/ accepte filter=all|unread et un curseur before/beforeId. L’ordre utilise created_at et id, avec précision PostgreSQL en microsecondes pour préserver les égalités d’horodatage. GET /api/v1/notifications/count/ retourne le seul compteur personnel. POST /api/v1/notifications/ reçoit un lot de un à vingt identifiants distincts à marquer lus.

Ces API exigent une session, un compte actif et un e-mail confirmé. Elles ne donnent aucun accès adulte ou rôle supplémentaire. Elles utilisent toujours le titulaire de la session, sans paramètre d’identité client. Un administrateur ne dispose pas d’une lecture générale des alertes d’autrui. Une lecture mêlant des éléments du titulaire et d’un autre compte échoue intégralement en 404. Les écritures exigent l’origine attendue et suivent un budget de soixante requêtes par compte sur quinze minutes.

Les réponses sont no-store, nosniff et no-referrer. Les liens sont des routes internes fixées par le serveur et limitées par la base. Le contenu s’affiche comme texte React. La couleur n’est pas le seul indicateur de lecture : les libellés Lue/Non lue restent visibles. L’ancienne lecture de notifications depuis la progression continue de fonctionner sur les mêmes lignes.

## Migration et validation

018_notification_inbox.sql étend la liste des liens internes autorisés et ajoute des index de pagination et de non-lues à learning_notice. Elle ne supprime pas de notification et ne modifie aucun état de lecture. La contrainte de liens est remplacée atomiquement en conservant tous les chemins précédents.

La migration a d’abord réussi sur la branche isolée br-lingering-band-bdljirbb, déjà dédiée aux validations fonctionnelles du 8 novembre, sans créer une nouvelle copie des données. Elle a ensuite été appliquée transactionnellement à la production : dix-huit migrations, zéro notification au relevé. Checksum SHA-256 : 47d54f8d847be1841d5664ab3eff7471a2eb2ff6800893f93b412381de396733. La branche de preuve de récupération n’a pas été modifiée.

Les 158 tests de la suite complète, TypeScript et la compilation de production ont réussi. Les essais portent sur la pagination avec égalités et microsecondes, l’isolation des comptes et administrateurs, le marquage atomique/idempotent, l’arrivée d’un nouvel élément, les permissions retirées, l’origine et les paramètres, les vraies transitions métier et les rollbacks. Les comptes et notifications synthétiques restent exclusivement dans la base de tests isolée. La revue visuelle avec un vrai compte et un lecteur d’écran reste à effectuer.
