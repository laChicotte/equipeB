import {smtpSettings} from './smtp-settings.ts';
import type {Environment} from './smtp-settings.ts';
export type DeploymentGoal='preview'|'accounts';
type Check={id:string;ok:boolean};
export function deploymentReadiness(env:Environment,goal:DeploymentGoal){
  const checks:Check[]=[];
  if(goal==='preview'){
    checks.push({id:'preview_accounts_closed',ok:env.AUTH_ENABLED!=='true'&&env.AUTH_REGISTRATION_ENABLED!=='true'&&env.REAL_ACCOUNTS_APPROVED!=='true'});
    checks.push({id:'preview_play_and_mentoring_closed',ok:env.PLAY_ENABLED!=='true'&&env.MENTORING_ENABLED!=='true'});
    checks.push({id:'preview_attestations_closed',ok:env.ATTESTATIONS_ENABLED!=='true'&&env.ATTESTATIONS_APPROVED!=='true'});
    checks.push({id:'preview_planning_closed',ok:env.PLANNING_ENABLED!=='true'});
    checks.push({id:'preview_messaging_closed',ok:env.MESSAGING_ENABLED!=='true'&&env.PRIVATE_COMMUNICATIONS_APPROVED!=='true'});
    checks.push({id:'clean_build_output',ok:env.TALENTLINK_KEEP_BUILD_OUTPUT!=='true'});
  }else{
    checks.push({id:'explicit_real_account_approval',ok:env.REAL_ACCOUNTS_APPROVED==='true'});
    checks.push({id:'authentication_enabled',ok:env.AUTH_ENABLED==='true'});
    checks.push({id:'registration_enabled',ok:env.AUTH_REGISTRATION_ENABLED==='true'});
    let origin=false;try{const url=new URL(env.APP_URL||'');origin=url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash}catch{}
    checks.push({id:'https_origin',ok:origin});
    checks.push({id:'random_auth_secret',ok:!!env.AUTH_SECRET&&env.AUTH_SECRET.length>=32&&!/replace|change-me/i.test(env.AUTH_SECRET)});
    let database=false;try{const url=new URL(env.DATABASE_URL||'');database=['postgres:','postgresql:'].includes(url.protocol)&&!!url.hostname&&env.DB_DRIVER!=='pglite'&&(url.hostname.endsWith('.neon.tech')||url.searchParams.get('sslmode')==='verify-full')}catch{}
    checks.push({id:'remote_postgresql_tls',ok:database});
    let smtp=false;try{smtpSettings({...env,NODE_ENV:'production'},true);smtp=true}catch{}
    checks.push({id:'smtp_configured',ok:smtp});
  }
  // Only identifiers and booleans leave this function; never configuration values.
  return {goal,ok:checks.every(check=>check.ok),checks};
}
