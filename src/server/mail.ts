import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import {smtpSettings} from './smtp-settings.ts';
import {localPrototype} from './prototype.ts';
export type Mail = {to:string;subject:string;text:string};
export interface Mailer {send(mail:Mail):Promise<void>}
export function mailer(): Mailer {
  if (process.env.MAIL_DRIVER === 'file' && process.env.NODE_ENV !== 'production') {
    return {async send(mail) {
      const directory=localPrototype()?'.local/prototype-mail':'.local/mail';
      await mkdir(directory,{recursive:true});
      await writeFile(`${directory}/${randomUUID()}.json`,JSON.stringify(mail,null,2),{mode:0o600});
    }};
  }
  const settings=smtpSettings();
  const transport = nodemailer.createTransport(settings.options);
  return {async send(mail) { await transport.sendMail({...mail,from:settings.from,disableFileAccess:true,disableUrlAccess:true}); }};
}
export async function verifySmtpConnection():Promise<void>{
  const settings=smtpSettings(process.env,true);
  const transport=nodemailer.createTransport(settings.options);
  try{await transport.verify()}finally{transport.close()}
}
