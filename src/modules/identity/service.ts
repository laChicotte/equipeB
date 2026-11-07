import {REGISTRATION_RULES_VERSION} from '../../content/registration.ts';
import {localPrototype} from '../../server/prototype.ts';
import {LEGAL_VERSION} from '../../content/operator.ts';
import { createHmac } from 'node:crypto';
import type { Database, Sql } from '../../server/database.ts';
import type { Mailer } from '../../server/mail.ts';
import { hashPassword, verifyPassword, createToken, digestToken } from './crypto.ts';
import { registerSchema, loginSchema, emailSchema, resetSchema, tokenSchema } from './schemas.ts';
import { AuthError } from './errors.ts';
import type { Account, Role } from './access.ts';

type User = {id:string;email:string;password_hash:string;role:Role;email_verified_at:Date|null;
  adult_access_approved_at:Date|null;disabled_at:Date|null};
const genericEmailMessage = 'Si cette adresse peut recevoir ce message, un e-mail vous sera envoyé.';
const invalidToken = () => new AuthError(400,'invalid_token','Ce lien est invalide ou expiré. Demandez un nouveau lien.');
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export class IdentityService {
  db: Database; mail: Mailer; origin: string; secret: string;
  constructor(db: Database, mail: Mailer, origin: string, secret: string) {
    this.db=db; this.mail=mail; this.origin=origin; this.secret=secret;
  }
  async rate(action: string, subject: string, maximum=5): Promise<void> {
    const bucket = createHmac('sha256',this.secret).update(`${action}:${subject}`).digest('hex');
    const [row] = await this.db.query<{attempts:number}>(`INSERT INTO auth_rate_limit(bucket,attempts,expires_at)
      VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET
      attempts=CASE WHEN auth_rate_limit.expires_at<=now() THEN 1 ELSE auth_rate_limit.attempts+1 END,
      expires_at=CASE WHEN auth_rate_limit.expires_at<=now() THEN now()+interval '15 minutes' ELSE auth_rate_limit.expires_at END
      RETURNING attempts`,[bucket]);
    if(row.attempts>maximum) throw new AuthError(429,'rate_limited','Trop de tentatives. Réessayez dans 15 minutes.');
  }
  async issue(sql: Sql, user: User, purpose:'verify'|'reset'): Promise<string> {
    const token=createToken();
    await sql.query('UPDATE email_token SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL',[user.id,purpose]);
    await sql.query(`INSERT INTO email_token(user_id,token_hash,purpose,expires_at)
      VALUES($1,$2,$3,now()+$4::interval)`,[user.id,digestToken(token),purpose,purpose==='verify'?'24 hours':'30 minutes']);
    return token;
  }
  async emailLink(user: User, purpose:'verify'|'reset', token:string): Promise<void> {
    const url=`${this.origin}/auth/${purpose==='verify'?'verifier':'reinitialiser'}#token=${token}`;
    try {
      await this.mail.send({to:user.email,subject:purpose==='verify'?'Vérifiez votre adresse TalentLink':'Réinitialisez votre mot de passe TalentLink',
        text:`${purpose==='verify'?'Confirmez votre adresse e-mail':'Choisissez un nouveau mot de passe'} :\n${url}\n\nCe lien est personnel et à usage unique. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.`});
    } catch {
      // Preserve the same public response for an absent address and a mail failure.
      // No address, token, link or password is written to server logs.
      console.error('talentlink_mail_delivery_failed');
    }
  }
  async register(input:unknown) {
    const value=registerSchema.parse(input);
    if(localPrototype()&&!value.email.endsWith('@example.invalid'))throw new AuthError(400,'demo_email','Pour ce prototype, utilise une adresse fictive se terminant par @example.invalid.');
    await this.rate('register',value.email);
    await this.rate('register-global','all',30);
    const hash=await hashPassword(value.password);
    const pending=await this.db.transaction(async sql=>{
      const [user]=await sql.query<User>(`INSERT INTO app_user(email,password_hash,role,adult_declared_at)
        VALUES($1,$2,$3,now()) ON CONFLICT DO NOTHING RETURNING *`,[value.email,hash,value.role]);
      if(!user) return null;
      for(const purpose of ['terms','privacy','adult_registration_rules',...(value.role==='mentor'?['mentor_charter']:[])]) {
        await sql.query('INSERT INTO consent(user_id,purpose,document_version) VALUES($1,$2,$3)',[user.id,purpose,purpose==='adult_registration_rules'?REGISTRATION_RULES_VERSION:LEGAL_VERSION]);
      }
      const token=await this.issue(sql,user,'verify');
      await sql.query(`INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,'account.registered','user',$1)`,[user.id]);
      return {user,token};
    });
    if(pending) await this.emailLink(pending.user,'verify',pending.token);
    return {message:genericEmailMessage};
  }
  async requestEmail(input:unknown,purpose:'verify'|'reset') {
    const {email}=emailSchema.parse(input);
    await this.rate(`email-${purpose}`,email);
    const pending=await this.db.transaction(async sql=>{
      const [user]=await sql.query<User>('SELECT * FROM app_user WHERE email=$1 FOR UPDATE',[email]);
      if(!user || user.disabled_at || (purpose==='verify' && user.email_verified_at)) return null;
      return {user,token:await this.issue(sql,user,purpose)};
    });
    if(pending) await this.emailLink(pending.user,purpose,pending.token);
    return {message:genericEmailMessage};
  }
  async login(input:unknown,previousToken?:string) {
    const {email,password}=loginSchema.parse(input);
    await this.rate('login',email);
    const [snapshot]=await this.db.query<User>('SELECT * FROM app_user WHERE email=$1',[email]);
    const matches=await verifyPassword(password,snapshot?.password_hash);
    if(!matches || !snapshot || snapshot.disabled_at) throw new AuthError(401,'invalid_credentials','Adresse e-mail ou mot de passe incorrect.');
    const token=createToken();
    await this.db.transaction(async sql=>{
      const [user]=await sql.query<User>('SELECT * FROM app_user WHERE id=$1 FOR UPDATE',[snapshot.id]);
      if(!user || user.disabled_at || user.password_hash!==snapshot.password_hash) throw new AuthError(401,'invalid_credentials','Adresse e-mail ou mot de passe incorrect.');
      if(!user.email_verified_at) throw new AuthError(403,'email_unverified','Vérifiez votre adresse e-mail avant de vous connecter.');
      if(previousToken) await sql.query('UPDATE auth_session SET revoked_at=now() WHERE token_hash=$1',[digestToken(previousToken)]);
      await sql.query(`INSERT INTO auth_session(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')`,[user.id,digestToken(token)]);
      await sql.query(`INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,'session.created','user',$1)`,[user.id]);
    });
    return token;
  }
  async account(token?:string):Promise<Account|null> {
    if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const [user]=await this.db.query<User>(`SELECT u.* FROM auth_session s JOIN app_user u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.disabled_at IS NULL AND u.email_verified_at IS NOT NULL`,[digestToken(token)]);
    return user?{id:user.id,email:user.email,role:user.role,emailVerified:!!user.email_verified_at,adultAccessApproved:!!user.adult_access_approved_at}:null;
  }
  async logout(token?:string) {
    if(token) await this.db.query('UPDATE auth_session SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL',[digestToken(token)]);
  }
  async consume(input:unknown,purpose:'verify'|'reset') {
    const resetValue=purpose==='reset'?resetSchema.parse(input):undefined;
    const value=resetValue||tokenSchema.parse(input);
    await this.rate('token',digestToken(value.token),10);
    const passwordHash=resetValue?await hashPassword(resetValue.password):undefined;
    await this.db.transaction(async sql=>{
      const [reference]=await sql.query<{user_id:string}>('SELECT user_id FROM email_token WHERE token_hash=$1 AND purpose=$2',[digestToken(value.token),purpose]);
      if(!reference) throw invalidToken();
      // Consistent lock order: user first, then token; reset and login serialize on the user.
      const [user]=await sql.query<User>('SELECT * FROM app_user WHERE id=$1 FOR UPDATE',[reference.user_id]);
      if(!user || user.disabled_at) throw invalidToken();
      const [ticket]=await sql.query<{id:string}>(`SELECT id FROM email_token WHERE token_hash=$1 AND purpose=$2
        AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`,[digestToken(value.token),purpose]);
      if(!ticket) throw invalidToken();
      if(purpose==='verify') await sql.query('UPDATE app_user SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1',[user.id]);
      else {
        await sql.query('UPDATE app_user SET password_hash=$2 WHERE id=$1',[user.id,passwordHash]);
        await sql.query('UPDATE auth_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
      }
      await sql.query('UPDATE email_token SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL',[user.id,purpose]);
      await sql.query(`INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,$2,'user',$1)`,[user.id,purpose==='verify'?'email.verified':'password.reset']);
    });
    return {message:purpose==='verify'?'Votre adresse est vérifiée. Vous pouvez vous connecter.':'Votre mot de passe a été modifié. Reconnectez-vous sur vos appareils.'};
  }
}
