const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const test=require('node:test');const {execFileSync}=require('node:child_process');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('public/front_end_lecture.js','utf8'),ctx);vm.runInNewContext(fs.readFileSync('public/front_end_academic.js','utf8'),ctx);
const lecture=ctx.window.FE_LECTURE,lessons=ctx.window.FE_LESSONS;
test('the academic sequence preserves all ten supplied sections and all 61 slide titles',()=>{
 const source=fs.readFileSync('docs/front_end_lecture.txt','utf8').replace(/(?<!\n)(Slide \d{2} \u2014)/g,'\n$1');
 const expected=[...source.matchAll(/^Slide (\d{2}) \u2014 (.+)$/gm)].map(m=>[Number(m[1]),m[2].trim()]);
 const actual=lecture.sections.flatMap(s=>s.slides.map(slide=>[slide.number,slide.title]));
 assert.equal(lecture.sections.length,10);assert.equal(lessons.length,10);assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);assert.equal(actual.length,61);
 for(let i=0;i<10;i++)assert.equal(lessons[i].title,lecture.sections[i].title);
 assert.deepEqual(Array.from(lessons.slice(0,7),l=>l.stage),[0,0,0,1,2,3,4]);
 assert.equal(lessons[7].stage,5);assert.equal(lessons[8].stage,6);
 assert.ok(lecture.sections[7].glossary.some(([term])=>term==='Quantization'));
});
test('all source formulas are locally rendered as well-formed native MathML',()=>{
 const script=`import json,xml.etree.ElementTree as E
from pathlib import Path
s=Path('public/front_end_lecture.js').read_text(encoding='utf-8')
data=json.loads(s[s.index('window.FE_LECTURE=')+len('window.FE_LECTURE='):].strip().removesuffix(';'))
n=0
for section in data['sections']:
 for slide in section['slides']:
  for block in slide['blocks']:
   if block['type']=='formula':
    root=E.fromstring(block['html']);assert root.tag.endswith('math');n+=1
assert n==57,n
print('57 MathML formulas verified')`;
 assert.match(execFileSync(process.platform==='win32'?'python':'python3',['-c',script],{encoding:'utf8'}),/57 MathML/);
});
test('RF passband, IF conditioning and ADC terminology follow the supplied reference',()=>{
 assert.match(lessons[3].change,/50 MHz 3-dB/);assert.match(lessons[3].example,/1550\.42.*1600\.42/);
 assert.match(lessons[6].change,/18 MHz.*50 dB.*6 MHz/);
 assert.match(lessons[7].example,/26\.18 ns.*19\.096 MHz.*9\.548 MHz/);
 assert.match(lessons[8].change,/four-bit.*38\.192.*9\.548/);
 const js=fs.readFileSync('public/front_end.js','utf8');assert.ok(js.includes('Sampling and quantization occur in the ADC'));
 assert.ok(js.includes('Supplementary Laboratory: Raw I/Q'));assert.ok(js.includes('Histogram total:'));
});
