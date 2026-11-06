# Vérification qualité — itération 0.9

Contrôles du 6 novembre 2026 :

- 80 tests réussis, dont quatre contrôles du transport client : réponse HTTP préservée, délai d’attente, annulation et corps de réponse lent. Aucun rejeu automatique d’écriture.
- Parcours HTTP Next.js sur base isolée réussis pour identité, mentorat, Play, messagerie, planification, administration et attestations.
- Build de production et TypeScript réussis, 27 pages statiques et routes API compilées.
- Préversion fermée sans identifiants PostgreSQL/SMTP réussie.
- Contrôle qualité du serveur de production : dix routes réussies, langue française, un main, lien d’évitement et cible unique, nosniff, cache immutable des ressources et API privée no-referrer/no-store.

Le premier contrôle a révélé une hypothèse incorrecte du script : l’accueil utilisait déjà une cible nommée main, alors que le script cherchait uniquement contenu. Le script vérifie maintenant la cible réelle du lien. Un contrôle suivant a détecté un conflit entre une règle générale de referrer et la politique privée des API. La règle générale a été retirée ; le contrôle final confirme no-referrer et no-store.

## Ressources initialement référencées

Mesure HTTP locale et compression gzip calculée sur les octets, sans exécution navigateur. Les scripts conditionnels/nomodule référencés sont inclus de façon conservatrice, même si un navigateur moderne peut les ignorer. Le rapport ne représente pas exactement les requêtes effectuées par un navigateur après hydratation.

| Page | Ressources JS/CSS | HTML + JS + CSS gzip (Kio) | Transfert théorique à 400 kbit/s (s) |
|---|---:|---:|---:|
| / | 7 | 185.9 | 3.81 |
| /auth/connexion/ | 7 | 181.2 | 3.71 |
| /compte/ | 7 | 179.6 | 3.68 |
| /mentors/ | 8 | 183.9 | 3.77 |
| /play/ | 8 | 185.5 | 3.80 |
| /compte/messages/ | 8 | 181.7 | 3.72 |
| /compte/planning/ | 7 | 181.2 | 3.71 |
| /administration/ | 7 | 180.4 | 3.70 |
| /compte/attestations/ | 8 | 181.2 | 3.71 |
| /administration/attestations/ | 8 | 181.4 | 3.72 |

Les dix pages respectent les budgets : 250 Kio gzip au total, 200 Kio de JavaScript et 30 Kio de CSS. Le temps théorique exclut RTT, négociation, parsing, rendu, exécution JavaScript, images, données API et chargements ultérieurs. Il ne doit pas être présenté comme un temps d’affichage mesuré, un score Lighthouse ou une mesure des Web Vitals. Le fichier reproductible est .local/quality-report.json ; npm run test:quality le régénère après compilation.

## Limites

Les outils de contrôle visuel du navigateur ne sont pas disponibles dans cette session. Aucun nouvel essai visuel mobile, lecteur d’écran, zoom, impression/PDF ni mesure navigateur sous réseau/CPU bridés n’est déclaré réussi. Les correctifs de code n’établissent pas une conformité WCAG complète. La matrice de contrôles manuels reste dans quality.md.

Aucune migration, modification de rôle, approbation adulte, donnée fictive persistante ou envoi d’e-mail. Les activations sensibles restent fermées. La nouvelle limite d’attente peut afficher une expiration alors que le serveur a terminé une écriture : vérifier l’état avant de réessayer. Les protections d’idempotence existantes sont conservées.

## Livraison privée Vercel

Source déployée : 096ab4b910292538720fa3e989856880cb106d77. Déploiement dpl_6M5Apedki5HN1WenbhqeKeDjNEqV confirmé READY, associé à talentlink.today et www.talentlink.today sans erreur d’alias. Protection relue après livraison : enabled=true, deploymentType=all.

Un premier envoi a échoué sur le transport du connecteur ; après rétablissement, l’historique a confirmé qu’aucun déploiement n’avait été créé par cette tentative. Le nouvel envoi ci-dessus a abouti. Aucun changement de protection, d’environnement sensible ou de compte n’a été effectué.

Les requêtes HTTPS anonymes vers /auth/connexion/ et /administration/ reçoivent HTTP 302 vers vercel.com. Ce contrôle confirme la protection, sans valider un parcours applicatif authentifié ou les Web Vitals du cloud. Aucun lien de contournement créé.
