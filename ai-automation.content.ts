/**
 * Automated AI lookup for the AI Definitions panel.
 * Types the approved prompt into the already signed-in AI page, waits for the
 * answer and returns its raw text. No cookies, tokens or passwords are read.
 */
type Spec = { composer: string[]; send: string[]; stop: string[]; message: string[] };

const SENTINEL = '<<<END>>>';
const COMPOSER_WAIT = 25000;
const FIRST_ANSWER_WAIT = 45000;
const TOTAL_WAIT = 120000;

const SPECS: Record<string, Spec> = {
  'chatgpt.com': {
    composer: ['#prompt-textarea', 'div.ProseMirror[contenteditable="true"]'],
    send: ['[data-testid="send-button"]', 'button[aria-label*="Send" i]'],
    stop: ['[data-testid="stop-button"]', 'button[aria-label*="Stop" i]'],
    message: ['[data-message-author-role="assistant"]'],
  },
  'chat.openai.com': {
    composer: ['#prompt-textarea', 'div.ProseMirror[contenteditable="true"]'],
    send: ['[data-testid="send-button"]', 'button[aria-label*="Send" i]'],
    stop: ['[data-testid="stop-button"]', 'button[aria-label*="Stop" i]'],
    message: ['[data-message-author-role="assistant"]'],
  },
  'gemini.google.com': {
    composer: ['rich-textarea .ql-editor[contenteditable="true"]', 'div[contenteditable="true"][role="textbox"]'],
    send: ['button.send-button', 'button[aria-label*="Send" i]'],
    stop: ['button[aria-label*="Stop" i]'],
    message: ['message-content', '.model-response-text'],
  },
  'claude.ai': {
    composer: ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"]'],
    send: ['button[aria-label*="Send" i]'],
    stop: ['button[aria-label*="Stop" i]'],
    message: ['div.font-claude-message', '[data-testid="chat-message"]'],
  },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pick = <T extends Element>(selectors: string[]): T | null => {
  for (const selector of selectors) {
    const found = document.querySelector<T>(selector);
    if (found) return found;
  }
  return null;
};

const waitFor = async <T extends Element>(selectors: string[], timeout: number): Promise<T | null> => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const found = pick<T>(selectors);
    if (found) return found;
    await sleep(150);
  }
  return null;
};

const answerText = (selectors: string[]): string => {
  const nodes = document.querySelectorAll(selectors.join(','));
  const last = nodes[nodes.length - 1] as HTMLElement | undefined;
  return last ? (last.innerText || '').trim() : '';
};

const typeInto = (composer: HTMLElement, text: string) => {
  composer.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('delete');
  }
  const inserted = document.execCommand('insertText', false, text);
  if (!inserted || (composer.innerText || '').trim().length < text.trim().length / 2) {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', text);
    composer.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
    );
  }
  composer.dispatchEvent(new Event('input', { bubbles: true }));
};

const submit = async (composer: HTMLElement, spec: Spec) => {
  const button = await waitFor<HTMLButtonElement>(spec.send, 10000);
  if (button && !button.disabled) {
    button.click();
    return;
  }
  composer.focus();
  composer.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })
  );
};

const run = async (prompt: string): Promise<string> => {
  const host = location.hostname.replace(/^www\./, '');
  const spec = SPECS[host];
  if (!spec) throw Error('Página de IA não suportada: ' + host);

  if (document.querySelector('#challenge-running, .cf-turnstile')) {
    throw Error('O ' + host + ' pediu verificação humana. Abra a aba, resolva e tente de novo.');
  }

  const composer = await waitFor<HTMLElement>(spec.composer, COMPOSER_WAIT);
  if (!composer) {
    throw Error('Campo de mensagem não encontrado em ' + host + '. Faça login na aba e tente de novo.');
  }

  const before = document.querySelectorAll(spec.message.join(',')).length;
  typeInto(composer, prompt + '\n\nFinish your reply with a line containing exactly ' + SENTINEL);
  await sleep(250);
  await submit(composer, spec);

  const started = Date.now();
  let first: HTMLElement | null = null;
  while (Date.now() - started < FIRST_ANSWER_WAIT) {
    const nodes = document.querySelectorAll(spec.message.join(','));
    if (nodes.length > before) {
      first = nodes[nodes.length - 1] as HTMLElement;
      break;
    }
    await sleep(250);
  }
  if (!first) {
    if (/\/auth|\/login/.test(location.pathname)) {
      throw Error('Sessão não encontrada em ' + host + '. Faça login na aba e tente de novo.');
    }
    throw Error('A IA não começou a responder em ' + host + '.');
  }

  let previous = '';
  let stable = 0;
  while (Date.now() - started < TOTAL_WAIT) {
    await sleep(500);
    const text = answerText(spec.message);
    if (text.includes(SENTINEL)) return text;
    const generating = pick<HTMLElement>(spec.stop) !== null;
    if (text && text === previous && !generating) {
      stable++;
      if (stable >= 4) return text;
    } else {
      stable = 0;
    }
    previous = text;
  }
  const partial = answerText(spec.message);
  if (partial) return partial;
  throw Error('Tempo esgotado esperando a resposta da IA.');
};

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://gemini.google.com/*',
    'https://claude.ai/*',
  ],
  runAt: 'document_idle',
  main() {
    let busy = false;
    browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (!request || request.type !== 'AI_AUTOMATION_RUN') return undefined;
      if (busy) {
        sendResponse({ ok: false, error: 'Já existe uma consulta em andamento nesta aba.' });
        return true;
      }
      busy = true;
      void run(String(request.prompt || ''))
        .then((raw) => sendResponse({ ok: true, raw }))
        .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }))
        .finally(() => {
          busy = false;
        });
      return true;
    });
  },
});
