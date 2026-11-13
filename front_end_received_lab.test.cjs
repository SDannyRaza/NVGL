const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('./public/front_end_received_lab.js');
const lab=globalThis.FE_RECEIVED_LAB;
test('Front End receiver views select the original shared GPS arrays without changing samples',()=>{
 const composite={I:[.1,.2],Q:[.3,.4]},individual={I:[-.1,.3],Q:[-.2,.5]},path={received:{composite,individual}};
 assert.equal(lab.dataFor(path,'all'),composite);
 assert.equal(lab.dataFor(path,'individual'),individual);
 assert.equal(lab.dataFor(path,'delay'),individual);
 assert.equal(lab.dataFor(null,'all'),null);
});
test('receiver laboratory exposes three accessible views and keeps epoch/source controls explicit',()=>{
 const model={doppler:-4325.112,delayChips:259.641352058301},state={receivedView:'individual',satellite:'G03',epoch:2,meta:{dataset:{epoch_count:17}},includeNoise:true,scene:[{satellite:'G03'},{satellite:'G08'}],path:{models:[model],satellites:['G03'],epoch:'2026-09-14T11:12:24'}};
 const html=lab.render(state);
 assert.equal((html.match(/role="tab"/g)||[]).length,3);
 assert.match(html,/aria-labelledby="fe-rx-tab-individual"/);
 assert.match(html,/data-satellite="G03" data-epoch-index="2"/);
 assert.match(html,/not samples recorded at the antenna/);
 assert.match(html,/value="G08"/);
 const delay=lab.render({...state,receivedView:'delay'});
 assert.match(delay,/modulo 1023 chips/);assert.match(delay,/apparent delay/);
 assert.match(delay,/do not estimate these quantities from the waveform/);
 for(const key of ['individual','all','delay'])assert.match(lab.render({...state,receivedView:key}),new RegExp('fe-rx-tab-'+key+'" role="tab" aria-selected="true"'));
});
