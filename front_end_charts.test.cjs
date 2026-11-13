const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const frames=new Map(),scripts=[],calls=[],observers=[];let next=0;
 class Node{constructor(tag='div'){this.tag=tag;this.children=[];this.isConnected=true;this.clientWidth=800;}replaceChildren(){this.children=[];}append(child){this.children.push(child);}setAttribute(){}remove(){this.isConnected=false;}}
 class IntersectionObserver{constructor(fn){this.fn=fn;observers.push(this);}observe(){}unobserve(){}}
 class ResizeObserver{observe(){}unobserve(){}}
 const root={},node=new Node(),document={getElementById:id=>id==='fe-plotly-source'?{dataset:{src:'/vendor/plotly.min.js?v=version'}}:node,createElement:tag=>new Node(tag),head:{append:script=>scripts.push(script)}};
 const context={window:root,document,IntersectionObserver,ResizeObserver,requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 root.Plotly=undefined;vm.runInNewContext(fs.readFileSync('public/front_end_charts.js','utf8'),context);
 const run=()=>{const tasks=[...frames.values()];frames.clear();return tasks.map(fn=>fn());};
 const visible=()=>observers[0].fn([{target:node,isIntersecting:true}]);
 const ready=()=>{root.Plotly={react:async(...args)=>{calls.push(args);},purge:()=>calls.push(['purge']),Plots:{resize(){}}};scripts.at(-1).onload();};
 return {root,api:root.FE_CHARTS,node,scripts,calls,run,visible,hidden:()=>observers[0].fn([{target:node,isIntersecting:false}]),ready};
}
test('offscreen charts neither download the library nor render',()=>{
 const x=setup();x.api.draw(x.node,[{y:[1]}],{},{});assert.equal(x.scripts.length,0);assert.equal(x.calls.length,0);assert.equal(x.api.stats().painted,0);
});
test('one delayed download paints only the latest slider data and queued axis ranges',async()=>{
 const x=setup();x.api.draw(x.node,[{y:[1]}],{},{});x.visible();const pending=x.run();
 x.api.draw(x.node,[{y:[2]}],{},{});x.api.relayout(x.node,{'yaxis.range':[-2,2]});pending.push(...x.run());
 assert.equal(x.scripts.length,1);assert.equal(x.scripts[0].src,'/vendor/plotly.min.js?v=version');x.ready();await Promise.all(pending);
 assert.equal(x.calls.length,1);assert.equal(x.calls[0][1][0].y[0],2);assert.equal(JSON.stringify(x.calls[0][2].yaxis.range),'[-2,2]');
});
test('switching topics before the library arrives prevents stale-node painting',async()=>{
 const x=setup();x.api.draw(x.node,[],{},{});x.visible();const pending=x.run();x.api.reset({contains:node=>node===x.node});x.node.isConnected=false;x.ready();await Promise.all(pending);assert.equal(x.calls.length,0);assert.equal(x.api.stats().queued,0);
});
test('a failed chart download can retry without blocking the lesson',async()=>{
 const x=setup();x.api.draw(x.node,[{y:[3]}],{},{});x.visible();const pending=x.run();x.scripts[0].onerror();await Promise.all(pending);
 const retry=x.node.children[0].children.at(-1);assert.equal(retry.textContent,'Retry chart');retry.onclick();const again=x.run();assert.equal(x.scripts.length,2);x.ready();await Promise.all(again);assert.equal(x.calls.length,1);
});

test('scrolling preserves an unchanged chart, while offscreen data updates render on return',async()=>{
 const x=setup();x.api.draw(x.node,[{y:[1]}],{},{});x.visible();const first=x.run();x.ready();await Promise.all(first);
 x.hidden();x.visible();await Promise.all(x.run());assert.equal(x.calls.length,1,'unchanged chart must not reset its zoom on re-entry');
 x.hidden();x.api.draw(x.node,[{y:[2]}],{},{});assert.equal(x.run().length,0);
 x.visible();await Promise.all(x.run());assert.equal(x.calls.length,2);assert.equal(x.calls[1][1][0].y[0],2);assert.equal(x.scripts.length,1);
});

test('a chart still being rendered is purged on topic change',async()=>{
 const x=setup();x.api.draw(x.node,[{y:[1]}],{},{});x.visible();const queued=x.run();x.ready();let finish;
 x.root.Plotly.react=(...args)=>{x.calls.push(args);return new Promise(resolve=>{finish=resolve;});};
 await Promise.resolve();x.api.reset({contains:node=>node===x.node});assert.ok(x.calls.some(call=>call[0]==='purge'));
 finish();await Promise.all(queued);assert.equal(x.api.stats().queued,0);
});
