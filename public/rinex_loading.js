/* Initial header and full engine are separate readiness states. */
(()=>{
 'use strict';
 const loader=document.getElementById('rinex-loader'),code=document.getElementById('code');
 if(!loader||!code)return;
 const message=document.getElementById('rinex-loading-message'),title=document.getElementById('rinex-loading-title'),retry=document.getElementById('rinex-loading-retry');
 const status=document.getElementById('rinex-background-status');
 const recordRetry=document.getElementById('rinex-record-retry');
 let headerReady=false,engineReady=false,retryView=false,engineFailed=false;
 function inline(text){status.textContent=text;status.hidden=!text;}
 window.addEventListener('gnss-engine-status',event=>{
  const detail=event.detail||{};
  if(headerReady){
   if(detail.isError){engineFailed=true;inline('The header is available. Detailed records could not initialize.');recordRetry.hidden=false;retryView=!detail.background;}
   else if(detail.message){engineFailed=false;recordRetry.hidden=true;inline((detail.background?'Header ready. Preparing detailed records in the background: ':'Preparing this view: ')+detail.message);}
   return;
  }
  if(detail.message)message.textContent=detail.message;
  if(detail.isError){loader.classList.add('is-error');title.textContent='Initialization needs another try';retry.hidden=false;return;}
  const phase=/index/i.test(detail.message)?2:/laboratory|RINEX records|file/i.test(detail.message)?1:0;
  loader.querySelectorAll('[data-load-step]').forEach((step,i)=>{step.classList.toggle('is-complete',i<phase);if(i===phase)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
 });
 window.addEventListener('gnss-rinex-ready',()=>{engineReady=true;engineFailed=false;recordRetry.hidden=true;inline('Detailed records are ready.');});
 function sync(){
  if(code.getAttribute('aria-busy')==='true'){
   recordRetry.hidden=true;
   if(headerReady)inline(engineReady?'Loading this view...':'Preparing detailed records. You can continue inspecting the current header.');
   return;
  }
  const error=document.getElementById('error');
  if(error&&!error.hidden){
   if(headerReady){inline('This view could not load. Your existing data remains available.');recordRetry.hidden=false;retryView=true;return;}
   loader.classList.add('is-error');title.textContent='Initialization needs another try';message.textContent=error.textContent;retry.hidden=false;return;
  }
  headerReady=true;loader.hidden=true;
  recordRetry.hidden=!engineFailed;
  inline(engineFailed?'The header is available. Detailed records could not initialize.':engineReady?'Detailed records are ready.':'Header ready. Detailed records will initialize in the background.');
 }
 const observer=new MutationObserver(sync);observer.observe(code,{attributes:true,attributeFilter:['aria-busy']});sync();
 recordRetry.addEventListener('click',()=>{recordRetry.hidden=true;document.getElementById('error').hidden=true;if(retryView)window.refresh();else window.GNSS_BROWSER.warmupRinex();});
 retry.addEventListener('click',()=>{loader.classList.remove('is-error');retry.hidden=true;title.textContent='Preparing your observation workspace';message.textContent='Retrying initialization...';document.getElementById('error').hidden=true;if(typeof window.refresh==='function')window.refresh();});
})();
