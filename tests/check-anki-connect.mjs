import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = process.argv[2] || 'asbplayer';
const s = readFileSync(root + '/extension/src/handlers/video/http-post-handler.ts', 'utf8');
const begin = s.indexOf('const allowedActions = [');
const end = s.indexOf('];', begin);
assert(begin >= 0 && end > begin, 'Não encontrei a lista de ações permitidas');
const allowlist = s.slice(begin, end + 2);
for (const action of ['version','modelNames','modelFieldNames','deckNames','createModel','createDeck','addNote']) {
    assert(allowlist.includes("'" + action + "'"), 'Ação AnkiConnect bloqueada: ' + action);
}
assert(!allowlist.includes("'deleteDecks'"), 'Não liberar ações destrutivas');
assert(!allowlist.includes("'deleteModel'"), 'Não liberar ações destrutivas');
const settings = readFileSync(root + '/common/components/AnkiSettingsTab.tsx','utf8');
assert(settings.includes('handleInstallFluency'), 'O botão de configuração não está instalado');
assert(settings.includes('anki.createModel(fluencyNoteType'), 'O fluxo não está criando o modelo');
assert(settings.includes('anki.createDeck(chosenDeck'), 'O fluxo não está criando o baralho');
console.log('OK: requisições de criação de baralho/modelo são aceitas pelo proxy, sem liberar ações destrutivas.');
