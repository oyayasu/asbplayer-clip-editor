import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = process.argv[2] || 'asbplayer';
const read = (p: string) => readFileSync(root + '/' + p, 'utf8');

const panel = read('common/components/AiDefinitionPanel.tsx');
const dialog = read('common/components/AnkiDialog.tsx');
const ui = read('extension/src/ui/components/AnkiUi.tsx');
const controller = read('extension/src/controllers/anki-ui-controller.ts');
const tabController = read('extension/src/controllers/tab-anki-ui-controller.ts');
const background = read('extension/src/services/json-relay-background.ts');
const manifest = read('extension/wxt.config.ts');

assert(!panel.includes('chrome.runtime'));
assert(panel.includes('request?:'));
assert(panel.includes('await request({ provider, prompt })'));
assert(dialog.includes('jsonRelayRequest?:'));
assert(dialog.includes('request={jsonRelayRequest}'));
assert(ui.includes("command: 'json-relay'"));
assert(ui.includes('jsonRelayRequest={jsonRelayRequest}'));
assert(ui.includes('190_000'));
for (const source of [controller, tabController]) {
  assert(source.includes("case 'json-relay'"));
  assert(source.includes("action: 'ASB_JSON_RELAY_RUN'"));
  assert(source.includes('messageId: relayMessage.messageId'));
}
assert(background.includes("msg?.action!=='ASB_JSON_RELAY_RUN'"));
assert(background.includes('browser.scripting.executeScript'));
assert(manifest.includes("'scripting'"));
assert(manifest.includes('https://chatgpt.com/*'));
assert(manifest.includes('https://gemini.google.com/*'));
assert(manifest.includes('https://claude.ai/*'));
assert(existsSync(root + '/extension/public/json-relay/content.js'));
console.log('PASS: automatic JSON relay crosses the Anki iframe bridge and never calls runtime from the common panel.');
