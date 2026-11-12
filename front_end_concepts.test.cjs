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
  assert.equal(c.primary[section].length,8);const html=c.render(section);assert.ok(html.includes('Concepts Used in This Section'));assert.ok(html.includes('Additional Definitions'));
  assert.ok(c.mathHelp(section).includes('id="fe-section-symbols"'));assert.ok(c.symbolSets[section].length>=3);
 }
});
test('point-of-use links escape markup, respect acronym case and do not duplicate first mentions',()=>{
 c.setSection(4);let html=c.text('If power gain is 20 dB and the input is -130 dBm, IF stays unchanged.');
 assert.ok(html.startsWith('If '));assert.ok(html.includes('data-concept="dB"'));assert.ok(html.includes('data-concept="dBm"'));assert.ok(html.includes('data-concept="IF"'));
 assert.equal((c.text('dBm again').match(/data-concept/g)||[]).length,0);
 c.setSection(4);html=c.text('<script>alert(1)</script> gain');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 c.setSection(0);assert.ok(c.text('Radio Frequency (RF)').includes('data-concept="RF"'));
});
test('key section definitions are short and preserve the supplied academic section structure',()=>{
 assert.equal(ctx.window.FE_LESSONS.length,10);
 for(const lesson of ctx.window.FE_LESSONS)assert.ok(lesson.definition.split(/\s+/).length<=25,lesson.definition);
 for(const name of ['public/front_end.html','public/front-end/index.html']){const html=fs.readFileSync(name,'utf8');assert.ok(html.indexOf('/front_end_concepts.js')<html.indexOf('/front_end_lecture_view.js'));}
});
