import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root,'public');
const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()){
      if(entry.name==='vendor') continue;
      walk(p);
    }else if(entry.isFile() && entry.name.endsWith('.js')) files.push(p);
  }
}
walk(publicDir);
let failed=0;
for(const file of files){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0){ console.error('FAIL',path.relative(root,file),r.stderr.trim()); failed++; }
}
if(failed) process.exitCode=1;
else console.log(`PASS JavaScript syntax (${files.length} custom browser scripts)`);
