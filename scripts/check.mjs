import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
// Static release checks: module syntax, local imports, page links and hosting config.
const root = resolve("dist");
let count = 0;
for (const name of await readdir(resolve(root, "src"))) {
  if (!name.endsWith(".js")) continue;
  if (/^qa-/.test(name)) throw Error("Remove QA module from dist/src: " + name);
  const file = resolve(root, "src", name),
    source = await readFile(file, "utf8");
  execFileSync(process.execPath, ["--check", file]);
  for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) await stat(resolve(dirname(file), match[1]));
  count++;
}
const pages = ["index.html", "privacy.html", "terms.html", "copyright.html", "contact.html", "cookies.html", "community-rules.html"];
for (const page of pages) {
  const html = await readFile(resolve(root, page), "utf8");
  for (const m of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g))
    if (m[1] !== "/") await stat(resolve(root, "." + m[1]));
}
const leftovers = (await readdir(root)).filter((f) => /^qa-|\.orig$/.test(f));
if (leftovers.length) throw Error("Remove QA files from dist: " + leftovers.join(", "));
const netlify = await readFile("netlify.toml", "utf8");
if (!/publish\s*=\s*"dist"/.test(netlify)) throw Error("netlify.toml must publish dist/");
console.log(`${count} modules passed syntax and local import checks. ${pages.length} pages link only to existing files. Netlify publishes dist/.`);
