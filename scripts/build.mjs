import {readFile,writeFile,mkdir} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const [shell,css,model,app,license]=await Promise.all(['src/shell.html','src/styles.css','src/model.mjs','src/app.mjs','LICENSE'].map(read));
const script=model.replace(/^export /gm,'')+'\n'+app.replace(/^import .*?;\n/,'');
const html=shell.replace('<head>','<head>\n<!--\n'+license+'-->\n').replace('/* STYLES */',()=>css).replace('/* SCRIPT */',()=>script.replace(/<\/script/gi,'<\\/script'));
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/index.html',import.meta.url),html);
await writeFile(new URL('../dist/LICENSE.txt',import.meta.url),license);
console.log(`Built standalone dist/index.html (${Buffer.byteLength(html)} bytes)`);
