# Service e-mail TalentLink

Comparatif consulté le 5 novembre 2026. Choix utilisateur : Resend. Aucun domaine possédé pour le moment. Aucun compte fournisseur créé par l’agent, abonnement souscrit, domaine acheté ni message réel envoyé.

Prochaine action : créer/connecter le compte gratuit depuis https://vercel.com/marketplace/resend et sélectionner uniquement le projet talentlink de l’espace talent-link1. L’utilisateur complète l’authentification et les conditions du service. Sans domaine vérifié, l’expéditeur de test onboarding@resend.dev permet uniquement des essais vers l’adresse associée au compte Resend ; ce mode ne permet pas d’ouvrir les inscriptions publiques. Source : https://resend.com/docs/knowledge-base/403-error-resend-dev-domain.

| Solution | Offre gratuite vérifiée | Intérêt pour TalentLink |
| --- | --- | --- |
| Resend — recommandé | 3 000 messages/mois, maximum 100/jour | Intégration native Vercel ; SMTP compatible avec le transport existant. Adapté au démarrage. |
| Brevo | 300 messages/jour, non reportables | Interface française et quota quotidien plus élevé ; e-mails transactionnels inclus. |
| Postmark | 100 messages/mois | Alternative spécialisée ; offre Basic affichée à 15 USD/mois pour 10 000 messages. |

Ces quotas portent sur les messages, pas les utilisateurs. Une inscription, un renvoi de vérification et une réinitialisation consomment chacun un envoi. Les tarifs et conditions restent à vérifier au moment de la souscription.

## Mise en place proposée avec Resend

1. L’utilisateur choisit le fournisseur et confirme le domaine qu’il possède ainsi que l’accès DNS. Un domaine Vercel partagé en `.vercel.app` ne peut pas servir de domaine expéditeur personnel vérifié.
2. Créer/connecter le compte Resend, en restant sur l’offre gratuite, via le Marketplace Vercel ou directement chez Resend. La création et les conditions du compte sont complétées par l’utilisateur.
3. Ajouter un sous-domaine d’envoi du domaine possédé (par exemple `notifications.example.com`, exemple uniquement). Copier les enregistrements DNS exacts fournis par Resend pour SPF/DKIM ; configurer DMARC et contrôler la vérification. Préserver les enregistrements de la messagerie existante. Désactiver le suivi des liens et des ouvertures pour les e-mails d’authentification.
4. Définir une clé d’envoi dédiée avec les droits minimaux. La conserver dans les paramètres privés, jamais dans le chat ni Git. L’intégration Vercel fournit RESEND_API_KEY ; le transport actuel de TalentLink attend SMTP_URL et ne lit pas directement cette variable.
5. Renseigner MAIL_DRIVER=smtp, MAIL_FROM et SMTP_URL dans les environnements privés autorisés. Pour Resend : hôte smtp.resend.com, utilisateur resend, mot de passe = clé API ; port 465 en smtps ou 587 avec STARTTLS. Encoder les identifiants lors de la construction de l’URL SMTP. Ne pas remplacer les variables Neon existantes.
6. Exécuter `npm run mail:check` : vérification de connexion/TLS/authentification, sans envoi. Puis tester réception et liens de vérification/réinitialisation sur une adresse explicitement autorisée par l’utilisateur. Une connexion SMTP réussie ne prouve pas la réception.
7. Valider le cadre de données, les URLs HTTPS, les secrets et les tests avant ouverture explicite des comptes. Les trois verrous dans vercel.json restent false jusque-là. Ne pas activer les fonctions mineurs ou la mise en relation privée.

L’expéditeur d’authentification et la boîte de support recevant les réponses doivent être décidés séparément. Aucune adresse réelle n’est supposée ici. Une préversion protégée par Vercel impose aussi une connexion Vercel au testeur qui ouvre les liens de vérification.

## Limites actuelles

Le service existant envoie directement via SMTP. Il permet de renvoyer un lien, mais ne possède pas encore de file durable ni de reprise automatique. Avant une ouverture plus large, prévoir la gestion des rebonds/plaintes, le suivi des quotas et une stratégie de reprise. Les journaux fournisseur peuvent contenir les destinataires et le contenu des messages : adapter leur rétention et limiter les accès.

## Sources

- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/docs/send-with-smtp
- https://resend.com/docs/dashboard/domains/introduction
- https://vercel.com/marketplace/resend
- https://help.brevo.com/hc/fr/articles/208589409-%C3%80-propos-des-offres-d-abonnement-de-Brevo
- https://postmarkapp.com/pricing
