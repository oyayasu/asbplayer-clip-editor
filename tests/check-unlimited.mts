import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readVocabulary,serializeVocabulary,renderVocabulary,updateVocabulary,emptyVocabularyEntry} from '../CleanVocabularyData.ts';

const make=(i:number)=>({
 term:'expression '+i,partOfSpeech:'idiom',ipa:'/ɪksˈprɛʃən/',
 definition:'English definition '+i,source:'WiktApi'
});
for(const count of [1,2,5,6,12,50]){
 const entries=Array.from({length:count},(_,i)=>make(i+1));
 const json=serializeVocabulary(entries);
 assert.deepEqual(readVocabulary(json),entries);
 const html=renderVocabulary(entries);
 assert.equal((html.match(/class="term-group"/g)||[]).length,count);
 assert(html.includes('expression '+count));
}
const original=[make(1),make(2),make(3)];
const grown=updateVocabulary(serializeVocabulary(original),'expression 1',
 values=>[...values,make(4),make(5),make(6)]);
assert.equal(readVocabulary(grown.VocabularyData).length,6);
assert(grown.Vocabulary.includes('expression 6'));
const deleted=updateVocabulary(grown.VocabularyData,'expression 1',
 values=>values.filter((_,i)=>i!==1));
assert.deepEqual(readVocabulary(deleted.VocabularyData).map(e=>e.term),
 ['expression 1','expression 3','expression 4','expression 5','expression 6']);
const html=renderVocabulary([{
 ...make(1),term:'<script>alert(1)</script>',
 definition:'<img src=x onerror=alert(1) />'
}]);
assert(!html.includes('<script>')&&!html.includes('<img'));
assert(html.includes('&lt;script&gt;')&&html.includes('&lt;img'));
assert(readVocabulary('broken JSON','original word')[0].term==='original word');

const root='asbplayer';
const get=p=>readFileSync(root+'/'+p,'utf8');
const model=get('common/components/CleanNoteType.ts');
const dialog=get('common/components/AnkiDialog.tsx');
const words=get('common/components/CleanWordFields.tsx');
const definitions=get('common/components/CleanDefinitionPanel.tsx');
assert(model.includes('{{Vocabulary}}'));
assert(!model.includes('MAX_CLEAN_TERMS'));
assert(!words.includes('secondVisible'));
assert(words.includes('entries.map'));
assert(words.includes('[...previous,emptyVocabularyEntry()]'));
assert(dialog.includes('readVocabulary(customFieldValues.VocabularyData,word)'));
assert(dialog.includes('updateVocabulary(current.VocabularyData,word,updater)'));
assert(definitions.includes('for(let index=0;index<ref.current.terms.length;index++)'));
console.log('PASS: 1–50 independent expressions roundtrip safely in Anki HTML and data; no slot ceiling.');
