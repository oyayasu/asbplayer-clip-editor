// Cross-tab relay: no external AI APIs or tokens.
const HOSTS: Record<string,string[]> = {
 chatgpt:['chatgpt.com','chat.openai.com'],
 gemini:['gemini.google.com'],
 claude:['claude.ai'],
};
function matchHost(url: string | undefined, provider: string): boolean {
 try {const h=new URL(url||'').hostname;return (HOSTS[provider]||[]).some(d=>h===d||h.endsWith('.'+d));}catch{return false;}
}
export function initJsonRelay(): void {
 browser.runtime.onMessage.addListener((msg: any, _sender: any, respond: (value: any)=>void) => {
  if(msg?.action!=='ASB_JSON_RELAY_RUN')return false;
  (async()=>{
   const provider=String(msg.provider||'chatgpt');
   const prompt=String(msg.prompt||'');
   if(!HOSTS[provider] || !prompt.trim() || prompt.length>120000)throw Error('Provedor ou prompt inválido.');
   const tabs=await browser.tabs.query({});
   const target=tabs.find(t=>typeof t.id==='number'&&matchHost(t.url,provider));
   if(!target?.id)throw Error('Abra uma aba do '+provider+' e faça login antes de gerar.');
   const tabId=target.id;
   await browser.scripting.executeScript({target:{tabId},files:['json-relay/content.js' as any]});
   const result=await browser.tabs.sendMessage(tabId,{namespace:'asb-json-relay',action:'RUN',prompt});
   if(!result?.ok)throw Error(result?.error||'A captura falhou.');
   return {ok:true,response:result.response};
  })().then(respond).catch(e=>respond({ok:false,error:String(e.message||e)}));
  return true;
 });
}
