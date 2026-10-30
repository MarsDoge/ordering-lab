import {readFile,writeFile,mkdir} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const [shell,css,model,lessons,chapters,app,guide,license]=await Promise.all(['src/shell.html','src/styles.css','src/model.mjs','src/lessons.mjs','src/chapters.mjs','src/app.mjs','src/guide.mjs','LICENSE'].map(read));
const script=model.replace(/^export /gm,'')+'\n'+lessons.replace(/^export /gm,'')+'\n'+chapters.replace(/^export /gm,'')+'\n'+app.replace(/^import .*?;\n/,'')+'\n'+guide.replace(/^import .*?;\n/gm,'');
const html=shell.replace('<head>','<head>\n<!--\n'+license+'-->\n').replace('/* STYLES */',()=>css).replace('/* SCRIPT */',()=>script.replace(/<\/script/gi,'<\\/script'));
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/index.html',import.meta.url),html);
await writeFile(new URL('../dist/LICENSE.txt',import.meta.url),license);
console.log(`Built standalone dist/index.html (${Buffer.byteLength(html)} bytes)`);
