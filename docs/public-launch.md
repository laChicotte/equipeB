# Lancement découverte — 6 novembre 2026

## Décision de l’utilisateur

Après validation manuelle de la connexion, de la navigation mobile et de l’administration, l’utilisateur a autorisé la préparation des textes puis l’ouverture publique. Périmètre choisi : vitrine, annuaire et quiz publics ; nouvelles inscriptions fermées. Cette décision remplace la protection intégrale précédente pour les seuls domaines de production. Elle n’ouvre ni les communications, ni les mineurs, ni les nouvelles attestations.

Éditeur communiqué : TalentLink Group, Conakry, République de Guinée. Contact public autorisé : +224 625 59 51 69. Le domaine n’a pas de MX de réception observé ; l’utilisateur a choisi le téléphone et reporté la réception e-mail. notifications@talentlink.today reste l’adresse d’envoi technique, sans lien de contact e-mail. Aucune adresse Gmail personnelle publiée. Aucun statut juridique, immatriculation ou identité de dirigeant n’est inventé.

## Périmètre

La découverte et les quiz validés sont accessibles sans compte. Un catalogue ou annuaire vide reste vide : aucune donnée fictive n’est copiée. Les comptes existants peuvent se connecter ; l’administration exige la session TalentLink et le rôle serveur adéquat. Les nouvelles inscriptions sont refusées côté serveur, même par appel API direct. Les demandes de reset et de vérification restent disponibles pour les comptes existants.

La page d’accueil annonce la fermeture des inscriptions et oriente vers les contenus accessibles. Conditions, confidentialité, engagements et charte décrivent le fonctionnement réel, les cookies techniques et les prestataires. La nouvelle version de document sert aux futurs consentements ; aucun consentement historique n’est réécrit. Les textes ne constituent pas une certification de conformité juridique. Les formalités et politiques complémentaires doivent être examinées avant une ouverture des inscriptions ou des communications.

robots.txt et sitemap.xml concernent les pages publiques seulement. Les espaces de compte et d’administration conservent noindex ; les API gardent leurs contrôles d’accès. robots.txt ne constitue jamais une protection d’accès.

## Configuration et séquence

Production : AUTH_ENABLED=true, REAL_ACCOUNTS_APPROVED=true, AUTH_REGISTRATION_ENABLED=false, PLAY_ENABLED=true. MENTORING_ENABLED, MESSAGING_ENABLED, PLANNING_ENABLED, PRIVATE_COMMUNICATIONS_APPROVED, ATTESTATIONS_ENABLED et ATTESTATIONS_APPROVED restent false. NEXT_PUBLIC_SITE_PHASE=public-discovery. APP_URL reste https://talentlink.today. Secrets PostgreSQL, SMTP et de session conservés, sans lecture ou publication.

Déployer d’abord cette source sous protection intégrale, contrôler READY, les alias, les variables et les refus attendus, puis passer Vercel Authentication de all à prod_deployment_urls_and_all_previews. Cette protection standard conserve la protection des URL de déploiement et des préversions tout en ouvrant les domaines de production. Ne pas utiliser ssoProtection=null ou preview, qui exposeraient un périmètre plus large. La procédure suit la [documentation officielle Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

## Entretien

GET /api/internal/maintenance/ exige un CRON_SECRET sensible, long et aléatoire, passé uniquement en Authorization Bearer. Une requête non autorisée ne se connecte pas à la base. MAINTENANCE_ENABLED permet d’arrêter le traitement. Aucun secret dans les logs, réponses ou fichiers Git.

Le cron déclaré exécute une maintenance quotidienne à 03:00 UTC (Conakry). La [documentation Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs) décrit l’envoi du secret et les contraintes de planification. Aucune modification de plan ni achat. L’heure effective peut varier selon l’offre et la disponibilité.

Transaction et verrou anti-chevauchement. Au plus 1 000 lignes par table et par passage : sessions expirées depuis plus d’un jour ou révoquées depuis plus de sept jours, jetons expirés/consommés depuis plus d’un jour, compteurs expirés depuis plus d’un jour, parties visiteurs expirées sans référence métier. Les réponses liées aux parties supprimées suivent leur cascade SQL. Comptes, consentements, historiques personnels, contenus publiés, messages, preuves et journal d’audit ne sont pas supprimés par ce job. Un volume supérieur, un incident ou une dépendance peut retarder le nettoyage : surveiller les comptes retournés et les erreurs.

La migration additive 010 ajoute les index d’entretien. Le contrôle PostgreSQL travaille dans une transaction annulée ; aucune suppression réelle n’y est effectuée. Les demandes de clôture des comptes et les sauvegardes restent gérées manuellement et doivent être organisées avant une ouverture plus large.

## Validation et retour arrière

Tests unitaires/intégration, test:public sur base isolée, build, test:quality et test:preview. Après ouverture : GET anonymes des pages et catalogues, configuration d’inscription fermée, POST register refusé, API privées refusées, maintenance sans secret refusée, alias www et URL technique protégée. Ne pas envoyer d’e-mail de test ou créer un compte réel sans instruction spécifique.

En cas d’échec de ces contrôles, remettre immédiatement la protection Vercel à all ; conserver les inscriptions et fonctions sensibles fermées. Corriger puis republier sans revenir à une ancienne version aux inscriptions ouvertes. Ne pas annuler le schéma ou effacer des données de comptes.

L’utilisateur a confirmé les essais navigateur précédents ; cela ne vaut pas audit exhaustif WCAG, lecteur d’écran, impression ou mesures de performance mobile. Ces limites restent dans quality.md.
