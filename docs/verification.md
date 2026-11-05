# Vérification de la première itération

Exécution le 5 novembre 2026, Windows, Node.js 26.13.0. Les résultats concernent uniquement la vitrine et les fondations livrées.

| Contrôle | Résultat |
|---|---|
| Tests de fondation (`npm test`) | 4 réussis : collecte fermée, cibles de navigation, contrastes principaux, clavier/réduction du mouvement |
| TypeScript strict du projet complet | Réussi |
| Rendu React de l’accueil et des quatre pages publiques | Réussi |
| Largeurs 375, 768 et 1440 px | Pas de débordement horizontal observé |
| Thèmes clair et sombre | Rendu inspecté |
| Préférence sombre après rechargement | Conservée dans le navigateur |
| Sélecteur automatique | Présent ; changement de préférence du système non simulé |
| Menu mobile | Ouverture vérifiée |
| FAQ | Ouverture et contenu vérifiés |
| Choix du domaine et recherche | Sélection et état d’attente affichés |
| Dialogue et choix mentor | Affichage, lien vers la charte et fermeture par Échap vérifiés |
| Console de l’aperçu React | Aucune erreur relevée |
| Compilation complète Next.js 16.4.5 | Réussie : accueil, quatre pages publiques et page 404 générés |
| Publication Sites | Bloquée : Git absent, aucune version déployée |

Les contrôles navigateur ci-dessus ont commencé sur un aperçu de QA rendu et hydraté à partir des mêmes composants React. Après compilation Next.js, les cinq routes principales ont répondu HTTP 200. Le dialogue mentor, la persistance du thème après rechargement et la navigation vers la charte ont été revérifiés sur le site compilé. Aucune erreur applicative n’a été relevée dans sa console. Un cas de sélection du thème avant hydratation a été corrigé puis revérifié. Les outils temporaires de génération sont dans `work/`, en dehors des sources livrées.

## Limites
Le sandbox Windows a refusé ponctuellement la création de sous-dossiers de sortie (`EPERM`). Leur création explicite, suivie d’une relance, a permis de compiler. Ce comportement de l’environnement ne doit pas être présenté comme un défaut fonctionnel résolu par le code ; une compilation depuis un dossier vierge hors sandbox reste à confirmer. Aucun réglage expérimental de Next.js n’est conservé pour masquer ce problème.

Pas de serveur PostgreSQL configuré, de migration exécutée, de service e-mail ou d’authentification active. Aucun test d’intégration backend ni test des 17 scénarios Play n’est annoncé comme réussi. Pas encore de suite E2E automatisée reproductible. Les tests navigateur de cette itération sont des vérifications manuelles pilotées dans le navigateur.

Les contrastes principaux sont calculés ; il reste à réaliser un audit WCAG 2.2 AA complet, dont lecteur d’écran, zoom, cibles tactiles et tous les états de composants. Les textes juridiques sont préparatoires et n’ont pas fait l’objet d’une validation juridique.
