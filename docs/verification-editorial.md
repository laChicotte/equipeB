# Vérification éditoriale — itération 0.11

Le 6 novembre 2026, l’utilisateur a demandé de commencer par les quiz et de différer les profils mentors. Trois lots débutants de quatre questions ont été rédigés et sourcés, avec corrections et explications privées. Le dossier de relecture est livré dans outputs/TalentLink-premiers-quiz-validation.md.

89 tests réussis, dont six contrôles éditoriaux : schéma du lot, import administrateur, idempotence concurrente, immutabilité, origine assistée sans compte fictif, validation humaine requise, composition refusée avant approbation et correction serveur d’une partie après approbation simulée. Une correction humaine ne peut toujours pas être approuvée par son propre rédacteur. Les tests d’approbation utilisent exclusivement une base embarquée isolée.

Le contrôle PostgreSQL natif a réussi : import de douze questions soumises puis rejeu sans doublon, dans une transaction entièrement annulée. Aucune approbation ni publication n’a été enregistrée dans la vraie base lors de ce contrôle. Migration additive 011 appliquée ; les migrations antérieures n’ont pas été modifiées.

Le parcours HTTP Next.js étendu a réussi : douze questions assistées reçues par le compte administrateur fictif avec auteur/rédacteur humain null et provenance explicite ; approbation HTTP simulée d’une question autorisée. Un premier processus de test n’a pas répondu et a été arrêté ; les requêtes du script ont reçu un délai de 30 secondes et les étapes de diagnostic ont été ajoutées. La nouvelle exécution est réussie.

Build public et TypeScript réussis, 29 pages statiques et routes API compilées. Le changement d’affichage signale la rédaction assistée dans l’atelier ; aucun parcours visuel automatisé supplémentaire n’est déclaré. Les sources sont citées sans revendiquer de partenariat ni d’approbation des organismes. La validation des sources par recherche et consultation ne remplace pas la décision éditoriale humaine.

La nouvelle provenance n’attribue pas le contenu à l’importateur humain : elle identifie un lot rédigé avec assistance et enregistre séparément l’importateur. Aucun auteur ou relecteur fictif n’est créé. L’import local n’a pas d’API publique, ne permet pas de publier et ne crée aucune approbation. Les corrections humaines gardent les contrôles d’auteur et de relecteur distincts.

## Livraison et import effectifs

Source 3a25ddcc6b257809951689d7c5764403b6126346, déploiement dpl_M3YQUDcRDFMGf8Bu18bitdmc3gV8 confirmé READY et associé à talentlink.today. Protection Vercel vérifiée avant livraison : enabled=true, prod_deployment_urls_and_all_previews. Aucune modification d’environnement ou de protection durant cette itération.

Le contrôle qualité de production réussit sur dix pages et vérifie aussi que /editorial/launch-quizzes.v1.json répond 404. La préversion fermée réussit. Le paquet contenant les corrections reste hors du contenu public et hors des composants client.

Import réel autorisé de trois lots et douze questions effectué via l’administrateur existant, enregistré seulement comme importateur. Lecture PostgreSQL après commit : 12 versions submitted, zéro reviewed_by, zéro created_by humain. Aucun compte, mentor, jeu, approbation ou publication créé par cet import. Les trois plans de quiz restent dans les lots pour composition après approbation des questions.

Contrôles HTTP anonymes en ligne : accueil et atelier 200 (coquille de page seulement), API des questions 401, fichier éditorial 404, catalogue 200 avec total 0, authentification existante activée et registrationEnabled=false. Les questions sont donc disponibles pour revue administrative et ne sont pas publiées. Aucun e-mail envoyé.

La décision humaine sur le contenu reste attendue. Le dossier de relecture est outputs/TalentLink-premiers-quiz-validation.md ; l’atelier est https://talentlink.today/compte/contributions/. Une fois les questions approuvées et les quiz composés, la publication doit être décidée séparément dans le parcours éditorial.
