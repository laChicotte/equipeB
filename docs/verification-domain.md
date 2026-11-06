# Livraison privée sur talentlink.today — 6 novembre 2026

- Autorisation utilisateur : regrouper et héberger les fonctions existantes sur Vercel avec le domaine ; accès privé Vercel choisi explicitement ; rôle administrateur du compte désigné approuvé séparément.
- Source déployée : 6294b78dd3afe4fce6f3db88f00878411635db7d.
- Déploiement : dpl_6uqTvAUZ9m9jUSXvxFLoLbp347Aw, cible production (affectation au domaine), état READY, compilation cloud réussie en environ 38 secondes.
- URL canonique : https://talentlink.today. Alias www.talentlink.today associé au même déploiement avec redirection 308 configurée vers le domaine principal.
- TLS validé avec la vérification des certificats active ; certificat observé expirant le 3 février 2027. L’accès HTTPS fonctionne ; son renouvellement reste géré par Vercel.
- Protection projet vérifiée après livraison : ssoProtection.enabled=true, deploymentType=all. Les requêtes anonymes vers /, /api/health/, /auth/connexion/ et /play/ sont redirigées vers l’authentification Vercel. Aucun lien de contournement de protection créé.
- Enregistrements Resend send, rsend et resend._domainkey comparés avant/après : identifiants, types et valeurs inchangés. Aucun enregistrement d’e-mail supprimé ni nameserver modifié.
- Variables sensibles DATABASE_URL et AUTH_SECRET installées pour la production uniquement ; nouveau secret cloud distinct du local. Clé SMTP du Marketplace conservée sans lecture. Valeurs privées absentes des commits et livrables.
- Compte demandé passé de mentoré à administrateur dans une transaction journalisée ; anciennes sessions révoquées. Aucun autre compte ni approbation adulte modifié.
- Authentification, inscription privée et Play activés derrière la protection Vercel ; mises en relation toujours fermées. Les données synthétiques de la démonstration ne sont pas transférées au vrai catalogue.
- Contrôle TypeScript réussi pour cette source ; 43 tests et contrôles HTTP/PostgreSQL de l’itération Play déjà réussis avant livraison. Le build cloud a compilé l’ensemble des routes et modules.

## Vérification restante après connexion

Le moteur Vercel protège aussi les API : les sondes anonymes ne valident pas les réponses du runtime applicatif. Aucun secret n’a été extrait pour contourner cette protection. L’utilisateur doit ouvrir talentlink.today, se connecter à Vercel puis à TalentLink, et confirmer connexion, navigation et réception d’un lien d’e-mail dans le navigateur autorisé. Ne pas annoncer une validation complète de ces parcours cloud avant ce contrôle.

Les mentors et quiz réels apparaissent seulement après examen humain. L’annuaire et le catalogue peuvent donc être vides. Les demandes/programmes sont hébergés mais leur activation reste soumise aux validations de protection et d’accès adulte. Aucun changement de plan, achat de domaine, transfert ou envoi d’e-mail réel n’a été réalisé pendant cette livraison.
