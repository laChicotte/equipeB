# TalentLink — dossier de clarification avant ouverture des comptes

Préparé le 7 novembre 2026. Brouillon de demande, non envoyé, ne constituant ni déclaration déposée ni autorisation. Le responsable n’a pas encore fait vérifier ces formalités. L’utilisateur a demandé l’ouverture des inscriptions ; cette autorisation produit ne prouve pas l’accomplissement des démarches réglementaires.

## Point constaté

L’article 28 du texte guinéen publié par l’Assemblée prévoit une autorisation préalable pour les transferts de données vers un pays tiers. Les articles 7 et 9 abordent les autorisations et le contenu des demandes. TalentLink utilise Neon en région AWS us-east-2, aux États-Unis : il faut faire confirmer les démarches effectivement applicables avant de collecter les comptes du public. Aucune dispense ni autorisation propre à TalentLink n’est établie. La compétence actuelle de l’organisme destinataire et les procédures en vigueur restent à confirmer ; ce dossier ne les invente pas.

Sources officielles consultées le 7 novembre 2026 : [texte de l’Assemblée nationale](https://cnt.gov.gn/archive.assemblee/www.assemblee.gov.gn/node/1001.html), [publication de la loi par l’ANSSI](https://anssi.gov.gn/?nproject=loi-l037-2016-relative-a-la-cybersecurite-et-la-protection-des-donnees-a-caractere-personnel). Cette vérification documentaire ne remplace pas l’analyse du cas par l’autorité compétente ou un conseil local.

## Message prêt à compléter et à adresser au destinataire compétent

Objet : TalentLink — clarification des formalités de traitement et de transfert de données avant ouverture des inscriptions

Madame, Monsieur,

Je suis BANGOURA Aboubacar Sidiki, enseignant et entrepreneur résidant à Conakry, responsable du projet TalentLink (https://talentlink.today). TalentLink Group est un collectif de quatre personnes né lors d’un hackathon ; aucune société enregistrée n’est déclarée pour ce projet à ce stade. Contact téléphonique : +224 625 59 51 69.

Nous souhaitons ouvrir gratuitement des comptes aux personnes déclarant avoir au moins 18 ans pour des activités éducatives. Les inscriptions du public sont actuellement fermées. Les visiteurs ont accès à des quiz sans compte. Les mises en relation, messages privés, séances et nouveaux comptes mineurs ne sont pas ouverts.

Les comptes envisagés nécessitent une adresse e-mail, un mot de passe conservé sous forme hachée, un rôle mentoré ou candidat mentor, une déclaration de majorité, les accords versionnés et des dates techniques. Les réponses et scores de quiz peuvent être associés au compte. Les éventuels profils mentors doivent être examinés avant publication ; nous ne collectons pas de justificatif d’identité ni de date de naissance dans le formulaire. La confirmation e-mail ne vérifie pas l’âge.

Les prestataires sont Vercel pour l’application, Neon pour la base PostgreSQL (région AWS us-east-2, États-Unis) et Resend pour l’envoi des e-mails techniques. Les lieux exacts de traitement des journaux, du support et des sous-traitants de chaque prestataire doivent encore être complétés dans l’inventaire joint. Le projet ne vend pas les données et n’utilise pas de publicité ciblée.

Pouvez-vous confirmer l’organisme compétent, les déclarations ou autorisations préalables nécessaires, notamment pour l’hébergement hors de Guinée, les formulaires et justificatifs à fournir, et les garanties à réunir ? Nous souhaitons également connaître les conditions applicables au traitement en nom personnel pour ce projet collectif.

Nous pouvons fournir le descriptif des données, des finalités, des mesures de sécurité, des durées de conservation proposées et des contrats des prestataires. Merci de nous indiquer si le service peut être ouvert dans ce périmètre et quelles démarches doivent être accomplies auparavant.

BANGOURA Aboubacar Sidiki

## Pièces et informations à compléter avant dépôt

- Adresse géographique/postale précise du responsable pour le dossier, sans publication automatique sur le site ; canal de réponse effectivement récepteur. notifications@talentlink.today ne reçoit pas les demandes à ce jour.
- Destinataire compétent et procédure actuelle, confirmés par une source officielle ou un conseil local ; ne pas assimiler un simple accusé de réception à une autorisation.
- Accords de traitement, sous-traitants, pays et conservation des journaux pour Vercel, Neon et Resend ; garanties de transfert et responsabilités d’accès.
- Textes et finalités du projet, données nécessaires/optionnelles, rôles d’accès, mesures de sécurité, conservation et procédure de droits : voir adult-opening-texts.md et account-lifecycle.md.
- Référence, date et portée de la réponse ou de l’autorisation obtenue, conservées en privé. Ne pas mettre les justificatifs personnels dans Git.

## Travaux techniques restant distincts de cette demande

Les objectifs de suppression des comptes non confirmés après 30 jours, de revue après 24 mois d’inactivité et de traitement des clôtures sont acceptés, mais leurs opérations ne sont pas encore implémentées et éprouvées. Leur publication comme garanties serait prématurée. Le parcours d’inscription et confirmation doit être revalidé en environnement isolé ; les quotas et échecs e-mail doivent être contrôlés avant activation. Une réponse réglementaire favorable ne remplace pas ces vérifications.

L’activation ultérieure conserve les fonctions privées fermées, les contrôles de majorité déclarée et la validation humaine des mentors. Aucun nouveau consentement n’est appliqué rétroactivement aux comptes existants.

Contrôles locaux du 7 novembre : npm run typecheck réussi et sept tests ciblés réussis (inscriptions adultes et lancement découverte). L’identité du responsable et la date des mentions sont mises à jour dans les sources ; aucune nouvelle version n’a été déployée à l’occasion de cette préparation. Aucune variable Vercel, base de production ou configuration e-mail n’a été modifiée. Ces contrôles ne prouvent ni l’implémentation du cycle de clôture ni un nouveau parcours d’envoi en production.
