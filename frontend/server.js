// Minimal static server: node server.js  ->  http://localhost:5173
const http=require('http'),fs=require('fs'),path=require('path');
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((q,r)=>{let p=path.join(__dirname,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith(path.sep))p+='index.html';
 if(!p.startsWith(__dirname)){r.writeHead(403);return r.end()}
 fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);return r.end('Not found')}r.writeHead(200,{'Content-Type':T[path.extname(p)]||'application/octet-stream'});r.end(d)})}).listen(5173,()=>console.log('EduCompass on http://localhost:5173'));
