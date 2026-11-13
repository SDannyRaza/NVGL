const test=require('node:test'),assert=require('node:assert/strict');
require('./public/front_end_polarization.js');const p=globalThis.FE_POLARIZATION;
test('circular electric field has unit magnitude and opposite handed phase progression',()=>{
 for(let phase=0;phase<=360;phase++){
  const right=p.field('RHCP',phase),left=p.field('LHCP',phase);
  assert.ok(Math.abs(Math.hypot(right.x,right.y)-1)<1e-12);
  assert.ok(Math.abs(Math.hypot(left.x,left.y)-1)<1e-12);
  assert.equal(right.x,left.x);assert.equal(right.y,-left.y);
 }
 assert.ok(p.field('RHCP',90).y<0);assert.ok(p.field('LHCP',90).y>0);
});
test('ideal circular polarization coupling distinguishes matching and orthogonal states',()=>{
 assert.equal(p.coupling('RHCP','RHCP'),1);assert.equal(p.coupling('LHCP','LHCP'),1);
 assert.equal(p.coupling('RHCP','LHCP'),0);assert.equal(p.coupling('LHCP','RHCP'),0);
 assert.match(p.render(),/look <em>in the direction the wave travels/);
 assert.match(p.render(),/does not always produce a pure opposite-handed wave/);
});
