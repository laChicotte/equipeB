# Vérification éditoriale — itération 0.11

Le 6 novembre 2026, l’utilisateur a demandé de commencer par les quiz et de différer les profils mentors. Trois lots débutants de quatre questions ont été rédigés et sourcés, avec corrections et explications privées. Le dossier de relecture est livré dans outputs/TalentLink-premiers-quiz-validation.md.

89 tests réussis, dont six contrôles éditoriaux : schéma du lot, import administrateur, idempotence concurrente, immutabilité, origine assistée sans compte fictif, validation humaine requise, composition refusée avant approbation et correction serveur d’une partie après approbation simulée. Une correction humaine ne peut toujours pas être approuvée par son propre rédacteur. Les tests d’approbation utilisent exclusivement une base embarquée isolée.

Le contrôle PostgreSQL natif a réussi : import de douze questions soumises puis rejeu sans doublon, dans une transaction entièrement annulée. Aucune approbation ni publication n’a été enregistrée dans la vraie base lors de ce contrôle. Migration additive 011 appliquée ; les migrations antérieures n’ont pas été modifiées.

Le parcours HTTP Next.js étendu a réussi : douze questions assistées reçues par le compte administrateur fictif avec auteur/rédacteur humain null et provenance explicite ; approbation HTTP simulée d’une question autorisée. Un premier processus de test n’a pas répondu et a été arrêté ; les requêtes du script ont reçu un délai de 30 secondes et les étapes de diagnostic ont été ajoutées. La nouvelle exécution est réussie.

Build public et TypeScript réussis, 29 pages statiques et routes API compilées. Le changement d’affichage signale la rédaction assistée dans l’atelier ; aucun parcours visuel automatisé supplémentaire n’est déclaré. Les sources sont citées sans revendiquer de partenariat ni d’approbation des organismes. La validation des sources par recherche et consultation ne remplace pas la décision éditoriale humaine.

La nouvelle provenance n’attribue pas le contenu à l’importateur humain : elle identifie un lot rédigé avec assistance et enregistre séparément l’importateur. Aucun auteur ou relecteur fictif n’est créé. L’import local n’a pas d’API publique, ne permet pas de publier et ne crée aucune approbation. Les corrections humaines gardent les contrôles d’auteur et de relecteur distincts.
