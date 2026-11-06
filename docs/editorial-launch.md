# Premiers quiz éditoriaux — itération 0.11

L’utilisateur a choisi de commencer par les quiz et de différer les profils mentors. Le fichier privé editorial/launch-quizzes.v1.json contient trois propositions de quiz débutants, quatre questions chacun, durée indicative de trois minutes et 10 points par bonne réponse : Les bons réflexes numériques ; Premiers repères dans le Système solaire ; L’eau change et circule.

Les formulations françaises sont originales et les corrections sont accompagnées de sources primaires : Cybermalveillance.gouv.fr, CNIL, NASA, USGS et USDA Climate Hubs. Sources consultées le 6 novembre 2026. Les organismes cités ne sont ni auteurs, ni partenaires, ni approbateurs de TalentLink. Le lot est rédigé avec assistance IA et exige une vérification humaine des faits, distracteurs et explications avant approbation.

## Provenance et intégrité

La migration additive 011 ajoute editorial_quiz_batch et une provenance explicite aux questions/versions. Une origine est soit humaine (auteur/rédacteur réel), soit éditoriale assistée (lot identifié). Aucun faux compte n’est créé pour représenter l’assistant. L’administrateur qui importe est enregistré comme importateur, pas comme auteur ou relecteur automatique.

L’import produit uniquement des versions submitted. Aucun jeu, approbation ou publication n’est créé. Le lot conserve son empreinte, ses sources, le plan du futur quiz et l’identité de l’importateur. Les verrous sont acquis dans un ordre stable ; un rejeu identique ne crée rien, un contenu changé exige un nouveau slug/version. L’import complet est transactionnel.

Le contenu et la provenance des versions restent immuables. Une correction humaine d’une question assistée porte l’identité du rédacteur réel : elle ne peut pas être approuvée par ce même compte. L’origine initiale n’est pas réattribuable. Les contrôles SQL et de service contre l’auto-approbation des contenus humains restent en place.

## Vérifier, importer, relire

npm run editorial:check valide le schéma du paquet sans accès en base. npm run editorial:import -- --admin-email <compte-administrateur-existant> charge le lot comme propositions avec la configuration PostgreSQL locale autorisée. La commande refuse un compte absent, désactivé, non vérifié ou non administrateur. Aucun secret ou adresse de compte n’est affiché. Le script d’import est un outil d’administration local, pas une API ouverte au navigateur.

Dans /compte/contributions/, l’administrateur retrouve les douze questions avec le badge « Rédaction assistée · source à contrôler · validation humaine requise ». Examiner les trois choix, la correction et l’explication, consulter la source, puis approuver ou demander une correction avec un motif réel. L’importateur peut examiner ces questions car il n’en est pas l’auteur humain ; sa décision demeure une action humaine explicite, distincte de l’import.

Après approbation des quatre questions d’un thème, composer le quiz selon le titre, la description et la durée du lot, puis le soumettre et choisir sa publication dans l’atelier. La composition refuse les versions non approuvées ou de catégories différentes ; la publication revérifie les versions. Le dossier de relecture TalentLink-premiers-quiz-validation.md est livré à côté du projet dans outputs.

## Confidentialité et limites

Le JSON contient les bonnes réponses et reste hors du dossier public, hors des composants client et hors des routes de distribution. Sa simple présence dans les sources ne doit pas le rendre téléchargeable sur le site. Les API privées des questions exigent le rôle autorisé. Les API de jeu ne montrent la correction qu’après la réponse du joueur.

Aucune donnée de mentor, nouveau compte ou e-mail ajouté. Les inscriptions et fonctions privées restent fermées. L’annuaire reste vide. Aucune question n’est déclarée approuvée au seul motif qu’elle passe les tests techniques. La consultation d’une source ne remplace pas la décision du relecteur humain. Certains sites institutionnels peuvent répondre lentement ; vérifier à nouveau leur accès lors de la revue.

## Vérification

89 tests globaux réussis : schéma, origine explicite, import administrateur, rejeu concurrent, refus d’un paquet changé, absence de compte fictif, garde SQL d’immuabilité, blocage avant revue, jeu après validation simulée et refus d’auto-approbation d’une correction humaine. Les approbations des tests ont lieu seulement sur une base embarquée isolée. Le contrôle PostgreSQL natif vérifie import et rejeu dans une transaction annulée, sans approbation ni publication persistante.
