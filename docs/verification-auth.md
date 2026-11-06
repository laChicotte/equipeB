# Vérification de l’authentification 0.2

Exécution le 5 novembre 2026, Windows, Node.js 26.13.0, Next.js 16.4.5. Les vérifications concernent l’identité et le compte courant ; elles ne signifient pas que les comptes réels sont ouverts.

| Vérification | Résultat |
|---|---|
| Migrations PostgreSQL | 001 et 002 appliquées dans le schéma talentlink de la base Neon configurée |
| Réexécution des migrations | Idempotence et contrôle des checksums vérifiés |
| Parcours sur Neon réel | Inscription fictive, vérification, session, reset concurrent, révocation et déconnexion réussis ; compte fictif supprimé à la fin |
| Tests de fondation, validation et intégration | 16 réussis sur une base PostgreSQL embarquée isolée |
| Rôles / mineurs déclarés / consentements | Élévation à admin/modérateur et inscriptions invalides rejetées ; aucun accès privé au mentorat autorisé |
| Sessions | Hachage des jetons, cookies HttpOnly / Secure sur HTTPS, expiration, déconnexion, compte désactivé et isolation de deux comptes vérifiés |
| E-mails / reset | Vérification obligatoire, finalités distinctes, jetons expirés ou déjà consommés refusés, reset concurrent à usage unique et invalidation des sessions vérifiés |
| Échec simulé d’e-mail | Réponse neutre, aucun détail personnel dans l’événement applicatif et renvoi possible vérifiés |
| CSRF / format / taille / débit | Origine étrangère, JSON invalide, corps excessif et limites persistantes vérifiés |
| Compilation de production | Réussie avec Webpack : pages publiques, six pages d’identité, compte et API dynamique |
| TypeScript strict | Génération des types Next.js et tsc réussis |
| E2E HTTP sur Next.js | Parcours complet réussi sur un serveur réel et une base locale isolée ; arrêt propre du serveur vérifié |
| Navigateur | Connexion/déconnexion du compte fictif, affichage du compte, redirection anonyme, formulaire mentor et charte obligatoire vérifiés |
| Smartphone / thèmes | Pas de débordement horizontal observé à 375 px ; modes clair/sombre inspectés |
| Fragments de vérification | Jeton retiré de location.hash, bouton de confirmation conservé malgré la double initialisation en développement |
| Console navigateur | Aucune erreur applicative relevée |
| Audit npm de production | 0 vulnérabilité connue signalée à la date de ce contrôle ; ne remplace pas un pentest |

## Commandes reproductibles

```sh
npm ci
npm test
npm run typecheck
npm run db:check
npm run db:migrate
npm run db:smoke
npm run build
npm run test:e2e
```

Les tests npm sont isolés et n’utilisent ni votre SMTP ni votre base Neon. db:smoke utilise explicitement la base PostgreSQL de développement configurée, avec une adresse unique sur example.invalid et un transport d’e-mail en mémoire. Les tests E2E HTTP lancent Next.js avec une base locale distincte et un transport fichier. Les données locales de test restent dans .local/, ignoré par Git et exclu des archives.

## Limites et décisions

- L’envoi via un vrai fournisseur SMTP et les cookies sur un hébergement HTTPS final ne sont pas encore testés. Les comptes réels restent fermés par défaut.
- La vitrine Sites publiée reste la version statique précédente. Les API 0.2 nécessitent un hébergement Node.js compatible ; aucune mise en production de données réelles ou souscription payante n’a été effectuée.
- La validation juridique, la procédure mineurs, la politique de purge/rétention, la sauvegarde/restauration et un audit complet d’accessibilité/sécurité restent à finaliser avant ouverture réelle.
- Le sandbox Windows a refusé les jonctions Turbopack et la recréation de sous-dossiers .next après nettoyage. La compilation finale utilise Webpack, les dossiers de génération préparés et TALENTLINK_KEEP_BUILD_OUTPUT=true pour conserver ces dossiers. Le nettoyage reste actif par défaut pour les builds ordinaires. Ce mode de compatibilité est réservé au cache local ; une compilation depuis un dossier vierge hors sandbox n’est pas revendiquée comme vérifiée.
- Le téléchargement interrompu avait laissé deux dépendances incomplètes ; elles ont été réinstallées individuellement avant les vérifications finales.

Les scripts n’affichent pas DATABASE_URL, les mots de passe, les jetons ou les corps des requêtes. La configuration privée .env.local et les messages locaux ne font pas partie des livrables versionnés.
# Validation utilisateur — 6 novembre 2026

L’utilisateur a confirmé le fonctionnement local de l’inscription, de l’e-mail de vérification, de la connexion et de la réinitialisation du mot de passe. La connexion PostgreSQL et le SMTP Resend ont été vérifiés ; un message de test émis par TalentLink a été accepté par SMTP. Domaine déclaré Verified par l’utilisateur : talentlink.today. Les inscriptions publiques Vercel restent fermées. Ce point constitue le jalon avant les modules de mentorat.

