import assert from 'node:assert/strict';
import {parseWiktApiEntry,fetchWiktApi} from '../WiktApiProvider.ts';

const sample = {
  word:'hold a grudge',
  edition:'en',
  entries:[
    {
      word:'hold a grudge',
      lang:'English',
      lang_code:'en',
      pos:'verb',
      senses:[
        {glosses:['To remain angry or resentful about something that happened in the past.']},
        {glosses:['To remain angry or resentful about something that happened in the past.']},
        {glosses:['To continue to feel resentment toward someone.']}
      ],
      sounds:[{ipa:'/hoʊld ə ɡrʌdʒ/',tags:['US']}]
    },
    {
      word:'hold a grudge',lang_code:'fr',pos:'noun',
      senses:[{glosses:['Incorrect language sense']}],
      sounds:[{ipa:'/ʃa/'}]
    }
  ]
};
const senses=parseWiktApiEntry(sample);
assert.equal(senses.length,2);
assert.equal(senses[0].partOfSpeech,'verb');
assert.equal(senses[0].ipa,'/hoʊld ə ɡrʌdʒ/');
assert.equal(senses[0].source,'WiktApi / English Wiktionary');
assert.match(senses[0].definition,/remain angry/);
assert(!senses.some(s=>s.definition.includes('Incorrect')));
assert.deepEqual(parseWiktApiEntry({entries:[]}),[]);
assert.deepEqual(parseWiktApiEntry({entries:[{lang_code:'en',pos:'noun',senses:[{glosses:[]}]}]}),[]);

console.log('PASS: WiktApi JSON parser, full idiom, English-only senses, IPA and deduplication.');

if(process.argv.includes('--live')){
  const result=await fetchWiktApi('run');
  assert(result.length>0,'WiktApi returned no definitions for common English word "run"');
  console.log('LIVE OK: run - '+result.length+' meanings, first='+result[0].definition.slice(0,90));
  try{
    const idiom=await fetchWiktApi('hold a grudge');
    console.log('LIVE idiom (optional): '+idiom.length+' senses');
  }catch(e){
    console.log('LIVE idiom request unavailable: '+String(e));
  }
}
