'use strict';
/*
 * Tracking Studio: visual explanations of synchronization loops.
 * All original interactive plots, formulas and lesson data are preserved.
 */
const trackingTone=['#ffc78d','#73dfd6','#aaabff','#f296b0'];
function trFlowNode(i,label,description,icon,term,color){
  const interactive=term&&glossary[term];
  return '<div class="flow-node" style="--flow-color:'+(color||trackingTone[i%4])+'"'+
    (interactive?' role="button" tabindex="0" data-term="'+term+'" aria-label="Explain '+term+'"':'')+'>'+
    '<span class="flow-icon">'+vglIcon(icon||vglKind(label))+'</span>'+
    '<span class="flow-count">STEP '+String(i+1).padStart(2,'0')+'</span>'+
    '<b>'+label+'</b><small>'+description+'</small></div>';
}
function trFlow(nodes,caption,extraClass){
  return '<div class="receiver-flow '+(extraClass||'')+'" role="group" aria-label="'+caption+'">'+
    nodes.map((n,i)=>trFlowNode(i,...n)).join('')+'</div>'+
    '<p class="flow-caption">'+caption+'</p>';
}
diagram=function(nodes,feedback=false){
  const known={
    'Satellite':['Transmits the ranging code and carrier','satellite','Satellite'],
    'Radio-frequency front end':['Filters, translates and digitizes the radio wave','antenna','Radio-frequency front end'],
    'Acquisition':['Finds approximate code delay and Doppler','search','Acquisition'],
    'Tracking':['Updates local code and carrier continuously','loop','Tracking'],
    'Navigation decoding':['Extracts synchronized navigation information','book','Navigation decoding'],
    'Observables':['Forms code timing and phase measurements','samples','Observables'],
    'Position':['Uses measurements from multiple satellites','target','Position'],
    'Numerically controlled oscillator':['Adjustable local generator used next iteration','chip','Numerically controlled oscillator'],
    'Correlation':['Compares samples to local replicas','code','Correlation'],
    'Discriminator':['Turns comparisons into a signed error','target','Discriminator'],
    'Loop filter':['Smooths corrections and limits noise response','filter','Loop filter'],
    'Carrier wipe-off':['Removes the fast carrier by local mixing','wave','Carrier wipe-off'],
    'Code wipe-off':['Cancels the matched spreading-code signs','code','Code wipe-off'],
    'Integration interval':['Accumulates products over one processing block','clock','Integration interval'],
    'Navigation data':['Remaining slow data-symbol polarity','book','Navigation data']
  };
  const items=nodes.map(n=>{
    const r=known[n]||['Processing stage','chip',n];
    return [n,r[0],r[1],r[2]];
  });
  return trFlow(items,
    feedback
      ?'Follow the direction of the measurements. The resulting oscillator setting feeds the next iteration: compare → error → smooth → adjust → repeat.'
      :'Read from left to right. Each box shows the purpose of that stage; select a concept to see its definition.',
    nodes.length===2?'flow-two':nodes.length===3?'flow-three':''
  )+(feedback?'<div class="feedback-loop-note">'+vglIcon('loop')+
    ' <strong>This is a feedback loop:</strong> The oscillator does not fix an old sample. Its updated replica is compared with the next incoming block.</div>':'')+
    '<div id="block-inspector" class="tr-inspect"><h4>Explore the blocks</h4><p>Select a box to inspect its exact purpose. A tracking loop continually reuses the new estimate.</p></div>';
};

carrierDiagram=function(){
  return '<div class="feedback-lanes" aria-label="Two carrier correlations feeding a shared Costas correction">'+
    '<div class="feedback-track carrier-track"><h4>'+vglIcon('wave')+' In-phase path · I</h4>'+
    '<p>Multiply the code-wiped samples by the local <strong>cosine</strong>. Integrate to measure the signal along the I axis.</p>'+
    '<div class="receiver-flow flow-two">'+
    trFlowNode(0,'Cosine mixer','Compare against local cosine','wave','Carrier wipe-off','#ffc78d')+
    trFlowNode(1,'Prompt I','Accumulated in-phase correlation','samples','In-phase component','#7cddd6')+
    '</div></div>'+
    '<div class="feedback-track code-track"><h4>'+vglIcon('phase')+' Quadrature path · Q</h4>'+
    '<p>Multiply the same samples by a carrier shifted <strong>90°</strong>. Integrate to measure the Q coordinate.</p>'+
    '<div class="receiver-flow flow-two">'+
    trFlowNode(0,'Quadrature mixer','Compare against local sine','wave','Carrier wipe-off','#8bb8ff')+
    trFlowNode(1,'Prompt Q','Accumulated quadrature correlation','samples','Quadrature component','#aa9afa')+
    '</div></div></div>'+
    '<div class="receiver-route"><div class="route-heading">'+vglIcon('loop')+'Both paths feed one correction</div>'+
    '<div class="route-steps">'+
    '<div class="route-step"><small>READ THE ERROR</small><strong>Costas discriminator</strong><span>Combine I and Q to determine residual carrier-phase error despite data polarity.</span></div>'+
    '<div class="route-step"><small>SMOOTH</small><strong>Loop filter</strong><span>Reduce noisy commands and control how quickly the loop responds.</span></div>'+
    '<div class="route-step"><small>FEEDBACK</small><strong>Carrier NCO</strong><span>Update local cosine and sine replicas for the next samples.</span></div>'+
    '</div></div>'+
    '<div id="block-inspector" class="tr-inspect"><h4>Follow the correction</h4><p>Select one of the I/Q blocks to connect the physical comparison with its formal definition.</p></div>';
};
replicaDiagram=function(){
  return trFlow([
    ['Early · E','Local code a little before the estimated timing','code','Early','#ffc584'],
    ['Prompt · P','Local code at the current timing estimate','target','Prompt','#76e1d9'],
    ['Late · L','Local code a little after the estimate','code','Late','#bc9eff']
  ],'One satellite code, copied three times with slightly different delays. The receiver compares all three against the same incoming samples.','flow-three')+
  '<div id="block-inspector" class="tr-inspect"><h4>Three timing probes</h4><p>Early looks to one side of the estimated peak; Late looks to the other; Prompt measures its centre.</p></div>';
};
sixCorrelatorDiagram=function(){
  const row=(axis,color,term)=>{
    return '<div class="feedback-track '+(axis==='I'?'carrier-track':'code-track')+'">'+
      '<h4>'+vglIcon('phase')+' '+(axis==='I'?'In-phase':'Quadrature')+' branch · '+axis+'</h4>'+
      '<p>After carrier wipe-off, correlate the '+axis+' samples with each of the same three local code replicas.</p>'+
      '<div class="receiver-flow flow-three">'+
      ['Early','Prompt','Late'].map((label,i)=>trFlowNode(i,axis+' '+label,
        axis+' × '+label+' replica → integrate', 'code',label,
        ['#ffc584','#75e0d6','#bb9eff'][i])).join('')+
      '</div></div>';
  };
  return '<div class="feedback-lanes" aria-label="Six correlations from two components and three code delays">'+
    row('I')+row('Q')+'</div>'+
    '<div class="feedback-loop-note">'+vglIcon('chip')+
    ' <strong>Remember the count:</strong> 2 carrier coordinates × 3 code delays = 6 correlation values.'+
    ' The Costas loop mainly uses Prompt I and Q; the code loop compares Early and Late correlation magnitudes.</div>'+
    '<div id="block-inspector" class="tr-inspect"><h4>Why six measurements?</h4><p>The two carrier coordinates share three time-shifted replicas. Select Early, Prompt, or Late to inspect the meaning of each timing probe.</p></div>';
};
combined=function(){
  return '<div class="feedback-lanes" aria-label="Shared tracking channel divided into carrier and code feedback">'+
    '<div class="feedback-track carrier-track"><h4>'+vglIcon('phase')+' Carrier feedback · Costas / PLL</h4>'+
    '<p>Keep the local carrier aligned in frequency and phase.</p>'+
    trFlow([
      ['Prompt I/Q','Read carrier phase from central correlations','phase','In-phase component','#ffca89'],
      ['Phase discriminator','Estimate phase mismatch while ignoring data sign','target','Costas loop','#f7a0a3'],
      ['Carrier filter','Smooth the phase/frequency correction','filter','Loop filter','#b99fff'],
      ['Carrier NCO','Adjust the local cosine and sine','chip','Numerically controlled oscillator','#7bded7']
    ],'The carrier oscillator returns a corrected local carrier to the next correlation.')+
    '</div><div class="feedback-track code-track"><h4>'+vglIcon('code')+' Code feedback · DLL</h4>'+
    '<p>Keep the local spreading code centred on its correlation peak.</p>'+
    trFlow([
      ['Early & Late','Probe both sides of the estimated peak','code','Early','#73ded6'],
      ['Code discriminator','Compare the powers to infer a signed delay error','target','Delay-locked loop','#8daefd'],
      ['Code filter','Smooth the timing correction','filter','Loop filter','#c6a7ff'],
      ['Code NCO','Move all three code replicas together','chip','Numerically controlled oscillator','#ffc789']
    ],'The code oscillator returns corrected Early, Prompt and Late timing to the next correlation.')+
    '</div></div>'+
    '<div class="feedback-loop-note">'+vglIcon('loop')+
    ' <strong>Shared information:</strong> Both loops use the same incoming samples and correlator bank. Carrier alignment supports coherent code correlation; code alignment strengthens the Prompt carrier measurements.</div>'+
    '<div id="block-inspector" class="tr-inspect"><h4>One channel, two coordinated corrections</h4><p>Select a block above to inspect the formal term and its purpose.</p></div>';
};
const existingCostas=newCostasLesson;
newCostasLesson=function(){
  return '<section class="tr-card"><h3>'+vglIcon('target')+' Start here: the Costas loop in plain language</h3>'+
    '<p><strong>A Costas loop is the receiver’s automatic carrier tuner.</strong> It continually compares a local wave with the incoming wave, measures their phase mismatch, and turns its local oscillator to stay aligned. Crucially, a navigation data bit can flip the signal without fooling the tuner.</p>'+
    '<div class="costas-key">'+
    '<div><span>Problem 01</span><b>The carrier drifts</b><p>Satellite motion and receiver clocks make a once-correct phase/frequency estimate become stale.</p></div>'+
    '<div><span>Our measurement</span><b>Two coordinates: I + Q</b><p>The in-phase and quadrature correlations reveal the direction of a small phase mismatch.</p></div>'+
    '<div><span>The clever part</span><b>Ignore data sign reversals</b><p>A bit reversal changes both I and Q signs. The Costas phase estimate remains equivalent modulo 180°.</p></div>'+
    '</div><div class="feedback-loop-note">'+vglIcon('loop')+
    ' <strong>One cycle:</strong> Measure I and Q → compute phase error → filter correction → adjust carrier generator → measure again.</div></section>'+
    existingCostas();
};
const originalEnhanceTracking=enhanceTracking;
enhanceTracking=function(id){
  originalEnhanceTracking(id);
  const chapter=TRACKING_CHAPTERS.find(c=>c.ids.includes(active));
  const chapterIndex=TRACKING_CHAPTERS.indexOf(chapter);
  const heading=tq('lesson').querySelector('h2');
  if(heading){
    heading.insertAdjacentHTML('beforebegin',
      '<div class="chapter-context">'+vglIcon(chapter.icon)+'<span><strong>Chapter '+(chapterIndex+1)+' of '+TRACKING_CHAPTERS.length+'</strong> · '+chapter.title+'</span></div>');
    const outcome=heading.nextElementSibling;
    const roadmap={
      0:['Understand the receiver goal','Recognize the initial estimates','See why tracking must keep updating'],
      1:['Remove the known modulation','Read a feedback loop','Observe repeated corrections'],
      2:['Read I and Q','Correct carrier phase with Costas','Tune bandwidth and damping'],
      3:['Locate the code peak','Compare Early and Late','Drive the DLL correction'],
      4:['Recognize multipath bias','Combine both feedback loops','Contrast acquisition and tracking'],
      5:['Calculate a result','Read tracking evidence','Review key definitions']
    }[chapterIndex];
    if(outcome?.classList.contains('learning-brief')){
      outcome.insertAdjacentHTML('afterend',
        '<div class="receiver-route"><div class="route-heading">'+vglIcon(chapter.icon)+'Your route through this chapter</div>'+
        '<div class="route-steps">'+roadmap.map((step,i)=>
          '<div class="route-step"><small>STAGE '+(i+1)+'</small><strong>'+step+'</strong></div>').join('')+
        '</div></div>');
    }
  }
};
// Re-render the initially selected lesson with the redesigned diagrams.
show(active);
