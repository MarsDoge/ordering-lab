import {scenarios, sources, frame} from './model.mjs';
const $ = id=>document.getElementById(id);
const escape = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let scene=scenarios.find(s=>s.id===location.hash.slice(1))||scenarios[1],step=0,timer=null;
let group='';
$('navigation').innerHTML=scenarios.map((s,i)=>{let heading=s.group!==group?`<div class="nav-group">${s.group}</div>`:'';group=s.group;return `${heading}<a class="nav-link" href="#${s.id}" data-scene="${s.id}"><b>${String(i+1).padStart(2,'0')}</b>${s.name}</a>`}).join('');
function stop(){clearTimeout(timer);timer=null;$('play').textContent='▶ 播放';$('play').setAttribute('aria-pressed','false');}
function schedule(){timer=setTimeout(()=>{if(step<scene.steps.length-1){step++;renderFrame();schedule();}else stop();},Number($('speed').value));}
function toggle(){if(timer){stop();return;}if(step===scene.steps.length-1)step=0;$('play').textContent='Ⅱ 暂停';$('play').setAttribute('aria-pressed','true');renderFrame();schedule();}
function seek(n){stop();step=Math.max(0,Math.min(scene.steps.length-1,n));renderFrame();}
function renderScene(){
 stop();step=0;
 document.title=`${scene.name} · 计算机系统顺序实验室`;
 document.querySelectorAll('[data-scene]').forEach(a=>{if(a.dataset.scene===scene.id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('eyebrow').textContent=`EXPERIMENT ${String(scenarios.indexOf(scene)+1).padStart(2,'0')} / ${scene.group}`;
 for(const key of ['title','lead','scope','takeaway','why','fix'])$(key).textContent=scene[key];
 $('experiment-title').textContent=scene.name;
 $('code').innerHTML=scene.code.map(([label,code])=>`<div class="code-card"><span>${escape(label)}</span><pre>${escape(code)}</pre></div>`).join('');
 $('progress').max=scene.steps.length-1;
 $('lanes').innerHTML=scene.lanes.map((l,i)=>`<div class="lane" data-kind="${l.kind}" aria-label="${escape(l.name)}"><div class="lane-heading"><h3>${escape(l.name)}</h3><span class="tag">${escape(l.tag)}</span></div><div class="flow">${scene.labels.map(label=>`<div class="cell"><small>${escape(label)}</small><strong></strong><i class="packet" aria-hidden="true"></i></div>`).join('')}</div><div class="lane-status" id="status-${i}"></div></div>`).join('');
 $('refs').innerHTML=scene.refs.map(k=>`<li><a href="${sources[k][1]}" target="_blank" rel="noopener noreferrer">${escape(sources[k][0])} ↗</a></li>`).join('');
 renderFrame();
}
function renderFrame(){
 $('counter').textContent=`${scene.lanes.length} 条路径并排对照`;
 $('step-number').textContent=`${step}/${scene.steps.length-1}`;
 $('step-label').textContent=`STEP ${String(step).padStart(2,'0')}`;
 $('progress').value=step;$('progress').setAttribute('aria-valuetext',`${step}：${scene.steps[step]}`);
 $('narration').textContent=scene.steps[step];$('prev').disabled=step===0;$('next').disabled=step===scene.steps.length-1;
 document.querySelectorAll('.lane').forEach((el,i)=>{
  const f=frame(scene.id,scene.lanes[i].kind,step);
  el.querySelectorAll('.cell').forEach((cell,j)=>{cell.querySelector('strong').textContent=f.cells[j];cell.classList.toggle('active',j===f.focus);cell.classList.remove('sending');if(step&&j===Math.max(0,f.focus-1)&&j<3){void cell.offsetWidth;cell.classList.add('sending');}});
  const status=$(`status-${i}`);status.textContent=f.status;status.className=`lane-status ${f.tone}`;
 });
}
$('play').addEventListener('click',toggle);$('prev').addEventListener('click',()=>seek(step-1));$('next').addEventListener('click',()=>seek(step+1));$('reset').addEventListener('click',()=>seek(0));$('progress').addEventListener('input',e=>seek(Number(e.target.value)));$('speed').addEventListener('change',()=>{if(timer){clearTimeout(timer);schedule();}});
window.addEventListener('hashchange',()=>{const next=scenarios.find(s=>s.id===location.hash.slice(1));if(next&&next!==scene){scene=next;renderScene();}});
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,button,a,summary,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();toggle();}else if(e.key==='ArrowRight'){e.preventDefault();seek(step+1);}else if(e.key==='ArrowLeft'){e.preventDefault();seek(step-1);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
$('source-jump').addEventListener('click',()=>$('references').open=true);
// Save a pristine standalone document, not the currently mutated experimental state.
const pristine='<!doctype html>\n'+document.documentElement.outerHTML;
$('download').href=URL.createObjectURL(new Blob([pristine],{type:'text/html;charset=utf-8'}));
renderScene();
