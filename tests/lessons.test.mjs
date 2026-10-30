import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons,lessonFrames} from '../src/lessons.mjs';
import {chapters} from '../src/chapters.mjs';
import {scenarios,sources} from '../src/model.mjs';
test('guided examples have complete explanation steps',()=>{
 assert.equal(lessons.length,4);for(const l of lessons){assert.ok(l.takeaway&&l.term);const frames=lessonFrames(l.id);assert.ok(frames.length>=4);assert.equal(frames[0].readData,null);for(const [i,f] of frames.entries()){assert.equal(f.index,i);assert.ok(f.title&&f.explain&&f.focus);}}
 assert.throws(()=>lessonFrames('invalid'));
});
test('same-thread new value does not require prior external visibility',()=>{
 const frames=lessonFrames('self');const firstRead=frames.find(f=>f.readData!==null);assert.equal(firstRead.readData,42);assert.equal(firstRead.visibleData,0);assert.ok(frames.some(f=>f.visibleData===42));
});
test('message read result stays stale after propagation, while synchronized publication excludes that state',()=>{
 const bad=lessonFrames('message'),good=lessonFrames('fix');const firstRead=bad.find(f=>f.readData!==null);assert.equal(firstRead.readReady,true);assert.equal(firstRead.visibleData,0);assert.equal(firstRead.readData,0);assert.equal(bad.at(-1).visibleData,42);assert.equal(bad.at(-1).readData,0);
 for(const f of good){if(f.visibleReady)assert.equal(f.visibleData,42);if(f.readData!==null){assert.equal(f.readReady,true);assert.equal(f.readData,42);}}
 assert.equal(good.at(-1).readData,42);
});
test('DBAR gate needs both older accesses; independent calculation survives',()=>{
 const frames=lessonFrames('dbar');assert.ok(frames.some(f=>f.addDone&&!f.gateOpen));assert.ok(frames.some(f=>f.olderStore&&!f.olderLoad&&!f.gateOpen));for(const f of frames){if(f.gateOpen||f.younger){assert.ok(f.olderLoad&&f.olderStore);}if(f.younger)assert.ok(f.gateOpen);}assert.ok(frames.at(-1).younger&&frames.at(-1).addDone);
});

test('every chapter links to a valid example, scenario and primary source',()=>{
 assert.equal(chapters.length,8);assert.equal(new Set(chapters.map(c=>c.id)).size,8);
 for(const c of chapters){if(c.lesson)assert.ok(lessons.some(l=>l.id===c.lesson));assert.ok(scenarios.some(s=>s.id===c.scene));assert.equal(c.terms.length,3);assert.equal(c.notes.length,3);for(const r of c.refs)assert.ok(sources[r]);}
});
