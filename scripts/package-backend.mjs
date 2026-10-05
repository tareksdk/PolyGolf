import fs from 'node:fs';
import path from 'node:path';
const files=new Map();
function visit(name,source){
 if(files.has(name))return;
 const content=fs.readFileSync(source,'utf8');files.set(name,{name,content});
 for(const m of content.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
  const next=path.posix.normalize(path.posix.join(path.posix.dirname(name),m[1]));
  const local=next.startsWith('shared/')?'dist/src/'+next.slice(7):'backend/'+next;
  visit(next,local);
 }
}
visit('index.ts','backend/index.ts');
const payload={project_id:'khbmuaitysznyxxefhou',name:'little-links',entrypoint_path:'index.ts',verify_jwt:false,files:[...files.values()]};
if(process.argv.includes('--stdout'))process.stdout.write(JSON.stringify(payload));
else {fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/backend-deploy.json',JSON.stringify(payload));console.log(`${files.size} backend files packaged with all relative dependencies.`);}
