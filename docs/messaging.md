# Messagerie encadrée — itération 0.5

## Périmètre

- /compte/messages/ : accompagnements autorisés, historique paginé par 40 messages, messages texte de 2 000 caractères maximum, indicateurs de non-lus, acquittement des messages affichés, blocage et signalement.
- /administration/signalements/ : file réservée aux administrateurs/modérateurs pour les messages signalés, avec motif, preuve du message concerné et décision journalisée.
- API /api/v1/messaging/[action] réutilisable par un futur client mobile. Pas de fichier, audio, appel ou pièce jointe.

Le premier envoi crée une conversation unique pour le programme accepté. Aucun utilisateur ne peut créer un échange en fournissant seulement l’identifiant d’une autre personne.

## Contrôles d’accès et état métier

L’acteur est relu en base : compte actif, e-mail vérifié et accès adulte approuvé. Il doit appartenir au programme en tant que mentor ou mentoré avec le rôle correspondant. Un administrateur n’a pas de droit général de lecture des conversations. Les participants ne voient ni adresses privées ni informations d’autres accompagnements.

Pour envoyer, le programme doit être actif, la demande acceptée et les deux accès adultes toujours approuvés. Le mentor doit rester publié et vérifié. Une suspension du programme, le retrait du mentor ou la révocation d’un accès bloque l’envoi. L’historique déjà partagé reste lisible par un participant encore autorisé lorsque le programme est arrêté ou l’interlocuteur bloqué.

MESSAGING_ENABLED=false par défaut. En production, PRIVATE_COMMUNICATIONS_APPROVED=true est aussi indispensable pour activer les lectures privées et les envois. MENTORING_ENABLED=true est requis pour envoyer. Ces valeurs restent fermées sur la version privée Vercel ; l’hébergement privé ne vaut pas validation de l’ouverture des communications ou de la procédure mineurs.

Les fonctions de protection (blocage, signalement et traitement des signalements) restent disponibles par API aux acteurs autorisés même si la messagerie est désactivée, pour ne pas supprimer les protections sur les données existantes. L’écran utilisateur reste fermé lorsque l’indicateur global est désactivé. Aucun accès adulte ou rôle réel n’est promu dans cette itération.

## Fiabilité et confidentialité

Le client envoie un UUID d’idempotence et le serveur impose l’unicité par conversation/expéditeur. Une réponse réseau perdue peut être réessayée sans duplication ; le même UUID avec un contenu différent est refusé. Un verrou de conversation sérialise l’ordre des messages. Les opérations de blocage et d’envoi partagent un verrou transactionnel de la paire de participants.

Le blocage est directionnel en base et interrompt les envois dans les deux sens, sur les programmes de la même paire. Chaque participant peut retirer seulement son propre blocage. L’historique ne disparaît pas.

La lecture avance un curseur monotone sur un message réel de cette conversation. Elle ne marque pas comme lus les messages arrivés après le chargement. Pas d’accusé de lecture exposé à l’interlocuteur. Les notifications sont des compteurs internes ; pas d’e-mail, push ou notification externe automatique.

L’actualisation est manuelle, indiquée dans l’interface, pour limiter les requêtes et rester compatible avec les fonctions serveur actuelles. Ce n’est pas encore un chat en temps réel. Le bouton d’actualisation conserve le brouillon en cours.

Un signalement conserve une copie du seul message concerné et l’explication du participant. La modération ne reçoit pas toute la conversation. L’auteur du message et l’auteur du signalement ne peuvent pas examiner leur propre dossier s’ils disposent aussi d’un rôle de modération. Le masquage retire le texte des API participants ; une preuve est conservée pour la procédure de modération. Le texte n’est pas effacé irréversiblement en base.

Les messages sont rendus comme texte React, jamais comme HTML. Les écritures utilisent la session HttpOnly existante, Origin exact, JSON limité à 8 Ko et une limite persistante par acteur/action (60 envois par 15 minutes, 30 pour les autres écritures). Les corps de messages ne sont pas envoyés aux logs ou à l’audit. Les comptes et le transport utilisent TLS sur l’hébergement ; aucune promesse de chiffrement de bout en bout n’est faite. La base et les preuves doivent suivre une politique de rétention et d’accès opérationnelle avant ouverture.

## Vérification et démonstration

Migration additive 006_messaging.sql, sans modification des anciennes migrations. Aucun message synthétique n’est ajouté à la base réelle par les tests : le contrôle natif travaille dans une transaction annulée.

```sh
npm test
npm run test:e2e
npm run db:smoke-messaging
npm run messaging:demo
```

messaging:demo démarre sur 127.0.0.1:4393 une base embarquée isolée, avec bannière explicite de démonstration. Comptes fictifs mentor-messaging@example.invalid, mentee-messaging@example.invalid et moderation-messaging@example.invalid ; mot de passe de démonstration uniquement : TalentLink-messaging-demo-2026. Les accès/validations sont simulés ; aucun compte réel, Neon ou SMTP n’est utilisé. Ctrl+C arrête ce serveur.

## Limites avant ouverture

La procédure mineurs et les communications privées restent non activées. Définir la conservation, le traitement des urgences et les responsabilités de modération avant ouverture. Les listes de conversations/signalements sont limitées à 100 ; la pagination des messages utilise un curseur serveur. Pas de recherche dans les messages, suppression utilisateur, modification des textes, temps réel ou accusés de lecture partagés. La planification des séances et le suivi détaillé des objectifs viennent ensuite.
