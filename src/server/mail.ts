import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
export type Mail = {to:string;subject:string;text:string};
export interface Mailer {send(mail:Mail):Promise<void>}
export function mailer(): Mailer {
  if (process.env.MAIL_DRIVER === 'file' && process.env.NODE_ENV !== 'production') {
    return {async send(mail) {
      await mkdir('.local/mail',{recursive:true});
      await writeFile(`.local/mail/${randomUUID()}.json`,JSON.stringify(mail,null,2),{mode:0o600});
    }};
  }
  if (!process.env.SMTP_URL || process.env.MAIL_DRIVER !== 'smtp' || !process.env.MAIL_FROM) throw new Error('SMTP is not configured');
  const url=new URL(process.env.SMTP_URL);
  if(!['smtp:','smtps:'].includes(url.protocol))throw new Error('Invalid SMTP protocol');
  const secure=url.protocol==='smtps:';
  const transport = nodemailer.createTransport({host:url.hostname,port:Number(url.port||(secure?465:587)),secure,
    requireTLS:process.env.NODE_ENV==='production',
    auth:url.username?{user:decodeURIComponent(url.username),pass:decodeURIComponent(url.password)}:undefined});
  return {async send(mail) { await transport.sendMail({...mail,from:process.env.MAIL_FROM,disableFileAccess:true,disableUrlAccess:true}); }};
}
