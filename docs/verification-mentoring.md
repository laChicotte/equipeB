# Vérification du mentorat — 6 novembre 2026

- 29 tests unitaires/intégrés réussis sur PostgreSQL embarqué isolé : identité et sécurité, SMTP/Resend, profils, revue, visibilité, favoris, demandes, programmes et contrôles HTTP.
- TypeScript : `npm run typecheck` réussi.
- `npm run test:e2e` réussi : vrais endpoints Next.js, inscription/connexion de mentor synthétique, sauvegarde et soumission, refus de CSRF, d’auto-validation et d’accès tiers, annuaire sans brouillon, pages disponibles, reset et déconnexion. Aucun SMTP réel utilisé.
- Migration additive 003 appliquée sur le PostgreSQL de développement configuré par l’utilisateur.
- `npm run db:smoke-mentoring` réussi sur PostgreSQL natif : profil, revue, recherche, favori, demande, acceptation/programme, retrait/suspension. Toutes les données synthétiques restent dans une transaction annulée, jamais visibles aux autres connexions. Aucun compte réel modifié ni message envoyé.
- Build serveur Webpack réussi, 18 pages prégénérées et routes dynamiques. Sous Windows sandbox, préparation des dossiers et TALENTLINK_KEEP_BUILD_OUTPUT=true utilisés pour éviter les refus EPERM déjà documentés ; le nettoyage ordinaire reste activé par défaut en dehors de ce contournement local. Pas de nouveau déploiement Vercel de cette itération.
- `npm run test:preview` réussi : accueil, health et comptes fermés en production sans connexion privée.
- Navigateur : annuaire vide explicite, connexion d’un mentor synthétique de la base isolée, accès au formulaire enregistré « En examen », thème sombre et mesure à 375 px sans débordement horizontal. Présentation claire de l’annuaire également inspectée. Aucun examen administratif réel effectué dans le navigateur.

Les photos, évaluations, séances et justificatifs ne sont pas couverts par cette livraison. Les tests de concurrence des demandes s’exécutent dans la base embarquée ; une charge multi-connexions PostgreSQL native reste à organiser avant ouverture. L’annuaire vide reflète l’absence de mentor réel validé, pas un échec de chargement. L’accès adulte et les mises en relation restent fermés jusqu’à la validation des procédures.

Contrôle final sur le serveur local relié à Neon : une première requête a renvoyé 503 lors d’une indisponibilité transitoire ; la suivante a répondu 200 avec items=[], total=0. Le profil ne doit pas être inventé pour masquer cet état. L’interface distingue erreur et liste vide et propose de réessayer le chargement. Pas de reprise automatique des écritures ni des e-mails.
