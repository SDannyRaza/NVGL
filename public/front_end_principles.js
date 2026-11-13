/* Original NVGL conceptual laboratories; numerical reference is the supplied receiver. */
(function(root){
'use strict';
const text=(x,y,s,size=15,color='#c5d8e7',anchor='middle')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+color+'" stroke="none">'+s+'</text>';
const svg=(view,title,body)=>'<div class="fe-principle-visual" tabindex="0" role="region" aria-label="'+title+'"><svg class="fe-principle-svg" viewBox="'+view+'" role="img" aria-label="'+title+'">'+body+'</svg></div>';
const card=(id,title,kicker,body)=>'<section class="card fe-card fe-principle" id="'+id+'" aria-labelledby="'+id+'-title"><div class="card-head"><span class="eyebrow">'+kicker+'</span><h3 id="'+id+'-title">'+title+'</h3></div><div class="fe-principle-body">'+body+'</div></section>';
const note=(title,body)=>'<div class="fe-principle-note"><h4>'+title+'</h4><p>'+body+'</p></div>';
const source='<p class="fe-principle-reference">The frequency plan follows the supplied reference receiver. See the Borre et al. textbook citation beneath the receiver block diagram.</p>';
function electromagnetic(){
 const regions=[['Radio waves',45,365,'#325b73'],['Infrared',365,510,'#945c4c'],['Visible',510,550,'url(#fe-em-visible)'],['Ultraviolet',550,690,'#6f538b'],['X-rays',690,810,'#3f64a1'],['Gamma rays',810,950,'#7873a5']];
 return card('fe-electromagnetic-spectrum','Electromagnetic Spectrum','SIGNAL FOUNDATIONS',
 '<p class="fe-principle-lead">An electromagnetic wave carries energy through changing electric and magnetic fields. GNSS uses radio waves in the microwave region.</p>'+
 svg('0 0 1000 300','Microwaves are part of radio waves; GNSS L-band is within the microwave region.',
 '<defs><linearGradient id="fe-em-visible"><stop stop-color="#ed6359"/><stop offset=".3" stop-color="#f3d75d"/><stop offset=".5" stop-color="#66dca6"/><stop offset=".7" stop-color="#69aeef"/><stop offset="1" stop-color="#ae7be1"/></linearGradient></defs>'+
 regions.map(([name,a,b,color])=>'<rect x="'+a+'" y="66" width="'+(b-a)+'" height="48" fill="'+color+'"/>'+text((a+b)/2,44,name,14)).join('')+
 '<rect x="195" y="74" width="155" height="32" rx="5" fill="#0c2f42" stroke="#72d8ef"/>'+text(272,95,'Microwaves',14,'#a0edf4')+
 '<path d="M45 147H950M935 140L950 147L935 154" stroke="#7293a8" fill="none" stroke-width="2"/>'+text(45,173,'Lower frequency / longer wavelength',13,'#b5cbd9','start')+text(950,173,'Higher frequency / shorter wavelength',13,'#b5cbd9','end')+
 '<path d="M272 114V207H445" stroke="#72d8ef" fill="none" stroke-width="2"/><rect x="445" y="192" width="505" height="70" rx="10" fill="#173448" stroke="#72d8ef"/>'+text(697,219,'GNSS L-band: 1-2 GHz',17,'#9ce9ef')+text(697,245,'GPS L1 C/A: 1.57542 GHz = 1575.42 MHz',14))+
 '<p class="fe-principle-caption">Conceptual ordering; region widths are not to scale. Microwaves are a subset of radio waves.</p><div class="fe-principle-grid">'+
 note('Frequency, f','The number of wave cycles each second, measured in hertz (Hz). One megahertz (MHz) is one million cycles per second.')+
 note('Wavelength, &#955;','The distance between adjacent wave peaks. In free space, &#955; = c/f, where c = 299,792,458 m/s.')+
 note('GPS L1 example','&#955; = 299,792,458 / 1,575,420,000 = 0.190294 m, approximately 19.03 cm.')+
 '</div><p class="fe-principle-reference">Original NVGL teaching diagram. Electromagnetic-region widths are schematic.</p>');
}
function receiverOverview(){
 const steps=[['Reception and RF selection','The antenna receives analog voltage; the RF filter passes the selected L1 band.'],['Amplification','Increase voltage while controlling added noise and keeping the signal analog.'],['Downconversion and IF','Translate the carrier to 47.74 MHz, select the difference band and limit its bandwidth.'],['Sampling and output','Sample at 38.192 Msamples/s and quantize voltage to produce four-bit digital IF.']];
 return card('fe-receiver-system','From the Antenna to Digital Samples','FRONT-END BOUNDARY',
 '<p class="fe-principle-lead">The front end receives and conditions analog voltage, then produces digital samples. Follow only these signal-conditioning operations in this chapter.</p>'+
 svg('0 0 1000 210','Four illustrative satellites send signals to one receiving antenna.',
 '<g stroke="#72d8ef" stroke-width="2" fill="none">'+[120,340,560,780].map((x,i)=>'<g transform="translate('+x+' 30)"><rect x="-14" y="0" width="28" height="28" rx="4" fill="#19384c"/><path d="M-60 2H-20V26H-60ZM20 2H60V26H20Z"/><path d="M0 28L'+(450-x)+' 135" stroke-dasharray="5 7" opacity=".65"/></g>'+text(x,21,'SV '+(i+1),13)).join('')+
 '<path d="M424 155H476L450 185ZM450 155V202"/></g>'+text(600,181,'Receiving antenna',16,'#d5e8f4'))+
 '<div class="fe-receiver-progression">'+steps.map(([title,body],i)=>'<div><span>'+String(i+1).padStart(2,'0')+'</span><h4>'+title+'</h4><p>'+body+'</p></div>').join('')+
 '</div><p class="fe-principle-caption">Several satellites can contribute to one antenna voltage. They illustrate the composite RF input; this diagram ends at the digital sample output.</p>');
}
function downconversion(){
 return card('fe-downconversion','Downconversion: Mixer, Local Oscillator and IF Filter','FREQUENCY TRANSLATION',
 '<p class="fe-principle-lead">Downconversion moves a received signal from its high radio frequency to a lower intermediate frequency (IF). The code and navigation data remain carried by the translated signal.</p><div class="fe-principle-grid">'+
 note('Mixer','Multiplies the received waveform by a local waveform. This creates difference-frequency and sum-frequency components.')+
 note('Local oscillator (LO)','Produces a stable sinusoid inside the receiver. Its frequency determines the frequency translation.')+
 note('First IF filter','Selects the desired difference-frequency band and attenuates the sum-frequency product and other unwanted components.')+'</div>'+
 svg('0 0 1000 330','One downconversion stage contains mixer, local oscillator input and first IF filter.',
 '<defs><marker id="fe-dc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#72d8ef"/></marker><marker id="fe-dc-lo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#ffd17a"/></marker></defs>'+
 '<rect x="254" y="23" width="490" height="282" rx="14" fill="#142c3d" stroke="#53778d" stroke-dasharray="5 4"/>'+text(499,52,'ONE DOWNCONVERSION STAGE',14,'#9bc4dc')+
 '<g stroke="#72d8ef" stroke-width="3" fill="none"><path d="M45 125H312" marker-end="url(#fe-dc-arrow)"/><circle cx="344" cy="125" r="30"/><path d="M326 107L362 143M362 107L326 143"/><path d="M374 125H560" marker-end="url(#fe-dc-arrow)"/><rect x="563" y="91" width="122" height="68" rx="8"/><path d="M584 113q10 -13 20 0t20 0t20 0M584 130q10 -13 20 0t20 0t20 0M584 147q10 -13 20 0t20 0t20 0"/><path d="M685 125H955" marker-end="url(#fe-dc-arrow)"/></g>'+
 '<rect x="284" y="230" width="160" height="50" rx="8" fill="#29302b" stroke="#ffd17a"/><path d="M344 230V155" stroke="#ffd17a" stroke-width="3" fill="none" marker-end="url(#fe-dc-lo)"/>'+
 text(132,99,'GPS L1 RF',17)+text(132,153,'1575.42 MHz',15,'#72d8ef')+text(344,90,'Mixer',14)+text(466,99,'Sum + difference',13)+text(624,185,'First IF filter',14)+text(624,208,'18 MHz bandwidth',13)+text(364,250,'Local oscillator',14,'#ffd17a')+text(364,270,'1527.68 MHz',13,'#ffd17a')+text(850,99,'Selected analog IF',16)+text(850,153,'47.74 MHz',17,'#72d8ef'))+
 '<div class="fe-principle-equation"><strong>Mixer identity</strong><span>cos(2&#960;f<sub>RF</sub>t) cos(2&#960;f<sub>LO</sub>t) = &#189;cos[2&#960;(f<sub>RF</sub> &#8722; f<sub>LO</sub>)t] + &#189;cos[2&#960;(f<sub>RF</sub> + f<sub>LO</sub>)t]</span></div><div class="fe-principle-grid fe-principle-grid-two">'+
 note('Pass the difference','fIF = |fRF &#8722; fLO| = |1575.42 &#8722; 1527.68| = 47.74 MHz.')+
 note('Reject the sum','fSUM = fRF + fLO = 1575.42 + 1527.68 = 3103.10 MHz, outside the desired IF passband.')+
 '</div><p class="fe-principle-caption">The carrier-only identity explains the frequency shift. In the received signal, the code, data, Doppler and noise spectra are translated together. Downconversion does not remove the modulation.</p>'+source);
}
const aliasFrequency=(frequency,rate)=>Math.abs(((frequency+rate/2)%rate+rate)%rate-rate/2);
function aliasBand(rate,low=44.74,high=50.74){
 if(!(rate>0)||!(high>low))throw new RangeError('Positive sample rate and ordered passband required');
 const half=rate/2,loZone=Math.floor((low+1e-10)/half),hiZone=Math.floor((high-1e-10)/half),edges=[aliasFrequency(low,rate),aliasFrequency(high,rate)];
 return {rate,nyquist:half,center:aliasFrequency((low+high)/2,rate),low:Math.min(...edges),high:Math.max(...edges),overlap:loZone!==hiZone};
}
function aliasing(){
 return card('fe-aliasing','Sampling, Nyquist Frequency and Aliasing','ANALOG IF TO DIGITAL IF',
 '<p class="fe-principle-lead">Aliasing means that different continuous-time frequencies produce the same samples. Sampling repeats the spectrum at multiples of the sampling frequency. Overlapping copies can make different input components inseparable.</p><div class="fe-principle-grid">'+
 note('Sampling frequency, fs','The number of amplitude samples recorded each second. 38.192 Msamples/s means 38.192 million samples per second.')+
 note('Nyquist frequency, fs/2','Half the sampling frequency. For fs = 38.192 MHz, it is 19.096 MHz: the upper edge of the first positive-frequency Nyquist interval.')+
 note('Nyquist rate, 2B','For a real baseband signal occupying 0 to B Hz, the minimum theoretical sampling rate is 2B samples/s. Practical systems need a transition margin.')+
 '</div><h4 class="fe-principle-subhead">Why 47.74 MHz IF can be sampled at 38.192 Msamples/s</h4><p>The final filter limits the reference analog passband to 44.74&#8211;50.74 MHz (47.74 MHz centre; 6 MHz bandwidth). A suitable bandpass-sampling plan maps this isolated band into the first Nyquist interval without self-overlap. The ADC still needs sufficient analog input bandwidth.</p>'+
 '<div class="fe-principle-equation"><strong>Reference mapping</strong><span>f<sub>digital IF</sub> = |47.74 &#8722; 38.192| = 9.548 MHz<br>44.74&#8211;50.74 MHz &#8594; 6.548&#8211;12.548 MHz; f<sub>s</sub>/2 = 19.096 MHz</span></div>'+
 '<div class="fe-alias-control"><label for="fe-alias-rate">Sampling-rate experiment</label><select id="fe-alias-rate"><option value="38.192">38.192 Msamples/s &#8212; reference receiver</option><option value="32">32 Msamples/s &#8212; inspect band folding</option><option value="24">24 Msamples/s &#8212; inspect band folding</option><option value="110">110 Msamples/s &#8212; above twice the highest IF</option></select></div>'+
 '<div class="fe-alias-result" id="fe-alias-result" role="status" aria-live="polite"></div><div id="fe-alias-spectrum"></div><h4 class="fe-principle-subhead">Different continuous waves can share the same samples</h4><p>This graph uses an unmodulated cosine to isolate aliasing. The 47.74 MHz cosine and its alias pass through the same sample points. The analog filter and frequency plan identify which input band was present.</p><div id="fe-alias-wave"></div><div class="fe-principle-grid fe-principle-grid-two">'+
 note('Intentional bandpass sampling','An isolated passband can map to a lower frequency without overlapping a copy. At the reference rate, the 6 MHz band maps one-to-one into 6.548&#8211;12.548 MHz.')+
 note('Unwanted spectral overlap','Filtering prevents unwanted signals and noise from folding into the desired band. If the band crosses a folding boundary, components can overlap; additional gain or ADC bits cannot restore their separation.')+
 '</div><p class="fe-principle-caption">The experiment checks self-overlap of the ideal 6 MHz band. Real receiver design must also consider filter transitions, image rejection, ADC input bandwidth, clock jitter and interference. A valid centre-frequency alias alone does not establish safe sampling.</p>'+source);
}
function linePath(fn){let d='';for(let i=0;i<=900;i++){const u=i/900;d+=(i?'L':'M')+(40+u*855).toFixed(2)+' '+(105-fn(u)*65.1).toFixed(2);}return d;}
function drawAlias(){
 const control=document.getElementById('fe-alias-rate');if(!control)return;
 const rate=Number(control.value),a=aliasBand(rate),result=document.getElementById('fe-alias-result');
 result.classList.toggle('is-overlap',a.overlap);
 result.innerHTML='<strong>'+(a.overlap?'The passband folds onto itself':'The isolated passband maps without self-overlap')+'</strong><span>Sampling: '+rate.toFixed(3)+' Msamples/s | Nyquist frequency: '+a.nyquist.toFixed(3)+' MHz | Centre alias: '+a.center.toFixed(3)+' MHz</span><p>'+(a.overlap?'A folding boundary lies inside 44.74-50.74 MHz. Different frequencies in the band can map to the same sampled frequency.':'The full passband maps to '+a.low.toFixed(3)+'-'+a.high.toFixed(3)+' MHz without crossing a folding boundary.')+'</p>';
 const axis=f=>58+f/a.nyquist*800;
 const ticks=[0,.25,.5,.75,1].map(f=>'<path d="M'+axis(f*a.nyquist)+' 45V195" stroke="#2f4c60" stroke-dasharray="4 6"/>'+text(axis(f*a.nyquist),226,(f*a.nyquist).toFixed(2),12)).join('');
 const points=[];for(let i=0;i<=240;i++)points.push([axis(aliasFrequency(44.74+i/40,rate)),175-i/240*110]);
 document.getElementById('fe-alias-spectrum').innerHTML=svg('0 0 920 275','Mapping the full IF band into the first Nyquist interval.',
 text(58,24,'Analog IF mapped into sampled frequency',14,'#b5d2e3','start')+ticks+'<path d="M58 195H858" stroke="#7797ac"/><path d="'+points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ')+'" fill="none" stroke="'+(a.overlap?'#ffd17a':'#72d8ef')+'" stroke-width="4"/>'+text(axis(aliasFrequency(44.74,rate)),188,'44.74 MHz input',12)+text(axis(aliasFrequency(50.74,rate)),49,'50.74 MHz input',12)+text(458,258,'Sampled frequency (MHz)',13));
 const duration=.35,signal=u=>Math.cos(2*Math.PI*47.74*duration*u),alias=u=>Math.cos(2*Math.PI*a.center*duration*u),dots=[];
 for(let n=0;n/rate<=duration+1e-12;n++){const u=n/rate/duration;dots.push('<circle cx="'+(40+u*855).toFixed(2)+'" cy="'+(105-signal(u)*65.1).toFixed(2)+'" r="4.5" fill="#ffd17a" stroke="#102036"/>');}
 document.getElementById('fe-alias-wave').innerHTML=svg('0 0 920 270','Analog IF cosine, aliased cosine and matching ADC sample values.',
 '<path d="M40 105H895" stroke="#355368"/><path d="'+linePath(signal)+'" fill="none" stroke="#6c91ae" stroke-width="1.5"/><path d="'+linePath(alias)+'" fill="none" stroke="#72d8ef" stroke-width="2"/>'+dots.join('')+text(40,235,'0',12,'#b5cbd9','start')+text(895,235,'0.35 microseconds',12,'#b5cbd9','end')+text(50,260,'Gray: 47.74 MHz analog cosine',13,'#8baac0','start')+text(450,260,'Cyan: '+a.center.toFixed(3)+' MHz alias',13,'#72d8ef')+text(870,260,'Gold: ADC samples',13,'#ffd17a','end'));
}
root.FE_PRINCIPLES={render(index){return index===0?electromagnetic():index===1?receiverOverview():index===5?downconversion():index===7?aliasing():'';},bind(index){if(index===7){const c=document.getElementById('fe-alias-rate');if(c){c.onchange=drawAlias;drawAlias();}}},aliasFrequency,aliasBand};
})(typeof window==='undefined'?globalThis:window);
