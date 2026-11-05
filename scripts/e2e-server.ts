import next from 'next';
import {createServer} from 'node:http';
const app=next({dev:true,webpack:true,hostname:'127.0.0.1',port:4387});
await app.prepare();
const handler=app.getRequestHandler();
const server=createServer((request,response)=>{void handler(request,response).catch(()=>{response.statusCode=500;response.end('Test server error')})});
server.on('upgrade',app.getUpgradeHandler());
let closing=false;
async function shutdown(){if(closing)return;closing=true;server.closeAllConnections();server.close();await app.close();process.exit(0)}
process.on('message',message=>{if(message==='shutdown')void shutdown()});
process.on('disconnect',()=>void shutdown());
process.on('SIGTERM',()=>void shutdown());
server.listen(4387,'127.0.0.1');
