/* Viewport-driven charts: the lesson and SVG experiments do not depend on Plotly. */
(function(root){
'use strict';
const states=new Map();let libraryPromise=null,requested=false;
const visible=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{const state=states.get(target);if(state){state.visible=isIntersecting;if(isIntersecting)schedule(target,state);}}),{rootMargin:'220px 0px'});
const resize=new ResizeObserver(entries=>entries.forEach(({target})=>{const state=states.get(target);if(state?.painted&&state.visible&&root.Plotly&&target.clientWidth)root.Plotly.Plots.resize(target);}));
function library(){
 if(root.Plotly)return Promise.resolve(root.Plotly);
 if(libraryPromise)return libraryPromise;requested=true;
 libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=document.getElementById('fe-plotly-source').dataset.src;script.async=true;script.onload=()=>{if(root.Plotly)resolve(root.Plotly);else{script.remove();libraryPromise=null;reject(Error('Chart library unavailable.'));}};script.onerror=()=>{script.remove();libraryPromise=null;reject(Error('The chart library could not load.'));};document.head.append(script);});
 return libraryPromise;
}
function placeholder(node,message,retry){
 node.replaceChildren();const panel=document.createElement('div');panel.className='fe-chart-placeholder';panel.setAttribute('role','status');const label=document.createElement('p');label.textContent=message;panel.append(label);
 if(retry){const button=document.createElement('button');button.type='button';button.textContent='Retry chart';button.onclick=retry;panel.append(button);}node.append(panel);
}
function schedule(node,state){
 if(!state.visible||state.frame||!state.dirty)return;
 state.frame=requestAnimationFrame(async()=>{
  state.frame=0;const version=state.version;if(!node.isConnected||states.get(node)!==state||!state.visible)return;
  if(!state.painted)placeholder(node,'Preparing interactive figure...');
  try{const Plotly=await library();if(!node.isConnected||states.get(node)!==state||!state.visible||state.version!==version)return;
   if(!state.painted)node.replaceChildren();state.painting=true;await Plotly.react(node,state.traces,state.layout,state.config);state.painting=false;if(states.get(node)!==state||!node.isConnected){Plotly.purge(node);return;}state.painted=true;if(state.version===version)state.dirty=false;
  }catch(error){state.painting=false;if(node.isConnected&&states.get(node)===state)placeholder(node,'The figure could not load. The lesson remains available.',()=>schedule(node,state));}
 });
}
function draw(node,traces,layout,config){
 let state=states.get(node);if(!state){state={visible:false,painted:false,frame:0};states.set(node,state);visible.observe(node);resize.observe(node);placeholder(node,'Interactive figure loads when it comes into view.');}
 Object.assign(state,{traces,layout,config,dirty:true,version:(state.version||0)+1});schedule(node,state);
}
function relayout(id,patch){const node=typeof id==='string'?document.getElementById(id):id,state=states.get(node);if(!state)return;for(const [key,value]of Object.entries(patch)){const parts=key.split('.');let object=state.layout;for(const part of parts.slice(0,-1))object=object[part]||(object[part]={});object[parts.at(-1)]=value;}state.version=(state.version||0)+1;state.dirty=true;schedule(node,state);}
function reset(container){for(const [node,state]of states){if(!node.isConnected||container.contains(node)){if(state.frame)cancelAnimationFrame(state.frame);visible.unobserve(node);resize.unobserve(node);if(root.Plotly&&(state.painted||state.painting||node.data))root.Plotly.purge(node);states.delete(node);}}}
root.FE_CHARTS={draw,relayout,reset,stats:()=>({requested,queued:states.size,painted:[...states.values()].filter(s=>s.painted).length})};
})(window);
