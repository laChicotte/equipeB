# Qualité et résilience — itération 0.9

## Corrections

Les espaces de compte, de mentorat et Play possèdent un lien clavier « Aller au contenu » avec destination unique et focalisable. L’accueil conserve son lien et reçoit aussi une destination focalisable. Le menu mobile expose son état ouvert/fermé et le lien avec sa navigation ; Échap ferme le menu et ramène le focus à son bouton. Ce menu reste une navigation ordinaire, sans piège de focus.

Les contrôles et liens de navigation des espaces privés ont une hauteur minimale de 44 pixels CSS. Les en-têtes peuvent revenir à la ligne, les identifiants longs se coupent et les fieldsets ne forcent plus une largeur minimale. Les préférences de réduction des mouvements couvrent aussi les animations. Ces corrections de code ne prouvent pas à elles seules l’absence de débordement ou une conformité WCAG.

Toutes les requêtes des composants de compte, mentorat, Play, messagerie, planification, administration et attestations utilisent un délai de 30 secondes, incluant le chargement du corps JSON. Le délai libère l’interface et propose de vérifier le résultat avant de réessayer. Aucun rejeu automatique : une écriture peut avoir abouti sur le serveur malgré une réponse perdue. Les identifiants d’idempotence existants restent conservés pour une nouvelle tentative manuelle.

L’annulation du composant reste propagée et les temporisateurs/écouteurs sont retirés à la fin. Le helper utilise AbortController et prend en charge les réponses JSON de petite taille ; il n’est pas destiné aux fichiers ou aux flux en continu. Les cookies de session restent gérés par la requête d’origine. Aucun nouvel outil de suivi, service externe ou stockage navigateur n’est ajouté.

Une erreur de configuration de l’authentification affiche désormais une indisponibilité réseau, plutôt qu’une fermeture des inscriptions. Réessayer conserve le jeton de vérification/réinitialisation déjà lu depuis le fragment. Les échecs de chargement initial du compte, de la messagerie et du planning offrent une reprise explicite.

Les réponses reçoivent nosniff. Aucune règle générale de referrer ne remplace les politiques no-referrer et no-store des API privées. Le contrôle de production a détecté ce conflit pendant l’itération ; la règle générale a été retirée.

## Contrôle reproductible des ressources

npm run build puis npm run test:quality. Le script démarre un serveur de production local sur 127.0.0.1:4395, avec comptes, communications, jeux et attestations fermés, sans accès à PostgreSQL ni SMTP. Il s’arrête en fin de contrôle.

Dix pages représentatives : accueil, connexion, compte, annuaire, Play, messagerie, planning, administration et deux espaces d’attestations. Contrôles : langue française, un landmark main, lien d’évitement et destination unique, nosniff, ressources JS/CSS initiales servies avec cache immutable, API privée no-referrer et no-store.

Budgets par première visite sans cache : 250 Kio pour HTML + JS + CSS compressés en gzip, dont au plus 200 Kio JS et 30 Kio CSS. Ces budgets sont des seuils internes, pas une certification de performance. Les ressources initialement référencées sont comptées une seule fois par page, y compris les scripts conditionnels/nomodule : c’est un inventaire conservateur, pas une trace réseau navigateur. La compression gzip estimée est calculée sur les octets ; le poids réellement reçu du serveur local est aussi enregistré séparément.

Le rapport .local/quality-report.json contient les résultats et une durée idéale de transfert à 400 kilobits/s. Cette formule exclut RTT, négociation, exécution JavaScript, rendu, API, images et ressources chargées après hydratation. Elle ne mesure ni LCP, INP, CLS, temps d’interactivité, ni un chargement navigateur sur réseau mobile. Aucun score Lighthouse n’est annoncé.

## Contrôles manuels encore nécessaires

| Parcours | Contrôle à réaliser | État de cette itération |
|---|---|---|
| Dix pages du rapport | 320/375/768/1440 pixels, clair/sombre et zoom 200 % puis 400 % | À réaliser dans le navigateur |
| Navigation et formulaires | Tab/Maj+Tab, lien d’évitement, focus visible, Échap du menu, erreurs et reprise | Code corrigé ; parcours visuel à réaliser |
| Connexion et Play | Lecteur d’écran, noms des champs, ordre des titres, annonces de statut | Audit complet à réaliser |
| Connexion lente | Réseau mobile bridé, CPU ralenti, interruption puis retour du réseau, réponse perdue après écriture | Délais testés automatiquement ; mesure navigateur à réaliser |
| Vérification e-mail | Couper le réseau au chargement, Réessayer, confirmer que le jeton reste utilisable | Code corrigé ; essai navigateur à réaliser |
| Attestations | Impression/PDF A4, thème clair/sombre, document en vigueur puis révoqué, contrôles absents de l’impression | À réaliser |
| Vercel privé | Connexion Vercel puis TalentLink, navigation avec le compte autorisé | À revalider après livraison |

Les outils de contrôle visuel du navigateur n’étaient pas disponibles dans cette session. Le présent rapport distingue les contrôles de code/HTTP des essais visuels et des technologies d’assistance. L’ouverture publique, les mineurs, les communications et l’émission réelle des attestations restent des décisions séparées.
