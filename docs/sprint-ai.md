# Mode Sprint IA — version 0.16

## Parcours

Depuis /play/, un utilisateur actif dont l’adresse e-mail est confirmée choisit un sujet général (3 à 160 caractères), une catégorie et un niveau. Il accepte explicitement la transmission du sujet au service IA et la publication du quiz. Aucune approbation adulte ou fonction de mentorat n’est accordée par ce parcours. Le fournisseur reçoit seulement le sujet, la catégorie et le niveau, jamais les données du compte.

Le service produit exactement cinq questions avec trois choix distincts, une seule correction et une explication. Un deuxième appel examine l’exactitude, la cohérence et la possibilité de publication. La structure, l’unicité et certains motifs de coordonnées sont également contrôlés par le serveur. Un refus ou un résultat invalide n’ajoute aucun jeu. Le texte brut de la demande n’est pas enregistré dans PostgreSQL : une empreinte permet de vérifier les répétitions ; les journaux du fournisseur peuvent contenir la demande. L’onglet conserve temporairement la demande dans sessionStorage pour reprendre un appel interrompu.

Après ces contrôles automatisés, le jeu est ajouté au catalogue public avec la mention Sprint IA. Aucun compte, clic, avis ou validation humaine n’est simulé. La provenance est distincte : generation_id et statut de question ai_ready, sans reviewed_by fictif. Les questions éditoriales conservent leur validation humaine. Le modèle initial choisi dans le catalogue vivant est google/gemini-3.8-flash, avec sorties structurées et raisonnement faible ; AI_GATEWAY_MODEL permet de le remplacer après vérification de ses capacités.

La partie commence au clic du joueur, dure au plus trois minutes et rapporte dix points par bonne réponse. La limite est vérifiée côté serveur ; les questions non répondues ne rapportent aucun point. Les visiteurs peuvent jouer aux Sprints publiés sans compte. Les réponses correctes ne sont pas renvoyées avant la réponse du joueur ou la fin de la partie. L’historique reste facultatif, soumis aux règles adultes existantes.

## Contrôle et limites

Les deux passages IA ne garantissent pas la vérité, la détection de toute donnée personnelle ni l’absence de contenu inadapté. Ils ne disposent pas de recherche web ni de sources vérifiées ; les sujets stables sont privilégiés et les URL générées ne sont pas proposées. Les demandes dangereuses, personnelles ou ambiguës doivent être refusées. Les réponses sont affichées comme texte React, sans HTML généré exécuté.

Un utilisateur confirmé peut signaler une correction incorrecte, un contenu inapproprié ou une information personnelle. Un signalement unique par utilisateur et jeu est enregistré. Dans /compte/contributions/, l’administrateur voit le nombre de signalements et peut examiner puis archiver le jeu. Les listes existantes restent limitées à 100 jeux/200 versions : pagination administrative avancée et traitement des signalements à plus grande échelle restent à améliorer. Un retrait empêche les nouvelles parties, sans réécrire les parties déjà commencées.

## Quotas et configuration

Trois demandes par compte et trente demandes pour toute la plateforme par jour UTC, y compris les demandes échouées ou refusées. Un verrou PostgreSQL sérialise les réservations. La même clé de demande avec les mêmes paramètres renvoie le jeu existant, sans nouvel appel IA ; une demande encore en cours reçoit 409. Ne pas lancer de nouvel appel pour vérifier une réponse interrompue : utiliser le bouton de reprise. Une demande interrompue côté serveur peut demeurer pending jusqu’à examen d’exploitation ; elle reste comptabilisée le jour de sa création.

Deux appels maximum par génération, sans réessai SDK automatique ; plafonds de sortie 3000 puis 600 tokens et délai total IA de 75 secondes. Route Vercel limitée à 90 secondes, client à 85 secondes. Aucun achat de crédits, changement de plan ni activation de recharge automatique par le code. Les quotas de demandes ne constituent pas un plafond monétaire du fournisseur ; surveiller les crédits et configurer un budget depuis le compte Vercel si nécessaire.

Variables serveur : PLAY_ENABLED=true, AI_SPRINT_ENABLED=true, AI_GATEWAY_MODEL=google/gemini-3.8-flash. Sur Vercel, activer l’identité OIDC du projet et disposer d’un accès AI Gateway avec crédits. En local, une clé AI_GATEWAY_API_KEY peut être renseignée dans .env.local, jamais dans Git ou le navigateur. Aucun jeu de remplacement préécrit n’est présenté comme une génération réelle si le fournisseur est indisponible. Un défaut d’identité, de crédits ou de capacité laisse les quiz existants utilisables et donne une erreur explicite pour la génération.

Sources officielles consultées : [sorties structurées AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [identité Vercel OIDC](https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc), [modèles AI Gateway](https://vercel.com/docs/ai-gateway/models-and-providers), [crédits et tarifs](https://vercel.com/docs/ai-gateway/pricing). La version installée du SDK et ses documents embarqués prévalent sur les exemples anciens.

## Vérification

Les tests isolés couvrent consentement, schémas, coordonnées, comptes confirmés, relecture du compte après l’appel, publication distincte de la revue humaine, absence de correction anticipée, fin du chronomètre côté serveur, reprise idempotente, refus sans publication partielle, signalement, retrait et quotas concurrents. Les appels IA y sont simulés ; ils ne prouvent pas la disponibilité d’un fournisseur réel. Aucun compte réel ni jeu synthétique n’est créé en production pour ces tests.

La migration 015 a d’abord été appliquée sur la branche Neon sprint-release-20261107 (br-misty-feather-bd290k48), issue de la production. Son empreinte SHA-256 est b87d1ad5ad2eb25a84e791b2e643201dfbe7d81f9ca47193ab438594aae86253.

La migration 016 préserve explicitement les contrôles de provenance éditoriale et ajoute la correspondance entre génération, auteur et version IA. Son empreinte SHA-256 est e21ec007267c35e05cdb5e1dc5a61626355b94dfa6b74def7aa7d468576af168. Après contrôle sur cette même branche, les deux migrations ont été appliquées ensemble à la production : seize migrations, trois jeux publiés préexistants et zéro demande IA au moment du contrôle.

TypeScript, la suite complète de 116 tests et une compilation de production ont réussi. Après les derniers ajustements, 29 tests identité/éditorial/Sprint puis 17 tests ciblés incluant le rejeu concurrent en cours ont également réussi. Le parcours visuel avec un vrai compte n’a pas été validé dans le navigateur.

### Activation différée à la demande du propriétaire

Les appels réels dans trois préversions protégées n’ont publié aucun contenu. Le dernier diagnostic (dpl_EzKBDPYaBH9PJ1LBLn6Cgtb1XwRU) a identifié un refus 403 customer_verification_required : AI Gateway exige une carte valide pour débloquer les crédits. L’absence de VERCEL_OIDC_TOKEN dans process.env n’établissait pas une absence d’identité : le SDK courant lit aussi le jeton transmis par en-tête à chaque requête. Aucun secret d’identité n’a été affiché.

Le propriétaire a choisi de déployer le module et de reporter l’activation. AI_SPRINT_ENABLED reste donc false en production ; le formulaire de génération est indisponible et les quiz existants restent jouables. Aucun achat, changement de plan ni recharge automatique n’a été effectué. Les routes techniques de diagnostic sont propres à ces préversions protégées et sont absentes du code livré en production et du dépôt.

Pour activer ultérieurement : résoudre l’accès AI Gateway dans l’équipe talent-link1, réussir un appel réel contrôlé sans publication de contenu de test, puis passer AI_SPRINT_ENABLED à true et redéployer. Tester ensuite avec un vrai utilisateur confirmé : accord, génération, jeu, ajout au catalogue et signalement. Une validation automatisée ne devient jamais une validation humaine.

### Livraison sur talentlink.today

Déploiement de production dpl_44kyDmkmAyUW87LFWtqmVQAZGpuR, état READY, source 853eb52a5d11f195634520ba8a24fbdfa87e8bd6. Vérifications HTTP du 7 novembre 2026 : /play/ 200 et titre du mode Sprint présent ; configuration Sprint 200 avec enabled=false, limites 3/30 et cinq questions ; tentative de génération 503 sprint_closed ; signalement d’origine étrangère 403 ; diagnostic technique absent (404). Le catalogue conserve ses trois quiz, sans jeu IA de test. Configuration des fichiers activée et inscriptions toujours ouvertes. L’URL technique du déploiement renvoie vers la protection Vercel (302), tandis que le domaine public reste accessible.

Le code et les preuves sont committés localement. L’envoi GitHub a échoué dans l’environnement Codex avec wincredman/terminal prompts disabled ; il reste à effectuer dans le PowerShell interactif du propriétaire. Le déploiement Vercel utilise les fichiers de la révision indiquée ci-dessus.
