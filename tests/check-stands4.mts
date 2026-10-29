import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseStands4Phrases} from '../Stands4Phrases.ts';

const samples = [
  {results:{result:{term:'throw around',explanation:'To discuss or mention ideas casually.',example:'They threw around a few ideas.'}}},
  {results:{result:[
    {term:'throw around',explanation:'To discuss or mention ideas casually.',example:'Example'},
    {term:'throw around',explanation:'To discuss or mention ideas casually.'},
    {term:'throw around',explanation:'To throw something in different directions.'},
  ]}},
  {results:{result:[]}}
];
const first=parseStands4Phrases(samples[0],'throw around');
assert.equal(first.length,1);
assert.equal(first[0].definition,'To discuss or mention ideas casually.');
assert.equal(first[0].ipa,'');
assert.equal(first[0].source,'STANDS4 Phrases');
assert.equal(first[0].partOfSpeech,'expression');
const multiple=parseStands4Phrases(samples[1],'throw around');
assert.equal(multiple.length,2);
assert.equal(parseStands4Phrases(samples[2],'throw around').length,0);
assert.equal(parseStands4Phrases({error:'invalid token'},'throw around').length,0);
assert.equal(parseStands4Phrases(null,'throw around').length,0);
const root='asbplayer';
const handler=readFileSync(root+'/extension/src/handlers/video/http-post-handler.ts','utf8');
const dictionary=readFileSync(root+'/extension/src/services/clean-dictionary.ts','utf8');
const panel=readFileSync(root+'/common/components/CleanDefinitionPanel.tsx','utf8');
const manifest=readFileSync(root+'/extension/wxt.config.ts','utf8');
assert(handler.includes("message.body?.action === 'fluencyPhrasesStatus'"));
assert(handler.includes("message.body?.action === 'fluencyPhrasesSetKey'"));
assert(handler.includes('asbplayerPhrasesUid')&&handler.includes('asbplayerPhrasesToken'));
assert(dictionary.includes('fetchStands4Phrases(term,phrasesUid,phrasesToken)'));
assert(dictionary.includes("'merriam','phrases','wiktapi'"));
assert(panel.includes('STANDS4 API token'));
assert(panel.includes("value:'phrases'"));
assert(!panel.includes('Look up in TheFreeDictionary'));
assert(manifest.includes('https://www.stands4.com/*'));
console.log('PASS: STANDS4 response variants, duplicate elimination, optional credentials, API source order, no external sites.');
