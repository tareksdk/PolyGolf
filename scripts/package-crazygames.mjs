import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..'), source = path.join(root, 'dist');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version.replace(/\.0$/, '');
if (!/^\d+\.\d+$/.test(version)) throw Error('Unexpected app version');
const output = path.join(root, 'output'), bundle = path.join(output, `crazygames-game-${version}`);
const archive = path.join(output, `polygolf-crazygames-game-${version}.zip`);
fs.mkdirSync(output, {recursive:true});
fs.rmSync(bundle, {recursive:true, force:true}); fs.mkdirSync(bundle);

// The portal artifact has a flat layout: the entry script and every fetched
// course resource live beside index.html, independent of nested CDN paths.
const resources = new Map();
function collect(directory, prefix='') {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    if (entry.name.startsWith('.')) continue;
    const name=prefix+entry.name;
    if (entry.isDirectory()) { if (name==='assets'||name.startsWith('assets/')) collect(path.join(directory,entry.name),name+'/'); }
    else if (name.startsWith('assets/')||(/\.(html|css|svg|json)$/.test(name)&&name!=='math-golf.html')) {
      const flat=path.posix.basename(name);
      if ([...resources.values()].includes(flat)) throw Error('Duplicate flattened asset: '+flat);
      resources.set(name,flat);
    }
  }
}
collect(source);
// Bundling Three.js does not copy its full MIT permission notice automatically.
resources.set('vendor/license.three', 'license.three');
function rewrite(text) {
  return text.replace(/(["'`])\/(?!\/)([^"'`\s<>)]*)/g,(match,quote,url)=>{
    if (url.startsWith('assets/course-cards/')) return quote+'./'+url.slice('assets/course-cards/'.length);
    return resources.has(url)?quote+'./'+resources.get(url):match;
  });
}
const startup=fs.readFileSync(path.join(source,'startup.js'),'utf8');
const flag="\n{ const url=new URL(location.href); url.searchParams.set('platform','crazygames'); history.replaceState(history.state,'',url); }\n";
for (const [name,flat] of resources) {
  let content=fs.readFileSync(path.join(source,name));
  if (/\.(html|css)$/.test(name)) {
    let text=content.toString('utf8');
    if(name==='index.html') {
      text=text.replace('<script type="module" src="/src/main.js"></script>','<script src="./polygolf.js"></script>');
      text=text.replace(/<script src="\/startup\.js"([^>]*)><\/script>/,(_,attrs)=>'<script'+attrs+'>'+startup+flag+'</script>');
    }
    content=Buffer.from(rewrite(text).replace(/href=(["'])\/\1/g,'href="./index.html"'));
  }
  fs.writeFileSync(path.join(bundle,flat),content);
}
const transform={name:'portal-resource-paths',setup(api){
  api.onLoad({filter:/\.js$/},args=>{
    let text=fs.readFileSync(args.path,'utf8');
    if(args.path===path.join(source,'src/main.js')) {
      const start=text.indexOf('let ui;');
      if(start<0)throw Error('Main startup marker missing');
      text=text.slice(0,start)+'\n(async()=>{\n'+text.slice(start)+'\n})();';
    }
    return {contents:rewrite(text).replaceAll('../assets/','./'),loader:'js',resolveDir:path.dirname(args.path)};
  });
}};
for (const [entry,filename,worker] of [
  ['main.js','polygolf.js',false],['shot-preview-worker.js','shot-preview-worker.js',true],['item-art-worker.js','item-art-worker.js',true],
]) {
  await build({entryPoints:[path.join(source,'src',entry)],outfile:path.join(bundle,filename),bundle:true,format:'iife',target:'es2020',minify:true,plugins:[transform],
    define:{'import.meta.url':'__polygolfModuleURL'},banner:{js:'const __polygolfModuleURL = '+(worker?'self.location.href;':'document.currentScript.src;')},logLevel:'warning'});
}
const html=fs.readFileSync(path.join(bundle,'index.html'),'utf8');
if(html.includes('type="module"')||!html.includes('src="./polygolf.js"')||!html.includes('PolyGolfStartup'))throw Error('Incomplete portal entry');
if(!fs.readFileSync(path.join(bundle,'license.three')).equals(fs.readFileSync(path.join(source,'vendor/license.three'))))throw Error('Missing or altered Three.js license notice');
fs.rmSync(archive,{force:true});
const zip=spawnSync('zip',['-q','-r',archive,'.'],{cwd:bundle,encoding:'utf8'});
if(zip.error||zip.status!==0)throw zip.error??Error(zip.stderr);
console.log(`Created ${archive} (${fs.statSync(archive).size} bytes).`);
console.log(`${fs.readdirSync(bundle).length} top-level files; bundled main and workers; startup diagnostics in index.html.`);
