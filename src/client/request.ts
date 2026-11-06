/** Load the small JSON API responses within one deadline, without replaying writes. */
export async function request(input:RequestInfo|URL,init:RequestInit={},timeoutMs=30_000):Promise<Response>{
 const controller=new AbortController();let expired=false;
 const cancel=()=>controller.abort(init.signal?.reason);
 if(init.signal?.aborted)cancel();else init.signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{expired=true;controller.abort()},timeoutMs);
 try{
  const response=await fetch(input,{cache:'no-store',credentials:'same-origin',...init,signal:controller.signal});
  // Include the response body in the deadline; resolving headers alone is insufficient.
  const bytes=await response.arrayBuffer();
  return new Response([204,205,304].includes(response.status)?null:bytes,{status:response.status,statusText:response.statusText,headers:response.headers});
 }catch(error){
  if(expired&&!init.signal?.aborted){const timeout=new Error('Le délai de réponse est dépassé. Actualisez pour vérifier le résultat avant de réessayer.');timeout.name='TimeoutError';throw timeout}
  throw error;
 }finally{clearTimeout(timer);init.signal?.removeEventListener('abort',cancel)}
}
