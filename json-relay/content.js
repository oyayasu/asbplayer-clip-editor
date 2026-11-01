(() => {
'use strict';
if (globalThis.__ASB_JSON_RELAY__) return;
globalThis.__ASB_JSON_RELAY__ = true;

const PROFILES = {
  chatgpt: {
    test: /(^|\.)chatgpt\.com$|^chat\.openai\.com$/i,
    input: [
      'div.ProseMirror[contenteditable="true"][data-composer-markdown]',
      'div.ProseMirror[contenteditable="true"][role="textbox"]',
      '#prompt-textarea[contenteditable="true"]',
      '#prompt-textarea',
      'form div[contenteditable="true"][role="textbox"]',
      'textarea[name="prompt"]'
    ],
    send: [
      'form button[type="submit"]','button[data-composer-submit]','#composer-submit-button',
      'button[data-testid="send-button"]','button[aria-label="Send prompt"]',
      'button[aria-label="Enviar mensagem"]','button[aria-label*="Send" i]'
    ],
    reply: [
      'div[data-content-search-unit-key$=":assistant"] div[data-markdown-text-style="assistant-message"]',
      'div[data-markdown-text-style="assistant-message"]',
      'section[data-turn="assistant"] [data-markdown-text-style="assistant-message"]',
      'section[data-turn="assistant"] .markdown',
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"]',
      '[data-role="assistant"] .markdown','.agent-turn .markdown'
    ],
    stop: ['button[data-testid="stop-button"]','button[aria-label="Stop generating"]','button[aria-label*="Stop" i]','button[aria-label*="Interromper" i]'],
    complete: ['button[data-testid="copy-turn-action-button"]','button[aria-label="Copy message"]','button[aria-label="Copiar mensagem"]','button[aria-label*="Copy message" i]']
  },
  gemini: {
    test: /(^|\.)gemini\.google\.com$/i,
    input: [
      'div.ql-editor[contenteditable="true"][aria-label*="Gemini" i]',
      'rich-textarea div.ql-editor[contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      'rich-textarea [contenteditable="true"]',
      'input-area-v2 [contenteditable="true"]'
    ],
    send: [
      'button[aria-label="Send message"]','button[aria-label="Enviar mensagem"]',
      'button[aria-label*="Send" i]','button[aria-label*="Enviar" i]',
      'button.send-button','.send-button','button[type="submit"]'
    ],
    reply: [
      'model-response message-content','message-content',
      'model-response .response-content','model-response .model-response-text','model-response'
    ],
    stop: ['button[aria-label*="Stop response" i]','button[aria-label*="Stop" i]','button[aria-label*="Interromper" i]'],
    complete: []
  }
};
const GENERIC = {
  input:['textarea[placeholder]','div[contenteditable="true"][role="textbox"]','[role="textbox"][contenteditable="true"]','div[contenteditable="true"]','textarea'],
  send:['button[data-testid="send-button"]','button[aria-label="Send message"]','button[aria-label="Enviar mensagem"]','button[aria-label="Send"]','button[aria-label="Enviar"]','button[type="submit"]'],
  reply:['[data-message-author-role="assistant"] .markdown','[data-message-author-role="assistant"]','[data-testid="assistant-message"]','[data-role="assistant"]','.assistant-message','article .markdown','.markdown'],
  stop:['button[data-testid="stop-button"]','button[aria-label="Stop generating"]'],
  complete:[]
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let active = false;

function profile() {
  const host = location.hostname;
  for (const [id, config] of Object.entries(PROFILES)) if (config.test.test(host)) return { id, ...config };
  return { id:'generic', ...GENERIC };
}
function usable(node) {
  if (!node || !node.isConnected || node.closest('[aria-hidden="true"],[hidden]')) return false;
  const style = getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden';
}
function list(config, field) {
  return [...(config[field] || []), ...(config.id === 'generic' ? [] : GENERIC[field] || [])];
}
function nodesFor(config, field, visibleOnly=true) {
  for (const selector of list(config, field)) {
    let nodes=[];
    try { nodes=[...document.querySelectorAll(selector)]; } catch { continue; }
    if (visibleOnly) nodes=nodes.filter(usable);
    if (nodes.length) return {nodes,selector};
  }
  return {nodes:[],selector:''};
}
function responseText(node) {
  return String(node?.innerText || node?.textContent || '').replace(/\u00a0/g,' ').trim();
}
function responses(config) {
  const found=nodesFor(config,'reply');
  return {nodes:found.nodes.filter(node=>responseText(node)),selector:found.selector};
}
function chooseInput(config) { return nodesFor(config,'input').nodes.at(-1) || null; }
function chooseSend(config,input) {
  const scope=input?.closest('form, input-area-v2, [data-composer-root], .input-area-container');
  if(scope){
    for(const selector of list(config,'send')){
      let local=[];try{local=[...scope.querySelectorAll(selector)];}catch{continue;}
      const enabled=local.filter(usable).find(el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true');
      if(enabled)return enabled;
    }
  }
  const candidates=nodesFor(config,'send').nodes;
  return candidates.find(el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true') || candidates[0] || null;
}
function isBusy(config) {
  return nodesFor(config,'stop').nodes.some(el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true');
}
function isComplete(config) { return nodesFor(config,'complete').nodes.length>0; }
function fieldText(el) {
  if(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)return el.value;
  return String(el?.innerText || el?.textContent || '').replace(/\u00a0/g,' ');
}
function nativeSetValue(el,message) {
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
  if(setter)setter.call(el,message);else el.value=message;
  el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:message}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function selectAll(el){
  el.focus();const selection=getSelection(),range=document.createRange();
  range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);
}
function insertLinewise(el,message){
  selectAll(el);
  const lines=String(message).replace(/\r\n/g,'\n').split('\n');
  for(let i=0;i<lines.length;i++){
    if(i){let ok=false;try{ok=document.execCommand('insertLineBreak',false);}catch{}if(!ok)try{document.execCommand('insertParagraph',false);}catch{}}
    if(lines[i])try{document.execCommand('insertText',false,lines[i]);}catch{return false;}
  }
  return true;
}
function fill(el,message){
  if(!el)throw Error('Message field not found in the selected AI tab.');
  el.focus();
  if(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement){nativeSetValue(el,message);return;}
  if(!(el.isContentEditable||el.getAttribute('contenteditable')==='true'))throw Error('The detected AI input is not editable.');
  selectAll(el);
  let ok=false;try{ok=document.execCommand('insertText',false,message);}catch{}
  if(!ok)ok=insertLinewise(el,message);
  if(!ok)throw Error('The AI editor refused the prompt text.');
  el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:null}));
}

async function perform(prompt) {
  if(active)throw Error('This AI tab is already processing a request.');
  active=true;
  const config=profile();
  try {
    const before=responses(config);
    const baselineNodes=new Set(before.nodes);
    const baselineLast=before.nodes.at(-1) || null;
    const baselineText=responseText(baselineLast);

    const input=chooseInput(config);
    fill(input,prompt);
    await sleep(500);

    let button=chooseSend(config,input);
    const buttonDeadline=Date.now()+7000;
    while((!button||button.disabled||button.getAttribute('aria-disabled')==='true')&&Date.now()<buttonDeadline){
      await sleep(250);button=chooseSend(config,input);
    }
    if(!button)throw Error('Send button not found in the selected AI tab.');
    if(button.disabled||button.getAttribute('aria-disabled')==='true')throw Error('The AI site did not enable its send button.');

    button.click();
    const started=Date.now(),until=started+180000;
    let latest='',lastChange=Date.now(),firstSeen=0,saw=false;

    while(Date.now()<until){
      await sleep(550);
      const current=responses(config);
      const fresh=current.nodes.filter(node=>!baselineNodes.has(node));
      let node=fresh.at(-1) || null;

      if(!node){
        const last=current.nodes.at(-1) || null;
        const lastText=responseText(last);
        if(last && current.nodes.length>before.nodes.length) node=last;
        else if(last && last===baselineLast && lastText && lastText!==baselineText) node=last;
      }

      const value=responseText(node);
      if(value){
        saw=true;
        if(!firstSeen)firstSeen=Date.now();
        if(value!==latest){latest=value;lastChange=Date.now();}
        const stable=Date.now()-lastChange>=5000 && Date.now()-firstSeen>=5000;
        if(stable && (isComplete(config)||!isBusy(config))) return latest;
      }

      if(!saw && Date.now()-started>14000 && fieldText(input).trim()===String(prompt).trim())
        throw Error('The prompt is still in the AI input; automatic send did not complete.');
    }
    throw Error(saw?'The AI response did not stabilize within three minutes.':'No new AI response was detected within three minutes.');
  } finally { active=false; }
}

chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
  if(message?.namespace!=='asb-json-relay')return;
  if(message.action==='PING'){reply({ok:true,provider:profile().id});return;}
  if(message.action==='RUN'){
    perform(String(message.prompt||'')).then(response=>reply({ok:true,response})).catch(error=>reply({ok:false,error:String(error?.message||error)}));
    return true;
  }
});
})();