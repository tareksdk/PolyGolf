import http from "node:http";
import { readLocalFile as readFile } from "./scripts/local-files.mjs";
import { resolve, extname, sep } from "node:path";
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
