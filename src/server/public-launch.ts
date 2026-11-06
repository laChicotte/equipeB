import {operator} from '../content/operator.ts';
export function publicLaunchReadiness(env:Record<string,string|undefined>,editor=operator){
 const checks=[
 {id:'editor_contact',ok:!!editor.name&&!!editor.country&&!!editor.address&&/^\+\d{8,15}$/.test(editor.phoneUri)},
 {id:'discovery_phase',ok:env.NEXT_PUBLIC_SITE_PHASE==='public-discovery'},
 {id:'existing_accounts_only',ok:env.AUTH_ENABLED==='true'&&env.REAL_ACCOUNTS_APPROVED==='true'&&env.AUTH_REGISTRATION_ENABLED==='false'},
 {id:'public_play',ok:env.PLAY_ENABLED==='true'},
 {id:'private_functions_closed',ok:['MENTORING_ENABLED','MESSAGING_ENABLED','PLANNING_ENABLED','PRIVATE_COMMUNICATIONS_APPROVED','ATTESTATIONS_ENABLED','ATTESTATIONS_APPROVED'].every(key=>env[key]==='false')},
 {id:'daily_maintenance',ok:env.MAINTENANCE_ENABLED==='true'&&!!env.CRON_SECRET&&env.CRON_SECRET.length>=32},
 {id:'canonical_https',ok:env.APP_URL==='https://talentlink.today'}
 ];return {ok:checks.every(c=>c.ok),checks};
}
