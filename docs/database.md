# Modèle de données initial

Fondation SQL dans `database/migrations/001_foundation.sql`, non exécutée faute de serveur PostgreSQL configuré. À compléter et transposer dans Prisma avant activation. Aucun seed de personne ou de mentor vérifié.

## Relations
User → Session, EmailToken, Consent, MentorProfile. User ↔ MentorshipRequest → MentorshipProgram → Goal, MentoringSession. MentorProfile possède un état pending/verified/rejected ; sa vérification est administrative.

Play : GameCategory → QuizGame ; QuizQuestion → QuizQuestionVersion → QuizAnswerOption ; GameQuestion référence une version précise. GameAttempt → GameAttemptAnswer → GameScore. Compléments prévus : GameBadge, UserBadge, GameSubmission, GameReview, GameMentorRecommendation et GameAnalyticsEvent.

## Invariants à implémenter avant Play
La version contient trois textes non vides et distincts et un index correct 0, 1 ou 2. La projection publique omet l’index et l’explication jusqu’à validation. Une version publiée est immuable. Le jeu épingle les versions approuvées. Publication et contrôle d’approbation doivent se faire sous transaction avec verrouillage des versions ; une simple validation React ne suffit pas.

Une réponse par tentative et question (contrainte unique). Le serveur tire le score du référentiel, jamais du navigateur. Les réponses attendues ne sont présentes ni dans le HTML initial ni dans les réponses API publiques. Le modèle détaillé Play sera migré et testé lors de sa phase, pas livré comme actif aujourd’hui.

## Confidentialité
Profils mentorés privés. Localisation publique générale seulement. Identités justificatives dans un espace privé séparé. Dates de naissance et justificatifs ne seront pas collectés avant validation de leur nécessité et de la procédure applicable. Consentements versionnés, séparation entre comptes et agrégats.
