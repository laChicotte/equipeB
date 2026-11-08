# Badges et bilan Play — version 0.18

## Badges de partie

Le résultat d’un quiz terminé affiche des repères calculés côté serveur, y compris pour un visiteur sans compte : Quiz terminé si toutes les questions ont une réponse, Cap des 80 % si au moins quatre cinquièmes des réponses sont correctes, Sans-faute si toutes sont correctes. Les seuils utilisent la proportion exacte, avant l’arrondi de l’affichage. Une partie en cours, vide ou terminée avec des questions sans réponse ne débloque pas ces repères.

Ces badges concernent uniquement la partie affichée. Pour un visiteur, leur accès suit celui de la partie dans son navigateur, au maximum 24 heures. Ils ne créent pas de compte ni d’historique nominatif. Aucun badge de vitesse, classement public, récompense financière ou certificat de compétence n’est ajouté.

## Bilan personnel

Dans /compte/jeux/, le bilan affiche les parties terminées enregistrées, le nombre de jeux différents entièrement terminés, le meilleur résultat, la moyenne des pourcentages des parties terminées et les résultats par domaine. Les compteurs agrègent l’ensemble de l’historique personnel conservé, pas seulement les cent parties que la liste affiche. Jusqu’à cent domaines sont présentés, par dernière partie terminée.

Cinq repères de parcours : un premier quiz entièrement terminé et enregistré, cinq parties entièrement terminées, trois jeux distincts, trois catégories distinctes et trois jeux distincts terminés à au moins 80 %. Chaque badge indique son critère et un compteur de progression. Une répétition d’un même jeu compte pour la pratique, sans créer de jeu ou de catégorie distincte supplémentaire. La catégorie utilise son identifiant stable pour éviter de compter un renommage comme un nouveau domaine.

Un Sprint arrivé à son terme avec des questions sans réponse conserve son score dans les moyennes des parties terminées, mais ne contribue pas aux critères exigeant un quiz entièrement répondu. Les parties ne deviennent pas artificiellement terminées lors de la consultation du bilan : le résultat doit avoir été enregistré par le moteur de jeu.

Les badges de parcours sont des calculs sur l’historique existant, sans table d’attribution, date d’obtention inventée ou garantie d’acquis pédagogique. Une modification future des règles ou un effacement de l’historique pourrait modifier ces résultats. Version des règles renvoyée : 2026-11-08-play-v1.

## Confidentialité et intégration

GET /api/v1/play/progress/ exige la session du titulaire, un compte actif avec e-mail confirmé et l’accès adulte approuvé déjà requis pour l’historique. Aucun accès adulte n’est accordé automatiquement. L’accord d’enregistrement reste facultatif au démarrage du quiz. Les parties visiteurs et celles jouées sans cet accord n’entrent pas dans le bilan personnel.

Le serveur relit les droits en base et choisit le compte depuis la session. Aucun identifiant de compte, score ou badge n’est accepté en paramètre. Les paramètres inattendus reçoivent 400 et les écritures 405. La réponse no-store ne contient pas de questions, corrections, réponses, empreintes de navigateur ni coordonnées. Un administrateur ne peut pas consulter les statistiques d’un autre titulaire par ce parcours. La lecture reste disponible selon les mêmes règles que l’historique si la création de parties est fermée.

L’API d’état de partie renvoie les badges seulement après la fin, selon l’autorisation habituelle du navigateur et, le cas échéant, du compte. Aucune correction anticipée n’est introduite. Une erreur du bilan n’empêche pas la liste d’historique de fonctionner. Les intitulés de badges et l’état obtenu sont textuels, avec jauges nommées pour l’accessibilité, sans information portée par la couleur seule.

Pas de migration, variable d’activation, envoi d’e-mail ou appel IA ajouté. La génération Sprint reste désactivée comme demandé. Aucun compte, badge ou partie de démonstration n’est importé en production pour les tests.

## Vérification

Trente-quatre tests ciblés Play, progression et Sprint ont réussi. Ils couvrent les seuils exacts, les visiteurs, l’absence de correction avant la fin, l’enregistrement facultatif, les répétitions et réponses rejouées, les catégories distinctes, un Sprint expiré partiellement répondu, l’isolation entre comptes, l’accès adulte retiré, les comptes désactivés, la lecture seule et le cache privé. Les données de test demeurent dans une base embarquée isolée. TypeScript est validé. La revue visuelle authentifiée et l’usage avec lecteur d’écran restent à effectuer dans le navigateur.

La suite complète de 142 tests et la compilation de production ont ensuite réussi. Le build conserve 40 pages statiques et utilise la route dynamique Play existante pour le bilan.

## Livraison du 8 novembre 2026

Déploiement Vercel dpl_4QvGAzJhdcR72PAGf3nrKpLsCuX3, état READY, source ad97367, associé à talentlink.today. Contrôles HTTP : /compte/jeux/ répond 200 et contient le chargement du nouveau bilan ; GET du bilan sans session 401/no-store ; paramètre userId rejeté en 400 ; tentative d’écriture de score/badge rejetée en 405. Le catalogue conserve trois quiz, la recherche Sciences trouve toujours un quiz, les inscriptions restent ouvertes et la configuration Sprint conserve enabled=false. Aucun jeu n’a été complété artificiellement en production pour ces contrôles : les badges de résultat ont été vérifiés dans la base isolée.

Les commits sont locaux ; l’envoi GitHub reste en attente du push depuis le PowerShell interactif, les tentatives précédentes ayant échoué sur le gestionnaire d’identifiants Windows. Le déploiement Vercel utilise les fichiers de la révision indiquée ci-dessus.
