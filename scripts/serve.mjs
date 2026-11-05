import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('out');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
createServer(async(req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch{
  res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
  try{res.end(req.method==='HEAD'?undefined:await readFile(path.join(root,'404.html')))}catch{res.end('Export de la vitrine 0.1 absent. Utilisez son archive ou npm run dev pour la version serveur.')}
 }
}).listen(3000,'127.0.0.1',()=>console.log('TalentLink — http://127.0.0.1:3000'));
