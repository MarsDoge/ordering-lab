import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,architectures,sources,buildTrace,components,connections,operationContext} from '../src/model.mjs';
const index=(t,id)=>t.events.findIndex(e=>e.id===id);
const get=(t,id)=>t.events.find(e=>e.id===id);
test('every valid architecture / scenario / synchronization combination has a well-formed trace',()=>{
 for(const s of scenarios)for(const a of architectures)for(const sync of [false,true]){
  if(s.id==='dbar'&&a.id!=='loongarch')continue;
  const t=buildTrace(s.id,a.id,sync);assert.equal(t.actors.length,2);assert.ok(t.resultAt>0&&t.resultAt<=t.events.length);assert.equal(new Set(t.events.map(e=>e.id)).size,t.events.length);
  for(const ref of [...s.refs,...a.refs])assert.ok(sources[ref]);
  for(const [i,e] of t.events.entries()){assert.ok(e.lane===0||e.lane===1);assert.equal(e.lines.length,2);assert.ok(e.note);if(e.from)assert.ok(index(t,e.from)>=0&&index(t,e.from)<i);const c=operationContext(t,i);for(const node of c.nodes)assert.ok(components.some(n=>n.id===node));assert.ok(c.contract&&c.difference);}
 }
});
test('weak architectures permit the message-passing counterexample; x86 WB excludes it',()=>{
 for(const a of architectures){const t=buildTrace('message',a.id,false);if(a.id==='x86'){assert.ok(index(t,'data-visible')<index(t,'ready-visible'));assert.match(get(t,'read-data').lines[1],/42/);}else{assert.ok(index(t,'ready-visible')<index(t,'read-data'));assert.ok(index(t,'read-data')<index(t,'data-visible'));assert.match(get(t,'read-data').lines[1],/0/);}}
});
test('paired release/acquire publishes data before the reader consumes it on all four architectures',()=>{
 for(const a of architectures){const t=buildTrace('message',a.id,true);assert.ok(index(t,'release')<index(t,'ready-visible'));assert.ok(index(t,'data-visible')<index(t,'ready-visible'));assert.ok(index(t,'read-ready')<index(t,'acquire'));assert.ok(index(t,'acquire')<index(t,'read-data'));assert.match(get(t,'read-data').lines[1],/42/);}
 assert.equal(architectures.find(a=>a.id==='aarch64').acquire,'LDAR');assert.match(architectures.find(a=>a.id==='riscv').release,/FENCE RW,W/);
});
test('SB allows double-zero on all four; both full barriers exclude it without requiring double-one',()=>{
 for(const a of architectures){const bad=buildTrace('sb',a.id,false),good=buildTrace('sb',a.id,true);assert.equal(get(bad,'read-y').lines[1],'r0 = 0');assert.equal(get(bad,'read-x').lines[1],'r1 = 0');assert.ok(index(bad,'read-x')<index(bad,'x-visible'));assert.equal(get(good,'read-y').lines[1],'r0 = 0');assert.equal(get(good,'read-x').lines[1],'r1 = 1');assert.ok(index(good,'fence-0')<index(good,'read-y'));assert.ok(index(good,'fence-1')<index(good,'read-x'));}
});
test('single-thread forwarding is correct before external visibility',()=>{
 for(const a of architectures){const t=buildTrace('self',a.id,false);assert.ok(index(t,'load')<index(t,'visible'));assert.match(get(t,'load').lines[1],/42/);}
});
test('DMA cache maintenance and MMIO completion stay separate from CPU ordering',()=>{
 for(const a of architectures){const bad=buildTrace('dma',a.id,false),good=buildTrace('dma',a.id,true);assert.match(get(bad,'read').lines[1],/0/);assert.match(get(good,'read').lines[1],/42/);assert.ok(index(good,'dma-sync')<index(good,'read'));const io=buildTrace('io',a.id,true);assert.ok(index(io,'arrival')<index(io,'readback'));assert.ok(index(io,'readback')<index(io,'stopped'));assert.ok(index(io,'stopped')<index(io,'free'));}
});
test('DBAR example cannot be mislabeled as another architecture',()=>{
 for(const a of ['x86','aarch64','riscv'])assert.throws(()=>buildTrace('dbar',a,true));
 const t=buildTrace('dbar','loongarch',true);assert.ok(index(t,'add')<index(t,'load-done'));assert.ok(index(t,'store-done')<index(t,'load-done'));assert.ok(index(t,'load-done')<index(t,'young'));
});
test('component network has valid endpoints and distinguishes private RAM from device paths',()=>{
 const ids=new Set(components.map(n=>n.id));assert.equal(ids.size,components.length);for(const e of connections){assert.ok(ids.has(e.from)&&ids.has(e.to));}for(const n of components){assert.ok(n.role&&n.guarantee&&n.limit);for(const r of n.refs)assert.ok(sources[r]);}
 const self=operationContext(buildTrace('self','x86',false),0);assert.ok(!self.nodes.includes('device'));const io=operationContext(buildTrace('io','aarch64',true),0);assert.ok(io.nodes.includes('bridge')&&io.nodes.includes('device'));assert.ok(!io.nodes.includes('cache'));
});
