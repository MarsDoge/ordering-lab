import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,frame,sources} from '../src/model.mjs';
test('all scenario states are total and refer to primary sources',()=>{
 assert.equal(new Set(scenarios.map(s=>s.id)).size,scenarios.length);
 for(const s of scenarios){assert.equal(s.labels.length,4);for(const r of s.refs)assert.ok(sources[r]);for(const l of s.lanes)for(let t=0;t<s.steps.length;t++){const f=frame(s.id,l.kind,t);assert.equal(f.cells.length,4);assert.ok(f.cells.every(c=>typeof c==='string'));assert.ok(f.focus>=0&&f.focus<4);assert.ok(f.status);}}
});
test('single thread reads own store even before external visibility',()=>{
 for(const k of ['weak','strong']){assert.equal(frame('self',k,2).cells[2],'data = 0');assert.equal(frame('self',k,2).cells[3],'r = 42');}
});
test('publication counterexample persists after data eventually arrives',()=>{
 for(const id of ['device','message']){assert.match(frame(id,'weak',3).cells[2],/data = 0 · ready = 1/);assert.equal(frame(id,'weak',7).cells[3],'result = 0');for(const k of ['strong','fence']){for(let t=0;t<6;t++)assert.match(frame(id,k,t).cells[2],/ready = 0/);assert.equal(frame(id,k,7).cells[3],'result = 42');}}
});
test('SB both weak lanes allow double zero, full barriers exclude it',()=>{
 const raw=frame('sb','weak',7),safe=frame('sb','fence',7);assert.equal(raw.cells[0],'r0 = 0');assert.equal(raw.cells[3],'r1 = 0');assert.equal(safe.cells[0],'r0 = 0');assert.equal(safe.cells[3],'r1 = 1');assert.match(frame('sb','fence',3).cells[2],/x = 1 · y = 0/);
});
test('DBAR does not substitute cache maintenance or device completion',()=>{
 assert.equal(frame('dma','weak',5).cells[3],'result = 0');assert.equal(frame('dma','fence',5).cells[3],'result = 42');assert.equal(frame('io','fence',4).cells[3],'保留缓冲区');assert.equal(frame('io','fence',6).cells[3],'确认停止后释放');
});
test('full data barrier waits for all older memory operations, not arithmetic',()=>{
 assert.equal(frame('dbar','fence',2).cells[3],'ADD 已完成');for(let t=0;t<6;t++)assert.equal(frame('dbar','fence',t).cells[2],'ready 尚未发布');assert.equal(frame('dbar','fence',6).cells[2],'ready = 1 可见');
});
