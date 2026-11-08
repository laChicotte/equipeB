# Trois guides de démarrage — 0.25

L’administration dispose d’un aperçu complet dans `/compte/ressources/` : message inattendu et vérification indépendante (Technologie et numérique), observation et comparaison (Sciences), prolongation d’usage d’un objet (Environnement). Ces domaines correspondent aux trois quiz éditoriaux de lancement.

Textes originaux préparés avec assistance IA, exercices propres à TalentLink et références pour approfondir :

- Cybermalveillance.gouv.fr : https://www.cybermalveillance.gouv.fr/tous-nos-contenus/fiches-reflexes/hameconnage-phishing
- Khan Academy : https://www.khanacademy.org/science/biology/intro-to-biology/science-of-biology/a/experiments-and-observations
- ADEME : https://quefairedemesdechets.ademe.fr/reduction-des-dechets/

Références consultées le 8 novembre 2026. Aucun texte d’ouvrage tiers reproduit. Les ressources françaises sont distinguées des procédures guinéennes ; aucun service local ou résultat environnemental chiffré n’est inventé. Les textes et références restent à examiner avant publication.

## Parcours

Un administrateur actif et vérifié ouvre l’aperçu, lit les textes, confirme qu’une relecture sera nécessaire puis ajoute les trois guides à la file. Les ressources restent `submitted` et ne sont ni lisibles dans le catalogue ni proposées après les quiz. L’administrateur ou le modérateur peut ensuite examiner chaque texte et choisir explicitement sa publication ou son refus dans la file existante.

Ces textes assistés n’ont pas d’auteur humain fictif : author_id est NULL, imported_by conserve le compte ayant effectué l’import, et les droits expliquent leur préparation. L’importateur peut relire et décider de publier un texte assisté, comme pour les quiz éditoriaux existants. Cela ne constitue pas une validation humaine réalisée par l’agent. Les contributions ordinaires conservent leur auteur et l’interdiction de leur auto-approbation.

## Intégrité

Migration 020 : origine éditoriale contrainte, clé unique, empreinte SHA-256 et importateur séparé. Les anciennes ressources conservent un auteur obligatoire. Les clés versionnées et empreintes empêchent un changement silencieux de lot. Verrous transactionnels triés et unicité protègent le rejeu concurrent. Le même lot n’écrase pas les décisions et ne republie rien ; un contenu révisé exige une nouvelle clé/version dans le code.

Aperçu GET et import POST `/api/v1/learning/starter-guides/`, administrateur relu en base. POST exige Origin exact, corps strict et confirmation explicite ; limitation persistante existante de 60 écritures par compte et quart d’heure. GET sans paramètres. Réponses no-store/no-referrer. Fermeture de LEARNING_ENABLED respectée. Audit d’import sans contenu intégral ; pas de notification adressée à un auteur inexistant.

Aucune publication, import de contenu ou création de compte automatique au déploiement. Aucun appel IA payant ni fichier joint. Une fois publiés, ces guides utilisent les lecteurs, favoris, recherche et suggestions Play existants.

## Vérification

Tests isolés : droits d’accès, schéma strict, absence de publication après import, concurrence, rejeu, provenance sans faux auteur, refus/retrait conservés, empreinte modifiée, contraintes SQL et revue humaine explicitement simulée. Les tests ordinaires de contributions continuent de couvrir la revue distincte. Contrôle TypeScript et compilation ; interface authentifiée à vérifier manuellement.


## Livraison du 8 novembre 2026

Source `6c875378e4ab14a2a5306fe911c29946f8bd9eb2`, version 0.25.0. Déploiement `dpl_75bmQJ66jHTbWLG5xr9pASAaBKaJ` READY sur talentlink.today. Migration 020 validée sur `br-lingering-band-bdljirbb`, puis appliquée à `br-delicate-darkness-bdhflh27` : 20 migrations enregistrées. Aucun contenu importé ou publié, aucun compte créé en production.

167 tests réussis, TypeScript et compilation réussis (42 pages statiques). Contrôles HTTP : atelier ressources 200, aperçu et import anonymes 401/no-store, Origin étranger 403, bibliothèque publique 200 avec zéro ressource publiée, catalogue Play 200 avec trois quiz. URL technique Vercel protégée (302). Les autorisations administrateur et les publications ont été testées avec fixtures isolées ; aucun compte réel emprunté et aucun parcours visuel authentifié déclaré comme testé.
