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
        input: () => document.querySelector<HTMLElement>('#prompt-textarea'),
        send: () => document.querySelector<HTMLButtonElement>('[data-testid="send-button"], button[aria-label*="Send"]'),
        stop: () => document.querySelector<HTMLButtonElement>('[data-testid="stop-button"], button[aria-label*="Stop"]'),
        lastAssistant: () => {
          const nodes = document.querySelectorAll('[data-message-author-role="assistant"]');
          return nodes[nodes.length - 1] as HTMLElement | null;
        },
      },
      'claude.ai': {
        input: () => document.querySelector<HTMLElement>('div.ProseMirror[contenteditable="true"]'),
        send: () => document.querySelector<HTMLButtonElement>('button[aria-label="Send Message"], button[aria-label*="Send"]'),
        stop: () => document.querySelector<HTMLButtonElement>('button[aria-label*="Stop"]'),
        lastAssistant: () => {
          const nodes = document.querySelectorAll('.font-claude-message');
          return nodes[nodes.length - 1] as HTMLElement | null;
        },
      },
      'gemini.google.com': {
        input: () => document.querySelector<HTMLElement>('div.ql-editor[contenteditable="true"]'),
        send: () => document.querySelector<HTMLButtonElement>('button[aria-label*="Send"], button.send-button'),
        stop: () => document.querySelector<HTMLButtonElement>('button[aria-label*="Stop"]'),
        lastAssistant: () => {
          const nodes = document.querySelectorAll('model-response, .model-response-text');
          return nodes[nodes.length - 1] as HTMLElement | null;
        },
      },
    };

    const getAdapter = () => {
      const host = location.hostname.replace(/^www\./, '');
      return ADAPTERS[host] || null;
    };

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    function setInputValue(el: HTMLElement, value: string) {
      el.focus();
      if (el.isContentEditable) {
        document.execCommand('insertText', false, value);
      } else {
        const proto = window.HTMLTextAreaElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    async function sendPrompt(prompt: string) {
      const a = getAdapter();
      if (!a) throw new Error('Site de IA não suportado nesta aba');
      const input = a.input();
      if (!input) throw new Error('Campo da IA não encontrado');
      setInputValue(input, prompt);
      await sleep(150);
      const send = a.send();
      if (send && !send.disabled) send.click();
      else {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }
    }

    async function waitForResponse({ timeoutMs = 90000, stableMs = 1800 } = {}) {
      const a = getAdapter();
      if (!a) throw new Error('Adapter não encontrado');
      const started = Date.now();
      let lastText = '';
      let lastChange = Date.now();

      while (Date.now() - started < timeoutMs) {
        await sleep(200);
        const node = a.lastAssistant();
        const text = node?.innerText?.trim() || '';
        if (text && text !== lastText) {
          lastText = text;
          lastChange = Date.now();
        }
        const generating = !!a.stop();
        const idle = Date.now() - lastChange > stableMs;
        if (lastText && !generating && idle) return lastText;
      }
      throw new Error('Timeout esperando resposta da IA');
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== 'AI_AUTOMATION_LOOKUP') return;
      (async () => {
        try {
          await sendPrompt(msg.prompt);
          const raw = await waitForResponse();
          sendResponse({ ok: true, raw });
        } catch (err: any) {
          sendResponse({ ok: false, error: err?.message || String(err) });
        }
      })();
      return true;
    });
  },
});
