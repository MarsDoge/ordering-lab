import {scenarios, architectures, sources, buildTrace, components, connections, operationContext, orderingChain} from './model.mjs';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pristine='<!doctype html>\n'+document.documentElement.outerHTML;
$('download').href=URL.createObjectURL(new Blob([pristine],{type:'text/html;charset=utf-8'}));
let scene='message',arch='loongarch',sync=false,trace,step=0,timer=null,overview=true,operation=0,selectedNode='lsu';
$('scene').innerHTML=scenarios.map(s=>`<option value="${s.id}">${escape(s.name)}</option>`).join('');
$('architecture').innerHTML=architectures.map(a=>`<option value="${a.id}">${escape(a.name)}</option>`).join('');
$('comparison').innerHTML=architectures.map(a=>`<tr><td>${escape(a.name)}</td><td>${a.orderedStores?'禁止':'允许'}</td><td>允许</td><td><code>${escape(a.full)}</code></td></tr>`).join('');
function stop(){clearTimeout(timer);timer=null;$('play').textContent='▶ 播放';$('play').setAttribute('aria-pressed','false');}
function schedule(){timer=setTimeout(()=>{step++;overview=false;renderFrame();if(step>=trace.events.length)stop();else schedule();},Number($('speed').value));}
function toggle(){if(timer){stop();return;}if(step>=trace.events.length)step=0;overview=false;$('play').textContent='Ⅱ 暂停';$('play').setAttribute('aria-pressed','true');renderFrame();schedule();}
function seek(n,all=false){stop();step=Math.max(0,Math.min(trace.events.length,n));overview=all;renderFrame();}
function readHash(){const [id,query='']=location.hash.slice(1).split('?');const q=new URLSearchParams(query);scene=scenarios.some(s=>s.id===id)?id:'message';arch=architectures.some(a=>a.id===q.get('arch'))?q.get('arch'):'loongarch';sync=q.get('sync')==='1';if(scene==='dbar')arch='loongarch';}
function saveHash(){history.replaceState(null,'',`#${scene}?arch=${arch}&sync=${sync?1:0}`);document.dispatchEvent(new Event('lab-state-change'));}
function rebuild(){
 stop();trace=buildTrace(scene,arch,sync);step=trace.events.length;overview=true;operation=0;
 $('operation').innerHTML=trace.events.map((e,i)=>`<option value="${i}">${i+1}. ${escape(trace.actors[e.lane])}：${escape(e.lines.join(' · '))}</option>`).join('');
 $('scene').value=scene;$('architecture').value=arch;$('architecture').disabled=scene==='dbar';$('arch-restriction').hidden=scene!=='dbar';$('sync').checked=sync;
 $('title').textContent=trace.scenario.title;$('sync-label').textContent=trace.scenario.toggle;$('arch-model').textContent=trace.arch.model;$('scope').textContent=trace.scenario.scope;
 $('arch-note').textContent=trace.arch.note+(scene==='message'?` 发布示例：${trace.arch.release}；接收示例：${trace.arch.acquire}。`:'');
 $('why').textContent=trace.scenario.why;$('fix').textContent=trace.scenario.fix;
 $('code').innerHTML=trace.code.map(([title,code])=>`<div class="code-card"><span>${escape(title)}</span><pre>${escape(code)}</pre></div>`).join('');
 const refs=[...new Set([...trace.arch.refs,...trace.scenario.refs,'linux','dma','io',...components.flatMap(c=>c.refs)])];$('refs').innerHTML=refs.map(k=>`<li><a href="${sources[k][1]}" target="_blank" rel="noopener noreferrer">${escape(sources[k][0])} ↗</a></li>`).join('');
 $('progress').max=trace.events.length;document.title=`${trace.scenario.name} · ${trace.arch.name} · Ordering Lab`;
 renderFrame();
}
function renderFrame(){
 const n=trace.events.length,current=overview?-1:step-1;const row=86,top=68,height=top+n*row+30;const x=[240,720];
 const y=i=>top+i*row;
 let svg=`<title id="diagram-title">${escape(trace.scenario.name)}，${escape(trace.arch.name)}，${sync?'已加入同步':'未加入同步'}</title><desc id="diagram-description">从上往下阅读。${trace.events.map((e,i)=>`${i+1}、${trace.actors[e.lane]}：${e.lines.join('，')}${i>=step?'（未到此步）':''}`).map(escape).join('。')}</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 Z" fill="#9ca3af"/></marker></defs>`;
 svg+=trace.actors.map((actor,l)=>`<text class="actor" x="${x[l]}" y="31" text-anchor="middle">${escape(actor)}</text><line class="lifeline" x1="${x[l]}" x2="${x[l]}" y1="47" y2="${height-16}"/>`).join('');
 for(let i=0;i<n;i++){const e=trace.events[i];if(e.from){const from=trace.events.findIndex(f=>f.id===e.from);const a=trace.events[from];svg+=`<path class="connector ${i>=step?'future':''} ${i===current?'current':''}" d="M${x[a.lane]},${y(from)+57} L${x[e.lane]},${y(i)-3}" marker-end="url(#arrow)"/>`;}}
 svg+=trace.events.map((e,i)=>`<g data-event="${i}" role="button" tabindex="0" aria-label="步骤 ${i+1}：${escape(e.lines.join('，'))}；点击查看协作环节" class="event ${e.tone} ${i>=step?'future':''} ${i===current?'current':''}"><rect class="box" x="${x[e.lane]-205}" y="${y(i)}" width="410" height="57" rx="5"/><text class="event-number" x="${x[e.lane]-194}" y="${y(i)+15}">${String(i+1).padStart(2,'0')}</text><text class="event-title" x="${x[e.lane]}" y="${y(i)+24}" text-anchor="middle">${escape(e.lines[0])}</text><text class="event-detail" x="${x[e.lane]}" y="${y(i)+44}" text-anchor="middle">${escape(e.lines[1]||'')}</text></g>`).join('');
 $('timeline').setAttribute('viewBox',`0 0 960 ${height}`);$('timeline').innerHTML=svg;
 $('progress').value=step;$('progress').setAttribute('aria-valuetext',overview?'完整路径':`${step} / ${n}`);$('step-count').textContent=`${step} / ${n}`;$('prev').disabled=step===0;$('next').disabled=step===n;
 $('step-label').textContent=overview?'完整路径':step===0?'初始状态':`STEP ${String(step).padStart(2,'0')}`;
 $('narration').textContent=overview?'上图显示本次选择的一条完整执行路径。切换架构或同步开关即可对照；点击播放，可从头逐步观察。':step===0?'即将开始。尚未发生的事件淡化显示；时间步仅表示示意顺序，不代表硬件周期。':trace.events[step-1].note;
 if(!overview)operation=Math.max(0,step-1);renderStructure();
 const pending=step<trace.resultAt;$('outcome-panel').className=`outcome ${pending?'pending':trace.tone}`;$('outcome-label').textContent=pending?'尚未得到结果':'这条路径的结果';$('outcome').textContent=pending?'继续单步，观察何时形成结果。':trace.outcome;
}
$('scene').addEventListener('change',e=>{scene=e.target.value;if(scene==='dbar')arch='loongarch';rebuild();saveHash();});
$('architecture').addEventListener('change',e=>{arch=e.target.value;rebuild();saveHash();});
$('sync').addEventListener('change',e=>{sync=e.target.checked;rebuild();saveHash();});
$('play').addEventListener('click',toggle);$('prev').addEventListener('click',()=>seek(step-1));$('next').addEventListener('click',()=>seek(step+1));$('reset').addEventListener('click',()=>seek(0));$('overview').addEventListener('click',()=>seek(trace.events.length,true));$('progress').addEventListener('input',e=>seek(Number(e.target.value)));$('speed').addEventListener('change',()=>{if(timer){clearTimeout(timer);schedule();}});
window.addEventListener('hashchange',()=>{readHash();rebuild();});
window.addEventListener('keydown',e=>{if($('expert').hidden||e.target.closest('input,select,button,a,summary,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();toggle();}else if(e.key==='ArrowRight'){e.preventDefault();seek(step+1);}else if(e.key==='ArrowLeft'){e.preventDefault();seek(step-1);}});
function renderStructure(){
 const context=operationContext(trace,operation);$('operation').value=operation;
 if(!context.nodes.includes(selectedNode))selectedNode=context.nodes.includes('lsu')?'lsu':context.nodes[0];
 const active=new Set(context.nodes), byId=Object.fromEntries(components.map(n=>[n.id,n]));
 let svg='<defs><marker id="structure-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#9aa5b6"/></marker></defs>';
 for(const edge of connections){const a=byId[edge.from],b=byId[edge.to];let path,labelX,labelY;
  if(edge.from==='lsu'&&edge.to==='cache'){path='M800 70 V100 H160 V130';labelX=320;labelY=95;}
  else if(a.y===b.y){path=`M${a.x+116} ${a.y} H${b.x-121}`;labelX=(a.x+b.x)/2;labelY=a.y-9;}
  else if(a.x===b.x){path=`M${a.x} ${a.y+28} V${b.y-33}`;labelX=a.x+52;labelY=(a.y+b.y)/2+3;}
  else {path=`M${a.x} ${a.y+28} L${b.x} ${b.y-33}`;labelX=(a.x+b.x)/2+30;labelY=(a.y+b.y)/2-5;}
  svg+=`<g class="map-edge ${edge.kind||'data'} ${active.has(a.id)&&active.has(b.id)&&(!edge.branch||edge.branch==='io'&&scene==='io')?'involved':''}"><path d="${path}" marker-end="url(#structure-arrow)"/><text x="${labelX}" y="${labelY}" text-anchor="middle">${escape(edge.label)}</text></g>`;
 }
 svg+=components.map(n=>`<g data-component="${n.id}" role="button" tabindex="0" aria-label="${escape(n.name)}，${active.has(n.id)?'涉及当前操作':'其他环节'}，点击查看职责" class="map-node ${active.has(n.id)?'involved':''} ${selectedNode===n.id?'selected':''}"><rect x="${n.x-116}" y="${n.y-27}" width="232" height="54" rx="7"/><text class="map-node-name" x="${n.x}" y="${n.y-2}" text-anchor="middle">${escape(n.name)}</text><text class="map-node-sub" x="${n.x}" y="${n.y+17}" text-anchor="middle">${escape(n.sub)}</text></g>`).join('');
 $('structure').innerHTML=svg;$('constraint-label').textContent=sync?'本例的同步 / 协议约束':'本例的顺序依据与缺口';$('constraint-chain').innerHTML=orderingChain(trace).map(text=>`<span>${escape(text)}</span>`).join('');showNode(selectedNode);$('operation-contract').textContent=context.contract;$('operation-difference').textContent=context.difference;
}
function showNode(id){const n=components.find(n=>n.id===id);selectedNode=id;$('node-title').textContent=n.name;$('node-role').textContent=n.role;$('node-guarantee').textContent=n.guarantee;$('node-limit').textContent=n.limit;document.querySelectorAll('[data-component]').forEach(e=>e.classList.toggle('selected',e.dataset.component===id));}
function activateMap(e){const node=e.target.closest('[data-component]');if(node)showNode(node.dataset.component);}
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>{const target=$(button.dataset.scroll);const disclosure=target.closest('details');if(disclosure)disclosure.open=true;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}));
function activateEvent(e){const node=e.target.closest('[data-event]');if(node)seek(Number(node.dataset.event)+1);}
$('operation').addEventListener('change',e=>seek(Number(e.target.value)+1));
$('structure').addEventListener('click',activateMap);$('timeline').addEventListener('click',activateEvent);
for(const [element,handler] of [[$('structure'),activateMap],[$('timeline'),activateEvent]])element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();handler(e);}});
readHash();rebuild();
