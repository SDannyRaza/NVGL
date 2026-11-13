const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const ctx={window:{}};for(const name of ['front_end_lecture.js','front_end_academic.js','front_end_concepts.js'])vm.runInNewContext(fs.readFileSync('public/'+name,'utf8'),ctx);
const c=ctx.window.FE_CONCEPTS;
test('every term in the supplied section glossaries has an explicit concise definition',()=>{
 for(const section of ctx.window.FE_LECTURE.sections)for(const [term] of section.glossary){const key=c.lookup(term);assert.ok(key,'Missing definition: '+term);assert.ok(c.definitions[key].definition.length>15);}
 for(const item of Object.values(c.definitions))assert.ok(item.definition.split(/\s+/).length<=32,item.definition);
});
test('all ten sections have essential definitions, supplemental terms and local symbol guides',()=>{
 for(let section=0;section<10;section++){
  const keys=Array.from(c.sectionKeys(section));assert.equal(new Set(keys).size,keys.length);
  for(const key of keys)assert.ok(c.definitions[key],key);
  assert.ok(c.primary[section].length>=6&&c.primary[section].length<=10);const html=c.render(section);assert.ok(html.includes('Concepts Used in This Section'));assert.ok(html.includes('Supporting Terms'));
  assert.ok(c.mathHelp(section).includes('id="fe-section-symbols"'));assert.ok(c.symbolSets[section].length>=3);
 }
});
test('point-of-use links escape markup, respect acronym case and do not duplicate first mentions',()=>{
 c.setSection(4);let html=c.text('If power gain is 20 dB and the input is -130 dBm, IF stays unchanged.');
 assert.ok(html.startsWith('If '));assert.ok(html.includes('data-concept="dB"'));assert.ok(html.includes('data-concept="dBm"'));assert.ok(!html.includes('data-concept="IF"'));
 c.setSection(5);assert.ok(c.text('If RF is mixed to IF, the IF filter selects the output.').startsWith('If '));
 assert.equal((c.text('dBm again').match(/data-concept/g)||[]).length,0);
 c.setSection(4);html=c.text('<script>alert(1)</script> gain');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 c.setSection(0);assert.ok(c.text('Radio Frequency (RF)').includes('data-concept="RF"'));
});
test('key section definitions are short and preserve the supplied academic section structure',()=>{
 assert.equal(ctx.window.FE_LESSONS.length,10);
 for(const lesson of ctx.window.FE_LESSONS)assert.ok(lesson.definition.split(/\s+/).length<=25,lesson.definition);
 for(const name of ['public/front_end.html','public/front-end/index.html']){const html=fs.readFileSync(name,'utf8');assert.ok(html.indexOf('/front_end_concepts.js')<html.indexOf('/front_end_lecture_view.js'));}
});


test('local vocabularies exclude unrelated processing and file concepts',()=>{
 const has=(section,key)=>c.sectionKeys(section).includes(key);
 for(const section of [0,2,3,4,5,6])for(const key of ['CU8','Interleaved','GNSS-SDR','Histogram','Quantization Bin'])assert.equal(has(section,key),false,section+': '+key);
 for(const section of [0,2,3,4,5,6])assert.equal(has(section,'ADC'),false,section+': unrelated ADC definition');
 for(const section of [0,1,2,3,4,5,6])assert.equal(has(section,'Bit Depth'),false,section+': unrelated bit-depth definition');
 assert.equal(has(2,'Sampling'),false);assert.equal(has(2,'Aliasing'),false);
 assert.equal(has(3,'Mixer'),false);assert.equal(has(3,'Local Oscillator'),false);
 for(const key of ['Downconversion','Mixer','Local Oscillator','IF Filter'])assert.equal(has(5,key),true,key);
 for(const key of ['Sampling','Aliasing','Nyquist Frequency','Nyquist Rate','Quantization'])assert.equal(has(7,key),true,key);
 for(const key of ['Raw I/Q','CU8','Interleaved','GNSS-SDR'])assert.equal(has(9,key),true,key);
});

test('the complete glossary remains available independently of section scope',()=>{
 for(const key of ['ADC','Sampling','Raw I/Q','CU8','GNSS-SDR','Downconversion','Electromagnetic Spectrum'])assert.ok(c.glossary[key],key);
 c.setSection(2);assert.ok(!c.text('The ADC writes CU8 samples.').includes('data-concept'));
 c.setSection(9);assert.ok(c.text('CU8 interleaved I/Q').includes('data-concept="CU8"'));
});


test('every generated point-of-use link resolves inside the current section',()=>{
 const vocabulary=Object.keys(c.definitions).join('; ');
 for(let section=0;section<10;section++){
  c.setSection(section);const linked=c.text(vocabulary),local=c.render(section);
  for(const [,target] of linked.matchAll(/href="#([^"]+)"/g))assert.ok(local.includes('id="'+target+'"'),section+': '+target);
 }
});


test('Front End vocabulary excludes downstream acquisition and navigation processing',()=>{
 for(let section=0;section<10;section++)for(const key of ['Acquisition','Tracking','PVT','Correlation','Multi-Channel'])assert.ok(!c.sectionKeys(section).includes(key),section+': '+key);
 for(const key of ['Acquisition','Tracking','PVT','Correlation','Multi-Channel'])assert.equal(c.glossary[key],undefined,key);
});
