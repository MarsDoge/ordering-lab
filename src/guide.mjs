import {lessons,lessonFrames} from './lessons.mjs';
import {chapters} from './chapters.mjs';
let lessonIndex=0,guideStep=0,guideTimer=null,guideUnlocked=true,chapterIndex=0;
const yesNo=v=>v===null?'未读':v?'是':'否';
const readNumber=v=>v===null?'未读':v;
function guideStop(){clearTimeout(guideTimer);guideTimer=null;$('g-play').textContent='▶ 自动播放';$('g-play').setAttribute('aria-pressed','false');}
function guideMode(learn,writeHash=true){
 stop();guideStop();$('beginner').hidden=!learn;$('expert').hidden=learn;
 document.querySelector('.keyboard-hint').hidden=learn;
 $('mode-learn').hidden=learn||chapterIndex<0||!chapters[chapterIndex].lesson;
 document.title=chapterIndex<0?'自由实验 · Ordering Lab':`${chapters[chapterIndex].title} · Ordering Lab`;
 if(writeHash){if(learn&&chapterIndex>=0)history.replaceState(null,'',`#chapter/${chapters[chapterIndex].id}`);else saveHash();}
}
function renderChapterHeader(){
 let previousLevel='';$('chapter-nav').innerHTML=chapters.map((c,i)=>{const group=c.level!==previousLevel?`<span class="chapter-group">${escape(c.level)}</span>`:'';previousLevel=c.level;return `${group}<button data-chapter="${i}" ${chapterIndex===i?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span>${escape(c.title)}</button>`;}).join('');
 const c=chapters[chapterIndex];$('chapter-notes').hidden=!c;$('chapter-terms').hidden=!c;$('chapter-count').textContent=c?`${chapterIndex+1} / ${chapters.length}`:'自由实验';$('chapter-prev').disabled=chapterIndex<=0;$('chapter-next').hidden=chapterIndex===chapters.length-1;
 if(!c){$('chapter-kicker').textContent='自由组合场景、架构和同步条件';$('chapter-title').textContent='完整实验台';$('chapter-question').textContent='可以直接比较允许结果，也可以从左侧目录按章节学习。';return;}
 $('chapter-kicker').textContent=`第 ${String(chapterIndex+1).padStart(2,'0')} 章 · ${c.level} · ${c.subtitle}`;$('chapter-title').textContent=c.title;$('chapter-question').textContent=c.question;
 $('chapter-terms').innerHTML=c.terms.map(([name,meaning])=>`<div><strong>${escape(name)}</strong><span>${escape(meaning)}</span></div>`).join('');
 $('chapter-notes').innerHTML=`<h3>规则与编码实践</h3>${c.notes.map(([title,body],i)=>`<details ${i===0?'open':''}><summary>${escape(title)}</summary><p>${escape(body)}</p></details>`).join('')}<p class="chapter-sources">本章依据：${c.refs.map(k=>`<a href="${sources[k][1]}" target="_blank" rel="noopener noreferrer">${escape(sources[k][0])} ↗</a>`).join(' · ')}</p>`;
}
function selectChapter(i,writeHash=true){
 guideStop();chapterIndex=i;const c=chapters[i];renderChapterHeader();
 scene=c.scene;arch=c.arch||'loongarch';sync=c.sync;rebuild();
 if(c.lesson){lessonIndex=lessons.findIndex(l=>l.id===c.lesson);guideStep=0;const l=lessons[lessonIndex];
  $('g-kicker').textContent='分步示例';$('g-title').textContent=l.title;$('g-setup').textContent=l.setup;
  $('g-rule').hidden=l.id!=='fix';$('g-takeaway').textContent=l.takeaway;$('g-term').textContent=l.term;$('g-architecture').hidden=l.id!=='fix';$('g-result').querySelector('details').open=true;
  guideMode(true,false);renderGuide();
 }else guideMode(false,false);
 if(writeHash)history.replaceState(null,'',`#chapter/${c.id}`);
}
function renderGuide(){
 const l=lessons[lessonIndex],frames=lessonFrames(l.id),s=frames[guideStep],last=guideStep===frames.length-1;
 $('g-demo').hidden=!guideUnlocked;$('g-prev').disabled=guideStep===0;$('g-next').hidden=last;$('g-play').disabled=last;
 $('g-progress').textContent=`${guideStep} / ${frames.length-1}`;
 $('g-step-name').textContent=guideStep===0?'起点':`第 ${guideStep} 步`;
 $('g-event-title').textContent=s.title;$('g-explain').textContent=s.explain;
 $('g-next').textContent=guideStep===0?'开始：看第一步 →':guideStep===frames.length-2?'最后一步 →':'下一步：继续观察 →';
 $('g-result').hidden=!last;
 if(l.id==='dbar'){
  $('g-board').innerHTML=`<div class="gate-board"><section class="guide-station ${s.focus==='older'?'active':''}"><span class="station-person">DBAR 0 前面的访存</span><h4>这两项都要满足条件</h4><div class="task-row ${s.olderLoad?'done':''}"><b>${s.olderLoad?'✓':'…'}</b>旧读 <span>${s.olderLoad?'完成':'尚未完成'}</span></div><div class="task-row ${s.olderStore?'done':''}"><b>${s.olderStore?'✓':'…'}</b>旧写 <span>${s.olderStore?'完成':'尚未完成'}</span></div></section><section class="gate-station ${s.gateOpen?'open':''} ${s.focus==='gate'?'active':''}"><span>DBAR 0</span><div class="gate-symbol" aria-hidden="true"><i></i><i></i></div><strong>${s.gateOpen?'条件满足，允许通过':'条件未齐，继续等'}</strong><small>门是语义比喻，不是物理开关</small></section><section class="guide-station ${s.focus==='younger'?'active':''}"><span class="station-person">DBAR 0 后面的访存</span><h4>新的读取 / 写入</h4><strong class="gate-status">${s.younger?'获准执行':s.gateOpen?'现在可以执行':'等待放行'}</strong><p>前面的访存没有满足要求，就不能越过这条约束。</p></section></div><div class="independent-task ${s.focus==='compute'?'active':''}"><b>无关的加法：1 + 2</b><span>${s.addDone?'✓ 已算出 3，结果保留':'尚未展示执行'}</span><small>不访问内存、无相关依赖；这里展示一种可能的执行。</small></div>`;
  $('g-boundary').textContent='只讲 LoongArch DBAR 0。这里的“完成”按架构访存语义理解，不等于把所有缓存写回 DRAM，也不等于设备工作完成。';
 }else{
  const self=l.id==='self',showReady=!self;
  const val=(label,value,kind='')=>`<div class="guide-value ${kind}"><span>${label}</span><strong>${escape(String(value))}</strong></div>`;
  $('g-board').innerHTML=`<div class="value-board"><section class="guide-station ${s.focus==='sender'?'active':''}"><span class="station-person">CPU 0 · ${self?'自己写':'发送方'}</span><h4>程序已经写了什么</h4>${val('数据',s.writtenData)}${showReady?val('准备好了',yesNo(s.writtenReady),'small'):''}<p>初始值 / 最近写入记录<br>写了 ≠ 对方已经看见</p></section><section class="guide-station visibility ${s.focus==='visibility'||s.focus==='rule'?'active':''}"><span class="station-person">${self?'对外可见的状态':'CPU 1 此刻可观察的状态'}</span><h4>${self?'尚未对外可见也能自己读':'本条路径中，哪些值可见'}</h4>${val('数据',s.visibleData)}${showReady?val('准备好了',yesNo(s.visibleReady),'small'):''}<p class="pending-label">${s.pending.length?'还有变化在等待':'此刻没有待展示的写入传播'}</p><ul class="pending-writes">${s.pending.map(x=>`<li>${escape(x)}</li>`).join('')}</ul></section><section class="guide-station ${s.focus==='reader'?'active':''} ${s.readData===0&&s.readReady?'read-risk':''}"><span class="station-person">${self?'CPU 0 · 自己读':'CPU 1 · 接收方'}</span><h4>这次真正读回的结果</h4>${val('数据',readNumber(s.readData),s.readData===null?'unread':'')}${showReady?val('准备好了',yesNo(s.readReady),'small'):''}<p>${s.readData!==null?'结果已经读回，不会自动更新':'“未读”表示还没有执行这次读取'}</p></section></div>`;
  $('g-boundary').textContent=self?'这段代码只有一个 CPU，且没有其他写入者。强序和弱序都必须保证这次同地址读取符合程序语义。':'中间是针对 CPU 1 的可见性示意，不是一块物理内存，也不是所有 CPU 的统一视图。普通 C/C++ 代码仍需使用正确的原子操作，不能直接用数据竞争实现此例。';
 }
}
function guideSeek(n){guideStop();guideStep=Math.max(0,Math.min(lessonFrames(lessons[lessonIndex].id).length-1,n));renderGuide();}
function guideSchedule(){guideTimer=setTimeout(()=>{guideStep++;renderGuide();if(guideStep>=lessonFrames(lessons[lessonIndex].id).length-1)guideStop();else guideSchedule();},3500);}
$('chapter-nav').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b){selectChapter(Number(b.dataset.chapter));$('chapter-header').scrollIntoView({block:'start',behavior:'auto'});}});
$('g-next').addEventListener('click',()=>guideSeek(guideStep+1));$('g-prev').addEventListener('click',()=>guideSeek(guideStep-1));$('g-reset').addEventListener('click',()=>guideSeek(0));
$('g-play').addEventListener('click',()=>{if(guideTimer){guideStop();return;}$('g-play').textContent='Ⅱ 暂停';$('g-play').setAttribute('aria-pressed','true');guideSchedule();});
$('g-open-lab').addEventListener('click',()=>{const l=lessons[lessonIndex];scene=l.advanced;arch='loongarch';sync=l.sync;rebuild();guideMode(false);$('expert').scrollIntoView({block:'start',behavior:'auto'});});
$('mode-learn').addEventListener('click',()=>selectChapter(chapterIndex));$('mode-lab').addEventListener('click',()=>{chapterIndex=-1;renderChapterHeader();guideMode(false);$('chapter-header').scrollIntoView({block:'start',behavior:'auto'});});
$('chapter-prev').addEventListener('click',()=>{selectChapter(Math.max(0,chapterIndex-1));$('chapter-header').scrollIntoView({block:'start',behavior:'auto'});});
$('chapter-next').addEventListener('click',()=>{selectChapter(Math.min(chapters.length-1,chapterIndex+1));$('chapter-header').scrollIntoView({block:'start',behavior:'auto'});});
document.addEventListener('lab-state-change',()=>{const c=chapters[chapterIndex];if(!c)return;if(scene!==c.scene&&!(c.id==='dma'&&scene==='device')){chapterIndex=-1;renderChapterHeader();$('mode-learn').hidden=true;return;}history.replaceState(null,'',`#chapter/${c.id}?scene=${scene}&arch=${arch}&sync=${sync?1:0}&view=lab`);});
function routeGuide(){
 const hash=location.hash,match=hash.match(/^#chapter\/([a-z-]+)(?:\?(.*))?$/);
 if(match){const i=chapters.findIndex(c=>c.id===match[1]);selectChapter(i<0?0:i,false);const q=new URLSearchParams(match[2]||'');if(q.get('view')==='lab'){scene=scenarios.some(s=>s.id===q.get('scene'))?q.get('scene'):scene;arch=architectures.some(a=>a.id===q.get('arch'))?q.get('arch'):arch;if(scene==='dbar')arch='loongarch';sync=q.get('sync')==='1';rebuild();guideMode(false,false);}}
 else if(!hash||hash==='#experiment')selectChapter(0,false);
 else if(hash.startsWith('#learn/')){const i=chapters.findIndex(c=>c.lesson===hash.slice(7));selectChapter(i<0?0:i);}
 else{chapterIndex=-1;renderChapterHeader();guideMode(false,false);}
}
window.addEventListener('hashchange',routeGuide);document.addEventListener('visibilitychange',()=>{if(document.hidden)guideStop();});
routeGuide();
