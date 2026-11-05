export type Environment=Record<string,string|undefined>;
export function smtpSettings(env:Environment=process.env,production=env.NODE_ENV==='production') {
  if(env.MAIL_DRIVER!=='smtp'||!env.SMTP_URL||!env.MAIL_FROM)throw new Error('SMTP is not configured');
  if(/[\r\n]/.test(env.MAIL_FROM)||env.MAIL_FROM.length>320)throw new Error('Invalid MAIL_FROM');
  const url=new URL(env.SMTP_URL);
  if(!['smtp:','smtps:'].includes(url.protocol)||!url.hostname||url.search||url.hash||(url.pathname&&url.pathname!=='/'))throw new Error('Invalid SMTP configuration');
  if(!!url.username!==!!url.password)throw new Error('Incomplete SMTP credentials');
  const secure=url.protocol==='smtps:';
  return {from:env.MAIL_FROM,options:{host:url.hostname,port:Number(url.port||(secure?465:587)),secure,
    requireTLS:production,
    connectionTimeout:20_000,greetingTimeout:10_000,socketTimeout:30_000,
    auth:url.username?{user:decodeURIComponent(url.username),pass:decodeURIComponent(url.password)}:undefined}};
}
