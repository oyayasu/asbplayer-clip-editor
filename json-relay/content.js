(() => {
'use strict';
if (globalThis.__ASB_JSON_RELAY__) return;
globalThis.__ASB_JSON_RELAY__ = true;
const profiles = {
 chatgpt: { input: ['#prompt-textarea[contenteditable="true"]','div.ProseMirror[contenteditable="true"]','textarea[name="prompt"]'], send:['#composer-submit-button','button[data-testid="send-button"]','form button[type="submit"]'], reply:['[data-message-author-role="assistant"] .markdown','[data-markdown-text-style="assistant-message"]','[data-message-author-role="assistant"]'], stop:['button[data-testid="stop-button"]','button[aria-label*="Stop" i]'] },
 gemini: { input:['rich-textarea .ql-editor[contenteditable="true"]','div.ql-editor[contenteditable="true"]'],send:['button[aria-label="Send message"]','button[aria-label="Enviar mensagem"]','button.send-button','.send-button'],reply:['model-response message-content','model-response'],stop:['button[aria-label*="Stop" i]'] },
 claude: {input:['.ProseMirror[contenteditable="true"]','[data-testid="chat-input"] [contenteditable="true"]'],send:['button[aria-label="Send message"]','button[data-testid="send-button"]'],reply:['[data-testid="assistant-message"]','.font-claude-response'],stop:['button[aria-label="Stop response"]'] }
};
function provider(){ const h=location.hostname; return /(^|\.)gemini\.google\.com$/.test(h)?'gemini':/(^|\.)claude\.ai$/.test(h)?'claude':'chatgpt'; }
function candidates(list){for(const selector of list){const found=[...document.querySelectorAll(selector)].filter(x=>x.isConnected && x.getAttribute('aria-hidden')!=='true');if(found.length)return found;}return [];}
function visible(el){if(!el)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}
function first(list){return candidates(list).filter(visible).at(-1);}
function text(el){return String(el?.innerText || el?.textContent || '').replace(/\u00a0/g,' ').trim();}
function answer(p){const nodes=candidates(p.reply);return {count:nodes.length,text:text(nodes.at(-1))};}
function fill(el, value){
 if(!el)throw Error('Campo de mensagem não encontrado nesta aba.');
 el.focus();
 if(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
  el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));
 } else {
  const sel=getSelection(),range=document.createRange();range.selectNodeContents(el);sel.removeAllRanges();sel.addRange(range);
  if(!document.execCommand('insertText',false,value))throw Error('O editor do chat recusou a inserção do texto.');
  el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:null}));
 }
}
let active=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function perform(prompt){
 if(active)throw Error('Esta aba já está processando um prompt.');
 active=true;const p=profiles[provider()];const before=answer(p);
 try {
  const input=first(p.input); fill(input,prompt);
  await sleep(450);
  let send=first(p.send);const deadline=Date.now()+6500;
  while((!send||send.disabled||send.getAttribute('aria-disabled')==='true') && Date.now()<deadline){await sleep(250);send=first(p.send);}
  if(!send || send.disabled || send.getAttribute('aria-disabled')==='true')throw Error('Botão de envio indisponível. Verifique o chat.');
  send.click();
  const until=Date.now()+180000;let latest='',changed=Date.now(),saw=false;
  while(Date.now()<until){
   await sleep(650);const now=answer(p);
   if((now.count>before.count||now.text!==before.text)&&now.text){
    saw=true;if(now.text!==latest){latest=now.text;changed=Date.now();}
    const busy=candidates(p.stop).some(el=>visible(el)&&!el.disabled);
    if(Date.now()-changed>=4500&&!busy)return latest;
   }
  }
  throw Error(saw?'Resposta não terminou em três minutos.':'Nenhuma resposta nova detectada em três minutos.');
 } finally {active=false;}
}
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
 if(message?.namespace!=='asb-json-relay')return;
 if(message.action==='PING'){reply({ok:true,provider:provider()});return;}
 if(message.action==='RUN'){
   perform(String(message.prompt||'')).then(response=>reply({ok:true,response})).catch(e=>reply({ok:false,error:String(e.message||e)}));
   return true;
 }
});
})();