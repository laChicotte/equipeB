# Vérification du lancement public — 6 novembre 2026

## Source et autorisation

Source ee9fe684898012e4cb870f02b7bf1f2b504f330c, déploiement dpl_A4pzCLQcEGnEFwzQ6uwiSx1jUy1E confirmé READY avec alias talentlink.today et www.talentlink.today. L’utilisateur a explicitement choisi vitrine, annuaire et quiz publics, nouvelles inscriptions fermées, avec contact téléphonique public et réception e-mail reportée.

Les essais navigateur précédents ont été confirmés par l’utilisateur. Cette confirmation ne vaut pas audit WCAG complet, lecteur d’écran, impression ou mesure de performance mobile. Aucune certification juridique n’est annoncée pour les textes. Aucun statut de société, numéro d’immatriculation ou identité personnelle non fournie n’a été inventé.

## Préparation et contrôles locaux

- 83 tests réussis, y compris le périmètre de lancement et la maintenance bornée, idempotente et protégée par secret.
- test:e2e et test:public réussis sur bases isolées : visiteur sans compte, quiz, inscriptions refusées, compte préexistant connecté et administration protégée.
- PostgreSQL : migration additive 010 appliquée ; maintenance vérifiée dans une transaction annulée, sans suppression réelle ni donnée fictive conservée.
- Build public réussi : 29 pages statiques et routes API compilées ; TypeScript réussi.
- test:quality réussi sur dix pages, budgets respectés ; test:preview fermé réussi.
- Coordonnées mises à jour ; absence de MX constatée pour talentlink.today. Téléphone choisi comme contact, notifications@talentlink.today indiqué comme envoi automatique seulement. Gmail personnel non publié.

## Configuration de production

Variables publiques de lancement comparées aux valeurs attendues après écriture. Authentification existante et Play activés ; inscriptions, mentorat, messagerie, planning et émission d’attestations fermés. Phase public-discovery ; maintenance activée avec un CRON_SECRET sensible distinct, généré sans affichage et absent de Git. Secrets PostgreSQL, SMTP et de session conservés.

Protection Vercel passée de all à prod_deployment_urls_and_all_previews après construction READY. Retour API confirmé enabled=true. Les domaines de production sont publics ; les URL générées de déploiement et les préversions restent protégées. Aucun lien de contournement, achat ou changement de plan créé.

## Contrôles anonymes sur le domaine

Exécutés à 2026-11-06T12:47:18.305Z (UTC, même fuseau que Conakry).

| Chemin | HTTP |
|---|---:|
| / | 200 |
| /mentors/ | 200 |
| /play/ | 200 |
| /confidentialite/ | 200 |
| /api/v1/auth/config/ | 200 |
| /api/v1/messaging/config/ | 200 |
| /api/v1/planning/config/ | 200 |
| /api/v1/attestations/config/ | 200 |
| /api/v1/administration/overview/ | 401 |
| /api/v1/auth/session/ | 401 |
| /api/v1/play/stats/ | 401 |
| /api/internal/maintenance/ | 401 |
| /api/v1/mentoring/directory/ | 200 |
| /api/v1/play/catalog/ | 200 |
| /robots.txt | 200 |
| /sitemap.xml | 200 |

POST /api/v1/auth/register/ avec corps vide et Origin canonique : HTTP 403, refus avant création de compte ou envoi d’e-mail. Les configurations exposent registrationEnabled=false et les modules privés désactivés. Le téléphone est présent dans la confidentialité et le Gmail personnel absent.

URL technique du nouveau déploiement et URL technique de la précédente version : HTTP 302 vers Vercel Authentication. www.talentlink.today : HTTP 308 vers https://talentlink.today/. Les connexions HTTPS utilisent la vérification TLS normale, sans contournement de certificat.

Les catalogues publics répondent 200 avec zéro mentor et zéro jeu. Aucun contenu de démonstration copié dans la base réelle. Le moteur de quiz a été testé en isolation, mais aucune partie réelle n’a été créée en production pour ce contrôle : il n’existe pas encore de jeu publié. La connexion d’un compte réel après cette ouverture reste à essayer manuellement par son titulaire ; la configuration de connexion et les protections API sont vérifiées, pas un nouveau parcours authentifié réel.

## Maintenance et limites opérationnelles

Cron quotidien déclaré à 03:00 UTC dans vercel.json, secret sensible fourni au déploiement. Requête sans secret refusée en production (401). La logique SQL a été testée en transaction annulée et l’authentification du job testée en isolation. Le premier déclenchement automatique planifié n’a pas encore été observé ; surveiller ses logs et les compteurs, particulièrement si une limite de 1 000 lignes par table est atteinte. Aucune purge de comptes, consentements, contenus, messages, preuves ou audit n’est prévue par ce job.

Textes et contact : informations fournies par l’utilisateur, sans promesse de boîte e-mail réceptrice. Sauvegardes/restauration, rétention des comptes/audits, validation juridique et procédures d’incidents doivent être approfondies avant une ouverture des inscriptions ou communications. Retour arrière : remettre Vercel Authentication à all, sans réactiver d’anciennes inscriptions ni revenir sur les migrations.
