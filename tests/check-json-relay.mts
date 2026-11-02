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
const extensionBackground = read('extension/src/entrypoints/background.ts');
const manifest = read('extension/wxt.config.ts');
const anki = read('common/anki/anki.ts');

assert(!panel.includes('chrome.runtime'));
assert(panel.includes('request?:'));
assert(panel.includes('await request({ provider, prompt })'));
assert(!panel.includes('<MenuItem value="claude">Claude</MenuItem>'));
assert(panel.includes("saved === 'gemini' ? 'gemini' : 'chatgpt'"));
assert(dialog.includes('jsonRelayRequest?:'));
assert(dialog.includes('label="Part of speech"'));
assert(dialog.includes('label="IPA"'));
assert(dialog.includes("customFieldValues.PartOfSpeech || ''"));
assert(dialog.includes("customFieldValues.IPA || ''"));
assert(dialog.includes("gridTemplateColumns:'repeat(2,minmax(0,1fr))'"));
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
assert(background.includes('scriptingApi?.executeScript'));
assert(background.includes("browser.tabs.executeScript(tabId,{file:'/json-relay/content.js'})"));
assert(!background.includes('claude.ai'));
assert(!extensionBackground.includes('enqueueUpdateAlert'));
assert(!extensionBackground.includes('updateListener'));
assert(manifest.includes("'scripting'"));
assert(manifest.includes('https://chatgpt.com/*'));
assert(manifest.includes('https://gemini.google.com/*'));
assert(!manifest.includes('https://claude.ai/*'));
assert(existsSync(root + '/extension/public/json-relay/content.js'));
const relay = read('extension/public/json-relay/content.js');
assert(relay.includes('baselineNodes'));
assert(!relay.includes('claude.ai'));
assert(anki.includes("this.settingsProvider.noteType === cleanModelName"));
assert(anki.includes("await this.modelNames(ankiConnectUrl)"));
assert(anki.includes("await this.createModel(cleanNoteType, ankiConnectUrl)"));
assert(anki.includes("await this.createDeck(this.settingsProvider.deck, ankiConnectUrl)"));
assert(relay.includes("model-response message-content"));
assert(relay.includes('[data-testid="assistant-message"]'));
assert(relay.includes('input-area-v2 [contenteditable='));
console.log('PASS: automatic JSON relay crosses the Anki iframe bridge and never calls runtime from the common panel.');
