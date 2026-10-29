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
const definitionPayload={
  word:'run',edition:'en',
  definitions:[
    {lang_code:'en',pos:'verb',senses:[{glosses:['To move rapidly on foot.']}]},
    {lang_code:'en',pos:'noun',senses:[{glosses:['An instance of running.']}]},
    {lang_code:'fr',pos:'noun',senses:[{glosses:['Must be discarded.']}]}
  ]
};
const extracted=parseWiktApiEntry(definitionPayload);
assert.equal(extracted.length,2);
assert.equal(extracted[0].partOfSpeech,'verb');
assert.equal(extracted[1].partOfSpeech,'noun');
assert(!extracted.some(s=>s.definition.includes('discarded')));
assert.deepEqual(parseWiktApiEntry({entries:[]}),[]);
assert.deepEqual(parseWiktApiEntry({entries:[{lang_code:'en',pos:'noun',senses:[{glosses:[]}]}]}),[]);

console.log('PASS: WiktApi JSON parser, full idiom, English-only senses, IPA and deduplication.');

if(process.argv.includes('--live')){
  for(const phrase of ['good graces',"in someone's good graces","in (someone's) good graces"]){
    try {
      const results=await fetchWiktApi(phrase);
      console.log('LIVE IDIOM',JSON.stringify({
        phrase,count:results.length,
        first:results[0]?.definition?.slice(0,115)||null,
      }));
    }catch(e){
      console.log('LIVE IDIOM',JSON.stringify({phrase,error:String(e)}));
    }
  }

  for(const url of [
    'https://api.wiktapi.dev/v1/en/word/run?lang=en',
    'https://api.wiktapi.dev/v1/en/word/run',
    'https://api.wiktapi.dev/v1/en/word/chat?lang=fr',
    'https://api.wiktapi.dev/v1/en/word/run/definitions'
  ]){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(7000)});
      const body=await response.json();
      if(url.includes('/word/run?lang=en')){
        const entries=Array.isArray(body.entries)?body.entries:[];
        console.log('LIVE ENTRY SHAPE',JSON.stringify({
          count:entries.length,
          keys:entries[0]?Object.keys(entries[0]):[],
          entries:entries.slice(0,4).map((e:any)=>({
            lang:e.lang,lang_code:e.lang_code,pos:e.pos,
            sense_keys:e.senses?.[0]?Object.keys(e.senses[0]):[],
            glosses:e.senses?.[0]?.glosses
          })),
          codes:[...new Set(entries.map((e:any)=>String(e.lang_code)))].slice(0,15)
        }).slice(0,2200));
      }
      console.log('LIVE DIAGNOSTIC',response.status,url,
        JSON.stringify(body).slice(0,550));
    }catch(e){console.log('LIVE DIAGNOSTIC error',url,String(e));}
  }
  try{
    const result=await fetchWiktApi('run');
    if(result.length){
      console.log('LIVE OK: '+result.length+' senses - '+result[0].definition.slice(0,90));
    }else{
      throw Error('WiktApi endpoint returned no parsed English definitions for run.');
    }
  }catch(e){
    console.log('LIVE WARNING: WiktApi unavailable - '+String(e));
  }
}
