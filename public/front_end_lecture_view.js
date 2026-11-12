/* Render the supplied lecture with consistent academic labels and native formulas. */
(function(root){
'use strict';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=value=>root.FE_CONCEPTS.text(value).replace(/\\\((.*?)\\\)/g,(_,s)=>'<span class="fe-inline-math">'+s.replace(/\\mathrm\{([^}]+)\}/g,'$1').replace(/[{}]/g,'')+'</span>');
function interpretation(value){return value
 .replace(/(^|[.!?]\s+)(Show|Display) /g,'$1The visual representation depicts ')
 .replace(/^Use /,'The illustration uses ')
 .replace(/^Compare /,'The comparison considers ')
 .replace(/^Label /,'Labels identify ')
 .replace(/^Emphasize /,'The interpretation emphasizes ')
 .replace(/^Explain that /,'The interpretation is that ')
 .replace(/Do not display digital samples or a data file at this stage\./,'Digital samples and data files belong after ADC processing.')
 .replace(/Place the three chip values directly above the waveform\./,'The chip values identify the corresponding waveform intervals.');}
function renderBlocks(blocks){let html='',i=0;while(i<blocks.length){const b=blocks[i];
 if(b.type==='formula'){html+='<div class="fe-equation">'+b.html+'</div>';i++;continue;}
 if(b.type==='heading'&&b.text==='Visual example'){
  let notes='';i++;while(i<blocks.length&&blocks[i].type!=='heading'){const item=blocks[i++];notes+=item.type==='formula'?'<div class="fe-equation">'+item.html+'</div>':'<p>'+text(interpretation(item.text||''))+'</p>';}
  html+='<details class="fe-worked"><summary>Visual Interpretation</summary><div class="fe-worked-body">'+notes+'</div></details>';continue;
 }
 if(b.type==='heading')html+='<h4>'+text(b.text)+'</h4>';
 else if(b.type==='table')html+='<div class="fe-table-wrap"><table><thead><tr>'+b.rows[0].map(cell=>'<th>'+text(cell)+'</th>').join('')+'</tr></thead><tbody>'+b.rows.slice(1).map(row=>'<tr>'+row.map(cell=>'<td>'+text(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 else if(b.type==='bullet'||b.type==='numbered'){const kind=b.type,tag=kind==='numbered'?'ol':'ul';html+='<'+tag+'>';while(i<blocks.length&&blocks[i].type===kind)html+='<li>'+text(blocks[i++].text)+'</li>';html+='</'+tag+'>';continue;}
 else html+='<p>'+text(b.text)+'</p>';
 i++;
}return html;}
function topics(index){const section=root.FE_LECTURE.sections[index],first=section.slides[0].number,last=section.slides.at(-1).number;return '<section class="card fe-card"><div class="card-head"><h3>Lecture Topics</h3></div><div class="fe-prose"><p>Section '+section.number+' &middot; Slides '+String(first).padStart(2,'0')+' to '+String(last).padStart(2,'0')+'. Definitions, equations and worked examples follow the supplied lecture.</p>'+section.slides.map(slide=>'<details class="fe-worked" data-lecture-slide="'+slide.number+'"><summary>'+String(slide.number).padStart(2,'0')+' &middot; '+esc(slide.title)+'</summary><div class="fe-worked-body">'+(slide.blocks.some(block=>block.type==='formula')?'<p><a href="#fe-section-symbols" data-symbol-reference>Read the symbols and units used in these equations</a></p>':'')+renderBlocks(slide.blocks)+'</div></details>').join('')+'</div></section>';}
const suppliedTerms={...Object.fromEntries(root.FE_LECTURE.sections.flatMap(section=>section.glossary)),...root.FE_FOUNDATIONS.terms,...root.FE_CONCEPTS.glossary};
const terms=Object.fromEntries(Object.entries(suppliedTerms).map(([term,meaning])=>{const key=root.FE_CONCEPTS.lookup(term)||term;return [key,root.FE_CONCEPTS.definitions[key]?.definition||meaning];}));
function exampleMath(index){
 const selected={0:[8],2:[16],3:[19,20],4:[23,25],5:[30,31],6:[38],7:[42,43,45,48],8:[53,54]}[index]||[];
 let formulas=root.FE_LECTURE.sections[index].slides.filter(slide=>selected.includes(slide.number)).flatMap(slide=>slide.blocks.filter(block=>block.type==='formula'));
 if(index===5)formulas=formulas.filter(block=>block.latex.includes('boxed')||block.latex.includes('40'));
 if(index===7)formulas=formulas.filter(block=>block.latex.includes('approx')||block.latex.includes('boxed')||block.latex==='2^4=16');
 return formulas.length?'<div class="fe-example-equations">'+formulas.map(block=>'<div class="fe-equation">'+block.html+'</div>').join('')+'</div>':'<div class="fe-equation">'+esc(root.FE_LESSONS[index].equation)+'</div>';
}
function glossary(index){let list=root.FE_LECTURE.sections[index].glossary;if(!list.length)list=Object.entries(terms).filter(([term])=>['Radio Frequency (RF)','ADC','IF','Digital IF','Sampling','Quantization','Time Domain','Frequency Domain'].includes(term));return '<section class="fe-definitions"><div class="fe-definition-heading"><h3>Section Glossary</h3></div><dl>'+list.map(([term,meaning])=>'<div><dt>'+esc(term)+'</dt><dd>'+esc(terms[root.FE_CONCEPTS.lookup(term)||term]||meaning)+'</dd></div>').join('')+'</dl></section><details class="fe-worked"><summary>Complete Front-End Glossary</summary><div class="fe-worked-body"><div class="fe-controls"><label>Search terminology<input type="search" id="glossary-search" placeholder="Search amplitude, sampling or noise figure" aria-controls="glossary-results"></label></div><p id="glossary-count" role="status"></p><div class="fe-definitions" id="glossary-results"></div></div></details>';}
function bind(){const input=document.getElementById('glossary-search');if(!input)return;const update=()=>{const q=input.value.trim().toLowerCase(),list=Object.entries(terms).filter(([term,meaning])=>(term+' '+meaning+' '+(root.FE_CONCEPTS.definitions[term]?.aliases||[]).join(' ')).toLowerCase().includes(q)).sort(([a],[b])=>a.localeCompare(b));document.getElementById('glossary-count').textContent=list.length+' matching terms';document.getElementById('glossary-results').innerHTML=list.length?'<dl>'+list.map(([term,meaning])=>'<div><dt>'+esc(term)+'</dt><dd>'+esc(terms[root.FE_CONCEPTS.lookup(term)||term]||meaning)+'</dd></div>').join('')+'</dl>':'<p>No matching terms. Try another word.</p>';};input.oninput=update;update();}
root.FE_LECTURE_VIEW={topics,glossary,bind,exampleMath};
})(window);
