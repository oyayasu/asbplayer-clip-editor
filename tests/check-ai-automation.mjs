#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'asbplayer');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const fail = (message) => {
  console.error('FAIL: ' + message);
  process.exit(1);
};
const need = (source, needle, label) => {
  if (!source.includes(needle)) fail(label);
};

const script = read('extension/src/entrypoints/ai-automation.content.ts');
for (const host of ['chatgpt.com', 'gemini.google.com', 'claude.ai']) {
  need(script, host, 'content script missing host ' + host);
}
need(script, 'AI_AUTOMATION_RUN', 'content script does not listen for the run message');
need(script, '<<<END>>>', 'content script has no completion sentinel');
need(script, 'defineContentScript', 'content script is not a WXT entrypoint');

const background = read('extension/src/entrypoints/background.ts');
need(background, 'AI_AUTOMATION_REQUEST', 'background does not answer the panel request');
need(background, 'runAiAutomation', 'background has no automation runner');
need(background, "sendResponse({ ok: true, raw })", 'background does not return the raw answer');
need(background, 'browser.tabs.create', 'background cannot open an AI tab');

const panel = fs.readFileSync(path.resolve('AiDefinitionPanel.tsx'), 'utf8');
need(panel, "type: 'AI_AUTOMATION_REQUEST'", 'panel does not request automation');
need(panel, 'provider,', 'panel does not send the chosen provider');
if (panel.includes('alert(')) fail('panel still uses blocking alerts');

const manifest = read('extension/wxt.config.ts');
need(manifest, 'content-scripts/ai-automation.js', 'manifest does not expose the content script');
need(manifest, 'https://gemini.google.com/*', 'manifest does not allow the AI hosts');

console.log('OK: AI automation, panel wiring and permissions are consistent.');
