# Vérification de la planification — itération 0.6

Contrôles du 6 novembre 2026 :

- 62 tests réussis, dont neuf contrôles de planification. Deux confirmations concurrentes sur des accompagnements distincts du même mentor donnent une réussite et un refus de chevauchement.
- HTTP Next.js sur base isolée : proposition, confirmation par le partenaire, accès tiers refusé, objectif créé puis atteint, lecture des états persistés et page accessible. Les contrôles de session, Origin et schémas stricts sont aussi couverts.
- PostgreSQL natif : proposition idempotente, confirmation, refus de chevauchement, objectif atteint et isolation réussis ; transaction entièrement annulée, sans données fictives persistantes.
- Migration additive 007 appliquée à PostgreSQL de développement.
- Build de production réussi, 24 pages statiques et routes API dynamiques compilées ; TypeScript réussi. Contrôle de préversion fermée sans base ni SMTP réussi, incluant la configuration planning désactivée.

La nouvelle interface n’a pas encore fait l’objet d’un parcours visuel automatisé dans un navigateur pendant cette itération. Les contrôles HTTP et de compilation ne remplacent pas cette vérification. Une démonstration isolée est disponible avec npm run planning:demo ; voir planning.md pour les comptes fictifs et le parcours manuel.

Aucun compte réel modifié, aucune approbation adulte accordée et aucun e-mail envoyé. La production garde PLANNING_ENABLED=false et les verrous de mise en relation et de communication privée existants. L’activation réelle reste distincte de l’hébergement privé.
