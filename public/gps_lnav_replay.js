/*
 * GPS L1 C/A LNAV re-encoder from decoded RINEX broadcast ephemerides.
 * Adapted from eph2sbf(), generateNavMsg() and computeChecksum() in
 * Yuta811x/gnss-sdr-sim/gnsssim.c (MIT). No downloaded RF/IQ is implied.
 *
 * Coverage: GPS subframes 1–3, HOW/TLM, parity, and SF4 page 18 where
 * RINEX GPSA/GPSB/GPUT corrections exist. SF5 retains the source simulator's
 * placeholder because RINEX lacks a bit-perfect transmitted almanac stream.
 */
(function(root) {
  'use strict';
  const MASKS=[0x3b1f3480,0x1d8f9a40,0x2ec7cd00,0x1763e680,0x2bb1f340,0x0b7a89c0];
  const GPS_ZERO=Date.UTC(1980,0,6)/1000;
  const bitCount=x=>{let n=0;while(x){x&=x-1;n++;}return n;};
  const modulo=(x,d)=>((x%d)+d)%d;
  const u32=x=>x>>>0;
  function parityWord(source,nib) {
    let d=(source&0x3fffffc0)>>>0;
    const d29=(source>>>31)&1,d30=(source>>>30)&1;
    if(nib){
      if((d30+bitCount(MASKS[4]&d))%2)d^=1<<6;
      if((d29+bitCount(MASKS[5]&d))%2)d^=1<<7;
    }
    let out=d30?(d^0x3fffffc0):d;
    for(let i=0;i<6;i++){
      const prev=i===0||i===2||i===5?d29:d30;
      out|=((prev+bitCount(MASKS[i]&d))%2)<<(5-i);
    }
    return (out&0x3fffffff)>>>0;
  }
  function gpst(seconds){
    const t=seconds-GPS_ZERO;
    const week=Math.floor(t/604800);
    return {week,sow:modulo(t,604800)};
  }
  function navMap(fields){
    const m={};for(const f of fields||[])m[f.name]=Number(f.value);
    const find=(name,defaultValue=NaN)=>Number.isFinite(m[name])?m[name]:defaultValue;
    return {
      af0:find('af0 / clock bias'),af1:find('af1 / clock drift'),af2:find('af2 / clock drift rate'),
      iode:find('IODE / issue'),crs:find('Crs'),delta:find('Δn'),m0:find('M0'),cuc:find('Cuc'),
      e:find('e'),cus:find('Cus'),sqrta:find('√A'),toe:find('Toe'),cic:find('Cic'),
      omg0:find('Ω0'),cis:find('Cis'),i0:find('i0'),crc:find('Crc'),omega:find('ω'),
      omgdot:find('Ω̇'),idot:find('IDOT'),codeL2:find('Codes/data source',0),
      health:find('SV health',0),tgd:find('Group delay 1',0),iodc:find('Group delay 2 / IODC'),
    };
  }
  function subframes(nav,navEpochSeconds){
    const p=navMap(nav.fields);
    if(!Number.isFinite(p.iode)||!Number.isFinite(p.toe)||!Number.isFinite(p.sqrta)
       ||!Number.isFinite(p.af0)||!Number.isFinite(p.iodc))return null;
    // The C original truncates all scaled ephemeris values toward zero.
    const s=(v,bits)=>Math.trunc(v/Math.pow(2,bits));
    const ang=(v,bits)=>Math.trunc(v/(Math.pow(2,bits)*Math.PI));
    const toc=Math.floor(gpst(navEpochSeconds).sow/16);
    const w=Array.from({length:5},()=>Array(10).fill(0));
    const [a,b,c,d,e]=w;
    for(let i=0;i<4;i++){w[i][0]=0x8b0000<<6;w[i][1]=(i+1)<<8;}
    a[2]=u32(((p.codeL2&3)<<18)|((p.health&63)<<8)|(((p.iodc>>>8)&3)<<6));
    a[6]=(s(p.tgd,-31)&255)<<6;
    a[7]=u32(((p.iodc&255)<<22)|((toc&65535)<<6));
    a[8]=u32(((s(p.af2,-55)&255)<<22)|((s(p.af1,-43)&65535)<<6));
    a[9]=(s(p.af0,-31)&0x3fffff)<<8;
    const m0=ang(p.m0,-31),ecc=s(p.e,-33),sqrta=s(p.sqrta,-19),omg0=ang(p.omg0,-31),inc0=ang(p.i0,-31),aop=ang(p.omega,-31);
    b[2]=u32(((p.iode&255)<<22)|((s(p.crs,-5)&65535)<<6));
    b[3]=u32(((ang(p.delta,-43)&65535)<<14)|(((m0>>24)&255)<<6));
    b[4]=(m0&0xffffff)<<6;
    b[5]=u32(((s(p.cuc,-29)&65535)<<14)|(((ecc>>24)&255)<<6));
    b[6]=(ecc&0xffffff)<<6;
    b[7]=u32(((s(p.cus,-29)&65535)<<14)|(((sqrta>>24)&255)<<6));
    b[8]=(sqrta&0xffffff)<<6;
    b[9]=(Math.floor(p.toe/16)&65535)<<14;
    c[2]=u32(((s(p.cic,-29)&65535)<<14)|(((omg0>>24)&255)<<6));
    c[3]=(omg0&0xffffff)<<6;
    c[4]=u32(((s(p.cis,-29)&65535)<<14)|(((inc0>>24)&255)<<6));
    c[5]=(inc0&0xffffff)<<6;
    c[6]=u32(((s(p.crc,-5)&65535)<<14)|(((aop>>24)&255)<<6));
    c[7]=(aop&0xffffff)<<6;
    c[8]=(ang(p.omgdot,-43)&0xffffff)<<6;
    c[9]=u32(((p.iode&255)<<22)|((ang(p.idot,-43)&0x3fff)<<8));
    const iono=nav.gps_iono_utc;
    if(iono?.alpha?.length===4 && iono?.beta?.length===4 && iono.utc){
      // gnsssim.c eph2sbf(): RINEX GPSA/GPSB/GPUT -> LNAV SF4 page 18.
      const roundAway=x=>Math.sign(x)*Math.floor(Math.abs(x)+0.5);
      const a=iono.alpha,b=iono.beta,utc=iono.utc;
      const al=[roundAway(a[0]/2**-30),roundAway(a[1]/2**-27),roundAway(a[2]/2**-24),roundAway(a[3]/2**-24)];
      const be=[roundAway(b[0]/2048),roundAway(b[1]/16384),roundAway(b[2]/65536),roundAway(b[3]/65536)];
      const A0=roundAway(utc.a0/2**-30),A1=roundAway(utc.a1/2**-50);
      d[2]=u32((1<<28)|(56<<22)|((al[0]&255)<<14)|((al[1]&255)<<6));
      d[3]=u32(((al[2]&255)<<22)|((al[3]&255)<<14)|((be[0]&255)<<6));
      d[4]=u32(((be[1]&255)<<22)|((be[2]&255)<<14)|((be[3]&255)<<6));
      d[5]=(A1&0xffffff)<<6;
      d[6]=((A0>>8)&0xffffff)<<6;
      d[7]=u32(((A0&255)<<22)|((Math.floor(utc.tot/4096)&255)<<14)|((utc.week&255)<<6));
      d[8]=u32(((iono.leap_seconds&255)<<22)|((1929&255)<<14)|(7<<6));
      d[9]=18<<22;
    }else{
      // Original simulator's SF4 page-25 fallback; not a complete almanac.
      d[2]=u32((1<<28)|(63<<22));
    }
    return w;
  }
  function frameWords(template,week,frameStart) {
    const words=[];
    let prev=0;
    let tow=Math.floor(frameStart/6);
    // Match gnss-sdr-sim generateNavMsg(init=1): carry parity from the
    // preceding SF5, including its own HOW, into the new frame's SF1.
    for(let i=0;i<10;i++){
      let data=template[4][i]>>>0;
      if(i===1)data|=(tow&0x1ffff)<<13;
      prev=parityWord((data|((prev<<30)>>>0))>>>0,i===1||i===9);
    }
    for(let subframe=0;subframe<5;subframe++){
      tow++;
      for(let i=0;i<10;i++){
        let data=template[subframe][i]>>>0;
        if(subframe===0&&i===2)data|=(week&1023)<<20;
        if(i===1)data|=(tow&0x1ffff)<<13;
        const source=(data|((prev<<30)>>>0))>>>0;
        prev=parityWord(source,i===1||i===9);
        words.push(prev);
      }
    }
    return words;
  }
  function create(nav,signalId){
    if(signalId!=='G-1C'||!nav?.fields?.length||!nav?.record_epoch)return null;
    const iso=String(nav.record_epoch);
    const navSeconds=Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(iso)?iso:iso+'Z')/1000;
    if(!Number.isFinite(navSeconds))return null;
    const tpl=subframes(nav,navSeconds);
    if(!tpl)return null;
    let cacheKey='',cache=[];
    const getWords=(txSeconds)=>{
      const {week,sow}=gpst(txSeconds);
      const frameStart=Math.floor(sow/30)*30;
      const key=`${week}/${frameStart}`;
      if(key!==cacheKey){cache=frameWords(tpl,week,frameStart);cacheKey=key;}
      return {words:cache,within:sow-frameStart,week,frameStart};
    };
    function bitAt(txSeconds){
      const {words,within}=getWords(txSeconds);
      const index=Math.max(0,Math.min(1499,Math.floor(within*50+1e-8)));
      return (words[Math.floor(index/30)]>>>(29-index%30))&1;
    }
    return {bitAt,getWords,recordSeconds:navSeconds,mode:'GNSS-SDR-SIM GPS LNAV re-encoding (SF1–3; SF4 page 18 if available; SF5 placeholder)'};
  }
  const api={create,parityWord,gpst,subframes,frameWords};
  root.GPS_LNAV_REPLAY=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
