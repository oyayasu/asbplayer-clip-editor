export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  main() {
    if ((window as any).__aiAutomationLoaded) return;
    (window as any).__aiAutomationLoaded = true;

    const ADAPTERS: Record<string, any> = {
      'chatgpt.com': {
        input: () =>
          document.querySelector<HTMLElement>('#prompt-textarea') ||
          document.querySelector<HTMLElement>('div[contenteditable="true"]'),
        send: () =>
          document.querySelector<HTMLButtonElement>('[data-testid="send-button"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Send"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Enviar"]'),
        stop: () =>
          document.querySelector<HTMLButtonElement>('[data-testid="stop-button"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Stop"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Parar"]'),
        lastAssistant: () => {
          const nodes = document.querySelectorAll('[data-message-author-role="assistant"]');
          return nodes[nodes.length - 1] as HTMLElement | null;
        },
      },
      'claude.ai': {
        input: () =>
          document.querySelector<HTMLElement>('div.ProseMirror[contenteditable="true"]') ||
          document.querySelector<HTMLElement>('div[contenteditable="true"]'),
        send: () =>
          document.querySelector<HTMLButtonElement>('button[aria-label="Send Message"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Send"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Enviar"]'),
        stop: () =>
          document.querySelector<HTMLButtonElement>('button[aria-label*="Stop"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Parar"]'),
        lastAssistant: () => {
          const nodes = document.querySelectorAll('.font-claude-message, [data-is-streaming]');
          return nodes[nodes.length - 1] as HTMLElement | null;
        },
      },
      'gemini.google.com': {
        input: () =>
          document.querySelector<HTMLElement>('rich-textarea div[contenteditable="true"]') ||
          document.querySelector<HTMLElement>('div.ql-editor[contenteditable="true"]') ||
          document.querySelector<HTMLElement>('div[contenteditable="true"]'),
        send: () =>
          document.querySelector<HTMLButtonElement>('button.send-button') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Send"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Enviar"]'),
        stop: () =>
          document.querySelector<HTMLButtonElement>('button[aria-label*="Stop"]') ||
          document.querySelector<HTMLButtonElement>('button[aria-label*="Parar"]'),
        lastAssistant: () => {
          const nodes = document.querySelectorAll('message-content, model-response, .model-response-text');
          return nodes[nodes.length - 1] as HTMLElement | null;
        },
      },
    };

    // Suporta domínios equivalentes (ex: chat.openai.com -> chatgpt.com)
    const getAdapter = () => {
      let host = location.hostname.replace(/^www\./, '');
      if (host === 'chat.openai.com') host = 'chatgpt.com';
      return ADAPTERS[host] || null;
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const setInputValue = (el: HTMLElement, text: string) => {
      el.focus();
      if ('value' in el && typeof (el as any).value === 'string') {
        (el as HTMLInputElement | HTMLTextAreaElement).value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        try {
          document.execCommand('insertText', false, '');
        } catch {
          // execCommand fallback optional
        }
      }
    };

    const handleLookup = async (promptText: string) => {
      const adapter = getAdapter();
      if (!adapter) {
        throw new Error(`IA não suportada para o domínio: ${location.hostname}`);
      }

      // 1. Localizar input
      let inputEl = adapter.input();
      if (!inputEl) {
        for (let i = 0; i < 10; i++) {
          await sleep(300);
          inputEl = adapter.input();
          if (inputEl) break;
        }
      }
      if (!inputEl) {
        throw new Error('Campo de entrada da IA não encontrado na página.');
      }

      // Guardar resposta anterior se existir para ignorar mensagens antigas
      const previousLastNode = adapter.lastAssistant();
      const previousText = previousLastNode ? (previousLastNode.innerText || previousLastNode.textContent || '').trim() : '';

      // 2. Preencher prompt
      setInputValue(inputEl, promptText);
      await sleep(300);

      // 3. Localizar e clicar no botão enviar
      let sendBtn = adapter.send();
      if (!sendBtn || sendBtn.disabled) {
        for (let i = 0; i < 10; i++) {
          await sleep(200);
          sendBtn = adapter.send();
          if (sendBtn && !sendBtn.disabled) break;
        }
      }

      if (!sendBtn) {
        throw new Error('Botão de envio da IA não encontrado.');
      }

      sendBtn.click();
      await sleep(1000);

      // 4. Aguardar nova resposta
      const maxAttempts = 120; // 60 segundos
      let attempts = 0;

      while (attempts < maxAttempts) {
        await sleep(500);
        attempts++;

        const stopBtn = adapter.stop();
        if (stopBtn && stopBtn.offsetParent !== null) {
          // Resposta ainda sendo gerada
          continue;
        }

        const lastElement = adapter.lastAssistant();
        if (lastElement) {
          const rawText = (lastElement.innerText || lastElement.textContent || '').trim();
          // Garante que não é a resposta antiga de um chat existente
          if (rawText.length > 0 && rawText !== previousText) {
            await sleep(500);
            return (lastElement.innerText || lastElement.textContent || '').trim();
          }
        }
      }

      throw new Error('Tempo limite excedido aguardando resposta da IA.');
    };

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg?.type !== 'AI_AUTOMATION_LOOKUP') return;

      (async () => {
        try {
          const raw = await handleLookup(msg.prompt);
          sendResponse({ ok: true, raw });
        } catch (err: any) {
          sendResponse({ ok: false, error: err?.message || String(err) });
        }
      })();

      return true; // mantém porta aberta para sendResponse assíncrono
    });
  },
});
