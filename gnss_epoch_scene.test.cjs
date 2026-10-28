const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const py=`import json,sys
sys.path.insert(0,'public/py')
from signal_engine import SignalEngine
e=SignalEngine('public/data/COM14___9600_260914_111044.26O','public/data/COM14___9600_260914_111044.26P')
print(json.dumps([e.scene(i) for i in (0,2,16)]))`;
const scenes=JSON.parse(execFileSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),['-c',py],{cwd:__dirname,encoding:'utf8'}));
assert.deepEqual(scenes.map(s=>s.satellite_count),[30,31,29]);
assert.notDeepEqual([...new Set(scenes[0].channels.map(c=>c.satellite))].sort(),
  [...new Set(scenes[2].channels.map(c=>c.satellite))].sort(),
  'Satellite membership must reflect the individual observation epoch');
for(const scene of scenes){
  const sats=new Set(scene.channels.map(c=>c.satellite));
  assert.equal(sats.size,scene.satellite_count);
  assert.equal(scene.channels.length,scene.channel_count);
  assert.ok(scene.channels.every(c=>c.epoch===scene.epoch));
  assert.ok(scene.channels.filter(c=>c.satellite[0]!=='R').every(c=>Number.isFinite(c.signal.carrier_mhz)));
  assert.ok(scene.channels.some(c=>c.satellite.startsWith('G')));
  assert.ok(scene.channels.some(c=>c.satellite.startsWith('E')));
  assert.ok(scene.channels.some(c=>c.satellite.startsWith('C')));
  assert.ok(scene.channels.some(c=>c.measurements?.Doppler?.value!==null));
}
console.log(`RINEX epoch scenes verified: ${scenes.map(s=>`${s.index}: ${s.satellite_count} satellites, ${s.channel_count} signal channels`).join(' | ')}`);
