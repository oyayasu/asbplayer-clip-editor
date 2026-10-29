// background.ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'AI_AUTOMATION_REQUEST') return;

  (async () => {
    try {
      // Procura uma aba aberta do ChatGPT, Claude ou Gemini
      const tabs = await chrome.tabs.query({ 
        url: [
          "*://chatgpt.com/*", 
          "*://chat.openai.com/*", 
          "*://claude.ai/*", 
          "*://gemini.google.com/*"
        ] 
      });
      
      if (!tabs || tabs.length === 0) {
        throw new Error("Nenhuma aba do ChatGPT/Claude/Gemini encontrada. Abra uma primeiro!");
      }
      
      const aiTab = tabs[0]; // Pega a primeira aba da IA que encontrar
      
      // Injeta o "espião" na aba da IA
      await chrome.scripting.executeScript({
        target: { tabId: aiTab.id! },
        files: ['content-scripts/ai-automation.js'], 
      }).catch((err) => {
        console.warn("Script já injetado ou aviso de injeção:", err);
      }); 

      // Pequeno delay para garantir que o script foi carregado
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Manda o prompt para a aba da IA
      const res = await chrome.tabs.sendMessage(aiTab.id!, {
        type: 'AI_AUTOMATION_LOOKUP',
        prompt: msg.prompt,
      });

      // Devolve a resposta para o painel do YouTube / asbplayer
      sendResponse(res);
    } catch (err: any) {
      sendResponse({ ok: false, error: err?.message || String(err) });
    }
  })();

  return true; // Importante para manter a conexão aberta
});
