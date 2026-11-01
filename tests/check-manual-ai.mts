import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildAIPrompt, parseAIResult, mergeAIResult } from '../AiPrompt.ts';
const entry = (term: string) => ({ term, definition:'', partOfSpeech:'', ipa:'', source:'' });
const entries = [entry('take off'), entry('break'), entry(''), entry('get along')];
const sentence = 'The plane is about to take off; the others get along.';
const prompt = buildAIPrompt(sentence, entries);
assert(prompt.includes(sentence));
assert(prompt.includes('meanings[0]'));
assert(prompt.includes('American English'));
assert(prompt.includes('Return ONLY valid raw JSON'));
assert(prompt.includes('take off'));
assert(prompt.includes('get along'));
assert(!prompt.includes('Portuguese translation;'));
const result = {
  version:2, sentence, entries:[
    {term:'take off',meanings:[
      {definition:'To leave the ground and begin to fly.',partOfSpeech:'phrasal verb',ipa:'/teɪk ɔf/'},
      {definition:'To remove clothing.',partOfSpeech:'phrasal verb',ipa:'/teɪk ɔf/'},
    ]},
    {term:'break',meanings:[{definition:'To fracture.',partOfSpeech:'verb',ipa:'/breɪk/'}]},
    {term:'get along',meanings:[{definition:'To have a friendly relationship.',partOfSpeech:'phrasal verb',ipa:''}]},
  ]
};
const parsed = parseAIResult(JSON.stringify(result),entries,sentence);
assert.equal(parsed.entries.length,3);
assert.equal(parsed.entries[0].meanings.length,2);
assert.equal(parsed.entries[0].meanings[0].definition,'To leave the ground and begin to fly.');
const merged = mergeAIResult(entries,parsed);
assert.equal(merged[0].definition,'To leave the ground and begin to fly.');
assert.equal(merged[0].partOfSpeech,'phrasal verb');
assert.equal(merged[0].ipa,'/teɪk ɔf/');
assert.equal(merged[2].term,'');
assert.equal(merged[3].definition,'To have a friendly relationship.');
assert.equal(merged[0].source,'AI · manual JSON');
const fenced = String.fromCharCode(96).repeat(3) + 'json\n'+JSON.stringify(result)+'\n'+String.fromCharCode(96).repeat(3);
assert.equal(parseAIResult(fenced,entries,sentence).entries.length,3);
assert.throws(()=>parseAIResult('not JSON',entries,sentence),/Invalid JSON/);
assert.throws(()=>parseAIResult(JSON.stringify({...result,sentence:'Not the same subtitle'}),entries,sentence),/subtitle/);
assert.throws(()=>parseAIResult(JSON.stringify({...result,entries:result.entries.slice(1)}),entries,sentence),/exactly one/);
assert.throws(()=>parseAIResult(JSON.stringify({...result,entries:[{...result.entries[0],term:'wrong'},...result.entries.slice(1)]}),entries,sentence),/does not match/);
assert.throws(()=>parseAIResult(JSON.stringify({...result,entries:[{...result.entries[0],meanings:[{definition:'a',partOfSpeech:'',ipa:''}]},...result.entries.slice(1)]}),entries,sentence),/grammatical class/);
assert.throws(()=>parseAIResult(JSON.stringify({...result,entries:[{...result.entries[0],meanings:[result.entries[0].meanings[0],result.entries[0].meanings[0]]},...result.entries.slice(1)]}),entries,sentence),/Duplicate/);
const root = process.argv[2] || 'asbplayer';
const read = (p:string) => readFileSync(root+'/'+p,'utf8');
const dialog = read('common/components/AnkiDialog.tsx');
const panel = read('common/components/AiDefinitionPanel.tsx');
const frame = read('extension/src/ui/components/AnkiUi.tsx');
const handler = read('extension/src/handlers/video/http-post-handler.ts');
const settings = read('common/components/AnkiSettingsTab.tsx');
const model = read('common/components/CleanNoteType.ts');
assert(dialog.includes('<AiDefinitionPanel'));
assert(dialog.includes('sentence={text}'));
assert(!dialog.includes('cleanRequest'));
assert(!frame.includes('cleanRequest'));
assert(!handler.includes('fluencyCleanLookup'));
assert(!handler.includes('fluencySetKey'));
assert(!panel.includes('fetch('));
assert(!panel.includes('chrome.runtime'));
assert(!panel.includes('axios'));
assert(panel.includes('navigator.clipboard.writeText(prompt)'));
assert(panel.includes('parseAIResult(response, entries, sentence)'));
assert(panel.includes('label="Definition (English)"'));
assert(panel.includes('Meaning (best contextual match first)'));
assert(settings.includes('manual AI / JSON'));
assert(model.includes('asbplayer Fluency Clean Unlimited v2'));
assert(model.includes('{{Vocabulary}}'));
assert(dialog.includes('<AudioField'));
assert(!existsSync(root+'/extension/src/services/clean-dictionary.ts'));
console.log('PASS: manual AI prompt and JSON import, contextual meanings, alternate senses, Anki and zero Clean dictionary API.');
