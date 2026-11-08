# Attestations de participation — itération 0.8

Le titulaire consulte ses documents sur /compte/attestations/. L’administration examine les clôtures, délivre et révoque sur /administration/attestations/. Le tableau de bord comporte un lien dédié et le journal un filtre « Attestations ».

## Nature du document

Il s’agit d’une attestation de participation non accréditée, liée au compte mentoré d’un accompagnement. Elle ne certifie ni compétence, ni diplôme, ni crédit académique. Aucun nom légal, adresse ou pièce justificative n’est collecté. Le titulaire est identifié par son identifiant de compte TalentLink ; ce choix limite l’usage comme document nominatif destiné à un tiers.

Le document garde la référence, le nom public du mentor, les dates de création et de clôture du programme, le nombre de séances enregistrées comme terminées et la date de délivrance. Ces valeurs constituent un instantané ; une modification ultérieure du profil ne réécrit pas l’attestation.

## Délivrance contrôlée

ATTESTATIONS_ENABLED=false par défaut. En production, ATTESTATIONS_APPROVED=true est également indispensable pour émettre. Ces deux valeurs restent false sur Vercel. L’hébergement privé et l’existence d’un compte administrateur ne valent pas accord d’émission réelle.

La délivrance exige un administrateur actif avec adresse vérifiée, distinct des participants. Le programme doit être clôturé avec demande acceptée ; le mentor doit être toujours publié, vérifié et éligible ; le mentoré doit être actif, vérifié, avec rôle mentoré et accès adulte approuvé. Au moins une séance doit être enregistrée comme terminée avec heure de fin passée. Le mentor marque une séance terminée dans le module de planification ; un administrateur examine ensuite les éléments avant délivrance.

Une seule référence est créée par programme. Les émissions concurrentes sont sérialisées par le verrou du programme ; une nouvelle tentative renvoie la même attestation sans doublon d’audit. Une attestation révoquée ne peut pas être réémise automatiquement. Aucune attestation n’est générée automatiquement lors de la clôture.

## Consultation et révocation

Le titulaire avec compte actif, vérifié et accès adulte approuvé, ainsi qu’un administrateur actif vérifié, peuvent consulter le document. Le mentor, le modérateur et les autres comptes ne reçoivent aucun droit général de lecture. La référence seule ne permet aucune vérification publique. Depuis la version 0.21, le titulaire peut créer un lien de vérification révocable (voir ci-dessous).

La consultation et la révocation restent disponibles même lorsque l’émission est fermée. La révocation exige un administrateur et un motif de 10 à 500 caractères, visible par le titulaire. Elle conserve l’attestation et sa référence, avec état révoqué et date. Une révision obsolète ou une seconde révocation est refusée.

Le bouton « Vérifier le statut actuel » recharge le document depuis le serveur. L’impression / enregistrement PDF utilise le navigateur et affiche le statut consulté, sa date et l’avertissement qu’une copie peut être périmée. Ce fichier n’est pas signé numériquement et ne fournit pas une preuve autonome de validité actuelle. L’export visuel imprimé reste à vérifier manuellement dans les navigateurs cibles.

## Sécurité et limites

API /api/v1/attestations/[action] : sessions HttpOnly, contrôle exact Origin pour les écritures, corps limité, Zod strict, réponses no-store et limites persistantes de 30 écritures par action et par quart d’heure. Les événements d’audit contiennent seulement l’acteur, l’action et la référence ; les motifs et contenus ne sont pas copiés dans le journal. Les identifiants restent des données personnelles pseudonymes.

Migration additive 009. Aucun changement des migrations existantes. Les essais PostgreSQL natifs utilisent uniquement une transaction annulée : aucune attestation réelle ni donnée fictive persistante. Aucun e-mail automatique, activation de compte, approbation adulte ou changement de rôle réel.

Listes limitées aux 100 documents du titulaire et aux 100 clôtures les plus récentes. Pas d’attestation pour le mentor dans cette première version, de nom légal, signature électronique, QR public, service d’envoi ou réémission. Le partage externe, les conditions d’émission, la conservation et les responsabilités opérationnelles doivent être définis avant ouverture réelle.

Commandes : npm test ; npm run test:e2e ; npm run db:smoke-attestations ; npm run build ; npm run test:preview.


## Partage volontaire — 0.21

Le titulaire seul peut créer ou remplacer un lien depuis son document. L’administration ne peut pas activer le partage pour une autre personne. Chaque remplacement invalide le lien précédent ; le retrait est idempotent. L’émission reste fermée et aucun document n’a été créé pour cette livraison.

Le lien utilise un secret aléatoire de 256 bits dans le fragment de `/verification-attestation/#…`. Seul son SHA-256 est enregistré (migration additive 019). Le fragment est retiré de l’adresse après chargement, puis le visiteur confirme la vérification ; le secret est transmis dans un corps POST, jamais dans le chemin ou la chaîne de requête. Le lien n’est montré qu’à sa création. Aucun secret n’est copié dans l’audit.

La réponse publique est limitée à la référence, au titre générique, à la date de délivrance et au statut en vigueur/révoqué. Aucun identifiant de titulaire, nom du mentor, période, motif ou détail de séance. Le lien ne prouve pas l’identité de son porteur. Une attestation révoquée reste signalée comme telle sur son lien existant ; aucun nouveau lien ne peut alors être créé. Un compte désactivé rend sa vérification indisponible. Le titulaire peut retirer un lien même après révocation.

API POST `share` privée (30 opérations par compte et quart d’heure), POST `verify` anonyme (plafond global 120 par quart d’heure), Origin exact, corps borné et schémas stricts ; réponses no-store/no-referrer. La limite globale peut temporairement bloquer les vérifications en cas de trafic excessif. Aucune liste publique ni recherche par référence.

Validation : tests isolés PGlite de propriété, rotation, retrait, hash seul, révocation, désactivation, projection minimale et contrôles HTTP ; TypeScript et compilation. Le parcours visuel authentifié et l’impression restent à vérifier manuellement.
