const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const test=require('node:test');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('public/front_end_foundations.js','utf8'),ctx);const f=ctx.window.FE_FOUNDATIONS;
const close=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(a),Math.abs(b),1e-30),`${a} differs from ${b}`);
test('power ratios and absolute power levels are numerically correct',()=>{
 for(const [gain,ratio] of [[0,1],[10,10],[20,100],[30,1000],[-10,.1]])close(f.ratio(gain),ratio);
 close(f.watts(0),.001);close(f.watts(30),1);close(f.watts(-130),1e-16);
 for(const level of [-160,-130,-100,-30,0,30])close(f.dbm(f.watts(level)),level,1e-10);
 assert.throws(()=>f.dbm(0),/positive/);assert.throws(()=>f.dbm(-1),/positive/);assert.throws(()=>f.watts(NaN),/finite/);
});
test('lecture gain/loss budget and equal-impedance voltage ratio are correct',()=>{
 const b=f.budget(-130,30,8);assert.equal(b.afterGain,-100);assert.equal(b.output,-108);assert.equal(b.netGain,22);close(b.powerRatio,158.48931924611142);close(b.voltageRatio,12.589254117941675);
 assert.equal(f.budget(-110,20,0).output,-90);assert.equal(f.budget(-130,0,1.5).output,-131.5);
 assert.equal(f.budget(-130,0,0).output,-130);close(f.budget(-130,20,0).voltageRatio,10);
 assert.equal(f.budget(-130,0,30).netGain,-30);assert.throws(()=>f.budget(-130,30,-8),/nonnegative/);
});
test('all ten lecture sections have accessible electrical prerequisites and calculators',()=>{
 for(let i=0;i<10;i++){
  const html=f.render(i);assert.ok(html.includes('id="fe-foundations"'));assert.ok(html.includes('id="budget-input"'));assert.ok(html.includes('0 dB: output power equals input power'));assert.ok(html.includes('0 dBm: 1 mW'));assert.ok(!html.includes('undefined'));
 }
 for(const term of ['Power','Voltage','Gain','dB','dBm','dBW','Noise Figure','SNR','Insertion Loss','3-dB Bandwidth','ADC','AGC'])assert.ok(f.terms[term],term);
 const js=fs.readFileSync('public/front_end.js','utf8');assert.ok(js.includes('FE_FOUNDATIONS.render(i)'));assert.ok(js.includes('FE_FOUNDATIONS.bind()'));
 for(const name of ['public/front_end.html','public/front-end/index.html']){const html=fs.readFileSync(name,'utf8');assert.ok(html.indexOf('/front_end_foundations.js')<html.indexOf('/front_end_lecture_view.js'));}
});
