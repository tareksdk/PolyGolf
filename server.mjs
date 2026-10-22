import http from "node:http";
import { readLocalFile as readFile } from "./scripts/local-files.mjs";
import { resolve, extname, sep } from "node:path";
import { SUPABASE_URL, PUBLISHABLE_KEY } from './dist/src/cloud.js';
const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const requestURL=new URL(req.url,'http://localhost');
      // A single public, read-only route lets any local preview port browse maps.
      // No sessions, arbitrary actions, target URLs or writes pass through it.
      if(requestURL.pathname==='/__preview/community'){
        if(req.method!=='GET'){res.writeHead(405,{Allow:'GET'}).end();return;}
        const offset=Number(requestURL.searchParams.get('offset')||0);
        if(!Number.isInteger(offset)||offset<0||offset>100000){res.writeHead(400).end('Invalid page');return;}
        const upstream=await fetch(SUPABASE_URL+'/functions/v1/little-links',{
          method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},
          body:JSON.stringify({action:'community_maps',mode:requestURL.searchParams.get('mode')==='golf'?'golf':'mini',offset}),
          signal:AbortSignal.timeout(15000),
        });
        const result=await upstream.json();
        res.writeHead(upstream.ok?200:502,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify(upstream.ok?{maps:Array.isArray(result.maps)?result.maps:[]}:{error:'Community maps are temporarily unavailable.'}));return;
      }
      const path = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      let file = path === root ? resolve(root, "index.html") : path;
      // Match Netlify's pretty URLs: /privacy serves privacy.html.
      if (!extname(file)) file += ".html";
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": (types[extname(file)] || "application/octet-stream") + (/html|css|javascript|plain/.test(types[extname(file)] || "") ? "; charset=utf-8" : ""),
        "Cache-Control": "no-cache",
      });
      res.end(body);
    } catch (error) {
      const missing = error.code === 'ENOENT' || error.code === 'ENOTDIR';
      if (!missing) console.error('Local preview read failed:', error.code || error.message);
      res.writeHead(missing ? 404 : 503).end(missing ? 'Not found' : 'Preview file is temporarily unavailable. Reload to try again.');
    }
  })
  .listen(Number(process.env.PORT) || 5173, "127.0.0.1", () => console.log(`PolyGolf ready at http://127.0.0.1:${Number(process.env.PORT) || 5173}`));
