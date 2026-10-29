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

    const sleep = (ms: number) => new Promise((
