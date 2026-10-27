'use strict';
/*
 * Accessible signal-path diagrams, constructed from native cards + local SVG icons.
 * The underlying exercises, numerical examples and plots are left unchanged.
 */
function feFlowNode(index,icon,title,detail,color,target){
  return '<'+(target?'button type="button"':'div')+' class="flow-node"'+
    (target?' data-flow-target="'+target+'" title="Open '+title+' lesson"':'')+
    ' style="--flow-color:'+color+'">'+
    '<span class="flow-icon">'+vglIcon(icon)+'</span>'+
    '<span class="flow-count">'+String(index).padStart(2,'0')+' · SIGNAL PATH</span>'+
    '<b>'+title+'</b><small>'+detail+'</small>'+
    '</'+(target?'button':'div')+'>';
}
function feSignalChain(){
  const stages=[
    ['antenna','Active GNSS antenna','Receive the satellite field and apply first low-noise gain','#68edd4','antenna'],
    ['wave','Cable','Carry the tiny voltage to the receiver with some loss','#73bdfc','noise'],
    ['filter','RF preselection','Reject out-of-band interference before mixing','#b5a5fb','filter'],
    ['amplifier','Low-noise gain','Increase level without burying the code in added noise','#ffd28a','noise'],
    ['mixer','Frequency mixer','1575.42 − 1527.68 = 47.74 MHz IF','#6ee1da','mixer'],
    ['filter','IF selection & gain','Retain useful difference-frequency energy','#85b4fd','filter'],
    ['filter','Final band limit','Example 6 MHz band centred at 47.74 MHz','#caa4ff','filter'],
    ['samples','Analog-to-digital converter','38.192 MS/s → digital IF centred at 9.548 MHz','#ffd08c','quantization']
  ];
  return '<div role="group" aria-label="Eight-stage GNSS radio front end" class="receiver-flow">'+
    stages.map((s,i)=>feFlowNode(i+1,...s)).join('')+
    '</div><div class="flow-legend"><span>RF input · 1575.42 MHz</span><span>Analog IF · 47.74 MHz</span><span>Digital IF · 9.548 MHz</span></div>'+
    '<div class="receiver-route"><div class="route-heading">'+vglIcon('clock')+'The shared clock and synthesizer</div>'+
    '<div class="route-steps">'+
    '<div class="route-step"><small>REFERENCE</small><strong>10 MHz oscillator</strong><span>One stable timing reference</span></div>'+
    '<div class="route-step"><small>SYNTHESIZE</small><strong>1527.68 MHz local oscillator</strong><span>Used for frequency translation</span></div>'+
    '<div class="route-step"><small>DIVIDE BY 40</small><strong>38.192 MHz sampling clock</strong><span>Sets the sample timing and sample rate</span></div></div></div>'+
    '<p class="flow-caption">Illustrative single-conversion GPS L1 example from the supplied lecture. Select any stage to study its role. Clock and frequency numbers describe this example, not every GNSS receiver.</p>';
}
function feMixDiagram(){
  return '<div role="group" class="receiver-flow flow-three" aria-label="Mixer creates sum and difference frequencies">'+
    feFlowNode(1,'wave','Incoming RF','GNSS L1 signal: 1575.42 MHz','#68edd4')+
    feFlowNode(2,'mixer','Multiply by local oscillator','Local oscillator: 1527.68 MHz','#88bafd')+
    feFlowNode(3,'filter','Select difference frequency','Useful intermediate band: 47.74 MHz','#ffd28a')+
    '</div><div class="receiver-route"><div class="route-heading">'+vglIcon('mixer')+'Two output frequencies appear after multiplication</div>'+
    '<div class="route-steps">'+
    '<div class="route-step"><small>DIFFERENCE · KEEP</small><strong>47.74 MHz</strong><span>1575.42 − 1527.68</span></div>'+
    '<div class="route-step"><small>SUM · REJECT</small><strong>3103.10 MHz</strong><span>1575.42 + 1527.68</span></div>'+
    '<div class="route-step"><small>DESIGN REQUIREMENT</small><strong>Filter the outputs</strong><span>Suppress unwanted mixing products; reject RF image bands before mixing</span></div>'+
    '</div></div><p class="flow-caption">A frequency mixer translates a band. It does not identify the PRN, remove the code, or perform acquisition.</p>';
}
function feGainDiagram(){
  return '<div role="group" class="receiver-flow" aria-label="Automatic gain control around the converter">'+
    feFlowNode(1,'wave','Analog input','Filtered signal plus receiver noise','#6de6d4')+
    feFlowNode(2,'amplifier','Variable gain','Scale voltage to fit the ADC','#82b6ff')+
    feFlowNode(3,'samples','ADC','Convert voltage to finite digital levels','#c7a5ff')+
    feFlowNode(4,'target','Measure distribution','Estimate clipping and level occupancy','#ffd28a')+
    '</div><div class="feedback-loop-note">'+vglIcon('loop')+
    ' <strong>Feedback:</strong> Sample statistics guide the gain controller, which adjusts the variable-gain amplifier. The goal is useful converter headroom—not the recovery of information already lost.</div>';
}
document.addEventListener('DOMContentLoaded',()=>{
  const patches={
    chain:feSignalChain(),
    mixer:feMixDiagram(),
    quantization:feGainDiagram()
  };
  for(const [lesson,html] of Object.entries(patches)){
    const container=document.querySelector('[data-fe-panel="'+lesson+'"] .fe-diagram-scroll');
    if(container)container.outerHTML='<div class="fe-illustrated-diagram">'+html+'</div>';
  }
  document.querySelectorAll('[data-flow-target]').forEach(node=>{
    node.addEventListener('click',()=>{
      showLesson(node.dataset.flowTarget);
      document.getElementById('front-end-main')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});
