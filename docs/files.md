# Fichiers de bibliothèque et photos mentors — version 0.15

Le dépôt de fichiers complète la bibliothèque et les profils mentors. Les rôles mentor et administrateur peuvent proposer un PDF avec une ressource ; le mentor peut proposer une photo dans son propre profil. Un fichier demeure privé jusqu’à publication du contenu auquel il est joint. La revue doit être effectuée par une autre personne habilitée, conformément aux parcours existants.

## Utilisation

Dans /compte/ressources/, choisir le PDF, confirmer ses droits, cliquer sur Déposer ce fichier, compléter le contenu et soumettre la ressource. La personne chargée de la revue peut télécharger la pièce jointe avant de décider. Après publication, le PDF est accessible depuis la lecture de la ressource dans la bibliothèque.

Dans /compte/profil-mentor/, choisir une photo, confirmer ses droits, la déposer puis enregistrer le brouillon et le soumettre. La photo est examinée avec le profil et devient visible sur la fiche et la carte du mentor publié. Toute édition remet le profil en brouillon et retire son image de l’accès public. Les documents d’identité ne sont pas demandés ou acceptés comme justificatifs par ce parcours.

Retirer une pièce du formulaire modifie seulement son association après enregistrement. Ce geste ne supprime pas l’objet stocké. Les demandes d’effacement et les fichiers abandonnés ou échoués nécessitent un traitement d’exploitation distinct ; aucune purge automatique n’est promise.

## Validation et contrôle d’accès

Taille maximale de 2 Mio mesurée sur le flux reçu, indépendamment de Content-Length. Types autorisés : photo JPEG/PNG/WebP, PDF en pièce jointe. Les images sont décodées avec limite de huit millions de pixels, les animations sont refusées et le type annoncé doit correspondre au format détecté. Elles sont orientées, recadrées à 384 × 384 et reconverties en WebP sans reprise des métadonnées EXIF.

Pour les PDF, contrôles du type annoncé, de l’en-tête et du marqueur de fin ; rejet des marqueurs actifs ou chiffrés détectés. Ces contrôles ne constituent ni une validation exhaustive de la structure PDF ni une analyse antivirus, et ne détectent pas toutes les fonctions actives potentiellement compressées ou obfusquées. Les fichiers sont servis uniquement en téléchargement attachment, avec nosniff et CSP sandbox ; aucune prévisualisation PDF intégrée n’est fournie. La revue humaine reste nécessaire pour la lisibilité, le contenu et les droits. Une analyse antivirus/quarantaine approfondie reste à ajouter avant une utilisation à grande échelle.

Accès avant publication : propriétaire et personnes habilitées à examiner le contenu effectivement soumis, pas accès administratif universel aux fichiers abandonnés. Accès public : document attaché à une ressource publiée ou photo attachée à un mentor publié, vérifié, actif et dont l’accès adulte est approuvé. Les URL passent par /api/files/:id/ pour réexaminer l’autorisation à chaque demande ; Cache-Control private,no-store permet le retrait des futurs accès. Une copie déjà téléchargée ne peut pas être révoquée à distance.

Le compte et le rôle sont relus en base. Les écritures exigent une session, l’origine attendue, une confirmation des droits, puis un maximum de huit dépôts par compte sur quinze minutes. Quotas applicatifs : 64 Mio réservés par compte et 512 Mio pour l’ensemble des fichiers suivis ; les dépôts en attente ou échoués restent comptabilisés pour éviter des réservations illimitées après une panne. Les réservations sont sérialisées avant l’envoi. Une empreinte SHA-256 et la taille sont vérifiées à la lecture. Les clés sont générées côté serveur sans nom de fichier personnel.

## Stockage et configuration

Bucket Neon talentlink-files en mode private, sur la branche de production du projet existant en région AWS us-east-2. Un credential de service est limité aux scopes storage:read et storage:write ; ses valeurs sont stockées comme variables sensibles de production Vercel. Aucun secret dans Git ni dans les réponses du navigateur. Les variables applicatives FILES_ENDPOINT, FILES_REGION, FILES_ACCESS_KEY_ID et FILES_SECRET_ACCESS_KEY évitent de réutiliser les variables AWS du runtime de l’hébergeur. ASSETS_ENABLED contrôle l’activation. Aucun changement de plan ou achat n’est effectué.

Le projet est sur free_v3 et le stockage a été constaté disponible dans sa région. Le quota gratuit publié est de 5 Go par projet ; surveiller aussi les limites de transfert et de calcul. Sources officielles consultées : [authentification du stockage Neon](https://neon.com/docs/storage/authentication), [offres et limites](https://neon.com/docs/introduction/plans). Les limites applicatives ne constituent pas une garantie de disponibilité des prestataires.

Le SDK AWS S3 est utilisé directement pour maîtriser les en-têtes et la restitution des octets, avec adressage par chemin et TLS vérifié. La migration additive 014_private_assets.sql crée stored_asset et ajoute les références file_id et photo_id. Le stockage ne remplace pas la base : les octets sont dans le bucket, les propriétaires, empreintes et droits d’accès dans PostgreSQL. Les exercices de récupération précédents n’ont pas validé ces nouveaux fichiers ; une future restauration devra contrôler les deux ensembles.

Le prototype local utilise uniquement .local/prototype-files lorsque son mode dédié est actif ; il ne demande pas de credential cloud. Relancer npm run prototype pour appliquer la migration au prototype existant.

## Vérification

Migration et bucket privé testés sur la branche assets-release-20261107 / br-royal-pond-bdby327k avant application à la production. Un objet de contrôle sans donnée utilisateur a été envoyé et relu à l’identique ; un accès non signé a reçu 403. Le store applicatif S3 a également réussi un vrai PutObject/GetObject avec un marqueur privé sans référence dans les données de l’application. Les objets de contrôle sont conservés comme traces techniques ; aucune suppression de fichier utilisateur n’a été exécutée. Le fichier temporaire utilisé pour le test SDK a été retiré après son exécution.

TypeScript, 106 tests et compilation ont réussi. Les essais ciblés couvrent taille et format, retrait des métadonnées photo, consentement, rôles, confidentialité, revue distincte, publication/retrait, panne du stockage, quotas et intégrité, origine/session et en-têtes de téléchargement. La validation visuelle et le parcours complet avec une vraie contribution humaine restent à examiner dans le navigateur. Aucun compte réel ni photo de personne n’a été créé pour ces tests.

### Mise en production du 7 novembre 2026

Déploiement Vercel dpl_3TYCrwMgXaP5SXtqrxZ5pTbPU7cY, état READY, source 001ae5cf458b8bc8d4546678f281e9a1af9e6469, associé à talentlink.today. La migration 014 est appliquée en production avec l’empreinte SHA-256 d8f3bbe2c89a69e8cf41a5fa661324f5b10f29c3d214e1fbdab1d3f39e810dc3. Le bucket reste privé et ASSETS_ENABLED est activé.

Contrôles HTTP sur le domaine public vers 08:11 UTC : configuration des fichiers 200 avec enabled=true ; bibliothèque, espace ressources et profil mentor 200 ; fichier inexistant 404 ; dépôt sans session 401 ; dépôt d’origine étrangère 403 ; route de prototype 404. Ces contrôles complètent les tests automatisés sans constituer une validation visuelle ni un dépôt réalisé avec un vrai compte.
