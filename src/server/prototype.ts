export function localPrototype(env:Record<string,string|undefined>=process.env){
 if(env.NODE_ENV==='production'||env.PROTOTYPE_MODE!=='true'||env.DB_DRIVER!=='pglite'||env.NEXT_PUBLIC_DEMO_MODE!=='full')return false;
 try{const u=new URL(env.APP_URL||'');return u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)&&!u.username&&!u.password}catch{return false}
}
