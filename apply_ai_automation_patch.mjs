#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'asbplayer');
const get = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const put = (name, content) => fs.writeFileSync(path.join(root, name), content);
const swap = (source, before, after, label) => {
  const matches = source.split(before).length - 1;
  if (matches !== 1) throw Error(label + ' expected one match, found ' + matches);
  return source.replace(before, after);
};

{
  const target = path.join(root, 'extension/src/entrypoints/ai-automation.content.ts');
  if (fs.existsSync(target)) throw Error('AI automation content script already installed');
  fs.copyFileSync(path.resolve('ai-automation.content.ts'), target);
}

{
  const file = 'extension/src/entrypoints/background.ts';
  let source = get(file);
  const handler = [
    '    // Automated AI lookup: drives the signed-in AI tab through its content script.',
    '    const AI_AUTOMATION_HOSTS: Record<string, { pattern: string; newChat: string }> = {',
    "        chatgpt: { pattern: '*://chatgpt.com/*', newChat: 'https://chatgpt.com/' },",
    "        gemini: { pattern: '*://gemini.google.com/*', newChat: 'https://gemini.google.com/app' },",
    "        claude: { pattern: '*://claude.ai/*', newChat: 'https://claude.ai/new' },",
    '    };',
    '    const sleepMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));',
    '    const runAiAutomation = async (provider: string, prompt: string): Promise<string> => {',
    '        const host = AI_AUTOMATION_HOSTS[provider];',
    "        if (!host) throw Error('Serviço de IA desconhecido: ' + provider);",
    '        const existing = await browser.tabs.query({ url: host.pattern });',
    '        let tabId: number;',
    '        let created = false;',
    '        const reusable = existing.find((tab) => tab.id !== undefined);',
    '        if (reusable && reusable.id !== undefined) {',
    '            tabId = reusable.id;',
    '            await browser.tabs.update(tabId, { url: host.newChat });',
    '        } else {',
    '            const tab = await browser.tabs.create({ url: host.newChat, active: false });',
    "            if (tab.id === undefined) throw Error('Não foi possível abrir a aba da IA.');",
    '            tabId = tab.id;',
    '            created = true;',
    '        }',
    '        try {',
    '            for (let i = 0; i < 40; i++) {',
    '                const current = await browser.tabs.get(tabId);',
    "                if (current.status === 'complete') break;",
    '                await sleepMs(400);',
    '            }',
    '            let lastError = "sem script de conteúdo na página";',
    '            for (let i = 0; i < 20; i++) {',
    '                let response: any;',
    '                try {',
    "                    response = await browser.tabs.sendMessage(tabId, { type: 'AI_AUTOMATION_RUN', prompt });",
    '                } catch (error) {',
    '                    lastError = error instanceof Error ? error.message : String(error);',
    '                    await sleepMs(700);',
    '                    continue;',
    '                }',
    "                if (!response || !response.ok) throw Error((response && response.error) || 'A IA não devolveu resposta.');",
    "                return String(response.raw || '');",
    '            }',
    "            throw Error('A página da IA não respondeu: ' + lastError);",
    '        } finally {',
    '            if (created) void browser.tabs.remove(tabId).catch(() => undefined);',
    '        }',
    '    };',
    '    browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {',
    "        if (!request || request.type !== 'AI_AUTOMATION_REQUEST') return undefined;",
    "        const prompt = typeof request.prompt === 'string' ? request.prompt.trim() : '';",
    "        const provider = typeof request.provider === 'string' ? request.provider : '';",
    "        if (!prompt) { sendResponse({ ok: false, error: 'Prompt vazio.' }); return true; }",
    "        if (prompt.length > 20000) { sendResponse({ ok: false, error: 'Prompt grande demais.' }); return true; }",
    '        void runAiAutomation(provider, prompt)',
    '            .then((raw) => sendResponse({ ok: true, raw }))',
    '            .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));',
    '        return true;',
    '    });',
    ''
  ].join('\n');
  source = swap(source,
    '    // Fluency lookups use strictly allowlisted destinations. No arbitrary URL proxy.',
    handler + '    // Fluency lookups use strictly allowlisted destinations. No arbitrary URL proxy.',
    'AI automation handler');
  put(file, source);
}

{
  const file = path.resolve('AiDefinitionPanel.tsx');
  let source = fs.readFileSync(file, 'utf8');
  source = swap(source,
    '      alert("1. Botão clicado! Pedindo para o background procurar a IA...");',
    "      setSuccess('Consultando a IA...');",
    'quiet first step');
  source = swap(source,
    '      alert("4. Resposta recebida do background: " + (res?.ok ? "Sucesso!" : "Erro: " + res?.error));\n',
    '',
    'quiet fourth step');
  source = swap(source,
    '      alert("ERRO FATAL: " + (err.message || String(err)));\n',
    '',
    'quiet fatal step');
  source = swap(source,
    '      alert("O Chrome perdeu a conexão com a extensão porque ela foi atualizada ou recarregada.\\n\\nPor favor, aperte F5 nesta página (YouTube) e no ChatGPT para continuar.");',
    "      setError('A extensão foi recarregada. Aperte F5 nesta página e tente de novo.');",
    'quiet extension context');
  source = swap(source,
    '        prompt: prompt,',
    '        prompt: prompt,\n        provider,',
    'send provider with prompt');
  fs.writeFileSync(file, source);
}

console.log('OK: automated AI lookup wired to the panel, manual fallback kept.');
