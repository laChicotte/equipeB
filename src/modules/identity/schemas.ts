import {REGISTRATION_RULES_VERSION} from '../../content/registration.ts';
import { z } from 'zod';
const email = z.string().trim().toLowerCase().max(254).email();
const password = z.string().min(12, 'Utilisez au moins 12 caractères.').max(128);
export const loginSchema = z.object({email, password: z.string().min(1).max(128)}).strict();
export const emailSchema = z.object({email}).strict();
export const registerSchema = z.object({
  email, password,
  role: z.enum(['mentee','mentor']),
  adultConfirmed: z.literal(true),
  registrationRulesAccepted:z.literal(true),
  registrationRulesVersion:z.literal(REGISTRATION_RULES_VERSION),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  mentorCharterAccepted: z.boolean().optional(),
}).strict().refine(value => value.role !== 'mentor' || value.mentorCharterAccepted === true,
  {message:'La charte des mentors est obligatoire.', path:['mentorCharterAccepted']});
export const tokenSchema = z.object({token: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const resetSchema = tokenSchema.extend({password});
