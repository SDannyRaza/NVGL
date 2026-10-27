'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'public');
const source=fs.readFileSync(path.join(root,'prn_core.js'),'utf8');
const context={module:{exports:{}},exports:{},console};
vm.createContext(context);vm.runInContext(source,context,{filename:'prn_core.js'});
const P=context.module.exports;
function assert(c,m){if(!c)throw new Error(m)}
function gal(file,prn,len){const txt=fs.readFileSync(path.join(root,'reference','icd','galileo_codes',file),'utf8');const tag=String(prn).padStart(2,'0');const line=txt.split(/\r?\n/).find(x=>x.includes(`Code_No_${tag};`));assert(line,`Missing Galileo ${file} code ${tag}`);return P.hexToBits(line.split(';')[1].trim(),len)}
const sats={G:[3,4,7,8,9,14,16,21,26,27,30],E:[5,6,9,16,18,25,31],C:[7,8,9,10,12,19,20,22,27,32,37],J:[194,196,199,200],S:[128,129,137]};
let checks=0;
for(const n of sats.G){const ca=P.gpsCA(n);assert(ca.bits.length===1023,`GPS ${n} C/A length`);assert(P.verifyFirst10(ca),`GPS ${n} C/A first-10 ICD check`);assert(P.gpsL2(n,'CM').bits.length===10230,`GPS ${n} L2CM`);assert(P.gpsL2(n,'CL').bits.length===767250,`GPS ${n} L2CL`);checks+=4}
for(const n of sats.C){const b=P.beidou(n);assert(b.bits.length===2046,`BDS ${n}`);checks++}
assert(new Set(sats.C.map(n=>P.fingerprint(P.beidou(n).bits))).size===sats.C.length,'BeiDou observed PRNs must be distinct');checks++;
for(const n of sats.J){const ca=P.qzssCA(n);assert(P.verifyFirst10(ca),`QZSS ${n} C/A first-10`);assert(P.qzssL2(n,'CM').bits.length===10230,`QZSS ${n} CM`);assert(P.qzssL2(n,'CL').bits.length===767250,`QZSS ${n} CL`);checks+=3}
for(const n of sats.S){const ca=P.sbasCA(n);assert(P.verifyFirst10(ca),`SBAS ${n}`);checks++}
const glo=P.glonass();assert(glo.bits.length===511,'GLONASS length');assert(glo.bits.reduce((a,b)=>a+b,0)===256,'GLONASS maximal sequence balance');checks+=2;
for(const n of sats.E){for(const [f,l] of [['C7_E1B.txt',4092],['C8_E1C.txt',4092],['C5_E5bI.txt',10230],['C6_E5bQ.txt',10230]]){const b=gal(f,n,l);assert(b.length===l,`Galileo E${n} ${f}`);checks++}}
const state=P.l2Generate('742417664',10229);assert(P.octalState(state.state)==='552566002','GPS L2CM PRN1 ICD end-state check');checks++;
const regression=[P.gpsCA(3).bits,gal('C7_E1B.txt',5,4092),P.beidou(7).bits,P.glonass().bits,P.qzssCA(194).bits,P.sbasCA(128).bits,P.gpsCA(4).bits].map(P.fingerprint);
for(let i=1;i<regression.length;i++)assert(regression[i]!==regression[i-1],`Stale PRN fingerprint at switch ${i}`);checks+=regression.length-1;
console.log(`GNSS ICD PRN verification passed: ${checks} checks across GPS, Galileo, BeiDou, GLONASS, QZSS and SBAS.`);
