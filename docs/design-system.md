# Design system

Identité typographique originale : sans-serif système pour l’interface, serif italique pour les accents. Illustration locale en CSS, zéro police distante, zéro image lourde. Espaces généreux, bords fins, rayon 6–12 px, animations limitées et respect de prefers-reduced-motion.

| Token | Clair | Sombre |
|---|---|---|
| Fond | #F6F8FB | #0B1220 |
| Surface | #FFFFFF | #172235 |
| Titres | #123B66 | #F3F4F6 |
| Texte | #263747 | #E1E7EE |
| Secondaire | #526477 | #B9C6D5 |
| Action verte | #087655 | #64DFBA |
| Bordure | #DCE4E9 | #334155 |
| Accent | #E8B44D | #E8B44D |

Le vert clair suggéré #169B72 est assombri sur les actions en mode clair pour améliorer le contraste. Les surfaces d’illustration gardent leur propre palette fixe, avec texte foncé. Les tokens sémantiques pilotent le reste.

Breakpoints : 620, 900, 1200 px. Navigation repliable, cartes empilées sur smartphone, grille de trois piliers sur grand écran. Focus visible, lien d’évitement, champs nommés, accordéons natifs et dialogue natif modal. Une vérification humaine WCAG 2.2 AA complète reste nécessaire ; aucune certification n’est revendiquée.
