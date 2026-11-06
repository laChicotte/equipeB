# Vérification de la messagerie — itération 0.5

Contrôles réalisés le 6 novembre 2026 sur des comptes fictifs isolés :

- 53 tests réussis : identité, mentorat, Play, déploiement et messagerie.
- Parcours HTTP Next.js réussi : sessions, envoi idempotent, isolation entre participants, lecture, blocage, signalement et masquage par modération.
- Migration additive 006 appliquée à PostgreSQL ; scénario natif réussi dans une transaction annulée, sans données fictives persistantes.
- Build de production et contrôle de préversion fermée réussis ; vérification TypeScript effectuée.
- Navigateur : envoi, non-lus, conservation du brouillon après actualisation, blocage/déblocage, signalement, traitement par un modérateur puis texte masqué côté participant. Affichage mobile contrôlé à 375 pixels, thèmes clair et sombre.

La démonstration utilise une base embarquée séparée, sans Neon ni SMTP. Aucun message ni e-mail de test envoyé à une personne réelle. La capture PNG finale a échoué ; aucun fichier image n’est livré comme preuve.

La version Vercel conserve MESSAGING_ENABLED=false, PRIVATE_COMMUNICATIONS_APPROVED=false et MENTORING_ENABLED=false. Aucun accès adulte réel n’est approuvé. Les parcours de communication sont validés localement ; ils ne sont pas ouverts aux utilisateurs réels.

Voir messaging.md pour les comptes fictifs de démonstration et les limites, notamment l’actualisation manuelle et la procédure de conservation à définir avant ouverture.
