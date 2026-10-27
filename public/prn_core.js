'use strict';
(function(root){
  const GPS_CA_TAPS={1:[2,6],2:[3,7],3:[4,8],4:[5,9],5:[1,9],6:[2,10],7:[1,8],8:[2,9],9:[3,10],10:[2,3],11:[3,4],12:[5,6],13:[6,7],14:[7,8],15:[8,9],16:[9,10],17:[1,4],18:[2,5],19:[3,6],20:[4,7],21:[5,8],22:[6,9],23:[1,3],24:[4,6],25:[5,7],26:[6,8],27:[7,9],28:[8,10],29:[1,6],30:[2,7],31:[3,8],32:[4,9]};
  const GPS_CA_FIRST10={1:'1440',2:'1620',3:'1710',4:'1744',5:'1133',6:'1455',7:'1131',8:'1454',9:'1626',10:'1504',11:'1642',12:'1750',13:'1764',14:'1772',15:'1775',16:'1776',17:'1156',18:'1467',19:'1633',20:'1715',21:'1746',22:'1763',23:'1063',24:'1706',25:'1743',26:'1761',27:'1770',28:'1774',29:'1127',30:'1453',31:'1625',32:'1712'};
  const GPS_L2_CM=['','742417664','756014035','002747144','066265724','601403471','703232733','124510070','617316361','047541621','733031046','713512145','024437606','021264003','230655351','001314400','222021506','540264026','205521705','064022144','120161274','044023533','724744327','045743577','741201660','700274134','010247261','713433445','737324162','311627434','710452007','722462133','050172213'];
  const GPS_L2_CL=['','624145772','506610362','220360016','710406104','001143345','053023326','652521276','206124777','015563374','561522076','023163525','117776450','606516355','003037343','046515565','671511621','605402220','002576207','525163451','266527765','006760703','501474556','743747443','615534726','763621420','720727474','700521043','222567263','132765304','746332245','102300466','255231716'];
  const GPS_L2_CM_END={1:'552566002'};
  const QZSS_CA={193:['1050','0727'],194:['1607','0170'],195:['1747','0030'],196:['1305','0472'],197:['0540','1237'],198:['1363','0414'],199:['0727','1050'],200:['0147','1630'],201:['1206','0571'],202:['1045','0732']};
  const QZSS_L2={
    193:['204244652','235525312'],194:['202133131','507056307'],195:['714351204','221720061'],196:['657127260','520470122'],197:['130567507','603764120'],198:['670517677','145604016'],199:['607275514','051237167'],200:['045413633','033326347'],201:['212645405','534627074'],202:['613700455','645230164']
  };
  const SBAS_CA={
    120:['1106','0671'],121:['1241','0536'],122:['0267','1510'],123:['0232','1545'],124:['1617','0160'],125:['1076','0701'],126:['1764','0013'],127:['0717','1060'],128:['1532','0245'],129:['1250','0527'],130:['0341','1436'],131:['0551','1226'],132:['0520','1257'],133:['1731','0046'],134:['0706','1071'],135:['1216','0561'],136:['0740','1037'],137:['1007','0770'],138:['0450','1327'],139:['0305','1472'],140:['1653','0124'],141:['1411','0366'],142:['1644','0133'],143:['1312','0465'],144:['1060','0717'],145:['1560','0217'],146:['0035','1742'],147:['0355','1422'],148:['0335','1442'],149:['1254','0523'],150:['1041','0736'],151:['0142','1635'],152:['1641','0136'],153:['1504','0273'],154:['0751','1026'],155:['1774','0003'],156:['0107','1670'],157:['1153','0624'],158:['1542','0235']
  };
  const BDS_TAPS={1:[1,3],2:[1,4],3:[1,5],4:[1,6],5:[1,8],6:[1,9],7:[1,10],8:[1,11],9:[2,7],10:[3,4],11:[3,5],12:[3,6],13:[3,8],14:[3,9],15:[3,10],16:[3,11],17:[4,5],18:[4,6],19:[4,8],20:[4,9],21:[4,10],22:[4,11],23:[5,6],24:[5,8],25:[5,9],26:[5,10],27:[5,11],28:[6,8],29:[6,9],30:[6,10],31:[6,11],32:[8,9],33:[8,10],34:[8,11],35:[9,10],36:[9,11],37:[10,11]};

  function specialOctal10(bits){const s=Array.from(bits).slice(0,10).join('');return s[0]+[1,4,7].map(i=>parseInt(s.slice(i,i+3),2).toString(8)).join('');}
  function octalBits(text,n){return parseInt(text,8).toString(2).padStart(n,'0').split('').map(Number);}
  function specialOctalBits(text){const s=String(text).padStart(4,'0');const bits=[Number(s[0])];for(const d of s.slice(1))bits.push(...parseInt(d,8).toString(2).padStart(3,'0').split('').map(Number));return bits;}
  function gpsCA(prn){
    const taps=GPS_CA_TAPS[prn]; if(!taps) throw new Error(`GPS L1 C/A PRN ${prn} is outside the implemented ICD table (1–32).`);
    let g1=Array(10).fill(1),g2=Array(10).fill(1); const out=new Uint8Array(1023);
    for(let i=0;i<1023;i++){
      out[i]=g1[9]^g2[taps[0]-1]^g2[taps[1]-1];
      const f1=g1[2]^g1[9],f2=g2[1]^g2[2]^g2[5]^g2[7]^g2[8]^g2[9];
      g1=[f1,...g1.slice(0,9)]; g2=[f2,...g2.slice(0,9)];
    }
    return {bits:out,totalLength:1023,method:'Gold code · G1/G2 10-stage LFSRs',initial:'G1=G2=1111111111',assignment:`G2 taps ${taps[0]}, ${taps[1]}`,feedback:'G1: x¹⁰+x³+1 · G2: x¹⁰+x⁹+x⁸+x⁶+x³+x²+1',expectedFirst10:GPS_CA_FIRST10[prn]};
  }
  function caFromG2Initial(initial,expected,method){
    let g1=Array(10).fill(1),g2=specialOctalBits(initial); const out=new Uint8Array(1023);
    for(let i=0;i<1023;i++){
      out[i]=g1[0]^g2[0];
      const f1=g1[2]^g1[9],f2=g2[1]^g2[2]^g2[5]^g2[7]^g2[8]^g2[9];
      g1=[...g1.slice(1),f1]; g2=[...g2.slice(1),f2];
    }
    return {bits:out,totalLength:1023,method,initial:`G1=1111111111 · G2=${initial} (octal)`,assignment:'ICD satellite-specific G2 initial state',feedback:'GPS-compatible C/A G1/G2 recurrences',expectedFirst10:expected};
  }
  function qzssCA(prn){const row=QZSS_CA[prn];if(!row)throw new Error(`QZSS PRN ${prn} is outside the implemented PNT ICD C/A table (193–202).`);return caFromG2Initial(row[0],row[1],'QZSS C/A · ICD G2 initialization');}
  function sbasCA(prn){const row=SBAS_CA[prn];if(!row)throw new Error(`SBAS PRN ${prn} is outside IS-GPS-200N Table 6-I (120–158).`);return caFromG2Initial(row[0],row[1],'SBAS L1 C/A · IS-GPS-200N additional assignment');}

  const L2_TAPS=octalBits('112225170',27).map((b,i)=>b?i:-1).filter(i=>i>=0);
  function l2Generate(initial,length){
    let r=octalBits(initial,27); const out=new Uint8Array(length);
    for(let i=0;i<length;i++){
      const c=r[26]; out[i]=c;
      for(const j of L2_TAPS) r[j]^=c;
      for(let j=26;j>0;j--) r[j]=r[j-1];
      r[0]=c;
    }
    return {bits:out,state:r};
  }
  function octalState(bits){return parseInt(bits.join(''),2).toString(8).padStart(9,'0');}
  function gpsL2(prn,component='CM'){
    component=String(component).toUpperCase().startsWith('CL')?'CL':'CM'; const init=(component==='CM'?GPS_L2_CM:GPS_L2_CL)[prn];
    if(!init)throw new Error(`GPS L2C PRN ${prn} is outside the implemented ICD initial-state table (1–32).`);
    const len=component==='CM'?10230:767250, gen=l2Generate(init,len);
    return {bits:gen.bits,totalLength:len,method:`GPS L2${component} · 27-stage modular code generator`,initial:`${init} (octal)`,assignment:'PRN-specific initial state from IS-GPS-200N Table 3-IIa',feedback:'Degree-27 polynomial 1112225171 (octal)',stateAfterCycle:octalState(gen.state)};
  }
  function qzssL2(prn,component='CM'){
    component=String(component).toUpperCase().startsWith('CL')?'CL':'CM'; const row=QZSS_L2[prn];if(!row)throw new Error(`QZSS L2C PRN ${prn} is outside IS-QZSS-PNT-006 Table 3.2.4-1 (193–202).`);
    const init=row[component==='CM'?0:1],len=component==='CM'?10230:767250,gen=l2Generate(init,len);
    return {bits:gen.bits,totalLength:len,method:`QZSS L2${component} · GPS-compatible 27-stage generator`,initial:`${init} (octal)`,assignment:'QZSS PRN-specific initial state from IS-QZSS-PNT-006',feedback:'Degree-27 polynomial 1112225171 (octal)',stateAfterCycle:octalState(gen.state)};
  }
  function beidou(prn){
    const taps=BDS_TAPS[prn];if(!taps)throw new Error(`BeiDou PRN ${prn} is outside the B1I/B2I ICD phase-assignment table (1–37).`);
    let g1='01010101010'.split('').map(Number),g2='01010101010'.split('').map(Number); const out=new Uint8Array(2046);
    for(let i=0;i<2046;i++){
      const a=11-taps[0],b=11-taps[1]; out[i]=g1[0]^g2[a]^g2[b];
      const f1=g1[0]^g1[1]^g1[2]^g1[3]^g1[4]^g1[10];
      const f2=g2[0]^g2[2]^g2[3]^g2[6]^g2[7]^g2[8]^g2[9]^g2[10];
      g1=[...g1.slice(1),f1]; g2=[...g2.slice(1),f2];
    }
    return {bits:out,totalLength:2046,method:'BeiDou B1I/B2I · truncated Gold code · dual 11-stage generators',initial:'G1=G2=01010101010',assignment:`G2 phase taps ${taps[0]}, ${taps[1]} (Table 4-2)`,feedback:'G1: 1+x+x⁷+x⁸+x⁹+x¹⁰+x¹¹ · G2: 1+x+x²+x³+x⁴+x⁵+x⁸+x⁹+x¹¹'};
  }
  function glonass(){
    let r=Array(9).fill(1);const out=new Uint8Array(511);
    for(let i=0;i<511;i++){out[i]=r[6];const fb=r[4]^r[8];r=[fb,...r.slice(0,8)];}
    return {bits:out,totalLength:511,method:'GLONASS standard ranging code · 9-stage m-sequence',initial:'111111111',assignment:'Common code for legacy standard-accuracy signals; satellite separation is FDMA',feedback:'G(x)=1+x⁵+x⁹ · output stage 7'};
  }
  function hexToBits(hex,length){const clean=String(hex).replace(/[^0-9A-F]/gi,'');const out=new Uint8Array(Math.min(length,clean.length*4));let k=0;for(const c of clean){const n=parseInt(c,16);for(let b=3;b>=0&&k<out.length;b--)out[k++]=(n>>b)&1;}return out;}
  function fingerprint(bits){let h=2166136261>>>0;for(let i=0;i<bits.length;i++){h^=(bits[i]+i)&255;h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
  function verifyFirst10(result){return !result.expectedFirst10||specialOctal10(result.bits)===result.expectedFirst10;}
  const api={GPS_CA_TAPS,GPS_CA_FIRST10,GPS_L2_CM,GPS_L2_CL,GPS_L2_CM_END,QZSS_CA,QZSS_L2,SBAS_CA,BDS_TAPS,specialOctal10,gpsCA,qzssCA,sbasCA,gpsL2,qzssL2,beidou,glonass,hexToBits,fingerprint,verifyFirst10,l2Generate,octalState};
  root.PRNLAB=Object.freeze(api);if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
